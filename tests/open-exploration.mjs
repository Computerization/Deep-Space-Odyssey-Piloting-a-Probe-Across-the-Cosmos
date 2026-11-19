import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');
 await page.waitForTimeout(500);
 // Enter/Observe must never depart automatically after the last optional observation.
 await page.evaluate(()=>{const a=window.__cosmos;a.game.task=3;a.game.discovered=['earth-0','earth-1','earth-2'];});
 await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.__cosmos.game.stage),'encounter');
 await page.evaluate(()=>{const a=window.__cosmos;a.game.discovered=[];a.startChapter(0);});
 const pose=()=>page.evaluate(()=>{const p=window.__cosmos.game.player;return [p.position.toArray(),p.quaternion.toArray(),p.velocity.toArray()];});
 await page.keyboard.press('m');const before=await pose();
 await page.screenshot({path:'tests/screenshots/v7-local-map.png'});
 await page.click('button[data-action=destination][data-value=moon]');
 assert.deepEqual(await pose(),before,'choosing a bearing never moves or steers the spacecraft');
 await page.keyboard.press('g');await page.waitForTimeout(100);
 assert.equal(await page.locator('#waypoint').isVisible(),false);
 await page.keyboard.down('d');await page.waitForTimeout(700);await page.keyboard.up('d');
 const speed=await page.evaluate(()=>window.__cosmos.game.player.velocity.length());assert.ok(speed>1);
 const coast=await page.evaluate(()=>{const a=window.__cosmos,g=a.game;g.angular.set(0,0,0);const v=g.player.velocity.toArray(),q=g.player.quaternion.toArray();for(let i=0;i<30;i++)a.updateFlight(1/30,a.zeroInput);return {v,q,afterV:g.player.velocity.toArray(),afterQ:g.player.quaternion.toArray()};});
 assert.deepEqual(coast.v,coast.afterV);assert.deepEqual(coast.q,coast.afterQ);
 // Deliberately choose the third suggestion first and expose far outside its old waypoint sphere.
 await page.keyboard.press('m');await page.locator('.observation-list summary').click();await page.click('[data-action=suggestion][data-value="2"]');
 const outOfOrder=await page.evaluate(async()=>{
  const a=window.__cosmos,g=a.game,w=a.world,{Vector3,Matrix4}=await import('three');g.view='probe';g.rateIndex=0;g.look.identity();g.player.velocity.set(0,0,0);
  g.player.position.copy(w.fromFrame(w.getFrame('earth'),[5,1,7],6371));g.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(g.player.position,w.bodyPositions.earth,new Vector3(0,1,0)));
  const distanceFromSuggestion=g.player.position.distanceTo(a.taskPoint());
  for(let i=0;i<105;i++)a.updateFlight(1/30,{...a.zeroInput,observe:true});
  return {distanceFromSuggestion,oldRadius:6371*1.2,discovered:[...g.discovered],next:g.task};
 });assert.ok(outOfOrder.distanceFromSuggestion>outOfOrder.oldRadius);assert.deepEqual(outOfOrder.discovered,['earth-2']);assert.equal(outOfOrder.next,0);
 // Render and record an independent Moon view, with no active survey or mission waypoint.
 const field=await page.evaluate(async()=>{
  window.__cosmos.updateFlight(1/30,window.__cosmos.zeroInput); // Release Observe before the next independent exposure.
  const a=window.__cosmos,g=a.game,w=a.world,{Vector3,Matrix4}=await import('three');g.guidance=false;g.destination=null;g.player.velocity.set(0,0,0);
  g.player.position.copy(w.fromFrame(w.getFrame('moon'),[2.4,.3,2.7],1737.4));g.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(g.player.position,w.bodyPositions.moon,new Vector3(0,1,0)));w.setFov(38);
  for(let i=0;i<105;i++)a.updateFlight(1/30,{...a.zeroInput,observe:true});
  return {explored:[...g.explored],task:g.task};
 });assert.equal(field.explored.length,1);assert.match(field.explored[0],/^explore-moon-/);assert.equal(field.task,0);
 await page.waitForTimeout(500);await page.screenshot({path:'tests/screenshots/v7-free-moon.png'});
 await page.keyboard.press('m'); // pause persists position, guidance and discovery
 const savedPose=await pose();await page.reload();await page.waitForFunction(()=>window.__cosmos);await page.click('#continue');
 assert.deepEqual(await pose(),savedPose);assert.equal(await page.evaluate(()=>window.__cosmos.game.guidance),false);
 assert.deepEqual(await page.evaluate(()=>window.__cosmos.game.explored),field.explored);
 await page.keyboard.press('j');await page.waitForSelector('.field-caption');await page.screenshot({path:'tests/screenshots/v7-exploration-journal.png'});await page.click('#panel-close');
 // Soft boundary and coasting: no turn, reposition or route failure beyond the map.
 const boundary=await page.evaluate(()=>{
  const a=window.__cosmos,g=a.game,w=a.world;g.player.position.copy(w.bodyPositions.earth).addScalar(2e6);g.player.velocity.set(3,0,0);g.rateIndex=0;g.angular.set(0,0,0);const before=g.player.position.clone(),attitude=g.player.quaternion.toArray();a.updateFlight(1/30,a.zeroInput);
  return {outside:a.exploration.region().outside,delta:g.player.position.clone().sub(before).toArray(),attitude,after:g.player.quaternion.toArray(),mode:g.mode};
 });assert.equal(boundary.outside,true);assert.ok(Math.abs(boundary.delta[0]-.1)<1e-6);assert.deepEqual(boundary.attitude,boundary.after);assert.equal(boundary.mode,'play');
 // A fresh encounter permits departure with zero completed observations.
 await page.evaluate(()=>{const a=window.__cosmos;a.game.discovered=[];a.startChapter(1);a.game.player.velocity.set(0,0,0);});
 await page.keyboard.press('m');await page.click('[data-action=depart]');
 assert.equal(await page.evaluate(()=>window.__cosmos.game.stage),'transit');assert.deepEqual(await page.evaluate(()=>window.__cosmos.game.discovered),[]);
 assert.deepEqual(errors,[]);
 const result={bearingPreservesPose:true,manualCoast:true,outOfOrder,field,saveRestored:true,softBoundary:boundary.outside,unlockedDeparture:true,errors};
 await fs.writeFile('tests/open-exploration-results.json',JSON.stringify(result,null,2)+'\n');console.log(result);
} finally {await browser.close();}
