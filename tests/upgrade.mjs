import {chromium} from './browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const upgradeURL=process.env.COSMOS_UPGRADE_URL||'http://127.0.0.1:4191';
const root=process.env.COSMOS_UPGRADE_ROOT;assert.ok(root?.includes('cosmos-upgrade-'),'Set COSMOS_UPGRADE_ROOT to the extracted previous release in a cosmos-upgrade-* temporary directory.');
const oldWorker=await fs.readFile(path.join(root,'sw.js'),'utf8'),oldVersion=/const VERSION='([^']+)'/.exec(oldWorker)[1];
const previous=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')).version,current=JSON.parse(await fs.readFile('package.json','utf8')).version;
const sw=await fs.readFile('sw.js','utf8'),version=/const VERSION='([^']+)'/.exec(sw)[1];
const files=[...sw.split('const FILES=')[1].split(';')[0].matchAll(/'([^']+)'/g)].map(m=>m[1]).filter(p=>p!=='./');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),context=await browser.newContext(),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(upgradeURL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});
 await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});await page.waitForFunction(()=>navigator.serviceWorker.controller);
 assert.ok((await page.evaluate(()=>caches.keys())).includes(oldVersion));
 await page.click('#begin');
 await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(0);a.game.mode='panel';a.game.rateIndex=0;a.game.actualRate=1;for(let i=0;i<200;i++)a.updateFlight(.05,a.zeroInput);a.game.timePaused=true;a.game.mode='play';});
 await page.click('#pause-button');
 const earthSaved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cosmos-voyager-save-v2')));
 await page.evaluate(()=>{const a=window.__cosmos;a.game.view='chase';a.startChapter(2,0,'titan');a.game.mode='panel';for(let i=0;i<90;i++)a.updateFlight(1/60,{...a.zeroInput,thrust:1});a.game.timePaused=true;a.game.mode='play';a.world.setFov(34);});
 await page.keyboard.press('p');await page.waitForFunction(()=>window.__cosmos.archive.memory.size>0);
 const previousPhoto=await page.evaluate(async()=>{const photos=await window.__cosmos.archive.all();const frame=photos.filter(f=>f.kind==='field').sort((a,b)=>b.createdAt-a.createdAt)[0];return{id:frame.id,photo:frame.photo,date:frame.date};});
 await page.evaluate(()=>{window.__cosmos.game.experience.seen=['moon','2:2'];});
 for(const key of ['z','g','h'])await page.keyboard.press(key);await page.keyboard.press('Escape');
 const saved=await page.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem('cosmos-voyager-save-v2'));
  // A persisted legacy selection, independent of whether the previous release
  // still writes retired route fields. Its composition took bearing priority.
  Object.assign(s,{opportunity:'ring-edge',destination:'titan',routeIndex:3,suggestedView:true,navigation:{points:[[1,2,3]],index:0}});
  return s;
 });
 for(const file of [...files,'sw.js']){await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.copyFile(file,path.join(root,file));}
 await page.evaluate(async()=>{const changed=new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));const r=await navigator.serviceWorker.getRegistration();await r.update();await changed;});
 await page.waitForFunction(async({version,oldVersion})=>{const keys=await caches.keys();return keys.includes(version)&&!keys.includes(oldVersion);},{version,oldVersion},{timeout:90000});
 await page.evaluate(async oldVersion=>{const old=await caches.open(oldVersion);await old.put('./',new Response('<html>Obsolete page</html>',{headers:{'Content-Type':'text/html'}}));},oldVersion);
 // Install the persisted fixture at new-document creation, after the old
 // page's beforeunload save. Physical/history fields come from that release.
 await page.addInitScript(saved=>localStorage.setItem('cosmos-voyager-save-v2',JSON.stringify(saved)),saved);
 await context.setOffline(true);await page.reload();await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#continue');
 const restored=await page.evaluate(()=>{const g=window.__cosmos.game;return {position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),fuel:g.fuel,study:g.study,epoch:window.__cosmos.world.epoch,history:window.__cosmos.flightHistory.samples.length};});
 assert.deepEqual({...restored,history:undefined},{position:saved.position,velocity:saved.velocity,fuel:saved.fuel,study:'titan',epoch:3,history:undefined});assert.ok(restored.history>1);
 assert.deepEqual(await page.evaluate(()=>window.__cosmos.game.experience.seen),saved.experience.seen);
 await page.waitForFunction(()=>window.__cosmos.world.lastRender.options.time===window.__cosmos.game.localSeconds);
 const upgradedRotation=await page.evaluate(()=>{const a=window.__cosmos;return {seconds:a.game.localSeconds,phase:a.world.bodies.saturn.uniforms.rotation.value,date:document.getElementById('chapter-date').textContent};});
 assert.equal(upgradedRotation.date,'12 November 1980 · '+new Date(Date.parse('1980-11-12T05:41:00Z')+Math.floor(saved.localSeconds)*1000).toISOString().slice(11,19)+' UTC · observation study');
 assert.equal(upgradedRotation.seconds,saved.localSeconds);assert.ok(Math.abs(upgradedRotation.phase-(.25-upgradedRotation.seconds/(10.656*3600)))<1e-12);

 const bearingMigration=await page.evaluate(()=>{
  const a=window.__cosmos,g=a.game,s=JSON.parse(localStorage.getItem('cosmos-voyager-save-v2')),retired=['opportunity','routeIndex','suggestedView','navigation'];
  return {destination:g.destination,hidden:!g.guidance,retiredGameFields:retired.filter(k=>Object.hasOwn(g,k)),retiredSavedFields:retired.filter(k=>Object.hasOwn(s,k))};
 });
 assert.equal(bearingMigration.destination,'saturn');assert.equal(bearingMigration.hidden,true);assert.deepEqual(bearingMigration.retiredGameFields,[]);assert.deepEqual(bearingMigration.retiredSavedFields,[]);

 const options=await page.evaluate(()=>{const g=window.__cosmos.game;return {precision:g.precision,guidance:g.guidance,showHud:g.showHud};});assert.deepEqual(options,{precision:saved.precision,guidance:saved.guidance,showHud:saved.showHud});assert.deepEqual(options,{precision:true,guidance:false,showHud:false});await page.keyboard.press('h');
 await page.keyboard.press('g');await page.waitForFunction(()=>document.getElementById('waypoint-name').textContent.includes('Saturn'));
 bearingMigration.visibleSubject=await page.locator('#waypoint-name').textContent();await page.keyboard.press('g');
 const restoredPhoto=await page.evaluate(async id=>(await window.__cosmos.archive.all()).find(f=>f.id===id),previousPhoto.id);assert.equal(restoredPhoto.photo,previousPhoto.photo);assert.equal(restoredPhoto.date,previousPhoto.date);
 const savedReviewLens=saved.history.samples[0].fov??34;assert.equal(await page.evaluate(()=>window.__cosmos.world.camera.fov),34);await page.click('#review-button');await page.locator('#review-range').fill('0');assert.equal(await page.evaluate(()=>window.__cosmos.world.camera.fov),savedReviewLens);const legacyChase=await page.evaluate(()=>{const a=window.__cosmos,g=a.game,w=a.world;w.update(g.reviewPreview,0,{view:g.reviewPreview.view,look:g.reviewPreview.look});return {follow:w.follow.toArray(),attitude:g.reviewPreview.quaternion.toArray(),view:g.reviewPreview.view};});
 if(!saved.history.samples[0].follow){assert.equal(legacyChase.view,'chase');assert.deepEqual(legacyChase.follow,legacyChase.attitude);}
 await page.click('#review-apply');assert.equal(await page.evaluate(()=>window.__cosmos.game.localSeconds),0);assert.equal(await page.evaluate(()=>window.__cosmos.world.camera.fov),savedReviewLens);
 await page.click('#map-button');await page.locator('.encounter-studies summary').click();await page.click('[data-action=study][data-value=ring-plane]');await page.evaluate(()=>window.__cosmos.game.timePaused=true);
 assert.equal(await page.evaluate(()=>window.__cosmos.game.study),'ring-plane');
 await page.click('#map-button');await page.locator('.encounter-studies summary').click();await page.click('[data-action=study][data-value=north-pole]');await page.evaluate(()=>{window.__cosmos.game.timePaused=true;});
 assert.equal(await page.evaluate(()=>window.__cosmos.game.study),'north-pole');assert.equal(await page.evaluate(()=>window.__cosmos.world.camera.fov),40);
 await page.evaluate(()=>{const a=window.__cosmos;a.beginTransit(.5);a.game.timePaused=true});await page.click('#map-button');await page.click('[data-action=map-tab][data-value=solar]');await page.locator('.chart-object-list [data-value=voyager]').click();
 const upgradedChart=await page.evaluate(async()=>{const a=window.__cosmos,{epochLabel}=await import('/src/trajectory.js');return {date:document.querySelector('.chart-inspector .eyebrow').textContent,expected:epochLabel(a.game.transit.jd),trail:!!document.querySelector('.chart-voyage-trail'),jd:a.game.transit.jd};});assert.ok(upgradedChart.date.startsWith(upgradedChart.expected));assert.ok(upgradedChart.trail);
 await page.click('#chart-play');await page.waitForFunction(jd=>window.__cosmos.game.transit.jd>jd+1,upgradedChart.jd);await page.click('#chart-play');const heldJd=await page.evaluate(()=>window.__cosmos.game.transit.jd);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__cosmos.game.transit.jd),heldJd);upgradedChart.livePlayback=true;

 await page.keyboard.press('Escape');await page.click('#pause-button');await page.click('[data-action=settings]');await page.click('[data-settings-tab=flight]');await page.click('[data-action=instruments]');assert.equal(await page.locator('.instrument-values dd').count(),3);await page.keyboard.press('Escape');assert.equal(await page.locator('[data-settings-tab=flight]').getAttribute('aria-pressed'),'true');
 // Old Earth flight stays in physical kilometres when its reference globe
 // becomes more accurate. Do not rescale a saved spacecraft or its clock.
 const earthPage=await context.newPage();earthPage.on('pageerror',e=>errors.push(e.message));
 await earthPage.addInitScript(saved=>localStorage.setItem('cosmos-voyager-save-v2',JSON.stringify(saved)),earthSaved);
 await earthPage.goto(upgradeURL+'/?test=1');await earthPage.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await earthPage.click('#continue');
 const earthRestored=await earthPage.evaluate(()=>{const a=window.__cosmos,g=a.game;return {position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),fuel:g.fuel,seconds:g.localSeconds,chapter:g.chapter,history:a.flightHistory.samples.length,renderedRadius:a.world.bodies.earth.data.radius};});
 assert.deepEqual(earthRestored.position,earthSaved.position);assert.deepEqual(earthRestored.velocity,earthSaved.velocity);assert.equal(earthRestored.fuel,earthSaved.fuel);assert.equal(earthRestored.seconds,earthSaved.localSeconds);assert.equal(earthRestored.chapter,0);assert.ok(earthRestored.history>1);assert.equal(earthRestored.renderedRadius,6378.137);
 await earthPage.close();
 assert.deepEqual(errors,[]);
 const report={previous,current,earthRestored,upgradedRotation,bearingMigration,newPolarStudyWorksOffline:true,savedLensRetained:true,savedReviewLens,recordedReviewLensRetained:saved.history.samples[0].fov!==undefined,legacyReviewLensFallback:saved.history.samples[0].fov===undefined,oldSaveRestored:true,oldFlightOptionsRetained:true,newSettingsAndInstrumentsOffline:true,oldStudyReviewRestored:true,oldPhotographRetained:true,oldScienceNotesRetained:true,studyWorksOffline:true,passageChartWorksOffline:true,oldCacheRemovedAtActivation:true,lateStaleCacheIsolated:true,offlineReload:true,errors};
 report.legacyChaseCameraFallback=!saved.history.samples[0].follow;report.upgradedPassagePlayback=upgradedChart.livePlayback;await fs.writeFile('tests/upgrade-results.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}
