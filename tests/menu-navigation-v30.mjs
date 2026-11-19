import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const active=()=>page.evaluate(()=>({id:document.activeElement.id,action:document.activeElement.dataset.action,value:document.activeElement.dataset.value}));
const pad=async n=>{
 await page.evaluate(n=>window.testPad.buttons[n]={value:1,pressed:true,touched:true},n);await page.waitForTimeout(70);
 await page.evaluate(n=>window.testPad.buttons[n]={value:0,pressed:false,touched:false},n);await page.waitForTimeout(70);
};
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');await page.click('#pause-button');
 const before=await page.evaluate(()=>{const g=window.__cosmos.game;return {p:g.player.position.toArray(),v:g.player.velocity.toArray(),rate:g.rateIndex,view:g.view,fuel:g.fuel};});
 assert.equal((await active()).action,'resume');await page.keyboard.press('ArrowDown');assert.equal((await active()).action,'review');
 await page.keyboard.press('ArrowDown');assert.equal((await active()).action,'map');await page.keyboard.press('Enter');assert.equal(await page.locator('#panel').getAttribute('data-view'),'map');
 for(const key of ['c','h','z','n','p','g','v'])await page.keyboard.press(key);
 const after=await page.evaluate(()=>{const g=window.__cosmos.game;return {p:g.player.position.toArray(),v:g.player.velocity.toArray(),rate:g.rateIndex,view:g.view,fuel:g.fuel};});
 assert.deepEqual(after,before);
 await page.keyboard.press('End');const last=await active();assert.equal(last.action,'depart');await page.keyboard.press('Tab');assert.equal((await active()).id,'panel-close');await page.keyboard.press('Shift+Tab');assert.deepEqual(await active(),last);
 await page.keyboard.press('Escape');await page.click('#pause-button');await page.click('[data-action=settings]');
 await page.focus('#volume');const volume=Number(await page.inputValue('#volume'));await page.keyboard.press('ArrowRight');assert.ok(Number(await page.inputValue('#volume'))>volume);
 await page.evaluate(()=>{window.testPad={id:'Synthetic Xbox test',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.testPad]});});
 const oldVolume=Number(await page.inputValue('#volume'));await pad(15);assert.ok(Number(await page.inputValue('#volume'))>oldVolume);
 await pad(13);assert.equal((await active()).id,'feedback');await pad(12);assert.equal((await active()).id,'volume');
 await page.focus('#quality');const quality=await page.locator('#quality').evaluate(el=>el.selectedIndex);await pad(15);assert.equal(await page.locator('#quality').evaluate(el=>el.selectedIndex),Math.min(quality+1,3));
 await page.focus('#settings-sound');const wasMuted=await page.evaluate(()=>window.__cosmos.audio.muted);await pad(0);assert.equal(await page.evaluate(()=>window.__cosmos.audio.muted),!wasMuted);assert.equal(await page.locator('#settings-sound').getAttribute('aria-pressed'),String(wasMuted));await pad(0);
 await pad(1);assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'play');
 await pad(9);assert.equal((await active()).action,'resume');await pad(13);assert.equal((await active()).action,'review');await pad(0);assert.equal(await page.locator('#panel').getAttribute('data-view'),'review');await pad(1);assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'play');
 await page.click('#map-button');await page.locator('[data-action=study]').first().click();await page.evaluate(()=>window.__cosmos.game.timePaused=true);
 await page.click('#map-button');await page.screenshot({path:'tests/screenshots/v30-encounter-final.png'});
 const hiddenFocus=[];for(let i=0;i<20;i++){await pad(13);hiddenFocus.push(await page.evaluate(()=>!!document.activeElement.closest('details:not([open])')&&!document.activeElement.matches('summary')));}assert.ok(hiddenFocus.every(v=>!v));
 await page.setViewportSize({width:1024,height:640});await page.click('#panel-close');await page.click('#pause-button');
 const fit=await page.locator('.pause-menu button').evaluateAll(es=>es.every(el=>el.getBoundingClientRect().bottom<=innerHeight));assert.ok(fit);
 assert.deepEqual(errors,[]);
 const report={version:'0.30.0',keyboardArrows:true,nativeRangeKeys:true,tabFocusTrap:true,flightShortcutsDoNotChangePausedFlight:true,syntheticXboxNavigation:true,controllerRangesAndSelects:true,controllerSoundToggle:true,controllerReviewAndCancellation:true,closedDetailsSkipped:true,compactPauseFits:true,physicalXboxTested:false,errors};
 await fs.writeFile('tests/menu-navigation-v30-results.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}
