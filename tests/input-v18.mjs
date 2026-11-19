import {chromium,BASE_URL} from './browser.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),page=await b.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 // Dispatch within the same task as the scene change: no neutral frame first.
 const immediate=await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(2);a.game.timePaused=true;const before=a.game.player.quaternion.toArray();document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowRight',bubbles:true}));return before;});
 await page.waitForTimeout(100);await page.keyboard.up('ArrowRight');const turned=await page.evaluate(()=>window.__cosmos.game.player.quaternion.toArray());assert.notDeepEqual(turned,immediate);
 await page.evaluate(()=>{window.pad={connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.pad]});});
 await page.click('#pause-button');
 await page.evaluate(()=>{pad.buttons[7]={pressed:true,value:1};pad.buttons[0]={pressed:true,value:1};});
 await page.waitForFunction(()=>window.__cosmos.game.mode==='play');
 const held=await page.evaluate(()=>({fuel:window.__cosmos.game.fuel,time:window.__cosmos.game.localSeconds,photo:window.__cosmos.game.observing}));
 await page.evaluate(()=>{pad.axes[2]=.7;});await page.waitForTimeout(160);
 const after=await page.evaluate(()=>({fuel:window.__cosmos.game.fuel,time:window.__cosmos.game.localSeconds,photo:window.__cosmos.game.observing,q:window.__cosmos.game.player.quaternion.toArray()}));assert.equal(after.fuel,held.fuel);assert.equal(after.time,held.time);assert.equal(after.photo,0);assert.notDeepEqual(after.q,turned);
 await page.evaluate(()=>{pad.buttons[7]={pressed:false,value:0};pad.buttons[0]={pressed:false,value:0};pad.axes[2]=0;});await page.waitForTimeout(60);
 await page.click('#time-toggle');await page.evaluate(()=>{pad.buttons[7]={pressed:true,value:1};});await page.waitForTimeout(200);assert.ok(await page.evaluate(()=>window.__cosmos.game.fuel)<held.fuel);
 assert.deepEqual(errors,[]);const report={firstTurnBeforeNeutralFrame:true,heldTriggerBlockedAfterMenu:true,newStickWhileTriggerHeld:true,menuSelectionDoesNotPhotograph:true,triggerRearmsAfterRelease:true,physicalXboxTested:false,errors};await fs.writeFile('tests/input-v18-results.json',JSON.stringify(report,null,2));console.log(report);
}finally{await b.close();}
