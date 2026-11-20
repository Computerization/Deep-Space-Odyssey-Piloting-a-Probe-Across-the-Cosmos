import assert from 'node:assert/strict';
import {chromium,BASE_URL} from './browser.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true,args:process.platform==='darwin'?['--use-angle=metal','--ignore-gpu-blocklist']:[]});
const errors=[];
try{
 const page=await browser.newPage({locale:'en-US',viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE_URL+'/?test=1',{waitUntil:'commit'});await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});
 await page.click('#begin');await page.keyboard.press('n');await page.waitForFunction(()=>__cosmos.game.stage==='encounter');
 await page.evaluate(()=>{__cosmos.game.timePaused=true});await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>__cosmos.game.view),'chase');
 assert.ok(await page.evaluate(()=>!!__cosmos.world.ship));
 assert.match(await page.locator('#flight-keys').textContent(),/C · View/);
 await page.screenshot({path:'tests/screenshots/v114-earth-third.png'});
 const physical=()=>page.evaluate(()=>{let p=__cosmos.game.player;return JSON.stringify([p.position.toArray(),p.velocity.toArray(),p.quaternion.toArray()])});
 const pose=await physical();await page.keyboard.press('c');assert.equal(await page.evaluate(()=>__cosmos.game.view),'probe');assert.equal(await physical(),pose);
 await page.screenshot({path:'tests/screenshots/v114-earth-first.png'});
 await page.keyboard.press('k');await page.waitForSelector('#camera-probe');assert.equal(await page.locator('#camera-probe').textContent(),'First person');assert.equal(await page.locator('#camera-chase').textContent(),'Third person');
 await page.click('#camera-chase');assert.equal(await physical(),pose);await page.keyboard.press('Escape');
 await page.keyboard.press('i');await page.waitForSelector('#gravity-time');const a=await page.locator('#gravity-fall').textContent();await page.locator('#gravity-time').fill('60');const b=await page.locator('#gravity-fall').textContent();assert.notEqual(a,b);await page.keyboard.press('Escape');
 for(const [chapter,name] of [[1,'jupiter'],[2,'saturn']]){
  await page.evaluate(c=>{__cosmos.startChapter(c);__cosmos.game.view='chase';__cosmos.game.timePaused=true},chapter);await page.waitForTimeout(700);await page.screenshot({path:`tests/screenshots/v114-${name}-third.png`});
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(300);await page.screenshot({path:`tests/screenshots/v114-${name}-turning.png`});await page.keyboard.up('ArrowRight');await page.waitForTimeout(100);
 }
 await page.evaluate(()=>{__cosmos.startChapter(1);__cosmos.game.view='chase';__cosmos.game.timePaused=false});
 await page.keyboard.press('l');const orbitStart=await page.evaluate(()=>__cosmos.game.player.position.toArray());await page.keyboard.down('a');await page.waitForTimeout(650);await page.screenshot({path:'tests/screenshots/v114-jupiter-circling.png'});await page.keyboard.up('a');assert.notDeepEqual(await page.evaluate(()=>__cosmos.game.player.position.toArray()),orbitStart);
 await page.setViewportSize({width:800,height:600});await page.waitForTimeout(250);const bounds=await page.locator('#flight-keys').boundingBox();assert.ok(bounds.x+bounds.width<=800&&bounds.y+bounds.height<=600);await page.screenshot({path:'tests/screenshots/v114-compact.png'});await page.setViewportSize({width:1440,height:900});
 await page.evaluate(()=>{__cosmos.startChapter(0);__cosmos.game.view='probe';__cosmos.beginTransit(0,{chapter:1,study:null,name:'Jupiter'});__cosmos.game.timePaused=true;__cosmos.game.transit.progress=.5;__cosmos.updateFlight(0,__cosmos.zeroInput)});
 await page.waitForTimeout(400);assert.ok(await page.locator('#passage-chart').isHidden());assert.match(await page.locator('#passage-caption').textContent(),/gravity/);
 assert.equal(await page.evaluate(()=>__cosmos.world.lastRender.options.view),'chase');
 await page.screenshot({path:'tests/screenshots/v114-transit-middle.png'});
 await page.keyboard.press('n');await page.waitForFunction(()=>__cosmos.game.stage==='encounter'&&__cosmos.game.chapter===1);assert.equal(await page.evaluate(()=>__cosmos.game.view),'probe');
 assert.deepEqual(errors,[]);console.log('Chrome: views, pose preservation, gravity experiment, 3D passage and skip passed');
}finally{await browser.close()}
