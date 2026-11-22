import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium,BASE_URL} from './browser.mjs';
// A real local file selection, never a shipped commercial track. Override
// with a synthetic MP3 when checking a specific exhibition setup.
const mp3=await readFile(process.env.COSMOS_TEST_MP3||'assets/audio/jupiter-lightning.mp3');
const output=process.env.COSMOS_REVIEW_DIR||'tests/screenshots';await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',args:process.platform==='darwin'?['--use-angle=metal','--ignore-gpu-blocklist']:[]});
try{
 const ctx=await browser.newContext({locale:'en-US',viewport:{width:1280,height:800}}),page=await ctx.newPage(),errors=[],external=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET')writes.push(r.method());if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(BASE_URL).origin)external.push(r.url());});
 const wait=fn=>page.waitForFunction(fn,null,{timeout:45000}),key=k=>page.keyboard.press(k),shot=name=>page.screenshot({path:`${output}/${name}.jpg`,quality:86});
 await page.goto(BASE_URL+'/?test=1');await wait(()=>window.__cosmos);await page.click('#landing-score');await page.click('#score-audition');
 await wait(()=>{const ch=__cosmos.audio.channels.get('holst-venus');return ch?.el.duration>499&&ch.el.currentTime>.2;});
 await page.locator('#score-file').setInputFiles({name:'Exhibition.mp3',mimeType:'audio/mpeg',buffer:mp3});
 await wait(()=>__cosmos.audio.current?.startsWith('local:')&&__cosmos.audio.channels.get(__cosmos.audio.current)?.el.currentTime>.1);
 await wait(()=>!document.querySelector('#score-file').disabled);const source=await page.locator('#score-source').inputValue();assert.equal(source,'local');
 await shot('music');
 await page.locator('#score-file').setInputFiles({name:'broken.mp3',mimeType:'audio/mpeg',buffer:Buffer.from('invalid')});await wait(()=>document.querySelector('#score-note').textContent.includes('could not play'));
 assert.equal(await page.locator('#score-source').inputValue(),'local');await page.click('[data-action=resume]');await page.click('#begin');await key('n');
 const a=await page.evaluate(()=>{const s=__cosmos.audio;return {key:s.current,t:s.channels.get(s.current).el.currentTime};});
 await page.evaluate(()=>__cosmos.startChapter(1));await wait(()=>__cosmos.game.chapter===1&&__cosmos.game.chapterTime>.2);await key('Shift+p');
 await wait(()=>__cosmos.game.flyby?.first&&document.querySelector('#flyby-proof')?.checkVisibility());await key('Shift+p');assert.equal(await page.evaluate(()=>!!__cosmos.game.flyby.pair),false);
 const b=await page.evaluate(()=>{const s=__cosmos.audio;return {key:s.current,t:s.channels.get(s.current).el.currentTime};});assert.equal(b.key,a.key);assert.ok(b.t>a.t);
 await page.keyboard.down('Shift');await page.keyboard.down('d');try{await wait(()=>document.querySelector('#flyby-label').textContent==='Take exposure II');}finally{await page.keyboard.up('d');await page.keyboard.up('Shift');}
 await shot('flyby-run');await key('Shift+p');await wait(()=>document.querySelector('#flyby-print img:nth-child(2)')?.naturalWidth>500);
 const images=await page.locator('.flyby-print img').evaluateAll(nodes=>nodes.map(n=>n.src));assert.notEqual(images[0],images[1]);const pair=await page.evaluate(()=>__cosmos.game.flyby.pair);assert.ok(pair.km>500&&pair.angle>=12);
 const slider=page.locator('.flyby-sheet input');await slider.focus();await key('ArrowRight');assert.equal(await slider.inputValue(),'51');await shot('flyby-pair');
 await page.reload();await wait(()=>window.__cosmos);await page.click('#continue');await wait(()=>__cosmos.audio.current==='holst-venus');assert.equal(await page.evaluate(()=>__cosmos.audio.localScore),null);
 await page.evaluate(()=>__cosmos.startChapter(4));await key('x');await wait(()=>__cosmos.audio.ducked);await wait(()=>__cosmos.audio.master.gain.value<.1);await key('Escape');await wait(()=>!__cosmos.audio.ducked);await page.evaluate(()=>__cosmos.startChapter(5));await key('n');
 await wait(()=>document.querySelector('#coda-print img:nth-child(2)')?.naturalWidth>500);assert.deepEqual(await page.locator('#coda-print img').evaluateAll(nodes=>nodes.map(n=>n.src)),images);
 assert.equal(await page.evaluate(()=>__cosmos.audio.paused),false);await page.click('#turn-record');await shot('ending-personal');assert.deepEqual(writes,[]);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 console.log('Concert, local MP3, corrupt-file rollback, continuity, ducking, flyby pair, keyboard wipe, checkpoint and personal ending passed:',Math.round(pair.km),'km',pair.angle.toFixed(1),'degrees.');
}finally{await browser.close();}
