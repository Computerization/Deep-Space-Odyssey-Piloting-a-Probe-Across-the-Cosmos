import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(`${BASE_URL}/?test=1`);await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');
// The new opening has its own real-keyboard end-to-end test. Enter the
// regular encounter here to exercise all thirteen optional observations.
await page.evaluate(()=>window.__cosmos.startChapter(0));
await page.waitForTimeout(1300);
assert.equal(await page.evaluate(()=>window.__cosmos.audio.context.state),'running');
await page.keyboard.down('w');await page.waitForTimeout(1000);await page.keyboard.up('w');
assert.ok(await page.evaluate(()=>window.__cosmos.game.player.velocity.length())>2);
await page.keyboard.down('Space');await page.waitForTimeout(1300);await page.keyboard.up('Space');
assert.ok(await page.evaluate(()=>window.__cosmos.game.player.velocity.length())<.2);
await page.keyboard.press('c');assert.equal(await page.evaluate(()=>window.__cosmos.game.view),'probe');
await page.waitForTimeout(700);await page.screenshot({path:'tests/screenshots/chase-earth.png'});
await page.keyboard.press('c');
await page.keyboard.down('x');await page.waitForTimeout(3300);await page.keyboard.up('x');
assert.equal(await page.evaluate(()=>window.__cosmos.game.task),1);
const log=[];
// Fly through each observation region using the production movement integrator.
// The test pilot chooses a heading and applies thrust/braking, never teleports.
for(let chapter=0;chapter<5;chapter++){
 const result=await page.evaluate(async expected=>{
  const api=window.__cosmos;const {game:g,world:w,zeroInput:z}=api;
  const {Vector3,Matrix4,Quaternion}=await import('three');
  const {CHAPTERS}=await import('./src/mission.js');
  g.view='probe';const c=CHAPTERS[g.chapter];if(g.chapter!==expected)throw Error('wrong chapter '+g.chapter);
  let simulated=0;
  while(g.task<c.tasks.length){
   const t=c.tasks[g.task],wp=api.taskPoint();let steps=0;
   if(wp){
    const radius=api.observationRadius();
    if(t.frameBody)g.rateIndex=3;
    while(g.player.position.distanceTo(wp)>radius*.70&&steps++<15000){
     const d=g.player.position.distanceTo(wp);g.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(g.player.position,wp,new Vector3(0,1,0)));
     const forward=new Vector3(0,0,-1).applyQuaternion(g.player.quaternion);const lateral=g.player.velocity.clone().sub(forward.clone().multiplyScalar(g.player.velocity.dot(forward)));
     // Correct course by braking before applying thrust along a new direction.
     const brake=lateral.length()>.5||d<radius&&g.player.velocity.length()>2;
     api.updateFlight(1/30,{...z,thrust:brake?0:1,brake});simulated+=1/30;
     if(g.mode!=='play')throw Error('Flight interrupted '+g.mode+' at '+c.id+' '+g.task);
    }
    if(steps>=15000)throw Error('Navigation did not converge '+c.id+' '+g.task);
   }
   for(let j=0;j<90;j++)api.updateFlight(1/30,{...z,brake:true});
   const target=api.targetPosition();g.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(g.player.position,target,new Vector3(0,1,0)));g.look.identity();
   const before=g.task;for(let j=0;j<300&&g.task===before;j++){api.updateFlight(1/30,{...z,observe:true,brake:true});if(g.observationLatched&&g.task===before)api.updateFlight(1/30,{...z,brake:true});}
   if(g.task===before)throw Error('Observation failed '+c.id+' '+g.task+' '+g.canObserve);if(t.recording&&g.mode==='panel')api.closePanel();
  }
  return {chapter:g.chapter,observations:g.discovered.length,simulatedFlightSeconds:simulated};
 },chapter);
 log.push(result);console.log('encounter',result);
 await page.waitForTimeout(500);await page.screenshot({path:`tests/screenshots/journey-${chapter}.png`});
 if(chapter===3){assert.equal(await page.locator('#panel-title').textContent(),'Our distant home');await page.click('[data-action=resume]');}
 if(chapter<4){
  const transit=await page.evaluate(async()=>{
   const a=window.__cosmos,g=a.game,z=a.zeroInput;const {Vector3,Matrix4}=await import('three');a.beginTransit();let steps=0;
   g.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(g.player.position,g.transit.destination,new Vector3(0,1,0)));
   while(g.mode==='play'&&g.stage==='transit'&&steps++<20000){a.updateFlight(1/30,{...z,thrust:1});if(g.mode==='panel')throw Error('Collision during crossing');}
   return {steps,mode:g.mode,progress:g.transit.progress,distance:g.transit.length};
  });console.log('transit',transit);assert.equal(transit.mode,'transition');
  await page.waitForTimeout(1000);
 }else{await page.click('#depart');await page.waitForFunction(()=>document.getElementById('panel-title').textContent==='The journey continues');assert.equal(await page.locator('#panel-title').textContent(),'The journey continues');await page.screenshot({path:'tests/screenshots/ending.png'});}
}
await fs.writeFile('tests/journey-results.json',JSON.stringify({log,errors,audio:await page.evaluate(()=>window.__cosmos.audio.status())},null,2));
console.log('ERRORS',errors);assert.deepEqual(errors,[]);await browser.close();
