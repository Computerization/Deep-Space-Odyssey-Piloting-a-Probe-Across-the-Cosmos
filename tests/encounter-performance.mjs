import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const version=(await(await fetch(BASE_URL+'/package.json')).json()).version;
const worldSource=process.env.COSMOS_PREVIOUS_WORLD?await fs.readFile(process.env.COSMOS_PREVIOUS_WORLD,'utf8'):await(await fetch(BASE_URL+'/src/world.js')).text();
const windowSeconds=Number(process.env.COSMOS_ENCOUNTER_SECONDS||3);assert.ok(windowSeconds>=3&&windowSeconds<=20);
const worldSha256=createHash('sha256').update(worldSource).digest('hex');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:2}),errors=[],samples=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 if(process.env.COSMOS_PREVIOUS_WORLD)await page.route('**/src/world.js',r=>r.fulfill({body:worldSource,contentType:'application/javascript'}));
 const loadingBegan=Date.now();await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});const readyMs=Date.now()-loadingBegan;await page.click('#begin');
 await page.evaluate(()=>{window.testContextLosses=0;document.getElementById('universe').addEventListener('webglcontextlost',()=>window.testContextLosses++);});
 const scenes=[[0,null,'Earth'],[0,'moon','Moon'],[0,'earth-shadow','Earth shadow'],[1,null,'Jupiter'],[1,'io','Io'],[2,null,'Saturn'],[2,'ring-plane','Ring plane'],[2,'north-pole','North pole'],[2,'titan','Titan']].filter(s=>!process.env.COSMOS_ENCOUNTER_SCENES||process.env.COSMOS_ENCOUNTER_SCENES.split(',').includes(s[2]));
 assert.ok(scenes.length);
 // Include the transition itself: a warm-up delay would conceal shader,
 // texture-upload or first-camera stalls. Repeat to separate cold/warm paths.
 for(let round=0;round<2;round++)for(const [chapter,study,name] of scenes)for(const view of ['probe','chase']){
  const sample=await page.evaluate(async({chapter,study,view,windowSeconds})=>{
   const a=window.__cosmos,g=a.game,w=a.world,update=w.update,render=w.renderer.render,resize=w.resize,intervals=[],draws=[],firstDraw={},resizes=[],slowFrames=[];
   const resources=()=>({...w.renderer.info.memory,programs:w.renderer.info.programs.length});
   const before=resources(),begin=performance.now();let last=begin,firstFrameMs=null,canvasWrites=0,lastDraw=null,frameDraw={};
   const dimensions=Object.fromEntries(['width','height'].map(key=>[key,Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,key)]));
   for(const [key,d] of Object.entries(dimensions))Object.defineProperty(w.canvas,key,{configurable:true,get(){return d.get.call(this)},set(value){canvasWrites++;d.set.call(this,value)}});
   w.resize=function(...args){const start=performance.now(),writes=canvasWrites,from=[w.canvas.width,w.canvas.height],sceneFrom=[w.frameTarget.width,w.frameTarget.height];try{return resize.apply(this,args);}finally{resizes.push({atMs:start-begin,cpuMs:performance.now()-start,from,to:[w.canvas.width,w.canvas.height],sceneFrom,sceneTo:[w.frameTarget.width,w.frameTarget.height],ratio:w.ratio,canvasWrites:canvasWrites-writes});}};
   w.renderer.render=function(scene,...args){
    const key=scene===w.scene?(this.getRenderTarget()===w.environmentTarget?'reflection':'world'):scene===w.sky?'sky':scene===w.shipScene?'probe':scene===w.resolveScene?'output':'clouds/prefilter',start=performance.now();
    try{return render.call(this,scene,...args);}finally{const duration=performance.now()-start;frameDraw[key]=(frameDraw[key]||0)+duration;if(!draws.length)firstDraw[key]=(firstDraw[key]||0)+duration;}
   };
   w.update=function(...args){frameDraw={};const start=performance.now();try{return update.apply(this,args);}finally{const duration=performance.now()-start;draws.push(duration);lastDraw={atMs:start-begin,cpuMs:duration,ratio:w.ratio,cloudScale:w.cloudScale,stages:frameDraw};}};
   try{
    a.startChapter(chapter,0,study);g.rateIndex=0;g.actualRate=1;g.view=view;
    await new Promise(resolve=>{function sample(){const now=performance.now();firstFrameMs??=now-begin;const interval=now-last;intervals.push(interval);if(interval>80)slowFrames.push({atMs:now-begin,intervalMs:interval,lastDraw});last=now;if(now-begin<windowSeconds*1000)requestAnimationFrame(sample);else resolve();}requestAnimationFrame(sample);});
    const seconds=(last-begin)/1000;intervals.sort((x,y)=>x-y);draws.sort((x,y)=>x-y);
    const audio=a.audio.status();
    return {seconds,firstFrameMs,resizes,slowFrames,canvasWrites,firstDrawCpuMs:firstDraw,frames:intervals.length,renders:draws.length,medianMs:intervals[Math.floor(intervals.length*.5)],p95Ms:intervals[Math.floor(intervals.length*.95)],maxIntervalMs:intervals.at(-1),maxRenderCpuMs:draws.at(-1),over100ms:intervals.filter(x=>x>100).length,simulationSeconds:g.localSeconds,held:g.timePaused||g.boundaryPaused,ratio:w.ratio,cloudScale:w.cloudScale,pixels:[w.canvas.width,w.canvas.height],scenePixels:[w.frameTarget.width,w.frameTarget.height],before,after:resources(),audioTracks:audio.playing.length,scorePlaying:audio.playing.includes(audio.track),contextLosses:window.testContextLosses};
   }finally{w.update=update;w.renderer.render=render;w.resize=resize;for(const key of Object.keys(dimensions))delete w.canvas[key];}
  },{chapter,study,view,windowSeconds});samples.push({round,name,view,...sample});console.log(samples.at(-1));
 }
 // Scene music crossfades for 7.5 seconds; more than one live track is valid
 // here. The sustained check verifies retirement after those fades finish.
 const passed=errors.length===0&&samples.every(s=>s.contextLosses===0&&!s.held&&s.simulationSeconds>1&&s.scorePlaying&&s.renders>=s.frames*.9);
 await fs.writeFile(process.env.COSMOS_ENCOUNTER_REPORT||'tests/encounter-performance-results.json',JSON.stringify({version,worldSha256,sourceURL:BASE_URL,viewport:[1600,1000],deviceScaleFactor:2,readyMs,windowSeconds,method:'Measured from each scene/camera selection, without a warm-up gap. Two rounds include all selected local studies in both views. Frame intervals include first-use stalls; CPU draw time excludes asynchronous GPU execution.',samples,errors,passed},null,2)+'\n');
 assert.deepEqual(errors,[]);assert.ok(passed,'Every transition must keep rendering and advance physical time with a live context and score');
}finally{await browser.close();}
