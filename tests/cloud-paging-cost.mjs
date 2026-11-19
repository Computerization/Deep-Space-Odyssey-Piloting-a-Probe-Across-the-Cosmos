import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const results=[],allErrors=[];
for(const mode of ['baseline','candidate','candidate','baseline']){
 const origin=mode==='baseline'?process.env.COSMOS_CLOUD_BASELINE_URL:BASE_URL;assert.ok(origin);
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),page=await browser.newPage({viewport:{width:1000,height:625},deviceScaleFactor:2}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(origin+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:120000});await page.click('#begin');
 for(const label of ['day','close']){
  const r=await page.evaluate(async({mode,label})=>{
   const a=window.__cosmos,w=a.world,g=a.game,t=await import('three');a.startChapter(0);g.mode='loading';g.timePaused=true;g.look.identity();w.setQuality('high');w.cloudScale=.75;w.setFov(58);
   const b=w.bodies.earth,c=w.bodyPositions.earth,sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize();const p=sun.multiplyScalar(Math.cos(35*Math.PI/180)).addScaledVector(side,Math.sin(35*Math.PI/180)).multiplyScalar(b.data.radius*(label==='day'?2.35:1.08)).add(c);
   g.player.position.copy(p);g.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0)));w.followReady=false;
   const physical=()=>JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.localSeconds,g.fuel]),before=physical(),gl=w.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),queries=[],intervals=[],draw=()=>w.update(g.player,0,{view:'probe',look:g.look}),raf=()=>new Promise(r=>requestAnimationFrame(r));
   for(let i=0;i<120;i++){draw();if(!w.cloudDetail?.pending&&(!w.cloudDetail?.wanted||w.cloudDetail?.uniforms.cloudPatchWeight.value===1))break;await new Promise(r=>setTimeout(r,40));}
   for(let i=0;i<24;i++){await raf();draw();}gl.finish();let last=await raf();
   for(let i=0;i<40;i++){const now=await raf();intervals.push(now-last);last=now;const q=ext?gl.createQuery():null;if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);draw();if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);queries.push(q);}}
   gl.finish();for(let i=0;i<30&&queries.some(q=>!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE));i++)await raf();
   const valid=ext&&!gl.getParameter(ext.GPU_DISJOINT_EXT),gpu=valid?queries.filter(q=>gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)).map(q=>gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6):[];for(const q of queries)gl.deleteQuery(q);intervals.sort((a,b)=>a-b);gpu.sort((a,b)=>a-b);
   return{mode,label,preserved:before===physical(),graphicsError:gl.getError(),frameMedian:intervals[20],frameP95:intervals[38],gpuMedian:gpu[Math.floor(gpu.length*.5)]??null,gpuSamples:gpu.length,cloudScale:w.cloudScale,dimensions:[w.canvas.width,w.canvas.height],resources:{...w.renderer.info.memory},programs:w.renderer.info.programs.length};
  },{mode,label});assert.ok(r.preserved);assert.equal(r.graphicsError,0);results.push(r);console.log(r);
 }
 assert.deepEqual(errors,[]);allErrors.push(...errors);
}finally{await browser.close();}
}
await fs.writeFile(process.env.COSMOS_CLOUD_COST_REPORT||'tests/cloud-paging-cost-results.json',JSON.stringify({results,errors:allErrors,method:'Fresh Chrome Metal contexts, baseline / candidate / candidate / baseline, 1000 x 625 DPR2, High at fixed .75 cloud scale. Detail fully loaded before 24 warm and 40 measured frames. GPU query intervals and frame intervals are reported separately; this is a short local comparison, not endurance.'},null,2)+'\n');
