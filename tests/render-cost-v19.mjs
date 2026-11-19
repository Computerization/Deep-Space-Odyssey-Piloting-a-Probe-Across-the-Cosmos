import {chromium,BASE_URL} from './browser.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const previous=await fs.readFile('tests/fixtures/earth-atmosphere-v18.glsl','utf8'),previousCloud=await fs.readFile('tests/fixtures/cloud-v18.glsl','utf8');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2}),errors=[],samples=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 await page.evaluate(()=>{window.atmoCurrent=window.__cosmos.world.bodies.earth.atmosphere.material.fragmentShader;window.cloudCurrent=window.__cosmos.world.bodies.earth.clouds.material.fragmentShader;});
 for(const [chapter,study,name,view] of [[0,null,'Earth','probe'],[0,null,'Earth','chase'],[2,'titan','Titan','chase']]){
  await page.evaluate(({chapter,study,view})=>{const a=window.__cosmos,w=a.world;a.startChapter(chapter,0,study);a.game.timePaused=true;a.game.view=view;w.noteFrame=()=>{};w.ratio=2;w.cloudScale=1;w.resize();},{chapter,study,view});
  for(const mode of ['previous','candidate','candidate','previous']){
   await page.evaluate(async({mode,previous,previousCloud})=>{const t=await import('three');const w=window.__cosmos.world,m=w.bodies.earth.atmosphere.material;m.fragmentShader=mode==='previous'?previous:window.atmoCurrent;m.needsUpdate=true;for(const file of ['earth-clouds.avif','moon-height.webp']){w.textures[file].format=mode==='previous'?t.RGBAFormat:t.RedFormat;w.textures[file].needsUpdate=true;}const c=w.bodies.earth.clouds.material,v=w.cloudLayer.volume.material;c.fragmentShader=mode==='previous'?previousCloud:window.cloudCurrent;c.needsUpdate=true;v.fragmentShader=c.fragmentShader.replace('vec4(radiance/alpha,alpha)','vec4(radiance,alpha)');v.needsUpdate=true;w.shipKey.shadow.autoUpdate=mode==='previous';w.shipKey.shadow.needsUpdate=true;},{mode,previous,previousCloud});await page.waitForTimeout(1500);
   const result=await page.evaluate(()=>new Promise(resolve=>{
    const w=window.__cosmos.world,gl=w.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),update=w.update.bind(w),pending=[],gpu=[],frames=[],began=performance.now();let last=began,count=0,cpu=0;
    const shadow=w.shipKey.shadow,matrices=shadow.updateMatrices.bind(shadow);let shadowUpdates=0;shadow.updateMatrices=(...args)=>{shadowUpdates++;return matrices(...args);};
    w.update=(...args)=>{const q=ext&&count%3===0?gl.createQuery():null;if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);const t=performance.now();update(...args);cpu+=performance.now()-t;count++;if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(q);}};
    function frame(now){frames.push(now-last);last=now;for(let i=pending.length-1;i>=0;i--){const q=pending[i];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(ext.GPU_DISJOINT_EXT))gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);pending.splice(i,1);}}
     if(now-began<5000){requestAnimationFrame(frame);return;}
     w.update=update;shadow.updateMatrices=matrices;for(const q of pending)gl.deleteQuery(q);frames.sort((a,b)=>a-b);gpu.sort((a,b)=>a-b);
     resolve({seconds:(now-began)/1000,frames:count,medianFrameMs:frames[Math.floor(frames.length*.5)],p95FrameMs:frames[Math.floor(frames.length*.95)],cpuMs:cpu/count,gpuSamples:gpu.length,gpuMedianMs:gpu[Math.floor(gpu.length*.5)],gpuP95Ms:gpu[Math.floor(gpu.length*.95)],shadowUpdates});
    }requestAnimationFrame(frame);
   }));samples.push({name,view,mode,...result});console.log(samples.at(-1));
  }
 }
 assert.deepEqual(errors,[]);assert.ok(samples.every(s=>s.gpuSamples>=30));await fs.writeFile('tests/render-cost-v19-results.json',JSON.stringify({viewport:{width:1440,height:900,dpr:2},fixedRenderRatio:2,cloudScale:1,method:'Alternating ABBA windows; same held view, complete-frame GPU queries sampled every third frame. Previous atmosphere/clouds + per-frame shadows versus candidate atmosphere/clouds + cached shadows + R8 scalar fields.',samples,errors},null,2));
}finally{await browser.close();}
