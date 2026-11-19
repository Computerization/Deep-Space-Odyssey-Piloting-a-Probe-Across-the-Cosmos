import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_PHOTO_ENGINE&&name!==process.env.COSMOS_PHOTO_ENGINE)continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],downloads=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('download',d=>downloads.push(d.suggestedFilename()));
 const photos=()=>page.evaluate(async()=>{const frames=await window.__cosmos.archive.all();return frames.filter(f=>f.kind==='field').map(({photo,...f})=>f);});
 const pose=()=>page.evaluate(()=>{const g=window.__cosmos.game;return{p:g.player.position.toArray(),v:g.player.velocity.toArray(),fuel:g.fuel,held:g.timePaused};});
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');await page.evaluate(()=>{const g=window.__cosmos.game;g.timePaused=true;g.chapterTime=30;});
  await page.waitForTimeout(300);assert.ok(await page.locator('#photo-button').isVisible());assert.ok(await page.locator('#observe-action').isHidden());
  const before=await pose();await page.click('#photo-button');await page.waitForFunction(()=>!document.getElementById('photo-receipt').hidden);assert.equal((await photos()).length,1);assert.deepEqual(await pose(),before);assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'play');assert.deepEqual(downloads,[]);
  await page.screenshot({path:`tests/screenshots/v24-${name.toLowerCase()}-photograph-receipt.png`});
  await page.click('#photo-receipt');await page.waitForFunction(()=>document.getElementById('full-photograph')?.naturalWidth>0);assert.equal(await page.locator('#photograph-count').textContent(),'1 / 1');
  await page.click('#photograph-download');await page.waitForFunction(()=>true);await page.waitForTimeout(150);assert.equal(downloads.length,1);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('.gallery'));await page.keyboard.press('Escape');
  await page.keyboard.press('p');await page.waitForFunction(async()=>((await window.__cosmos.archive.all()).filter(f=>f.kind==='field')).length===2);assert.equal(downloads.length,1);
  await page.waitForFunction(()=>!document.getElementById('photo-button').disabled);assert.equal((await photos()).length,2);
  // The controller gets an independent shutter without opening Pause.
  await page.evaluate(()=>{window.testPad={id:'Synthetic Xbox',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({value:0,pressed:false}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[testPad]});});
  await page.waitForTimeout(80);await page.evaluate(()=>testPad.buttons[10]={value:1,pressed:true});await page.waitForFunction(()=>window.__cosmos.input.device==='gamepad');await page.waitForFunction(async()=>((await window.__cosmos.archive.all()).filter(f=>f.kind==='field')).length===3);await page.evaluate(()=>testPad.buttons[10]={value:0,pressed:false});assert.equal((await photos()).length,3);await page.waitForFunction(()=>document.getElementById('photo-key').textContent==='LS');assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'play');
  // Repeated commands while the storage transaction is pending take one shot.
  await page.evaluate(()=>{const a=window.__cosmos;window.originalPut=a.archive.put.bind(a.archive);a.archive.put=async frame=>{await new Promise(r=>setTimeout(r,500));return originalPut(frame);};});
  await page.keyboard.press('p');await page.keyboard.press('p');await page.keyboard.press('p');await page.waitForFunction(()=>!document.getElementById('photo-button').disabled);assert.equal((await photos()).length,4);await page.evaluate(()=>window.__cosmos.archive.put=originalPut);
  await page.mouse.move(640,100);await page.locator('#photo-receipt').focus();await page.waitForTimeout(6700);assert.ok(await page.locator('#photo-receipt').isVisible());await page.locator('#photo-button').focus();await page.waitForFunction(()=>document.getElementById('photo-receipt').hidden);
  // Independent photography remains available when no suggested subject is in view.
  await page.evaluate(async()=>{const a=window.__cosmos,t=await import('three');a.startChapter(0);a.game.timePaused=true;a.game.player.quaternion.multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),Math.PI));a.game.chapterTime=30;});await page.waitForFunction(()=>!window.__cosmos.game.observation);assert.ok(await page.locator('#photo-button').isVisible());
  // Passage pictures must not be labelled as a hidden planetary body.
  const passageDate=await page.evaluate(async()=>{const a=window.__cosmos,t=await import('/src/trajectory.js');a.beginTransit();a.game.mode='panel';a.game.rateIndex=6;a.game.timePaused=false;a.updateFlight(.05,a.zeroInput);a.game.timePaused=true;a.game.mode='play';return t.epochLabel(a.game.transit.jd)+' · historical passage';});await page.click('#photo-button');await page.waitForFunction(()=>!document.getElementById('photo-button').disabled);const passagePhoto=(await photos()).sort((a,b)=>b.createdAt-a.createdAt)[0];assert.equal(passagePhoto.title,'Deep space');assert.equal(passagePhoto.date,passageDate);assert.match(passagePhoto.range,/from Sun/);assert.equal((await photos()).length,5);assert.equal(downloads.length,1);
  // Existing suggested long exposure still works when explicitly held.
  await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(0);a.game.timePaused=true;a.game.chapterTime=30;});await page.keyboard.down('x');await page.waitForFunction(()=>!document.getElementById('observe-action').hidden);await page.keyboard.up('x');
  await page.setViewportSize({width:800,height:600});await page.waitForTimeout(150);const fit=await page.locator('#photo-button').evaluate(e=>{const r=e.getBoundingClientRect();return r.height>=44&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;});assert.ok(fit);
  await page.screenshot({path:`tests/screenshots/v24-${name.toLowerCase()}-compact-flight.png`});
  await page.evaluate(()=>{window.originalCapture=window.__cosmos.world.capture;window.__cosmos.world.capture=()=>{throw Error('Injected capture failure');};});await page.keyboard.press('p');assert.match(await page.locator('#toast').textContent(),/could not be captured/);assert.ok(await page.locator('#photo-button').isEnabled());await page.evaluate(()=>window.__cosmos.world.capture=originalCapture);
  // A failed database transaction retains a session copy and downloads a fallback.
  await page.evaluate(()=>window.__cosmos.archive.db.close());await page.keyboard.press('p');await page.waitForTimeout(500);assert.equal(downloads.length,2);assert.equal(await page.locator('#photo-receipt-status').textContent(),'Saved for this session');assert.equal(await page.locator('#photo-button').isEnabled(),true);
  await page.click('#photo-receipt');await page.waitForFunction(()=>document.getElementById('full-photograph')?.naturalWidth>0);await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('.gallery'));
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),visibleIndependentShutter:true,noAutomaticDownloadWhenStored:true,receiptOpensActualPhoto:true,explicitDownload:true,physicalStatePreserved:true,keyboardAndSyntheticXboxShutter:true,pendingCommandsCoalesced:true,focusedReceiptRetained:true,captureFailureRecovers:true,passageMetadata:true,suggestedExposurePreserved:true,compactTargetFits:true,storageFailureFallback:true,physicalXboxTested:false,errors,passed:true});console.log({name,passed:true});
 }finally{await browser.close();}
 await fs.writeFile('tests/photography-v24-results.json',JSON.stringify({version:'0.24.0',outcomes},null,2));
}
