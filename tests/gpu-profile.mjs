// Completed-draw profiling. Readback makes each diagnostic interval end at
// an observable GPU result; empty finish calls are not a completion witness.
import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const sourceHashes=Object.fromEntries(await Promise.all(['src/world.js','src/rendering/cloud-layer.js','src/rendering/earth-shaders.js'].map(async p=>[p,createHash('sha256').update(await fs.readFile(p)).digest('hex')])));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2}),errors=[],records=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 for(const [chapter,study,name,view] of [[0,null,'Earth','probe'],[0,null,'Earth','chase'],[2,'titan','Titan','probe'],[2,'titan','Titan','chase']]){
  const result=await page.evaluate(async({chapter,study,view})=>{
   const a=window.__cosmos,w=a.world,r=w.renderer,gl=r.getContext();
   a.startChapter(chapter,0,study);a.game.mode='loading';a.game.timePaused=true;a.game.view=view;w.setQuality('high');w.cloudScale=.75;w.resize();
   const physical=()=>JSON.stringify([a.game.player.position.toArray(),a.game.player.velocity.toArray(),a.game.player.quaternion.toArray(),a.game.localSeconds,a.game.fuel]);
   const before=physical(),render=r.render.bind(r);
   const buffers={[gl.UNSIGNED_BYTE]:new Uint8Array(4),[gl.HALF_FLOAT]:new Uint16Array(4),[gl.FLOAT]:new Float32Array(4),[gl.UNSIGNED_INT]:new Uint32Array(4)};
   const complete=()=>{const type=gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE),format=gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT);if(!buffers[type])throw Error('Unsupported readback type '+type);gl.readPixels(0,0,1,1,format,type,buffers[type]);};
   const stage=(scene,camera)=>scene===w.sky?'stars':scene===w.scene?(camera===w.camera?'world':'environment'):scene===w.shipScene?'spacecraft':scene===w.resolveScene?'frame resolve':scene===w.cloudLayer.volumeScene?'cloud volume':scene===w.cloudLayer.resolveScene?'cloud + atmosphere':scene===w.cloudLayer.splitScene?'cloud + atmosphere (split)':'environment filter';
   const draw=()=>w.update(a.game.player,1/60,{view,look:a.game.look,time:0,exposure:1});
   for(let i=0;i<30;i++){await new Promise(requestAnimationFrame);draw();complete();}
   const summarize=values=>{const s=[...values].sort((a,b)=>a-b);return {samples:s.length,medianMs:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)],meanMs:s.reduce((a,b)=>a+b,0)/s.length};};
   const profiles=[];
   for(const mode of ['whole frame','completed stages']){
    const stages={},frames=[];
    r.render=mode==='whole frame'?render:(scene,camera)=>{complete();const start=performance.now();render(scene,camera);complete();(stages[stage(scene,camera)]??=[]).push(performance.now()-start);};
    try{
     for(let i=0;i<60;i++){
      await new Promise(requestAnimationFrame);complete();const start=performance.now();draw();complete();frames.push(performance.now()-start);
     }
    }finally{r.render=render;}
    const costs=Object.fromEntries(Object.entries(stages).map(([name,s])=>[name,summarize(s)]));
    profiles.push({mode,frame:summarize(frames),stages:costs,stageMsPerFrame:Object.values(stages).reduce((sum,s)=>sum+s.reduce((a,b)=>a+b,0),0)/frames.length});
   }
   if(gl.getError()!==gl.NO_ERROR)throw Error('Profiling generated a graphics error');
   return {scene:[w.frameTarget.width,w.frameTarget.height],cloud:[w.cloudLayer.target.width,w.cloudLayer.target.height],physicalStatePreserved:physical()===before,profiles};
  },{chapter,study,view});
  assert.deepEqual(result.scene,[2880,1800]);assert.ok(result.physicalStatePreserved);
  const profile=result.profiles[1];assert.ok(profile.stageMsPerFrame<=profile.frame.meanMs+.01);
  assert.ok(result.profiles.every(p=>p.frame.samples===60&&Number.isFinite(p.frame.meanMs)));
  records.push({name,view,...result});console.log(records.at(-1));
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile('tests/gpu-profile-results.json',JSON.stringify({version,sourceHashes,method:'Chrome/Metal High at 1440 x 900 DPR 2, native scene and cloud scale fixed at its 0.75 adaptive floor. Held physical views; 30 completed warmup draws followed by 60 whole-frame draws and 60 per-stage completion draws. A one-pixel readback after drawing includes CPU, synchronization and GPU execution. Stage profiling introduces extra readbacks; these are diagnostic draw costs, not live frame-rate measurements.',records,errors},null,2)+'\n');
}finally{await browser.close();}
