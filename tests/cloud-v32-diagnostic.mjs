import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const previous=await fs.readFile('tests/fixtures/cloud-v31.glsl','utf8');
const skip=await fs.readFile('/private/tmp/cosmos-cloud-skip-v32.glsl','utf8');
const outcomes=[];
for(const [name,engine,options] of [['Firefox',firefox,{headless:true}]]){
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:800,height:500}}),errors=[],views=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 await page.evaluate(()=>{const a=window.__cosmos;a.game.mode='panel';a.world.setQuality('ultra');window.cloudCandidate=a.world.bodies.earth.clouds.material.fragmentShader;});
 for(const [label,radius,phase,yaw=0]of [['day',2.35,35],['close',1.05,50]]){
  await page.evaluate(async({radius,phase,yaw})=>{
   const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0);a.game.mode='panel';a.game.timePaused=true;
   const c=w.bodyPositions.earth,sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize(),p=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180)).multiplyScalar(6371*radius).add(c);
   a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0))).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),yaw));w.followReady=false;window.cloudPixels={};
  },{radius,phase,yaw});
  const draws={};
  for(const mode of ['off','previous','fallback','skip','filterOnly','candidate']){
   const r=await page.evaluate(({mode,previous,skip,save})=>{
    const a=window.__cosmos,w=a.world,cloud=w.bodies.earth.clouds;cloud.visible=mode!=='off';const filter=mode==='candidate'?2:1;w.textures['earth-clouds.avif'].anisotropy=filter;w.textures['earth-clouds.avif'].needsUpdate=true;cloud.material.defines={CLOUD_ANISOTROPIC:filter>1?1:0};cloud.material.fragmentShader=mode==='previous'?previous:mode==='skip'?skip:mode==='filterOnly'?window.cloudCandidate.replace('if(h>=top)return 0.;','').replace('if(min(ha,hb)>=top)return 0.;',''):window.cloudCandidate;cloud.material.needsUpdate=true;
    w.update(a.game.player,0,{view:'probe',exposure:1});const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const x=c.getContext('2d');x.drawImage(w.canvas,0,0);window.cloudPixels[mode]=x.getImageData(0,0,c.width,c.height).data;
    return {png:save?c.toDataURL().split(',')[1]:null,drawCalls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles};
   },{mode,previous,skip,save:mode!=='off'});
   draws[mode]={calls:r.drawCalls,triangles:r.triangles};if(r.png)await fs.writeFile(`tests/screenshots/v32-firefox-diagnostic-${label}-${mode}.png`,Buffer.from(r.png,'base64'));
  }
  const metrics=await page.evaluate(()=>{
   const p=window.cloudPixels,out={};for(const mode of ['fallback','skip','filterOnly','candidate']){let sum=0,sq=0,max=0,n=0,full=0,fullMax=0;for(let i=0;i<p.previous.length;i+=4){const visible=Math.max(...[0,1,2].map(c=>Math.abs(p.previous[i+c]-p.off[i+c])))>2;for(let c=0;c<3;c++){const e=Math.abs(p[mode][i+c]-p.previous[i+c]);full+=e;fullMax=Math.max(fullMax,e);if(visible){sum+=e;sq+=e*e;max=Math.max(max,e);n++}}}out[mode]={channels:n,mae:n?sum/n:0,rmse:n?Math.sqrt(sq/n):0,max,fullMean:full/(p.previous.length*.75),fullMax};}return out;
  });

  assert.deepEqual(draws.candidate,draws.previous);views.push({label,radius,phase,yaw,metrics,draws});console.log({name,label,fallbackMax:metrics.fallback.fullMax,candidateMeanDifference:metrics.candidate.mae});
 }
 assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),views,errors,passed:true});
 }finally{await browser.close()}
 await fs.writeFile('tests/cloud-v32-diagnostic-results.json',JSON.stringify({version:'0.32.0',reference:'The delivered v31 shader is the fallback reference. New filtering is separately checked against spatially supersampled linear radiance.',viewport:[800,500],outcomes},null,2));
}
