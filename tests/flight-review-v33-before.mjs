import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),page=await browser.newPage({viewport:{width:1280,height:800}});
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 const before=await page.evaluate(()=>{
  const a=window.__cosmos,g=a.game,w=a.world,h=a.flightHistory;a.startChapter(0);g.mode='panel';g.timePaused=true;w.setFov(58);h.reset(g);
  for(const [seconds,fov]of [[1000,18],[9900,42],[10000,22]]){g.localSeconds=seconds;w.setFov(fov);h.record(g,1,true);}
  g.player.quaternion.setFromAxisAngle(g.angular.clone().set(0,1,0),.2);g.angular.set(0,0,0);const current=g.player.quaternion.toArray();g.mode='play';a.flightReview.open();
  return {current,preview:g.reviewPreview.quaternion.toArray(),times:h.samples.map(s=>s.seconds),rangeMaximum:Number(document.getElementById('review-range').max),fovStored:h.samples.map(s=>s.fov??null)};
 });
 await page.locator('#review-range').fill('1');const observed=await page.evaluate(()=>({time:document.getElementById('review-time').textContent,previewFov:window.__cosmos.world.camera.fov}));
 assert.notDeepEqual(before.current,before.preview);assert.equal(before.rangeMaximum,3);assert.equal(observed.previewFov,22);
 const report={version:'0.32.0',heldCameraJumps:before,expectedHistoricalFov:18,observed};await fs.writeFile('tests/flight-review-v33-before.json',JSON.stringify(report,null,2));console.log(report);
 await page.screenshot({path:'tests/screenshots/v33-review-before.png'});
}finally{await browser.close()}
