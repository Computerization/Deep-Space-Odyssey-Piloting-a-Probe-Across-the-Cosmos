import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
let lowPowerModeConfigured=null;try{if(process.platform==='darwin')lowPowerModeConfigured=execFileSync('pmset',['-g','custom'],{encoding:'utf8'}).match(/lowpowermode\s+(\d)/)?.[1]==='1';}catch{}
const previous=await fs.readFile('tests/fixtures/cloud-v34.glsl','utf8');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1}),errors=[],samples=[];
page.on('pageerror',e=>errors.push(e.message));
try{
await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
await page.evaluate(()=>{const a=window.__cosmos;a.game.mode='panel';a.world.setQuality('ultra');window.cloudBase=a.world.bodies.earth.clouds.material.fragmentShader;});
for(const [label,radius,phase,yaw=0,fov=58] of (process.env.COSMOS_CLOUD_COST_ZOOM?[['resolved-limb',1.05,35,1.2645,4]]:[['day',2.35,35],['close',1.05,50],['grazing',1.08,90]])){
 await page.evaluate(async({radius,phase,yaw,fov})=>{const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0);a.game.mode='panel';a.game.timePaused=true;w.setFov(fov);const c=w.bodyPositions.earth,sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize(),p=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180)).multiplyScalar(6371*radius).add(c);a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0))).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),yaw));w.followReady=false;},{radius,phase,yaw,fov});
 // Warm both complete pipelines before paired timing. Initial driver work
 // can otherwise dominate the first window even after shader compilation.
 for(const mode of ['previous','candidate'])await page.evaluate(async({mode,previous})=>{
  const a=window.__cosmos,w=a.world,m=w.bodies.earth.clouds.material;
  m.fragmentShader=mode==='previous'?previous:window.cloudBase;m.needsUpdate=true;
  for(let i=0;i<240;i++){await new Promise(requestAnimationFrame);w.update(a.game.player,0,{view:'probe',exposure:1});}
 },{mode,previous});
 for(const mode of ['previous','candidate','candidate','previous']){
 const r=await page.evaluate(async({mode,previous})=>{
  const a=window.__cosmos,w=a.world,m=w.bodies.earth.clouds.material,gl=w.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  m.fragmentShader=mode==='previous'?previous:window.cloudBase;m.needsUpdate=true;
  const gpu=[],cpu=[],pending=[];
  for(let i=0;i<200;i++){
   await new Promise(requestAnimationFrame);
   const query=i>=40&&ext?gl.createQuery():null;if(query)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
   const began=performance.now();w.update(a.game.player,0,{view:'probe',exposure:1});const elapsed=performance.now()-began;if(i>=40)cpu.push(elapsed);
   if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(query)}
   for(let n=pending.length-1;n>=0;n--){const q=pending[n];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(ext.GPU_DISJOINT_EXT))gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);pending.splice(n,1)}}
  }
  for(let i=0;i<20&&pending.length;i++){
   await new Promise(requestAnimationFrame);
   for(let n=pending.length-1;n>=0;n--){const q=pending[n];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(ext.GPU_DISJOINT_EXT))gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);pending.splice(n,1)}}
  }
  for(const q of pending)gl.deleteQuery(q);gpu.sort((a,b)=>a-b);cpu.sort((a,b)=>a-b);
  return {gpuSamples:gpu.length,gpuMedianMs:gpu[Math.floor(gpu.length*.5)]??null,gpuP95Ms:gpu[Math.floor(gpu.length*.95)]??null,cpuMedianMs:cpu[Math.floor(cpu.length*.5)],drawCalls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,pixels:[w.canvas.width,w.canvas.height]};
 },{mode,previous});samples.push({label,mode,yaw,fov,...r});console.log(samples.at(-1));
 }
}
assert.deepEqual(errors,[]);await fs.writeFile(`tests/cloud-cost-v35${process.env.COSMOS_CLOUD_COST_ZOOM?'-zoom':''}-results.json`,JSON.stringify({version:'0.35.0',lowPowerModeConfigured,method:'240 unmeasured renders per variant before ABBA full-frame GPU queries; 40 warmup and 160 measured renders per window; fixed ultra 1280 x 800, no frame cache or adaptive resolution.',samples,errors},null,2));
}finally{await browser.close()}
