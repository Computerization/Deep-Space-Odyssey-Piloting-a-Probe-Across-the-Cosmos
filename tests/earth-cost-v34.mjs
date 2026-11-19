import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const previous=await fs.readFile('tests/fixtures/planet-v33.glsl','utf8');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1}),errors=[],samples=[];
page.on('pageerror',e=>errors.push(e.message));
try{
await page.route('**/tests/earth-before.avif',route=>route.fulfill({path:process.env.COSMOS_PREVIOUS_EARTH,contentType:'image/avif'}));
await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
await page.evaluate(async()=>{const a=window.__cosmos,w=a.world,t=await import('three');a.game.mode='panel';w.setQuality('ultra');window.cloudBase=w.bodies.earth.mesh.material.fragmentShader;const old=await new t.TextureLoader().loadAsync('/tests/earth-before.avif');old.colorSpace=t.SRGBColorSpace;old.wrapS=t.RepeatWrapping;old.anisotropy=w.textures['earth.avif'].anisotropy;
window.earthVariants={old,current:w.textures['earth.avif'],atmosphere:w.bodies.earth.atmosphere.material.fragmentShader,composite:w.cloudLayer.resolve.fragmentShader};
window.switchEarth=(mode,previous)=>{const b=w.bodies.earth,u=b.uniforms,v=window.earthVariants;b.mesh.material.fragmentShader=mode==='previous'?previous:window.cloudBase;b.mesh.material.needsUpdate=true;u.surfaceMap.value=mode==='previous'?v.old:v.current;u.saturation.value=mode==='previous'?.82:1;u.surfaceGain.value=mode==='previous'?1.08:1;b.atmosphere.material.fragmentShader=mode==='previous'?v.atmosphere.replace('*3.141592654;','*7.;'):v.atmosphere;b.atmosphere.material.needsUpdate=true;w.cloudLayer.resolve.fragmentShader=mode==='previous'?v.composite.replace('*3.141592654;','*7.;'):v.composite;w.cloudLayer.resolve.needsUpdate=true;};});
for(const [label,radius,phase] of [['day',2.35,35],['grazing',1.08,90]]){
 await page.evaluate(async({radius,phase})=>{const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0);a.game.mode='panel';a.game.timePaused=true;const c=w.bodyPositions.earth,sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize(),p=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180)).multiplyScalar(6371*radius).add(c);a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0)));w.followReady=false;},{radius,phase});
 // Warm both complete pipelines before paired timing. Initial driver work
 // can otherwise dominate the first window even after shader compilation.
 for(const mode of ['previous','candidate'])await page.evaluate(async({mode,previous})=>{
  const a=window.__cosmos,w=a.world,m=w.bodies.earth.mesh.material;
  window.switchEarth(mode,previous);
  for(let i=0;i<240;i++){await new Promise(requestAnimationFrame);w.update(a.game.player,0,{view:'probe',exposure:1});}
 },{mode,previous});
 for(const mode of ['previous','candidate','candidate','previous']){
 const r=await page.evaluate(async({mode,previous})=>{
  const a=window.__cosmos,w=a.world,m=w.bodies.earth.mesh.material,gl=w.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  window.switchEarth(mode,previous);
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
 },{mode,previous});samples.push({label,mode,...r});console.log(samples.at(-1));
 }
}
assert.deepEqual(errors,[]);await fs.writeFile('tests/earth-cost-v34-results.json',JSON.stringify({version:'0.34.0',method:'240 unmeasured renders per variant before ABBA full-frame GPU queries; 40 warmup and 160 measured renders per window; fixed ultra 1280 x 800, no frame cache or adaptive resolution.',samples,errors},null,2));
}finally{await browser.close()}
