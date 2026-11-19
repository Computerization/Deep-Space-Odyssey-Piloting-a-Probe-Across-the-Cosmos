import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
const browser=await engine.launch(options);
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>{const g=window.__cosmos.game;return {fuel:g.fuel,feedback:g.thrustFeedback,acceleration:g.thrustAcceleration,seconds:g.localSeconds,rate:g.actualRate};});
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 await page.evaluate(()=>{const g=window.__cosmos.game;g.rateIndex=0;g.actualRate=1;g.chapterTime=30;});
 const before=await state();await page.keyboard.down('w');await page.waitForTimeout(800);const firing=await state();
 assert.equal(firing.feedback.state,'firing');assert.ok(firing.acceleration>1.08e-6&&firing.acceleration<1.11e-6);
 const rocketDelta=220*9.80665/1000*Math.log((711+before.fuel)/(711+firing.fuel));
 assert.ok(Math.abs(rocketDelta-firing.feedback.deltaV)<1e-10);assert.ok(firing.feedback.deltaV>0);
 assert.ok(await page.locator('#thrust-feedback').isVisible());assert.equal(await page.locator('#flight-hint').isVisible(),false);
 await page.screenshot({path:`tests/screenshots/v22-${name.toLowerCase()}-thrust-flight.png`});
 await page.keyboard.up('w');await page.waitForTimeout(150);assert.equal((await state()).feedback.state,'coasting');
 await page.waitForTimeout(2700);assert.equal(await page.locator('#thrust-feedback').isVisible(),false);
 await page.keyboard.down('Space');await page.waitForTimeout(80);const heldBefore=await state();await page.keyboard.down('w');await page.waitForTimeout(250);const held=await state();
 assert.equal(held.feedback.state,'held');assert.equal(held.feedback.deltaV,0);assert.equal(held.feedback.acceleration,0);assert.equal(held.fuel,heldBefore.fuel);assert.equal(held.seconds,heldBefore.seconds);
 await page.keyboard.up('w');await page.keyboard.up('Space');await page.keyboard.press('z');await page.keyboard.down('w');await page.waitForTimeout(180);const fine=await state();
 assert.ok(fine.acceleration>2.16e-7&&fine.acceleration<2.22e-7);await page.keyboard.up('w');await page.keyboard.press('z');
 await page.evaluate(()=>{window.testPad={id:'Synthetic Xbox test',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.testPad]});});
 await page.waitForTimeout(100);await page.evaluate(()=>window.testPad.buttons[7]={value:.5,pressed:true,touched:true});await page.waitForTimeout(300);const analog=await state();
 assert.ok(analog.acceleration>5.40e-7&&analog.acceleration<5.56e-7);
 await page.setViewportSize({width:800,height:600});await page.screenshot({path:`tests/screenshots/v22-${name.toLowerCase()}-thrust-compact.png`});
 const fits=await page.locator('#thrust-feedback').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;});assert.ok(fits);
 await page.evaluate(()=>{window.testPad.buttons[7]={value:0,pressed:false,touched:false};const a=window.__cosmos;a.flightHistory.restore(a.game,0);});await page.waitForTimeout(100);assert.equal(await page.locator('#thrust-feedback').isVisible(),false);
 await page.evaluate(()=>{const a=window.__cosmos;a.game.fuel=0;a.game.timePaused=false;});await page.keyboard.down('w');await page.waitForTimeout(150);const empty=await state();assert.equal(empty.feedback.state,'empty');assert.equal(empty.feedback.deltaV,0);await page.keyboard.up('w');
 await page.evaluate(()=>window.__cosmos.beginTransit());await page.waitForTimeout(100);assert.equal(await page.locator('#thrust-feedback').isVisible(),false);
 assert.deepEqual(errors,[]);
 const report={name,engineVersion:browser.version(),version:'0.22.0',physicalImpulseMatchesFuel:true,oneTimesFeedback:firing,heldTimeDeliversNoImpulse:true,fineAcceleration:fine.acceleration,syntheticXboxHalfTriggerAcceleration:analog.acceleration,releasesToCoastThenClears:true,reviewClearsOldBurn:true,exhaustedFuelReported:true,passageHidesLocalThrust:true,compactFits:fits,errors};
 outcomes.push(report);console.log({name,passed:true,acceleration:firing.acceleration});
}finally{await browser.close();}

await fs.writeFile('tests/thrust-feedback-v22-results.json',JSON.stringify({version:'0.22.0',outcomes},null,2));
}
