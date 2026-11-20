import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const sw=await fs.readFile('sw.js','utf8'),version=/const VERSION='([^']+)'/.exec(sw)[1];
const paths=[...sw.split('const FILES=')[1].split(';')[0].matchAll(/'([^']+)'/g)].map(m=>m[1]).filter(p=>p!=='./');
const expected=Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await fs.readFile(p)).digest('hex')])));
const extracted=process.env.COSMOS_PACKAGE_ROOT;assert.ok(extracted,'Test an independently extracted archive');
assert.notEqual(path.resolve(extracted),process.cwd());
const manifest=JSON.parse(await fs.readFile(path.join(extracted,'MANIFEST.sha256.json'),'utf8'));
for(const [name,h] of Object.entries(expected)){assert.equal(manifest[name],h,name);assert.equal(createHash('sha256').update(await fs.readFile(path.join(extracted,name))).digest('hex'),h,name);}
const browser=await chromium.launch({channel:'chrome',headless:true,args:process.platform==='darwin'?['--use-angle=metal','--ignore-gpu-blocklist']:[]});
const errors=[],external=[];
try{
 const context=await browser.newContext({locale:'en-US',viewport:{width:1440,height:900}}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(BASE_URL+'/'))external.push(r.url())});
 await page.goto(BASE_URL+'/?test=1',{waitUntil:'commit'});await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});
 await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await page.waitForFunction(async({version,count})=>{const c=await caches.open(version);return(await c.keys()).length>=count;},{version,count:paths.length+1});
 await context.setOffline(true);await page.reload({waitUntil:'commit'});await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});
 const actual=await page.evaluate(async paths=>Object.fromEntries(await Promise.all(paths.map(async p=>{const r=await fetch(p);if(!r.ok)throw Error(p+' '+r.status);const d=await crypto.subtle.digest('SHA-256',await r.arrayBuffer());return[p,[...new Uint8Array(d)].map(n=>n.toString(16).padStart(2,'0')).join('')]}))),paths);
 assert.deepEqual(actual,expected);assert.deepEqual(external,[]);
 await page.locator('#craft-views').getByRole('button',{name:'Antenna',exact:true}).click();assert.equal(await page.locator('#craft-title').textContent(),'High-gain antenna');
 await page.click('#begin');await page.waitForFunction(()=>!!document.pointerLockElement&&document.querySelector('#launch-film').readyState>=2);await page.screenshot({path:'tests/screenshots/offline-launch.png'});await page.keyboard.press('n');await page.waitForFunction(()=>__cosmos.game.stage==='encounter'&&__cosmos.game.mode==='play');
 const before=await page.evaluate(()=>__cosmos.game.player.position.toArray());await page.keyboard.down('w');await page.waitForFunction(p=>__cosmos.game.player.position.distanceTo({x:p[0],y:p[1],z:p[2]})>100,before,{timeout:10000});await page.keyboard.up('w');
 assert.ok(await page.evaluate(p=>__cosmos.game.player.position.distanceTo({x:p[0],y:p[1],z:p[2]})>100,before));
 await page.keyboard.press('p');await page.waitForFunction(()=>__cosmos.archive.memory.size>0);
 // Software-mapped Xbox input: actual controller feel still needs hardware.
 await page.evaluate(()=>{window.testPad={connected:true,axes:[.9,0,0,0],buttons:Array.from({length:16},()=>({value:0,pressed:false}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.testPad]})});
 await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>__cosmos.input.device),'gamepad');assert.ok((await page.locator('#flight-keys').textContent()).includes('RT / LT'));
 await page.evaluate(()=>testPad.axes.fill(0));
 await page.keyboard.press('n');await page.waitForFunction(()=>__cosmos.game.stage==='encounter'&&__cosmos.game.chapter===1,null,{timeout:20000});
 await page.setViewportSize({width:1024,height:640});const bounds=await page.locator('#depart').boundingBox();assert.ok(bounds.y+bounds.height<=640);await page.screenshot({path:'tests/screenshots/offline-jupiter.png'});
 const range=await page.evaluate(async()=>{const r=await fetch('assets/archive/interstellar-plasma-compact.mp4',{headers:{Range:'bytes=0-1023'}});return{status:r.status,bytes:(await r.arrayBuffer()).byteLength}});assert.deepEqual(range,{status:206,bytes:1024});
 assert.deepEqual(errors,[]);await fs.writeFile(process.env.COSMOS_PACKAGE_REPORT||'tests/package-smoke-results.json',JSON.stringify({version,source:'independently extracted archive',offlineHashes:paths.length,spacecraftStudy:true,keyboard:true,softwareXbox:true,photograph:true,passage:true,smallViewport:true,mediaRange:true,externalRequests:external,errors},null,2)+'\n');console.log('Offline package passed',paths.length,'asset hashes');
}finally{await browser.close()}
