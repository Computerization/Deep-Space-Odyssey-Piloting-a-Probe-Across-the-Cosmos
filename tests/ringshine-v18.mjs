import {chromium,BASE_URL} from './browser.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const baseline=await fs.readFile('tests/fixtures/planet-v17.glsl','utf8');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],views=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 await page.evaluate(base=>{const a=window.__cosmos;a.startChapter(2);a.game.mode='panel';a.game.timePaused=true;document.getElementById('hud').hidden=true;document.getElementById('toast').classList.remove('visible');window.newSurface=a.world.bodies.saturn.mesh.material.fragmentShader;window.oldSurface=base;},baseline);
 for(const [label,phase,latitude] of [['day',null,null],['crescent',130,15],['night',178,15],['southern-night',178,-15]]){
  if(phase!==null)await page.evaluate(async({phase,latitude})=>{const a=window.__cosmos,w=a.world,t=await import('three'),saturn=w.bodies.saturn,center=w.bodyPositions.saturn,sun=center.clone().negate().normalize().applyQuaternion(saturn.inverseOrientation);const angle=Math.atan2(sun.z,sun.x)+phase*Math.PI/180,lat=latitude*Math.PI/180,local=new t.Vector3(Math.cos(lat)*Math.cos(angle),Math.sin(lat),Math.cos(lat)*Math.sin(angle));a.game.player.position.copy(local.multiplyScalar(60268*4.8).applyQuaternion(saturn.group.quaternion).add(center));a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(a.game.player.position,center,new t.Vector3(0,1,0).applyQuaternion(saturn.group.quaternion)));w.followReady=false;},{phase,latitude});
  for(const mode of ['before','after']){
   const snapshot=await page.evaluate(mode=>{const a=window.__cosmos,w=a.world;w.bodies.saturn.mesh.material.fragmentShader=mode==='before'?oldSurface:newSurface;w.bodies.saturn.mesh.material.needsUpdate=true;w.update(a.game.player,0,{view:'probe',exposure:1,look:a.game.look});return w.canvas.toDataURL('image/png').split(',')[1];},mode);
   const path=`tests/screenshots/v18-ringshine-${label}-${mode}.png`;await fs.writeFile(path,Buffer.from(snapshot,'base64'));views.push({label,mode,path});
  }
 }
 const quadrature=await page.evaluate(async()=>{
  const a=window.__cosmos,w=a.world,{createRingIntegrator,ringIrradianceMap}=await import('./src/rendering/ringshine.js');
  const sun=w.bodies.saturn.uniforms.localSun.value.toArray(),ordinary=createRingIntegrator(w.ringProfile,sun),dense=createRingIntegrator(w.ringProfile,sun,{radialSteps:192,azimuthSteps:256}),samples=[];
  for(const latitude of [-35,-15,-5,5,15,35])for(const longitude of [0,90,180,270]){
   const lat=latitude*Math.PI/180,lon=longitude*Math.PI/180,p=[Math.cos(lat)*Math.cos(lon),.902*Math.sin(lat),Math.cos(lat)*Math.sin(lon)],n=[p[0],p[1]/(.902*.902),p[2]],l=Math.hypot(...n);for(let i=0;i<3;i++)n[i]/=l;
   const x=ordinary(p,n),y=dense(p,n);samples.push({latitude,longitude,ordinary:x,dense:y,error:Math.max(...x.map((v,i)=>Math.abs(v-y[i])))});
  }
  const start=performance.now();ringIrradianceMap(w.ringProfile,sun);return {samples,generationMs:performance.now()-start,sun};
 });
 const cache=await page.evaluate(()=>{const w=window.__cosmos.world,before=w.ringLightCache.size,begin=performance.now();for(let i=0;i<120;i++)w.setEpoch(i%2?2:3);const meanBindingMs=(performance.now()-begin)/120;return {before,after:w.ringLightCache.size,meanBindingMs,bytes:[...w.ringLightCache.values()].reduce((sum,t)=>sum+t.image.data.byteLength,0),textureSize:[w.bodies.saturn.uniforms.ringIrradiance.value.image.width,w.bodies.saturn.uniforms.ringIrradiance.value.image.height]};});assert.ok(cache.after<=cache.before+1);assert.ok(Math.max(...quadrature.samples.map(s=>s.error))<.001);assert.deepEqual(errors,[]);
 await fs.writeFile('tests/ringshine-v18-results.json',JSON.stringify({views,cache,quadrature,errors},null,2));console.log({views:views.length,cache,maxQuadratureError:Math.max(...quadrature.samples.map(s=>s.error)),generationMs:quadrature.generationMs,errors});
}finally{await browser.close();}
