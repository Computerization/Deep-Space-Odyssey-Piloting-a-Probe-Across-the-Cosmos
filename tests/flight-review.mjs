import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const version=JSON.parse(await fs.readFile('package.json','utf8')).version,outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
  // Record the displayed chase base after actual turn/flight frames.
  await page.evaluate(()=>{
   const a=window.__cosmos;a.startChapter(2);a.game.view='chase';a.game.timePaused=false;a.game.rateIndex=0;a.world.setFov(18);
   window.chaseRecords=[];window.originalHistoryRecord=a.flightHistory.record;
   a.flightHistory.record=function(...args){const previous=this.samples.at(-1);const result=originalHistoryRecord.apply(this,args);const s=this.samples.at(-1);if(s!==previous&&s.follow)chaseRecords.push({follow:s.follow,drawn:a.world.follow.toArray()});return result;};
  });
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(1800);await page.keyboard.up('ArrowRight');
  const chase=await page.evaluate(()=>{
   const a=window.__cosmos,g=a.game,w=a.world,h=a.flightHistory;h.record=window.originalHistoryRecord;
   const physical=()=>JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.look.toArray(),g.fuel,g.localSeconds,g.freeLook,g.tracking]);
   const before=physical(),camera=w.camera.quaternion.clone(),base=w.cameraState(g.view),lag=w.follow.angleTo(g.player.quaternion);
   document.getElementById('review-button').click();w.update(g.reviewPreview,0,{view:g.reviewPreview.view,look:g.reviewPreview.look});
   const jump=camera.angleTo(w.camera.quaternion),records=chaseRecords;
   return{before,base,lag,jump,physicalUnchanged:before===physical(),records,history:h.samples,earlier:h.samples.findIndex(s=>s.follow&&s.seconds>0)};
  });
  assert.ok(chase.lag>.0001);assert.ok(chase.jump<1e-6);assert.ok(chase.physicalUnchanged);assert.ok(chase.records.length>=2);assert.ok(chase.earlier>0);
  for(const record of chase.records)assert.deepEqual(record.follow,record.drawn,'History records the drawn camera, not the preceding frame');
  // Let the frame owner observe the preview after the synchronous pose check.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.waitForFunction(()=>!window.__cosmos.world.needsRender);
  const heldDraws=await page.evaluate(()=>window.__cosmos.world.renderCount);await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>window.__cosmos.world.renderCount),heldDraws,'A lagged review picture must settle without repeated drawing');
  const frame=chase.history[chase.earlier];
  const selectChase=async()=>{await page.locator('#review-range').focus();await page.keyboard.press('Home');for(let i=0;i<chase.earlier;i++)await page.keyboard.press('ArrowRight');};
  await selectChase();
  const oldView=await page.evaluate(()=>{const a=window.__cosmos,g=a.game,w=a.world;w.update(g.reviewPreview,0,{view:g.reviewPreview.view,look:g.reviewPreview.look});return{follow:w.follow.toArray(),physical:JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.look.toArray(),g.fuel,g.localSeconds,g.freeLook,g.tracking])};});
  assert.deepEqual(oldView.follow,frame.follow);assert.equal(oldView.physical,chase.before);
  // Cancelling restores the same lagged present; normal easing can then continue.
  const cancelled=await page.evaluate(()=>{const a=window.__cosmos;document.querySelector('[data-action=resume]').click();a.world.update(a.game.player,0,{view:a.game.view,look:a.game.look});return a.world.cameraState(a.game.view);});assert.deepEqual(cancelled,chase.base);
  await page.evaluate(()=>{window.__cosmos.game.timePaused=true;document.getElementById('review-button').click();});await selectChase();
  const presentSave=await page.evaluate(()=>{dispatchEvent(new Event('beforeunload'));const s=JSON.parse(localStorage.getItem('cosmos-voyager-save-v2'));return {camera:window.__cosmos.flightReview.cameraState(),last:s.history.samples.at(-1),state:s};});
  assert.deepEqual(presentSave.last.follow,presentSave.camera.follow);assert.equal(presentSave.last.fov,presentSave.camera.fov);
  await page.reload();await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});
  const continued=await page.evaluate(()=>{const a=window.__cosmos;document.getElementById('continue').click();const state=a.world.cameraState(a.game.view);a.game.mode='panel';return state;});assert.deepEqual(continued,presentSave.camera);
  await page.evaluate(()=>{window.__cosmos.game.mode='play';document.getElementById('review-button').click();});await selectChase();
  const committedChase=await page.evaluate(()=>{const a=window.__cosmos;document.getElementById('review-apply').click();a.world.update(a.game.player,0,{view:a.game.view,look:a.game.look});return{camera:a.world.cameraState(a.game.view),attitude:a.game.player.quaternion.toArray(),position:a.game.player.position.toArray(),velocity:a.game.player.velocity.toArray(),held:a.game.timePaused};});
  assert.deepEqual(committedChase.camera,{fov:frame.fov,follow:frame.follow});assert.deepEqual(committedChase.attitude,frame.attitude);assert.deepEqual(committedChase.position,frame.position);assert.deepEqual(committedChase.velocity,frame.velocity);assert.ok(committedChase.held);
  const independent=await page.evaluate(async()=>{
   const a=window.__cosmos,g=a.game,w=a.world,{Euler}=await import('three');
   g.freeLook=true;g.look.setFromEuler(new Euler(.15,.2,.1));w.update(g.player,0,{view:g.view,look:g.look});
   const camera=w.camera.quaternion.clone(),physical=JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.look.toArray(),g.fuel,g.localSeconds]);
   document.getElementById('review-button').click();w.update(g.reviewPreview,0,{view:g.reviewPreview.view,look:g.reviewPreview.look});const entry=camera.angleTo(w.camera.quaternion);
   document.querySelector('[data-action=resume]').click();w.update(g.player,0,{view:g.view,look:g.look});
   return{entry,return:camera.angleTo(w.camera.quaternion),unchanged:physical===JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.look.toArray(),g.fuel,g.localSeconds])};
  });
  assert.ok(independent.entry<1e-6&&independent.return<1e-6&&independent.unchanged);
  const chaseView={liveLagDegrees:chase.lag*180/Math.PI,entryJumpDegrees:chase.jump*180/Math.PI,recordsMatchDisplayedCamera:true,heldPictureReused:true,cancelRetainsLaggedView:true,previewSaveAndReloadRetainPresent:true,restoreRecordedCameraAndPhysics:true,independentLookRetained:true};
  const seeded=await page.evaluate(()=>{
   const a=window.__cosmos,g=a.game,w=a.world,h=a.flightHistory;a.startChapter(0);g.view='probe';g.mode='panel';g.timePaused=false;g.rateIndex=0;g.actualRate=1;w.setQuality('balanced');w.setFov(58);h.reset(g);
   for(const [dt,fov] of [[20,18],[60,42],[20,22]]){w.setFov(fov);a.updateFlight(dt,a.zeroInput);h.record(g,0,true);}
   g.timePaused=true;g.player.quaternion.multiply(g.look.clone().setFromAxisAngle(g.angular.clone().set(0,1,0),.2));g.look.setFromAxisAngle(g.angular.clone().set(1,0,0),.1);g.angular.set(0,0,0);g.freeLook=true;w.setFov(26);
   window.reviewState=()=>({position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),attitude:g.player.quaternion.toArray(),look:g.look.toArray(),fuel:g.fuel,seconds:g.localSeconds,view:g.view,freeLook:g.freeLook});
   const present=reviewState();g.mode='play';a.flightReview.open();
   return {present,preview:g.reviewPreview.quaternion.toArray(),look:g.reviewPreview.look.toArray(),times:h.samples.map(s=>s.seconds),fovs:h.samples.map(s=>s.fov),max:Number(document.getElementById('review-range').max),currentFov:w.camera.fov,first:h.samples[0],earlier:h.samples[1]};
  });
  assert.deepEqual(seeded.times,[0,20,80,100]);assert.equal(seeded.max,100);assert.deepEqual(seeded.preview,seeded.present.attitude);assert.deepEqual(seeded.look,seeded.present.look);assert.deepEqual(seeded.fovs,[58,18,42,26]);assert.equal(seeded.currentFov,26);
  await page.locator('#review-range').fill('20');
  const preview=await page.evaluate(()=>({physical:reviewState(),lens:window.__cosmos.world.camera.fov,readout:document.getElementById('review-speed').textContent,fill:document.getElementById('review-range').style.getPropertyValue('--range-fill')}));
  assert.deepEqual(preview.physical,seeded.present);assert.equal(preview.lens,18);assert.equal(preview.fill,'20%');assert.ok(preview.readout.includes('18°'));
  // Saving or refreshing during preview must keep the uncommitted present.
  const saved=await page.evaluate(()=>{dispatchEvent(new Event('beforeunload'));return JSON.parse(localStorage.getItem('cosmos-voyager-save-v2'));});
  assert.equal(saved.fov,26);assert.equal(saved.history.samples.at(-1).fov,26);assert.equal(saved.history.samples[1].fov,18);assert.deepEqual(saved.attitude,seeded.present.attitude);
  await page.keyboard.press('Escape');assert.deepEqual(await page.evaluate(()=>reviewState()),seeded.present);assert.equal(await page.evaluate(()=>window.__cosmos.world.camera.fov),26);
  await page.click('#review-button');await page.locator('#review-range').fill('20');await page.reload();await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#continue');
  const reloaded=await page.evaluate(()=>{const a=window.__cosmos,g=a.game;return {fov:a.world.camera.fov,position:g.player.position.toArray(),attitude:g.player.quaternion.toArray(),seconds:g.localSeconds,historyFovs:a.flightHistory.samples.map(s=>s.fov)};});
  assert.equal(reloaded.fov,26);assert.deepEqual(reloaded.position,seeded.present.position);assert.equal(reloaded.seconds,100);assert.deepEqual(reloaded.historyFovs,[58,18,42,26]);assert.ok(reloaded.attitude.every((v,i)=>Math.abs(v-seeded.present.attitude[i])<1e-14));
  await page.click('#review-button');await page.keyboard.press('Home');assert.equal(await page.locator('#review-range').inputValue(),'0');
  await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#review-range').inputValue(),'20');
  await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#review-range').inputValue(),'80');
  await page.keyboard.press('End');assert.equal(await page.locator('#review-range').inputValue(),'100');
  await page.keyboard.press('PageDown');assert.equal(await page.locator('#review-range').inputValue(),'0');
  // A real pointer press maps to elapsed time, then snaps to a recorded frame.
  const box=await page.locator('#review-range').boundingBox();await page.mouse.click(box.x+box.width*.74,box.y+box.height/2);assert.equal(await page.locator('#review-range').inputValue(),'80');
  await page.evaluate(()=>{window.reviewPad={connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.reviewPad]});});
  await page.locator('#review-range').focus();
  const press=async i=>{await page.evaluate(i=>reviewPad.buttons[i]={pressed:true,value:1},i);await page.waitForTimeout(100);await page.evaluate(i=>reviewPad.buttons[i]={pressed:false,value:0},i);await page.waitForTimeout(70);};
  await press(14);assert.equal(await page.locator('#review-range').inputValue(),'20');await press(15);assert.equal(await page.locator('#review-range').inputValue(),'80');await press(14);
  const layouts=[];
  for(const [width,height] of [[1280,800],[1024,640],[800,600],[720,640]]){
   await page.setViewportSize({width,height});
   await page.waitForFunction(()=>!window.__cosmos.world.needsRender);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const layout=await page.evaluate(()=>{const controls=[...document.querySelectorAll('#panel button,#review-range')].filter(e=>!e.disabled&&e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.textContent.trim(),x:r.x,y:r.y,w:r.width,h:r.height};});return {controls,overflow:document.getElementById('panel').scrollHeight-innerHeight};});
   assert.ok(layout.controls.every(c=>c.x>=0&&c.y>=0&&c.x+c.w<=width+1&&c.y+c.h<=height+1&&c.h>=44));assert.ok(layout.overflow<=1);layouts.push({width,height,...layout});
   await page.screenshot({path:`tests/screenshots/flight-review-${name.toLowerCase()}-${width}.png`});
  }
  await page.click('#review-apply');
  const committed=await page.evaluate(()=>{const a=window.__cosmos,g=a.game;return {position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),fuel:g.fuel,seconds:g.localSeconds,fov:a.world.camera.fov,paused:g.timePaused,preview:g.reviewPreview,history:a.flightHistory.samples.length,saved:JSON.parse(localStorage.getItem('cosmos-voyager-save-v2'))};});
  assert.deepEqual(committed.position,seeded.earlier.position);assert.deepEqual(committed.velocity,seeded.earlier.velocity);assert.equal(committed.fuel,seeded.earlier.fuel);assert.equal(committed.seconds,20);assert.equal(committed.fov,18);assert.equal(committed.saved.fov,18);assert.equal(committed.paused,true);assert.equal(committed.preview,null);assert.equal(committed.history,2);
  // Legacy saves have no historical lens. Preserve their present lens and flight.
  await page.evaluate(()=>{const key='cosmos-voyager-save-v2',s=JSON.parse(localStorage.getItem(key));for(const frame of s.history.samples)delete frame.fov;s.fov=34;localStorage.setItem(key,JSON.stringify(s));});
  // Avoid beforeunload replacing the intentional legacy fixture.
  await page.evaluate(()=>window.__cosmos.game.mode='landing');await page.reload();await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#continue');
  assert.equal(await page.evaluate(()=>window.__cosmos.world.camera.fov),34);await page.click('#review-button');await page.locator('#review-range').fill('0');assert.equal(await page.evaluate(()=>window.__cosmos.world.camera.fov),34);await page.click('#review-apply');assert.equal(await page.evaluate(()=>window.__cosmos.world.camera.fov),34);
  await page.click('#review-button');assert.ok(await page.locator('#review-range').isDisabled());assert.ok(await page.locator('#review-apply').isDisabled());assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'resume');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'play');
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),chaseView,heldViewRetained:true,elapsedTimeTrack:true,pointerAndKeyboard:true,syntheticXbox:true,physicalXbox:false,cancelPreservesFlightAndLens:true,previewReloadPreservesPresent:true,restoresRecordedLensAndPhysics:true,legacyHistoryRetained:true,emptyHistoryHasReturnFocus:true,layouts,errors});console.log({name,passed:true,layouts:layouts.length});
 }finally{await browser.close()}
}
await fs.writeFile('tests/flight-review-results.json',JSON.stringify({version,outcomes},null,2)+'\n');
