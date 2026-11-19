import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',args:['--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let release;const blocked=new Promise(done=>release=done);
 await page.route('**/assets/cruise.json',async route=>{await blocked;await route.continue();});
 await page.goto(BASE_URL+'/?test=1',{waitUntil:'domcontentloaded'});
 const stage=page.locator('#craft-stage');await stage.waitFor();assert.ok(await page.locator('#begin').isDisabled());assert.ok(await page.locator('#chapter-select').isDisabled());
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'craft-stage');
 const before=await stage.screenshot();await page.getByRole('button',{name:'Antenna',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#craft-title').textContent==='High-gain antenna');
 assert.ok(!before.equals(await stage.screenshot()),'model can be inspected while flight data remains unavailable');
 release();await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});assert.ok(await page.locator('#begin').isEnabled());
 assert.equal(await page.locator('#craft-title').textContent(),'High-gain antenna');assert.deepEqual(errors,[]);console.log('Interactive spacecraft precedes flight data; selection retained at handover.');
}finally{await browser.close();}
