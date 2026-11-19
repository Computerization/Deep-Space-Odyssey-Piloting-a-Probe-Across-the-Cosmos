import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_FOCUS_ENGINE&&process.env.COSMOS_FOCUS_ENGINE!==name)continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'begin');await page.click('#begin');await page.click('#pause-button');
  await page.evaluate(()=>{window.focusPad={connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[focusPad]});});
  const press=async i=>{await page.evaluate(i=>focusPad.buttons[i]={pressed:true,value:1},i);await page.waitForTimeout(100);await page.evaluate(i=>focusPad.buttons[i]={pressed:false,value:0},i);await page.waitForTimeout(100);};
  await press(13);
  const pause=await page.evaluate(()=>({action:document.activeElement.dataset.action,nativeFocus:document.activeElement.matches(':focus-visible'),selectionMark:Number(getComputedStyle(document.activeElement,'::before').opacity),gamepad:document.documentElement.classList.contains('gamepad-nav')}));
  assert.equal(pause.action,'review');assert.equal(pause.selectionMark,1);assert.equal(pause.gamepad,true);await page.screenshot({path:`tests/screenshots/v33-${name.toLowerCase()}-controller-pause.png`});
  await page.click('[data-action=settings]');assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('gamepad-nav')),false);
  await press(13);assert.equal(await page.evaluate(()=>document.activeElement.dataset.settingsTab),'picture');
  const tab=await page.evaluate(()=>({outline:getComputedStyle(document.activeElement).outlineStyle,width:getComputedStyle(document.activeElement).outlineWidth}));assert.equal(tab.outline,'solid');assert.equal(tab.width,'1px');
  await press(15);assert.equal(await page.evaluate(()=>document.activeElement.dataset.settingsTab),'flight');await press(13);assert.equal(await page.evaluate(()=>document.activeElement.id),'sensitivity');
  const range=await page.evaluate(()=>({outline:getComputedStyle(document.activeElement.closest('.setting-range')).outlineStyle,value:Number(document.activeElement.value)}));assert.equal(range.outline,'solid');await press(15);assert.ok(Number(await page.locator('#sensitivity').inputValue())>range.value);
  await page.screenshot({path:`tests/screenshots/v33-${name.toLowerCase()}-controller-settings.png`});
  // Native keyboard focus resumes normally when the player changes device.
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('gamepad-nav')),false);const keyboard=await page.evaluate(()=>({id:document.activeElement.id,tag:document.activeElement.tagName,native:document.activeElement.matches(':focus-visible'),outline:getComputedStyle(document.activeElement).outlineStyle,html:document.activeElement.outerHTML.slice(0,180)}));assert.equal(keyboard.id,'flight-precision',JSON.stringify(keyboard));assert.equal(keyboard.native,true,JSON.stringify(keyboard));
  await press(1);await press(9);assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'resume');assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('gamepad-nav')),true);
  await page.click('[data-action=guide]');assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('gamepad-nav')),false);await press(13);
  const reference=await page.evaluate(()=>({tag:document.activeElement.tagName,outline:getComputedStyle(document.activeElement).outlineStyle,gamepad:document.documentElement.classList.contains('gamepad-nav')}));assert.equal(reference.outline,'solid');assert.equal(reference.gamepad,true);
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),pause,tab,range,reference,pointerClearsControllerFocus:true,keyboardRestoresNativeFocus:true,landingAndPanelTabOrder:true,physicalXboxTested:false,errors});console.log({name,passed:true});
 }finally{await browser.close()}
}
await fs.writeFile('tests/controller-focus-v33-results.json',JSON.stringify({version:'0.33.0',outcomes},null,2)+'\n');
