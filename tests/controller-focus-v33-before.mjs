import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 const browser=await engine.launch(options),page=await browser.newPage();
 try{
  await page.goto(BASE_URL+'/?test=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');await page.click('#pause-button');
  await page.evaluate(()=>{window.focusPad={connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[focusPad]});focusPad.buttons[13]={pressed:true,value:1};});
  await page.waitForFunction(()=>document.activeElement.dataset.action==='review');await page.waitForTimeout(200);
  outcomes.push({name,...await page.evaluate(()=>({device:window.__cosmos.input.device,action:document.activeElement.dataset.action,nativeFocus:document.activeElement.matches(':focus-visible'),outline:getComputedStyle(document.activeElement).outlineStyle,selectionMark:getComputedStyle(document.activeElement,'::before').opacity}))});
  await page.evaluate(()=>focusPad.buttons[13]={pressed:false,value:0});await page.click('[data-action=settings]');await page.click('[data-settings-tab=flight]');await page.locator('#sensitivity').focus();await page.keyboard.press('Tab');outcomes.at(-1).afterTab=await page.evaluate(()=>({id:document.activeElement.id,tag:document.activeElement.tagName}));
 }finally{await browser.close()}
}
await fs.writeFile('tests/controller-focus-v33-before.json',JSON.stringify({runtime:'Delivered v32 package',outcomes},null,2));console.log(outcomes);
