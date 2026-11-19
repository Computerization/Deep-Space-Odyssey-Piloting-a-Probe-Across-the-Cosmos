import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
try {
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],phases=[],eclipses=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');
 for(const phase of [15,80,130]){
  await page.evaluate(async phase=>{
   const a=window.__cosmos,g=a.game,w=a.world,{Vector3,Matrix4}=await import('three');a.startChapter(0);g.view='probe';g.guidance=false;g.rateIndex=0;
   const c=w.bodyPositions.moon,sun=c.clone().negate().normalize(),east=new Vector3().crossVectors(sun,new Vector3(0,1,0)).normalize(),theta=phase*Math.PI/180;
   g.player.position.copy(c).addScaledVector(sun,Math.cos(theta)*1737.4*3.5).addScaledVector(east,Math.sin(theta)*1737.4*3.5);
   g.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(g.player.position,c,new Vector3(0,1,0)));w.setFov(42);
   for(const id of ['hud','chapter-intro','discovery','toast'])document.getElementById(id).hidden=true;
  },phase);
  await page.waitForTimeout(500);await page.screenshot({path:`tests/screenshots/v7-moon-phase-${phase}.png`});
  phases.push({phase,starVisibility:await page.evaluate(()=>window.__cosmos.world.starMaterial.uniforms.visibility.value)});
 }
 assert.ok(phases.at(-1).starVisibility>phases[0].starVisibility);
 for(const offset of [6000,6371,6700]){
  await page.evaluate(async offset=>{
   const a=window.__cosmos,g=a.game,w=a.world,{Vector3,Matrix4}=await import('three');a.startChapter(0);g.view='chase';g.rateIndex=0;
   const c=w.bodyPositions.earth,away=c.clone().normalize(),east=new Vector3().crossVectors(away,new Vector3(0,1,0)).normalize();
   g.player.position.copy(c).addScaledVector(away,50000).addScaledVector(east,offset);
   g.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(g.player.position,c,new Vector3(0,1,0)));w.followReady=false;
   for(const id of ['hud','chapter-intro','discovery','toast'])document.getElementById(id).hidden=true;
  },offset);
  await page.waitForTimeout(600);
  eclipses.push(await page.evaluate(()=>({fraction:window.__cosmos.world.sunlightFraction,key:window.__cosmos.world.shipKey.intensity})));
  await page.screenshot({path:`tests/screenshots/v7-shadow-${offset}.png`});
 }
 assert.equal(eclipses[0].fraction,0);assert.ok(eclipses[1].fraction>0&&eclipses[1].fraction<1);assert.equal(eclipses[2].fraction,1);
 assert.deepEqual(errors,[]);const result={phases,eclipses,errors};await fs.writeFile('tests/exploration-visuals-results.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{await browser.close();}
