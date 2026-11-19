import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});const errors=[],views=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');
for(const [body,chapter,distance,fov,angles]of [['titan',2,3,52,[30,90,150,175]],['earth',0,1.25,58,[30,85,110]],['saturn',2,5,58,[30,145]]]){
 for(const angle of angles){
  await page.evaluate(async({body,chapter,distance,fov,angle})=>{
   const a=window.__cosmos,{Vector3,Matrix4}=await import('three');a.startChapter(chapter);const center=a.world.bodyPositions[body],radius=a.world.bodies[body].data.radius;
   const sun=center.clone().negate().normalize(),right=new Vector3().crossVectors(sun,new Vector3(0,1,0)).normalize(),theta=angle*Math.PI/180;
   a.game.player.position.copy(center).addScaledVector(sun,Math.cos(theta)*radius*distance).addScaledVector(right,Math.sin(theta)*radius*distance);
   a.game.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(a.game.player.position,center,new Vector3(0,1,0)));
   a.game.view='probe';a.world.setFov(fov);for(const id of ['hud','chapter-intro','discovery','toast'])document.getElementById(id).hidden=true;
  },{body,chapter,distance,fov,angle});await page.waitForTimeout(900);
  const name=`v4-${body}-phase-${angle}`;await page.screenshot({path:`tests/screenshots/${name}.png`});views.push(name);
 }
}
// Solar illumination of the probe must disappear behind Earth and return on its day side.
const solar=[];for(const side of [-1,1]){
 await page.evaluate(side=>{const a=window.__cosmos;a.startChapter(0);const center=a.world.bodyPositions.earth;a.game.player.position.copy(center).addScaledVector(center.clone().negate().normalize(),side*1.5*a.world.bodies.earth.data.radius);a.game.view='chase';},side);
 await page.waitForTimeout(120);solar.push(await page.evaluate(()=>window.__cosmos.world.shipKey.intensity));
}
assert.equal(solar[0],0);assert.ok(solar[1]>0);assert.deepEqual(errors,[]);
await fs.writeFile('tests/lighting-review-results.json',JSON.stringify({views,probeSolarIntensity:{earthNight:solar[0],earthDay:solar[1]},errors},null,2));console.log({views:views.length,solar,errors});await browser.close();
