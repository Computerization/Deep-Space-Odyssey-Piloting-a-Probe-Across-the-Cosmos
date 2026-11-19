import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:2});
const page=await context.newPage();const errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 window.__virtualPad={id:'Xbox standard test controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:0};
 Object.defineProperty(navigator,'getGamepads',{value:()=>[window.__virtualPad]});
});
await page.goto(`${BASE_URL}/?test=1`);await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');await page.waitForTimeout(1500);
// Regular-observation control coverage; the new opening is tested separately.
await page.evaluate(()=>window.__cosmos.startChapter(0));await page.waitForTimeout(500);
const press=async(index,ms=150)=>{await page.evaluate(i=>{window.__virtualPad.buttons[i]={pressed:true,touched:true,value:1};},index);await page.waitForTimeout(ms);await page.evaluate(i=>{window.__virtualPad.buttons[i]={pressed:false,touched:false,value:0};},index);await page.waitForTimeout(100);};
await press(7,700);assert.ok(await page.evaluate(()=>window.__cosmos.game.player.velocity.length())>1);
await press(1,1500);assert.ok(await page.evaluate(()=>window.__cosmos.game.player.velocity.length())<.1);
await press(3);assert.equal(await page.evaluate(()=>window.__cosmos.game.view),'probe');
await press(15);assert.equal(await page.evaluate(()=>window.__cosmos.world.camera.fov),54);
await press(3);await press(0,3400);assert.equal(await page.evaluate(()=>window.__cosmos.game.task),1);
await press(9);assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'panel');
await press(13);assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'resume');await press(0);assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'play');
// A wrong bearing must not record; a suggested observation region is optional.
await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(1);a.game.view='probe';a.game.player.quaternion.setFromAxisAngle(a.game.frame.y,Math.PI).multiply(a.game.player.quaternion);a.world.followReady=false;});await press(0,3400);assert.equal(await page.evaluate(()=>window.__cosmos.game.task),0);
// Visibility loss pauses; reconnects never resume flight unexpectedly.
await page.evaluate(()=>dispatchEvent(new GamepadEvent('gamepaddisconnected')));assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'panel');await page.click('[data-action=resume]');
// Measure the actual audio graph, not merely the playing flag.
await page.waitForTimeout(6000);
const audio=await page.evaluate(async()=>{
 const a=window.__cosmos.audio,analyser=a.context.createAnalyser();analyser.fftSize=2048;a.master.connect(analyser);const data=new Float32Array(2048);let maxRms=0;
 for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,100));analyser.getFloatTimeDomainData(data);maxRms=Math.max(maxRms,Math.sqrt(data.reduce((s,x)=>s+x*x,0)/data.length));}a.master.disconnect(analyser);
 const tracks=[];for(const name of ['departure','encounter','rings','distance']){const b=await a.context.decodeAudioData(await(await fetch(`assets/audio/${name}.webm`)).arrayBuffer());let peak=0;const channel=b.getChannelData(0);for(let i=0;i<channel.length;i++)peak=Math.max(peak,Math.abs(channel[i]));tracks.push({name,duration:b.duration,channels:b.numberOfChannels,peak});}
 return {maxRms,tracks};
});assert.ok(audio.maxRms>.001);assert.ok(audio.tracks.every(t=>t.duration>=95&&t.channels===2&&t.peak<.9));
await page.waitForTimeout(2000);const performance=await page.evaluate(()=>window.__cosmos.inspect());
await page.screenshot({path:'tests/screenshots/retina-1366.png'});
// Saved continuation must read the current save, not the initial page snapshot.
await page.keyboard.press('Escape');await page.click('[data-action=home]');await page.click('#continue');assert.equal(await page.evaluate(()=>window.__cosmos.game.chapter),1);
assert.deepEqual(errors,[]);
await fs.writeFile('tests/compatibility-results.json',JSON.stringify({controller:'synthetic standard-mapping test; not physical hardware',audio,performance,errors},null,2));
console.log(JSON.stringify({audio,performance,errors},null,2));
await context.close();
// A fresh production context installs every asset, then reloads without network.
const offline=await browser.newContext({viewport:{width:1280,height:800}});const p=await offline.newPage();
await p.goto(`${BASE_URL}/`);await p.waitForFunction(()=>!document.getElementById('begin').disabled);
await p.evaluate(async()=>{await navigator.serviceWorker.ready;});await p.waitForFunction(()=>navigator.serviceWorker.controller!==null,{timeout:60000});
const count=await p.evaluate(async()=>{const cache=await caches.open('cosmos-departure-v11');return(await cache.keys()).length;});assert.ok(count>=58);
await offline.setOffline(true);await p.reload();await p.waitForFunction(()=>!document.getElementById('begin').disabled,{timeout:60000});await p.click('#begin');await p.waitForTimeout(2000);
assert.equal(await p.locator('#chapter-title').textContent(),'Earth departure');
await p.keyboard.press('m');await p.click('[data-action=chapter][data-value="2"]');await p.waitForTimeout(1500);assert.equal(await p.locator('#chapter-title').textContent(),'Light through the rings');
await p.screenshot({path:'tests/screenshots/offline-saturn.png'});
const offlineMedia=await p.evaluate(async()=>{const range=await fetch('assets/archive/interstellar-plasma-compact.mp4',{headers:{Range:'bytes=0-1023'}});const status=range.status,length=(await range.arrayBuffer()).byteLength;if(status!==206||length!==1024)throw Error('Offline media range failed');const video=document.createElement('video');video.src='assets/archive/interstellar-plasma-compact.mp4';video.muted=true;document.body.append(video);await video.play();await new Promise(r=>setTimeout(r,400));const duration=video.duration,time=video.currentTime;video.pause();video.remove();if(!(time>0&&duration>24))throw Error('Offline video failed');return{status,length,duration,time};});
await fs.writeFile('tests/offline-results.json',JSON.stringify({offlineReload:true,chapterSwitch:true,cachedRequests:count,offlineMedia},null,2));
console.log('OFFLINE PASS',count);await browser.close();
