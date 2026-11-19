import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const before=!!process.env.COSMOS_EXPECT_BEFORE,outcomes=[];
for(const [name,engine,options]of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_UI_ENGINE&&process.env.COSMOS_UI_ENGINE!==name)continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],states=[];
 page.on('pageerror',e=>errors.push(e.message));
 const clock=()=>page.evaluate(()=>{const g=window.__cosmos.game;return{paused:g.timePaused,rate:g.actualRate,seconds:g.localSeconds,position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),fuel:g.fuel,boundary:g.boundaryPaused};});
 const pressPad=async value=>{await page.evaluate(value=>window.testPad.buttons[1]={pressed:!!value,touched:!!value,value},value);await page.waitForTimeout(150);};
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');await page.waitForTimeout(150);
  await page.click('#review-button');await page.locator('#review-range').fill('0');await page.click('#review-apply');await page.waitForTimeout(100);
  const reviewed=await clock();assert.equal(reviewed.paused,true);assert.equal(reviewed.rate,0);
  await page.keyboard.down('Space');await page.waitForTimeout(150);const keyDown=await clock();assert.deepEqual(keyDown.position,reviewed.position);assert.deepEqual(keyDown.velocity,reviewed.velocity);assert.equal(keyDown.fuel,reviewed.fuel);assert.equal(keyDown.rate,0);
  await page.keyboard.up('Space');await page.waitForTimeout(180);const keyUp=await clock();
  if(before)assert.equal(keyUp.rate,0);else{assert.equal(keyUp.paused,false);assert.ok(keyUp.seconds>reviewed.seconds);assert.ok(keyUp.rate>0);}
  states.push({label:'review-keyboard',reviewed,keyDown,keyUp});
  // Start an independent pass so the old stuck clock does not leave a
  // single-frame history for the second regression.
  await page.evaluate(()=>window.__cosmos.startChapter(0));await page.waitForFunction(()=>window.__cosmos.game.localSeconds>1);
  // Repeat through the real review action, then use the standard Xbox B input.
  await page.click('#review-button');await page.locator('#review-range').fill('0');await page.click('#review-apply');await page.waitForTimeout(100);
  await page.evaluate(()=>{window.testPad={id:'Synthetic Xbox',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.testPad]});});
  const padReview=await clock();await pressPad(1);const padDown=await clock();assert.deepEqual(padDown.position,padReview.position);assert.equal(padDown.rate,0);await pressPad(0);const padUp=await clock();
  if(before)assert.equal(padUp.rate,0);else{assert.equal(padUp.paused,false);assert.ok(padUp.seconds>padReview.seconds);assert.ok(padUp.rate>0);}
  states.push({label:'review-gamepad',reviewed:padReview,down:padDown,up:padUp});
  // Back closes a panel, and its held press cannot leak into the flight below.
  await page.evaluate(()=>window.__cosmos.game.timePaused=true);await page.keyboard.press('Escape');await pressPad(1);assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'play');assert.equal((await clock()).paused,true);await pressPad(0);assert.equal((await clock()).paused,true);
  if(!before){
   await page.keyboard.press('Escape');await page.locator('.pause-menu [data-action=resume]').focus();await page.keyboard.press('Space');await page.waitForTimeout(100);
   assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'play');assert.equal((await clock()).paused,true);
  }
  // A boundary hold is a physical exploration limit, not a resumable clock.
  await page.evaluate(()=>{const g=window.__cosmos.game;g.boundaryPaused=true;g.proximityLimited=true;g.timePaused=false;});await page.keyboard.down('Space');await page.waitForTimeout(120);await page.keyboard.up('Space');await pressPad(1);await pressPad(0);const boundary=await clock();assert.equal(boundary.boundary,true);assert.equal(boundary.rate,0);
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),states,panelBackPreservesHold:true,nativeSpaceMenuActivation:!before,boundaryHoldPreserved:true,physicalControllerTested:false,errors,passed:true});
 }finally{await browser.close()}
 await fs.writeFile(`tests/time-resume-v37-${before?'before':'results'}.json`,JSON.stringify({version:before?'0.36.0':'0.37.0',outcomes},null,2));
}
