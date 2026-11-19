import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],result={};
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__pad={id:'Xbox test',connected:false,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
  Object.defineProperty(navigator,'getGamepads',{value:()=>[window.__pad]});
 });
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');await page.waitForTimeout(1000);
 const fresh=async chapter=>{await page.evaluate(ch=>{const a=window.__cosmos;a.startChapter(ch);a.game.view='probe';a.game.discovered=[];a.game.explored=[];a.game.player.velocity.set(0,0,0);},chapter);await page.waitForTimeout(500);};
 // A deliberate press produces one photograph, even when held beyond two exposures.
 await fresh(0);const observe=await page.locator('#observe-action').boundingBox();
 await page.mouse.move(observe.x+observe.width/2,observe.y+observe.height/2);await page.mouse.down();await page.waitForTimeout(7000);await page.mouse.up();
 result.pointerObservation=await page.evaluate(()=>({mission:window.__cosmos.game.discovered.length,field:window.__cosmos.game.explored.length}));
 assert.equal(result.pointerObservation.mission+result.pointerObservation.field,1);
 await fresh(0);await page.keyboard.down('x');await page.waitForTimeout(7000);
 assert.equal(await page.evaluate(()=>window.__cosmos.game.discovered.length+window.__cosmos.game.explored.length),1);await page.keyboard.up('x');
 result.singleExposurePerPress=true;
 // An eligible field exposure stays selected when a mission also qualifies.
 result.stableSubject=await page.evaluate(async()=>{
  const a=window.__cosmos,g=a.game;g.discovered=['earth-0','earth-1','earth-2'];g.explored=[];a.updateFlight(.02,a.zeroInput);
  const id=g.observation.id;g.observing=.4;g.discovered=[];a.updateFlight(.02,{...a.zeroInput,observe:true});return {before:id,after:g.observation.id,progress:g.observing};
 });assert.equal(result.stableSubject.before,result.stableSubject.after);assert.ok(result.stableSubject.progress>.4);
 // Independent Moon framing must not point the observation marker back at Earth.
 result.markerSubject=await page.evaluate(async()=>{
  const a=window.__cosmos,g=a.game,w=a.world,{Matrix4,Vector3}=await import('three');a.startChapter(0);g.view='probe';g.discovered=[];g.explored=[];g.player.position.copy(w.fromFrame(w.getFrame('moon'),[.4,.2,4],1737.4));g.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(g.player.position,w.bodyPositions.moon,new Vector3(0,1,0)));return true;
 });await page.waitForTimeout(500);assert.equal(await page.locator('#waypoint-name').textContent(),'Moon');assert.equal(await page.locator('#waypoint').isVisible(),false);
 await page.screenshot({path:'tests/screenshots/polish-moon-flight.png'});
 // Hidden UI must allow a drag exactly where its menu buttons normally sit.
 const viewButton=await page.locator('#view-button').boundingBox();await page.keyboard.press('h');
 const before=await page.evaluate(()=>window.__cosmos.game.player.quaternion.toArray());
 await page.mouse.move(viewButton.x+10,viewButton.y+10);await page.mouse.down();await page.mouse.move(viewButton.x+80,viewButton.y+25,{steps:8});await page.mouse.up();await page.waitForTimeout(250);
 assert.notDeepEqual(await page.evaluate(()=>window.__cosmos.game.player.quaternion.toArray()),before);
 assert.equal(await page.evaluate(()=>document.getElementById('hud').inert),true);result.cleanViewDrag=true;
 // Exact free-look and precision state survives closing the page and continuing.
 await page.keyboard.press('v');await page.keyboard.press('z');await page.keyboard.down('ArrowRight');await page.waitForTimeout(300);await page.keyboard.up('ArrowRight');await page.waitForTimeout(400);await page.keyboard.press('Escape');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cosmos-voyager-save-v2')));
 await page.reload();await page.waitForFunction(()=>window.__cosmos);await page.click('#continue');await page.waitForTimeout(300);
 const restored=await page.evaluate(()=>{const g=window.__cosmos.game;return{look:g.look.toArray(),precision:g.precision,freeLook:g.freeLook,showHud:g.showHud};});
 assert.ok(restored.look.every((v,i)=>Math.abs(v-saved.look[i])<1e-10));assert.ok(restored.precision&&restored.freeLook);assert.equal(restored.showHud,false);result.restoredView=restored;await page.keyboard.press('h');
 // Xbox Resume and Back must wait for held flight controls to be released.
 await page.keyboard.press('Escape');await page.locator('[data-action=resume]').focus();
 await page.evaluate(()=>{window.__pad.connected=true;for(const i of [0,7])window.__pad.buttons[i]={pressed:true,value:1};});await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'play');assert.equal(await page.evaluate(()=>window.__cosmos.game.player.velocity.length()),0);assert.equal(await page.evaluate(()=>window.__cosmos.game.observing),0);
 await page.evaluate(()=>{for(const i of [0,7])window.__pad.buttons[i]={pressed:false,value:0};});await page.waitForTimeout(150);
 await page.evaluate(()=>window.__pad.buttons[7]={pressed:true,value:1});await page.waitForTimeout(350);assert.ok(await page.evaluate(()=>window.__cosmos.game.player.velocity.length())>.1);
 await page.evaluate(()=>window.__pad.buttons[7]={pressed:false,value:0});await page.keyboard.press('Escape');
 await page.evaluate(()=>window.__pad.buttons[1]={pressed:true,value:1});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'play');
 await page.evaluate(()=>{window.__pad.buttons[1]={pressed:false,value:0};window.__pad.connected=false;window.__cosmos.game.player.velocity.set(0,0,0);});result.controllerReleaseGate=true;
 // All pause actions fit on a 1024 × 640 desktop without a scroll.
 await page.setViewportSize({width:1024,height:640});await page.keyboard.press('Escape');
 result.pauseFits=await page.locator('[data-action=home]').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight);assert.ok(result.pauseFits);
 await page.screenshot({path:'tests/screenshots/polish-pause-1024.png'});await page.keyboard.press('Escape');await page.setViewportSize({width:1440,height:900});
 // Native details work with Enter and controller A, and closed details cannot trap Tab.
 await page.keyboard.press('m');await page.locator('.observation-list summary').focus();await page.keyboard.press('Enter');assert.ok(await page.locator('.observation-list').evaluate(el=>el.open));await page.keyboard.press('Space');assert.equal(await page.locator('.observation-list').evaluate(el=>el.open),false);await page.keyboard.press('Enter');
 await page.evaluate(()=>{window.__pad.connected=true;window.__pad.buttons[0]={pressed:true,value:1};});await page.waitForTimeout(100);assert.equal(await page.locator('.observation-list').evaluate(el=>el.open),false);
 await page.evaluate(()=>window.__pad.buttons[0]={pressed:false,value:0});await page.waitForTimeout(100);await page.evaluate(()=>window.__pad.buttons[13]={pressed:true,value:1});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'depart');await page.evaluate(()=>{window.__pad.buttons[13]={pressed:false,value:0};window.__pad.connected=false;});result.summaryControls=true;result.collapsedChoicesSkipped=true;await page.keyboard.press('Escape');
 // Historical media follows Sound, master level, and background state.
 await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(1,2);a.recordObservation();});await page.waitForFunction(()=>document.getElementById('historic-media')?.currentTime>.15);
 await page.keyboard.press('b');await page.waitForFunction(()=>window.__cosmos.audio.recordingBus.gain.value<.00001);
 // Native clip controls cannot bypass a muted master bus.
 await page.locator('#historic-media').evaluate(m=>{m.muted=false;m.volume=1;});
 assert.ok(await page.evaluate(()=>window.__cosmos.audio.recordingBus.gain.value<.00001));
 await page.keyboard.press('b');await page.waitForFunction(()=>window.__cosmos.audio.recordingBus.gain.value>.5);
 result.recording=await page.evaluate(async()=>{const a=window.__cosmos.audio,sleep=()=>new Promise(r=>setTimeout(r,250));a.setVolume(.35);await sleep();const volume=a.recordingBus.gain.value;a.setHidden(true);await sleep();const hidden=a.recordingBus.gain.value<.0001;a.setHidden(false);await sleep();return {volume,hidden,restored:a.recordingBus.gain.value>.34,nativeVolume:document.getElementById('historic-media').volume};});assert.ok(Math.abs(result.recording.volume-.35)<.0001&&result.recording.hidden&&result.recording.restored);assert.equal(result.recording.nativeVolume,1);
 result.hiddenRecordingPaused=await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));const paused=document.getElementById('historic-media').paused&&window.__cosmos.audio.hidden;delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));return paused;});assert.ok(result.hiddenRecordingPaused);
 await page.click('[data-action=resume]');assert.equal(await page.evaluate(()=>window.__cosmos.audio.recordings.size),0);
 // Interrupted score crossfades retain the exact gain at each switch.
 result.crossfade=await page.evaluate(async()=>{
  const a=window.__cosmos.audio,sleep=ms=>new Promise(r=>setTimeout(r,ms));let maximumJump=0;
  for(const name of ['rings','departure','distance','encounter']){
   await sleep(180);const current=a.channels.get(a.current),before=current?.gain.gain.value||0;await a.select(name);const after=current?.gain.gain.value||0;maximumJump=Math.max(maximumJump,Math.abs(after-before));
  }
  return {maximumJump,tracks:a.channels.size};
 });assert.ok(result.crossfade.maximumJump<.06);
 assert.deepEqual(errors,[]);result.errors=errors;await fs.writeFile('tests/finish-polish-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
