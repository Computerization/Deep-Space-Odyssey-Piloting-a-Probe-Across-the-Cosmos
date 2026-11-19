import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(`${BASE_URL}/?test=1`);await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');await page.waitForTimeout(700);
// A turning view must never expose a sharp photograph.
const blocked=await page.evaluate(()=>{const a=window.__cosmos;for(let i=0;i<150;i++)a.updateFlight(1/30,{...a.zeroInput,yaw:.02,observe:true});return a.game.task;});assert.equal(blocked,0);
await page.evaluate(()=>window.__cosmos.startChapter(0));await page.waitForTimeout(500);await page.keyboard.down('x');await page.waitForTimeout(3400);await page.keyboard.up('x');assert.equal(await page.evaluate(()=>window.__cosmos.game.task),1);
// Resume the actual position, attitude, velocity and lens, then reload the stored photograph.
await page.evaluate(()=>{const a=window.__cosmos;a.game.player.position.add(a.game.frame.x.clone().multiplyScalar(500));a.game.player.velocity.set(0,0,0);a.world.setFov(42);});
await page.keyboard.press('Escape');const encounter=await page.evaluate(()=>({position:window.__cosmos.game.player.position.toArray(),attitude:window.__cosmos.game.player.quaternion.toArray()}));
await page.reload();await page.waitForFunction(()=>window.__cosmos);await page.click('#continue');await page.waitForTimeout(500);
const restored=await page.evaluate(()=>({position:window.__cosmos.game.player.position.toArray(),attitude:window.__cosmos.game.player.quaternion.toArray(),fov:window.__cosmos.world.camera.fov}));assert.deepEqual(restored.position,encounter.position);assert.ok(restored.attitude.every((value,i)=>Math.abs(value-encounter.attitude[i])<1e-12),'Restored attitude matches within floating-point normalisation precision');assert.equal(restored.fov,42);
await page.keyboard.press('j');await page.waitForFunction(()=>document.querySelector('.gallery img')?.naturalWidth>0);assert.equal(await page.locator('.gallery figure').count(),1);await page.screenshot({path:'tests/screenshots/rebuild-gallery.png'});await page.keyboard.press('Escape');
// Historical recordings decode, play, duck the score, and stop when dismissed.
const recordings=[];
for(const [chapter,task,name]of [[1,2,'jupiter'],[4,0,'plasma']]){
 await page.evaluate(({chapter,task})=>{const a=window.__cosmos;a.startChapter(chapter,task);a.recordObservation();},{chapter,task});
 await page.waitForFunction(()=>document.getElementById('historic-media')?.currentTime>.3);
 const media=await page.evaluate(()=>{const m=document.getElementById('historic-media');window.__previousMedia=m;return{duration:m.duration,readyState:m.readyState,currentTime:m.currentTime,ducked:window.__cosmos.audio.ducked};});
 assert.ok(media.readyState>=3&&media.ducked&&media.duration>7);recordings.push({name,...media});await page.screenshot({path:`tests/screenshots/recording-${name}.png`});await page.click('[data-action=resume]');assert.ok(await page.evaluate(()=>window.__previousMedia.paused&&!window.__cosmos.audio.ducked));
}
// The journal can replay records after the observation has finished.
await page.keyboard.press('j');await page.waitForSelector('[data-value=jupiter]');await page.click('[data-value=jupiter]');await page.waitForFunction(()=>document.getElementById('historic-media')?.currentTime>.1);await page.keyboard.press('Escape');
// Save in the middle of a crossing, retaining both spatial and historical progress.
await page.evaluate(async()=>{const a=window.__cosmos,{CHAPTERS}=await import('./src/mission.js');a.startChapter(0,CHAPTERS[0].tasks.length);a.beginTransit();a.game.player.position.lerpVectors(a.game.transit.from,a.game.transit.destination,.42);a.game.player.velocity.set(0,0,0);a.updateFlight(1/60,a.zeroInput);a.world.setFov(46);});
await page.keyboard.press('Escape');const transit=await page.evaluate(()=>({position:window.__cosmos.game.player.position.toArray(),progress:window.__cosmos.game.transit.progress,earth:window.__cosmos.world.bodyPositions.earth.toArray()}));
await page.reload();await page.waitForFunction(()=>window.__cosmos);await page.click('#continue');await page.waitForTimeout(500);
const crossing=await page.evaluate(()=>({stage:window.__cosmos.game.stage,position:window.__cosmos.game.player.position.toArray(),progress:window.__cosmos.game.transit.progress,earth:window.__cosmos.world.bodyPositions.earth.toArray(),fov:window.__cosmos.world.camera.fov}));
assert.equal(crossing.stage,'transit');assert.deepEqual(crossing.position,transit.position);assert.ok(Math.abs(crossing.progress-transit.progress)<1e-8);assert.deepEqual(crossing.earth,transit.earth);assert.equal(crossing.fov,46);await page.screenshot({path:'tests/screenshots/rebuild-cruise.png'});
await page.keyboard.press('Escape');await page.click('[data-action=home]');await page.click('#begin');assert.deepEqual(await page.evaluate(()=>window.__cosmos.game.discovered),[]);
assert.deepEqual(errors,[]);const results={stableExposureGuard:true,photographPersists:true,exactEncounterResume:true,exactTransitResume:true,recordings,journalReplay:true,newVoyageResetsDiscoveries:true,errors};await fs.writeFile('tests/rebuild-regression-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();
