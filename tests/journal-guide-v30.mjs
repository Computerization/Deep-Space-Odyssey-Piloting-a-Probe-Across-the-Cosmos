import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],layouts=[];
page.on('pageerror',e=>errors.push(e.message));
const pad=async n=>{await page.evaluate(n=>testPad.buttons[n]={value:1,pressed:true,touched:true},n);await page.waitForTimeout(80);await page.evaluate(n=>testPad.buttons[n]={value:0,pressed:false,touched:false},n);await page.waitForTimeout(80);};
const active=()=>page.evaluate(()=>document.activeElement.dataset.value||document.activeElement.dataset.action||document.activeElement.id);
try{
await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
await page.evaluate(async()=>{const a=window.__cosmos;a.game.timePaused=true;a.game.mode='panel';for(const [i,[chapter,study,title]]of [[0,null,'Earth'],[0,'moon','Moon'],[1,null,'Jupiter'],[1,'io','Io'],[2,null,'Saturn'],[2,'titan','Titan']].entries()){a.startChapter(chapter,0,study);a.game.timePaused=true;a.game.mode='panel';a.world.update(a.game.player,0,{view:'probe',exposure:1});await a.archive.put({id:'review-'+i,kind:'field',title,date:'Encounter study',range:'Recorded range',fieldOfView:'48°',createdAt:1000+i,photo:a.world.capture(),text:i===3?'A retained observation from this photograph.':''});}a.game.mode='play';a.game.experience.seen=['0:0','0:1','0:2','1:0','2:0'];});
const physical=await page.evaluate(()=>{const g=window.__cosmos.game;return {p:g.player.position.toArray(),v:g.player.velocity.toArray(),fuel:g.fuel,rate:g.rateIndex}});
await page.click('#log-button');await page.waitForFunction(()=>document.querySelector('.journal-photos'));
for(const [width,height]of [[1280,800],[1024,640],[800,600]]){
 await page.setViewportSize({width,height});await page.waitForTimeout(100);
 const m=await page.evaluate(()=>{const area=document.getElementById('journal-body').getBoundingClientRect(),footer=document.querySelector('.journal-footer').getBoundingClientRect(),items=[...document.querySelectorAll('.photo-open')];return {visiblePhotos:items.filter(el=>{const r=el.getBoundingClientRect();return r.top>=area.top&&r.bottom<=area.bottom}).length,footer:footer.bottom<=innerHeight,contained:items.every(e=>getComputedStyle(e.querySelector('img')).objectFit==='contain'),overflow:document.getElementById('panel').scrollWidth>innerWidth,buttons:document.querySelectorAll('#panel button,#panel a').length};});
 assert.ok(m.footer&&m.contained&&!m.overflow);if(width===1280)assert.equal(m.visiblePhotos,6);layouts.push({width,height,journal:m});if(name==='Chrome')await page.screenshot({path:`tests/screenshots/v30-journal-${width}.png`});
 // Two or three columns; down follows the column, then left moves one item.
 await page.locator('.photo-open').first().focus();await page.keyboard.press('ArrowDown');assert.equal(await active(),width>1000?'review-2':'review-3');await page.keyboard.press('ArrowRight');assert.equal(await active(),width>1000?'review-1':'review-2');
}
await page.setViewportSize({width:1280,height:800});await page.locator('.photo-open').first().click();await page.waitForFunction(()=>document.getElementById('full-photograph')?.naturalWidth>0);await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('.journal-photos'));assert.equal(await active(),'review-3');
// Export uses the actual selected frame. Removal and Undo retain its exact bytes.
await page.locator('[data-action=view-photo][data-value=review-3]').click();const original=await page.locator('#full-photograph').getAttribute('src');assert.equal(await page.locator('#photograph-download').getAttribute('href'),original);
await page.click('#photograph-remove');await page.waitForSelector('[data-action=undo-photo]');assert.equal(await page.locator('.photo-open').count(),5);await page.click('[data-action=undo-photo]');await page.waitForFunction(()=>document.querySelectorAll('.photo-open').length===6);assert.equal(await active(),'review-3');assert.equal(await page.evaluate(async()=>(await window.__cosmos.archive.all()).find(f=>f.id==='review-3').photo),original);
await page.click('[data-action=journal-tab][data-value=notes]');await page.waitForSelector('.journal-notes');assert.equal(await page.locator('.journal-notes article').count(),6);assert.ok((await page.locator('.journal-notes').textContent()).includes('A retained observation'));await page.locator('.journal-notes summary').first().click();if(name==='Chrome')await page.screenshot({path:'tests/screenshots/v30-journal-notes.png'});
await page.click('[data-action=journal-tab][data-value=photos]');await page.waitForSelector('.journal-photos');await page.keyboard.press('Escape');await page.click('#controls-button');
for(const [width,height]of [[1280,800],[1024,640],[800,600]]){
 await page.setViewportSize({width,height});await page.waitForTimeout(100);
 for(const device of ['keyboard','gamepad']){
  await page.click(`[data-device=${device}]`);assert.equal(await page.locator(`[data-device=${device}]`).getAttribute('aria-pressed'),'true');
  const m=await page.evaluate(()=>{const f=document.querySelector('.reference-footer').getBoundingClientRect(),area=document.querySelector('.control-reference').getBoundingClientRect(),more=document.querySelector('.control-more summary').getBoundingClientRect();return {footer:f.bottom<=innerHeight,overflow:document.getElementById('panel').scrollWidth>innerWidth,moreVisible:more.top>=area.top&&more.bottom<=area.bottom,device:document.querySelector('[data-device][aria-pressed=true]').dataset.device};});assert.ok(m.footer&&!m.overflow);if(width>800)assert.ok(m.moreVisible,JSON.stringify({width,height,m}));layouts.find(l=>l.width===width).guide??=[];layouts.find(l=>l.width===width).guide.push(m);
 }
 if(name==='Chrome')await page.screenshot({path:`tests/screenshots/v30-controls-${width}.png`});
}
await page.setViewportSize({width:1280,height:800});await page.click('[data-device=keyboard]');await page.locator('.control-more summary').click();assert.ok((await page.locator('.control-reference').textContent()).includes('Fine controlZ'));await page.keyboard.press('Escape');
await page.evaluate(()=>{window.testPad={id:'Synthetic Xbox test',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[testPad]});});
await pad(9);await page.click('[data-action=guide]');assert.equal(await page.locator('[data-device=gamepad]').getAttribute('aria-pressed'),'true');await pad(1);
await page.click('#log-button');await page.waitForSelector('.journal-photos');await page.locator('.photo-open').first().focus();await pad(13);assert.equal(await active(),'review-2');await pad(15);assert.equal(await active(),'review-1');await pad(0);await page.waitForSelector('#full-photograph');await pad(1);await page.waitForSelector('.journal-photos');assert.equal(await active(),'review-1');
assert.deepEqual(await page.evaluate(()=>{const g=window.__cosmos.game;return {p:g.player.position.toArray(),v:g.player.velocity.toArray(),fuel:g.fuel,rate:g.rateIndex}}),physical);
// Reload proves Undo was persisted and exercises deletion of an older image
// with no new-capture copy in the archive's session map.
await page.reload();await page.waitForFunction(()=>window.__cosmos);await page.click('#continue');await page.click('#log-button');await page.waitForSelector('.journal-photos');assert.equal(await page.locator('.photo-open').count(),6);assert.equal(await page.evaluate(()=>window.__cosmos.archive.memory.size),0);
// A closed database must leave the original image recoverable, with no false removal.
await page.locator('[data-action=view-photo][data-value=review-3]').click();await page.evaluate(()=>window.__cosmos.archive.db.close());await page.click('#photograph-remove');await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('could not be removed'));assert.equal(await page.locator('#full-photograph').getAttribute('src'),original);assert.equal(await page.evaluate(async()=>(await window.__cosmos.archive.all()).find(f=>f.id==='review-3').photo),original);
assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),layouts,photoNavigationMatchesLayout:true,viewerReturnsToCurrentPhoto:true,exportRetainsBytes:true,removeAndUndoPreserveImage:true,failedRemovalPreservesImage:true,undoPersistsAcrossReload:true,scienceAndPhotoNotesRetained:true,defaultMatchesLastInput:true,syntheticXboxNavigation:true,physicalStateHeld:true,physicalXboxTested:false,errors});console.log({name,passed:true});
}finally{await browser.close()}
await fs.writeFile('tests/journal-guide-v30-results.json',JSON.stringify({version:'0.30.0',outcomes},null,2));
}
