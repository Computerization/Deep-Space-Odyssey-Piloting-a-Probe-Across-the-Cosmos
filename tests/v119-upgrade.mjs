// Exercise the actual organisation baseline, then install this worker in place.
import {chromium} from './browser.mjs';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
const root=process.env.COSMOS_UPGRADE_ROOT,url=process.env.COSMOS_UPGRADE_URL;
assert.ok(root&&url&&path.resolve(root).startsWith('/tmp/cosmos-upgrade-'));const worker=await fs.readFile('sw.js','utf8');
const version=text=>text.match(/const VERSION='([^']+)'/)[1],old=version(await fs.readFile(path.join(root,'sw.js'),'utf8'));assert.notEqual(old,version(worker));
const files=[...worker.split('const FILES=')[1].split(';')[0].matchAll(/'([^']+)'/g)].map(m=>m[1]).filter(x=>x!=='./');
const browser=await chromium.launch({channel:'chrome'});
try{const ctx=await browser.newContext(),page=await ctx.newPage();const wait=f=>page.waitForFunction(f,null,{timeout:90000});
 await page.goto(url+'/?test=1');await wait(()=>window.__cosmos);await page.evaluate(async()=>{await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;});await wait(()=>navigator.serviceWorker.controller);
 await page.click('#begin');await page.keyboard.press('n');await page.keyboard.press('p');await wait(()=>__cosmos.archive.memory.size);await page.keyboard.press('z');await page.keyboard.press('g');await page.keyboard.press('b');await page.evaluate(()=>{__cosmos.game.timePaused=true;});await page.keyboard.press('Escape');
 const before=await page.evaluate(async()=>({save:JSON.parse(localStorage.getItem('cosmos-voyager-save-v2')),photo:(await __cosmos.archive.all())[0],settings:JSON.parse(localStorage.getItem('cosmos-settings-v1'))}));
 for(const f of [...files,'sw.js']){await fs.mkdir(path.dirname(path.join(root,f)),{recursive:true});await fs.copyFile(f,path.join(root,f));}
 await page.evaluate(async()=>{const done=new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));await(await navigator.serviceWorker.getRegistration()).update();await done;});
 await ctx.setOffline(true);await page.reload();await wait(()=>window.__cosmos);assert.ok(!(await page.evaluate(()=>caches.keys())).includes(old));
 await page.click('#continue');await wait(()=>__cosmos.game.mode==='play');
 const restored=await page.evaluate(async()=>{return {p:__cosmos.game.player.position.toArray(),v:__cosmos.game.player.velocity.toArray(),g:__cosmos.game.guidance,z:__cosmos.game.precision,photo:(await __cosmos.archive.all())[0],muted:__cosmos.audio.muted,pilot:__cosmos.game.pilot};});
 assert.deepEqual(restored.p,before.save.position);assert.deepEqual(restored.v,before.save.velocity);
 assert.equal(restored.g,before.save.guidance);assert.equal(restored.z,before.save.precision);assert.equal(restored.muted,before.settings.muted);assert.deepEqual(restored.photo,before.photo);assert.deepEqual(restored.pilot.finished,[]);console.log(old,'→',version(worker),'offline; checkpoint, controls, mute and photograph retained');
}finally{await browser.close();}
