import {chromium} from './browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=(await fs.readFile('/private/tmp/cosmos-v14-upgrade-root.txt','utf8')).trim();assert.ok(root.includes('cosmos-v14-upgrade-'));
const sw=await fs.readFile('sw.js','utf8'),version=/const VERSION='([^']+)'/.exec(sw)[1];
const files=[...sw.split('const FILES=')[1].split(';')[0].matchAll(/'([^']+)'/g)].map(m=>m[1]).filter(p=>p!=='./');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),context=await browser.newContext(),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4190/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});
 await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});await page.waitForFunction(()=>navigator.serviceWorker.controller);
 assert.ok((await page.evaluate(()=>caches.keys())).includes('cosmos-exploration-v13'));
 await page.click('#begin');await page.click('#time-toggle');await page.click('#pause-button');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cosmos-voyager-save-v2')));
 for(const file of [...files,'sw.js']){await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.copyFile(file,path.join(root,file));}
 await page.evaluate(async()=>{const changed=new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));const r=await navigator.serviceWorker.getRegistration();await r.update();await changed;});
 await page.waitForFunction(async version=>{const keys=await caches.keys();return keys.includes(version)&&!keys.includes('cosmos-exploration-v13');},version,{timeout:90000});
 await page.evaluate(async()=>{const old=await caches.open('cosmos-exploration-v13');await old.put('./',new Response('<html>Obsolete page</html>',{headers:{'Content-Type':'text/html'}}));});
 await context.setOffline(true);await page.reload();await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#continue');
 const restored=await page.evaluate(()=>{const g=window.__cosmos.game;return {position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),fuel:g.fuel};});
 assert.deepEqual(restored,{position:saved.position,velocity:saved.velocity,fuel:saved.fuel});
 await page.click('#map-button');await page.click('[data-action=study][data-value=moon]');await page.evaluate(()=>window.__cosmos.game.timePaused=true);
 assert.equal(await page.evaluate(()=>window.__cosmos.game.study),'moon');
 assert.deepEqual(errors,[]);
 const report={previous:'0.13.0',current:'0.14.0',oldSaveRestored:true,newStudyWorksOffline:true,oldCacheRemovedAtActivation:true,lateStaleCacheIsolated:true,offlineReload:true,errors};
 await fs.writeFile('tests/upgrade-v14-results.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}
