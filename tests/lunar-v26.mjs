import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const baseline=await fs.readFile('tests/fixtures/planet-v25.glsl','utf8'),outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_LUNAR_ENGINE&&name!==process.env.COSMOS_LUNAR_ENGINE)continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
  await page.evaluate(baseline=>{const a=window.__cosmos;a.startChapter(0,0,'moon');a.game.timePaused=true;a.game.mode='panel';a.world.setQuality('ultra');a.game.view='probe';a.game.look.identity();document.getElementById('hud').hidden=true;document.getElementById('toast').classList.remove('visible');window.oldLunarShader=baseline;window.newLunarShader=a.world.bodies.moon.mesh.material.fragmentShader;window.referenceLunarShader=newLunarShader.replace('i<14','i<128').replace('stepKm*=1.5;',`stepKm*=${Math.pow(1.5,13/127).toFixed(12)};`);window.lunarAttitude=a.game.player.quaternion.clone();},baseline);
  const captured={};
  for(const variant of ['old','current','unshadowed','reference']){
   captured[variant]=await page.evaluate(variant=>{const a=window.__cosmos,w=a.world,b=w.bodies.moon;b.mesh.material.fragmentShader=variant==='old'?oldLunarShader:variant==='reference'?referenceLunarShader:newLunarShader;b.mesh.material.needsUpdate=true;b.uniforms.reliefShadows.value=variant==='unshadowed'?0:1;w.update(a.game.player,0,{view:'probe',exposure:1,look:a.game.look});const c=document.createElement('canvas');c.width=1280;c.height=800;const x=c.getContext('2d');x.drawImage(w.canvas,0,0,1280,800);const roi=x.getImageData(712,235,24,16).data;return {roi:[...roi],draws:w.renderer.info.render.calls,png:c.toDataURL('image/png').split(',')[1]};},variant);
   await fs.writeFile(`tests/screenshots/v26-${name}-lunar-${variant}.png`,Buffer.from(captured[variant].png,'base64'));
  }
  const count=values=>{let count=0;for(let i=0;i<values.length;i+=4)if(captured.reference.roi[i]>120&&captured.reference.roi[i+1]>120&&Math.max(...values.slice(i,i+3))<15)count++;return count;};
  const before=count(captured.old.roi),after=count(captured.current.roi);assert.equal(after,0);assert.equal(captured.current.draws,captured.old.draws);
  const motion=[];
  for(const yaw of [-.001,-.0005,0,.0005,.001]){
   const count=await page.evaluate(async yaw=>{const t=await import('three'),a=window.__cosmos,b=a.world.bodies.moon;a.game.player.quaternion.copy(lunarAttitude).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),yaw));const c=document.createElement('canvas');c.width=1280;c.height=800;const x=c.getContext('2d'),frames=[];for(const shader of [referenceLunarShader,newLunarShader]){b.mesh.material.fragmentShader=shader;b.mesh.material.needsUpdate=true;b.uniforms.reliefShadows.value=1;a.world.update(a.game.player,0,{view:'probe',exposure:1,look:a.game.look});x.drawImage(a.world.canvas,0,0,1280,800);frames.push(x.getImageData(712,235,24,16).data);}let dark=0;for(let i=0;i<frames[0].length;i+=4)if(frames[0][i]>120&&frames[0][i+1]>120&&Math.max(frames[1][i],frames[1][i+1],frames[1][i+2])<15)dark++;return dark;},yaw);motion.push(count);assert.equal(count,0);
  }
  const views=[];
  for(const [label,radius,phase,polar] of [['close',1.5,70,false],['full',4,20,false],['crescent',3,125,false],['polar',3,80,true]]){
   await page.evaluate(async({radius,phase,polar})=>{const a=window.__cosmos,t=await import('three');a.startChapter(0,0,'moon');a.game.mode='panel';a.game.timePaused=true;a.game.view='probe';a.game.look.identity();const b=a.world.bodies.moon,center=a.world.bodyPositions.moon,sun=center.clone().negate().normalize(),up=new t.Vector3(0,1,0).applyQuaternion(b.group.quaternion),side=polar?up.clone().addScaledVector(sun,-up.dot(sun)).normalize():new t.Vector3().crossVectors(sun,up).normalize();a.game.player.position.copy(center).addScaledVector(sun,1737.4*radius*Math.cos(phase*Math.PI/180)).addScaledVector(side,1737.4*radius*Math.sin(phase*Math.PI/180));a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(a.game.player.position,center,up));a.world.followReady=false;b.uniforms.reliefShadows.value=1;a.world.update(a.game.player,0,{view:'probe',exposure:1,look:a.game.look});},{radius,phase,polar});
   await page.screenshot({path:`tests/screenshots/v26-${name}-lunar-${label}.png`});views.push(label);
  }
  assert.deepEqual(errors,[]);const result={name,engineVersion:browser.version(),brightSurfaceDefectPixelsBefore:before,brightSurfaceDefectPixelsAfter:after,smallTurnDefectPixels:motion,drawCalls:captured.current.draws,unchangedDrawCount:true,referenceHeightSamples:128,views,errors,passed:true};outcomes.push(result);console.log(result);
 }finally{await browser.close();}
}
assert.ok(outcomes.some(x=>x.brightSurfaceDefectPixelsBefore>0),'The retained old shader reproduces the defect');
await fs.writeFile('tests/lunar-v26-results.json',JSON.stringify({version:'0.26.0',outcomes},null,2)+'\n');
