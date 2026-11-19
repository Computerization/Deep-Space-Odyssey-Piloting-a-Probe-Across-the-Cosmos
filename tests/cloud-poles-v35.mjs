import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const previous=await fs.readFile('tests/fixtures/cloud-v34.glsl','utf8');
const reference=previous.replace('for(int i=0;i<20;i++){','for(int i=0;i<320;i++){').replace('float stepSize=i<8?(split-begin)/8.:(end-split)/12.;','float stepSize=(end-begin)/320.;').replace('float t=i<8?begin+(float(i)+.5)*stepSize:split+(float(i)-8.+.5)*stepSize;','float t=begin+(float(i)+.5)*stepSize;');
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_CLOUD_ENGINE&&process.env.COSMOS_CLOUD_ENGINE!==name)continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:800,height:500}}),errors=[],views=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 await page.evaluate(async()=>{const a=window.__cosmos,w=a.world,t=await import('three');a.game.mode='panel';w.setQuality('ultra');window.cloudCandidate=w.bodies.earth.clouds.material.fragmentShader;const material=w.bodies.earth.clouds.material.clone();material.uniforms=w.bodies.earth.clouds.material.uniforms;material.blending=t.NoBlending;material.transparent=false;material.depthTest=false;material.depthWrite=false;const mesh=new t.Mesh(w.bodies.earth.clouds.geometry,material);mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;const scene=new t.Scene();scene.add(mesh);const target=new t.WebGLRenderTarget(800,500,{type:t.HalfFloatType,depthBuffer:false});window.numeric={t,material,mesh,scene,target,lookup:Float32Array.from({length:65536},(_,i)=>t.DataUtils.fromHalfFloat(i)),frames:{}};});
 for(const [label,radius,phase,yaw=0]of [['pole',2.35,90],['seam',2.35,150]]){
  await page.evaluate(async({label,radius,phase,yaw})=>{
   const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0);a.game.mode='panel';a.game.timePaused=true;
   const c=w.bodyPositions.earth;if(label==='seam')c.copy(new t.Vector3(-149600000,0,0).applyQuaternion(w.bodies.earth.group.quaternion));const sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize(),p=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180)).multiplyScalar(6371*radius).add(c);
   if(label==='pole')p.copy(c).add(new t.Vector3(0,6371*radius,0).applyQuaternion(w.bodies.earth.group.quaternion));if(label==='seam')p.copy(c).add(new t.Vector3(6371*radius,0,0).applyQuaternion(w.bodies.earth.group.quaternion));a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,label==='pole'?new t.Vector3(0,0,1).applyQuaternion(w.bodies.earth.group.quaternion):new t.Vector3(0,1,0))).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),yaw));w.followReady=false;window.cloudPixels={};window.cloudLinear={};
  },{label,radius,phase,yaw});
  const draws={};
  for(const mode of ['off','previous','candidate','reference','dense']){
   const r=await page.evaluate(({mode,previous,reference,save})=>{
    const a=window.__cosmos,w=a.world,cloud=w.bodies.earth.clouds;cloud.visible=mode!=='off';cloud.material.fragmentShader=mode==='previous'?previous:mode==='reference'?reference:mode==='dense'?reference.replaceAll('320','640'):window.cloudCandidate;cloud.material.needsUpdate=true;
    w.update(a.game.player,0,{view:'probe',exposure:1});const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const x=c.getContext('2d');x.drawImage(w.canvas,0,0);window.cloudPixels[mode]=x.getImageData(0,0,c.width,c.height).data;
    const calls=w.renderer.info.render.calls,triangles=w.renderer.info.render.triangles;
    if(mode!=='off'){const n=window.numeric;n.material.fragmentShader=cloud.material.fragmentShader.replace('vec4(radiance/alpha,alpha)','vec4(radiance,alpha)');n.material.needsUpdate=true;n.mesh.matrix.copy(cloud.matrixWorld);w.renderer.setRenderTarget(n.target);w.renderer.setClearAlpha(0);w.renderer.clear();w.renderer.render(n.scene,w.camera);const raw=new Uint16Array(800*500*4);w.renderer.readRenderTargetPixels(n.target,0,0,800,500,raw);window.cloudLinear[mode]=Float32Array.from(raw,x=>n.lookup[x]);w.renderer.setRenderTarget(null);w.renderer.setClearAlpha(1);}
    return {png:save?c.toDataURL().split(',')[1]:null,drawCalls:calls,triangles};
   },{mode,previous,reference,save:name==='Chrome'&&mode!=='off'});
   draws[mode]={calls:r.drawCalls,triangles:r.triangles};if(r.png)await fs.writeFile(`tests/screenshots/v35-cloud-poles-${label}-${mode}.png`,Buffer.from(r.png,'base64'));
  }
  const metrics=await page.evaluate(()=>{
   const p=window.cloudPixels,out={};for(const mode of ['previous','candidate']){let sum=0,sq=0,max=0,n=0,full=0,fullMax=0;for(let i=0;i<p.reference.length;i+=4){const visible=Math.max(...[0,1,2].map(c=>Math.abs(p.reference[i+c]-p.off[i+c])))>2;for(let c=0;c<3;c++){const e=Math.abs(p[mode][i+c]-p.reference[i+c]);full+=e;fullMax=Math.max(fullMax,e);if(visible){sum+=e;sq+=e*e;max=Math.max(max,e);n++}}}out[mode]={channels:n,mae:n?sum/n:0,rmse:n?Math.sqrt(sq/n):0,max,fullMean:full/(p.reference.length*.75),fullMax};}return out;
  });
  
  const linear=await page.evaluate(label=>{const p=window.cloudLinear,out={};for(const mode of ['previous','candidate',...(p.dense?['dense']:[])]){let sum=0,sq=0,max=0,count=0;for(let i=0;i<p.reference.length;i+=4)if(p.reference[i+3]>.01){for(let c=0;c<4;c++){const e=Math.abs(p[mode][i+c]-p.reference[i+c]);if(!Number.isFinite(e))throw Error('Invalid cloud radiance');sum+=e;sq+=e*e;max=Math.max(max,e);count++;}}out[mode]={mean:count?sum/count:0,rmse:count?Math.sqrt(sq/count):0,max,count};}if(['close','close-left','close-right','horizon','limb-left','limb-right'].includes(label))window.numeric.frames[label]=p;return out;},label);
  assert.ok(linear.candidate.mean<linear.previous.mean*.95+1e-7,JSON.stringify({name,label,linear}));assert.ok(linear.candidate.rmse<linear.previous.rmse*.95+1e-7,JSON.stringify({name,label,linear}));if(linear.dense)assert.ok(linear.dense.mean<(linear.previous.mean-linear.candidate.mean)*.2+1e-7,JSON.stringify({name,label,linear}));
  assert.deepEqual(draws.candidate,draws.previous);views.push({label,radius,phase,yaw,metrics,linear,draws});console.log({name,label,previous:linear.previous,candidate:linear.candidate,convergence:linear.dense});
 }
 assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),views,errors,passed:true});
 }finally{await browser.close()}
 await fs.writeFile('tests/cloud-poles-v35-results.json',JSON.stringify({version:'0.35.0',reference:'320 uniform view midpoint samples of the unchanged v34 density field and sunlight integrator. Both views also use 640 for convergence. Linear premultiplied RGBA and display pixels are measured separately; this tests integration, not photographic equivalence.',viewport:[800,500],outcomes},null,2));
}
