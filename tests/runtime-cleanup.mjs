import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const beforeURL=process.env.COSMOS_PREVIOUS_URL||'http://127.0.0.1:4190';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),outcomes=[];
try{
 for(const [label,url] of [['before',beforeURL],['after',BASE_URL]]){
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],downloads=[];page.on('pageerror',e=>errors.push(e.message));page.on('download',d=>downloads.push(d.suggestedFilename()));
  await page.goto(url+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');
  const views=[];
  for(const [name,chapter,study]of [['earth',0,null],['jupiter',1,null],['polar',2,'north-pole']]){
   for(const viewport of [{width:1280,height:800},{width:1024,height:640}]){
    await page.setViewportSize(viewport);await page.evaluate(({chapter,study})=>{const a=window.__cosmos;a.startChapter(chapter,0,study);a.game.timePaused=true;a.game.actualRate=0;a.game.chapterTime=30;a.world.setQuality('ultra');a.game.showHud=true;}, {chapter,study});
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.waitForTimeout(100);
    await page.screenshot({path:`tests/screenshots/cleanup-${label}-${name}-${viewport.width}.png`});views.push({name,...viewport});
   }
  }
  const passage=await page.evaluate(async()=>{const a=window.__cosmos;a.startChapter(3);a.beginTransit(.5);a.game.timePaused=true;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   let lookups=0,frames=0;const original=a.world.chartEphemeris.state.bind(a.world.chartEphemeris);a.world.chartEphemeris.state=(...args)=>{lookups++;return original(...args);};
   await new Promise(resolve=>{const step=()=>++frames>=30?resolve():requestAnimationFrame(step);requestAnimationFrame(step);});a.world.chartEphemeris.state=original;
   return {frames,lookups,domElements:document.querySelectorAll('*').length};});
  await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(0);a.game.timePaused=true;a.game.discovered=[];a.archive.db.close();});
  await page.evaluate(async()=>{await window.__cosmos.recordObservation(0);});await page.waitForTimeout(180);
  const storage=await page.evaluate(()=>{const a=window.__cosmos,f=a.archive.memory.get('earth-0');return {retained:!!f,createdAt:Number.isFinite(f?.createdAt),toast:document.getElementById('toast').textContent,receiptVisible:!document.getElementById('photo-receipt').hidden};});storage.downloads=downloads.length;
  const failure=await page.evaluate(async()=>{const a=window.__cosmos;a.game.discovered=[];const original=a.world.capture;a.world.capture=()=>{throw Error('Injected capture failure');};let escaped=false;try{await a.recordObservation(0);}catch{escaped=true;}a.world.capture=original;return {escaped,discovered:[...a.game.discovered],buttonEnabled:!document.getElementById('photo-button').disabled};});
  assert.deepEqual(errors,[]);outcomes.push({label,views,passage,storage,failure,errors});await page.close();
 }
 const [before,after]=outcomes;
 assert.ok(before.passage.lookups>=25);assert.equal(after.passage.lookups,0);assert.ok(after.passage.domElements<before.passage.domElements);
 assert.equal(before.storage.downloads,0);assert.match(before.storage.toast,/saved to your journal/i);assert.equal(before.storage.createdAt,false);
 assert.equal(after.storage.downloads,1);assert.equal(after.storage.createdAt,true);assert.equal(after.storage.receiptVisible,true);
 assert.equal(before.failure.escaped,true);assert.deepEqual(before.failure.discovered,['earth-0']);assert.equal(after.failure.escaped,false);assert.deepEqual(after.failure.discovered,[]);assert.equal(after.failure.buttonEnabled,true);
 await fs.writeFile('tests/runtime-cleanup-results.json',JSON.stringify({version:JSON.parse(await fs.readFile('package.json','utf8')).version,outcomes},null,2)+'\n');console.log(JSON.stringify(outcomes.map(({label,passage,storage,failure})=>({label,passage,storage,failure})),null,2));
}finally{await browser.close();}
