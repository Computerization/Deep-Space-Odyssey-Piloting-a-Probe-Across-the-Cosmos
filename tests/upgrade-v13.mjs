import {chromium} from './browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=(await fs.readFile('/private/tmp/cosmos-upgrade-root.txt','utf8')).trim();
assert.ok(root.includes('cosmos-v13-upgrade-'));
const sw=await fs.readFile('sw.js','utf8');const files=[...sw.split('const FILES=')[1].split(';')[0].matchAll(/'([^']+)'/g)].map(m=>m[1]).filter(p=>p!=='./');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 console.log('loading old version');await page.goto('http://127.0.0.1:4190/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});
 assert.equal(await page.locator('#review-button').count(),0);
 await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});await page.waitForFunction(()=>navigator.serviceWorker.controller);
 assert.ok((await page.evaluate(()=>caches.keys())).includes('cosmos-physical-v12'));
 console.log('old cache ready');for(const file of [...files,'sw.js']){await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.copyFile(file,path.join(root,file));}
 await page.evaluate(async()=>{const changed=new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));const r=await navigator.serviceWorker.getRegistration();await r.update();await changed;});
 await page.waitForFunction(async()=>{const keys=await caches.keys();return keys.includes('cosmos-exploration-v13')&&!keys.includes('cosmos-physical-v12');},{},{timeout:90000});
 // Simulate a late v12 request recreating a stale cache after activation.
 await page.evaluate(async()=>{const stale=await caches.open('cosmos-physical-v12');await stale.put('./',new Response('<html><body>STALE VERSION</body></html>',{headers:{'Content-Type':'text/html'}}));});
 console.log('new cache ready');await context.setOffline(true);await page.reload();await page.waitForFunction(()=>!!window.__cosmos,null,{timeout:90000});console.log('after reload',await page.evaluate(()=>({keys:Object.keys(window.__cosmos),review:!!document.getElementById('review-button'),href:location.href})));assert.equal(await page.evaluate(()=>!!window.__cosmos.flightHistory),true);await page.click('#begin');assert.ok(await page.locator('#review-button').isVisible());
 const keys=await page.evaluate(()=>caches.keys());assert.deepEqual(errors,[]);
 const report={previous:'0.12.0',current:'0.13.0',oldCacheRemovedAtActivation:true,lateStaleCacheIsolated:true,newCache:keys,offlineReload:true,flightReviewVisible:true,errors};await fs.writeFile('tests/upgrade-v13-results.json',JSON.stringify(report,null,2));console.log(report);
}catch(error){console.log({errors,diagnostics:await page.evaluate(async()=>({fatal:document.getElementById('fatal-message')?.textContent,hasApi:!!window.__cosmos,apiKeys:Object.keys(window.__cosmos||{}),keys:await caches.keys(),scripts:[...document.scripts].map(s=>s.src),mainHasHistory:(await(await fetch('/src/main.js')).text()).includes('FlightHistory')}))});throw error;}finally{await browser.close();}
