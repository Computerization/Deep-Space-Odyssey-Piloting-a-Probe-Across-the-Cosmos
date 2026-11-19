import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');
 await page.keyboard.press('z');assert.equal(await page.evaluate(()=>window.__cosmos.game.precision),true);
 const precision=await page.evaluate(()=>{
  const a=window.__cosmos,g=a.game;g.player.velocity.set(0,0,0);g.rateIndex=7;
  for(let i=0;i<60;i++)a.updateFlight(1/60,{...a.zeroInput,thrust:1});
  return {speed:g.player.velocity.length(),rate:g.actualRate};
 });assert.ok(Math.abs(precision.speed-1)<.05);assert.ok(precision.rate<=10);
 await page.keyboard.press('m');await page.click('[data-action=opportunity][data-value=shadow]');
 const navigation=await page.evaluate(async()=>{
  const a=window.__cosmos,g=a.game,w=a.world,{Vector3,Matrix4}=await import('three');g.view='probe';g.precision=false;g.player.velocity.set(0,0,0);const route=a.exploration.destination();
  let steps=0,minAltitude=Infinity;
  while(steps++<18000){
   const nav=a.exploration.destination(),delta=nav.point.clone().sub(g.player.position),distance=delta.length();
   const final=!nav.clearance;if(final&&distance<100)break;
   const side=g.player.velocity.clone().sub(delta.clone().normalize().multiplyScalar(g.player.velocity.dot(delta.clone().normalize()))).length();
   g.precision=final&&distance<3500;g.rateIndex=5;
   g.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(g.player.position,nav.point,new Vector3(0,1,0)));
   a.updateFlight(1/30,{...a.zeroInput,thrust:side>.4?0:1,brake:side>.4});
   minAltitude=Math.min(minAltitude,g.player.position.distanceTo(w.bodyPositions.earth)-6371);
   if(g.mode!=='play')throw Error('Navigation entered '+g.mode);
  }
  for(let i=0;i<100;i++)a.updateFlight(1/30,{...a.zeroInput,brake:true});
  g.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(g.player.position,w.bodyPositions.earth,new Vector3(0,1,0)));g.angular.set(0,0,0);
  for(let i=0;i<115;i++)a.updateFlight(1/30,{...a.zeroInput,observe:true});
  return {steps,seconds:steps/30,minAltitude,recorded:g.explored.includes('event-shadow'),waypoints:g.navigation.points.length};
 });assert.ok(navigation.steps<18000);assert.ok(navigation.minAltitude>6371*.03);assert.ok(navigation.recorded);
 // Same camera/lighting, switch measured-relief shadowing off and on to isolate its effect.
 const terrain=await page.evaluate(async()=>{
  const a=window.__cosmos,g=a.game,w=a.world,{Vector3,Matrix4}=await import('three');a.startChapter(0);g.view='probe';
  const center=w.bodyPositions.moon,sun=center.clone().negate().normalize(),side=new Vector3().crossVectors(sun,new Vector3(0,1,0)).normalize();
  g.player.position.copy(center).addScaledVector(sun,1737.4*3.5*Math.cos(80*Math.PI/180)).addScaledVector(side,1737.4*3.5*Math.sin(80*Math.PI/180));g.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(g.player.position,center,new Vector3(0,1,0)));w.setFov(42);
  const canvas=document.createElement('canvas');canvas.width=w.canvas.width;canvas.height=w.canvas.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const capture=enabled=>{w.bodies.moon.uniforms.reliefShadows.value=enabled;w.update(g.player,0,{view:'probe'});ctx.drawImage(w.canvas,0,0);return ctx.getImageData(0,0,canvas.width,canvas.height).data;};
  const before=capture(0),after=capture(1);let changed=0,darker=0,total=0;
  for(let i=0;i<after.length;i+=4){const difference=after[i]+after[i+1]+after[i+2]-before[i]-before[i+1]-before[i+2];if(Math.abs(difference)>6)changed++;if(difference< -6)darker++;total+=Math.abs(difference);}
  for(const name of ['hud','chapter-intro','discovery','toast'])document.getElementById(name).hidden=true;
  return {changed,darker,meanDifference:total/(after.length/4),samples:w.frameTarget.samples};
 });assert.ok(terrain.changed>500);assert.ok(terrain.darker>terrain.changed*.9);assert.equal(terrain.samples,4);
 await page.waitForTimeout(400);await page.screenshot({path:'tests/screenshots/v8-lunar-relief.png'});
 assert.deepEqual(errors,[]);const result={precision,navigation,terrain,errors};await fs.writeFile('tests/flight-polish-results.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{await browser.close();}
