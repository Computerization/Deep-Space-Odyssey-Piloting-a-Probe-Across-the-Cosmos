import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&process.env.COSMOS_TEST_ENGINE!==name)continue;
 const browser=await engine.launch(options);
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const active=()=>page.evaluate(()=>({id:document.activeElement.id,action:document.activeElement.dataset.action,value:document.activeElement.dataset.value}));
const pad=async n=>{
 await page.evaluate(n=>window.testPad.buttons[n]={value:1,pressed:true,touched:true},n);await page.waitForTimeout(70);
 await page.evaluate(n=>window.testPad.buttons[n]={value:0,pressed:false,touched:false},n);await page.waitForTimeout(70);
};
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');await page.waitForFunction(()=>document.getElementById('map-button').textContent==='Explore');
 // First-run guidance stages existing controls, while keyboard flight remains free.
 await page.waitForFunction(()=>document.getElementById('hud').dataset.introduction==='look');
 const opening={rate:await page.evaluate(()=>window.__cosmos.game.rateIndex),initial:await page.locator('#objective-title').textContent()};
 assert.equal(opening.rate,0);assert.match(opening.initial,/Voyager 1/);
 for(const id of ['view-button','photo-button','time-toggle','depart','waypoint'])assert.equal(await page.locator('#'+id).isVisible(),false,id);
 assert.ok(await page.locator('#pause-button').isVisible());assert.ok(await page.locator('#controls-button').isVisible());assert.ok(await page.locator('#map-button').isVisible());
 await page.screenshot({path:`tests/screenshots/opening-${name}-look.png`});
 await page.evaluate(()=>window.__cosmos.input.setDevice('gamepad'));await page.waitForFunction(()=>document.getElementById('objective-caption').textContent.includes('right stick'));
 // Explore is available by pointer before any timed introduction completes.
 await page.click('#map-button');assert.equal(await page.locator('#panel').getAttribute('data-view'),'map');await page.click('[data-action=study][data-value=moon]');
 assert.equal(await page.locator('#hud').getAttribute('data-introduction'),'');opening.earlyStudyExit=true;
 // Controls used ahead of the introduction reveal their own feedback at once.
 await page.evaluate(()=>window.__cosmos.startJourney(false));
 await page.keyboard.press('t');await page.waitForFunction(()=>document.getElementById('hud').dataset.introduction==='time');
 assert.equal(await page.evaluate(()=>window.__cosmos.game.rateIndex),1);
 assert.ok(await page.locator('#time-toggle').isVisible());assert.equal(await page.locator('#photo-button').isVisible(),false);
 await page.keyboard.press('[');assert.equal(await page.evaluate(()=>window.__cosmos.game.rateIndex),0);
 assert.equal(await page.locator('#hud').getAttribute('data-introduction'),'time','Returning to 1x keeps the revealed controls');
 await page.screenshot({path:'tests/screenshots/opening-'+name+'-early-time.png'});
 await page.evaluate(()=>window.__cosmos.startJourney(false));
 await page.keyboard.down('w');await page.waitForFunction(()=>document.getElementById('hud').dataset.introduction==='flight'&&window.__cosmos.game.thrustFeedback?.state==='firing');
 assert.ok(await page.locator('#speed').isVisible());assert.ok(await page.locator('#thrust-feedback').isVisible());assert.equal(await page.locator('#time-toggle').isVisible(),false);
 await page.keyboard.up('w');
 await page.evaluate(()=>window.__cosmos.startJourney(false));
 await page.keyboard.down('Space');await page.waitForFunction(()=>document.getElementById('hud').dataset.introduction==='time'&&window.__cosmos.game.actualRate===0);
 assert.ok(await page.locator('#time-toggle').isVisible());await page.keyboard.up('Space');
 await page.evaluate(()=>window.__cosmos.startJourney(false));
 await page.keyboard.press('c');await page.waitForFunction(()=>document.getElementById('hud').dataset.introduction==='explore');
 assert.equal(await page.evaluate(()=>window.__cosmos.game.view),'chase');assert.ok(await page.locator('#view-button').isVisible());
 assert.match(await page.locator('#objective-caption').textContent(),/Continue to Jupiter whenever you are ready/);
 assert.equal(await page.locator('#depart').textContent(),'Continue to Jupiter');assert.ok(await page.locator('#depart').isVisible());
 opening.earlyControls={timeFeedback:true,rateReturnKeepsControls:true,thrustFeedback:true,heldTimeFeedback:true,cameraFeedback:true,onwardChoiceVisible:true};
 await page.evaluate(()=>window.__cosmos.startJourney(false));
 // A first-look player can recover an offscreen world through the existing
 // bearing. Following must leave the held physical spacecraft untouched.
 const lostPhysical=await page.evaluate(async()=>{const a=window.__cosmos,t=await import('three'),g=a.game;g.timePaused=true;g.player.quaternion.multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),Math.PI));a.experienceGuide.beginIntroduction();return {position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),quaternion:g.player.quaternion.toArray(),fuel:g.fuel,seconds:g.localSeconds};});
 await page.waitForFunction(()=>document.getElementById('waypoint').classList.contains('offscreen'));
 assert.ok(await page.locator('#waypoint').isVisible());assert.match(await page.locator('#objective-caption').textContent(),/edge arrow.*Earth/);
 await page.screenshot({path:'tests/screenshots/opening-'+name+'-lost.png'});
 await page.click('#waypoint');await page.waitForFunction(()=>window.__cosmos.observationCamera.acquired);
 const foundPhysical=await page.evaluate(()=>{const g=window.__cosmos.game;return {position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),quaternion:g.player.quaternion.toArray(),fuel:g.fuel,seconds:g.localSeconds};});
 assert.deepEqual(foundPhysical,lostPhysical);opening.lostBearingVisible=true;opening.cameraRecoveryPreservesFlight=true;
 await page.evaluate(()=>window.__cosmos.startJourney(false));
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(250);await page.keyboard.up('ArrowLeft');
 await page.evaluate(()=>{const a=window.__cosmos;a.game.timePaused=true;for(let i=0;i<120;i++)a.updateFlight(.05,a.zeroInput);});
 await page.waitForFunction(()=>document.getElementById('hud').dataset.introduction==='flight');
 assert.match(await page.locator('#objective-caption').textContent(),/W \/ S.*thrusters.*gradually/);
 assert.equal(await page.locator('#time-toggle').isVisible(),false);assert.ok(await page.locator('#speed').isVisible());assert.ok(await page.locator('#map-button').isVisible());
 await page.evaluate(()=>window.__cosmos.input.setDevice('gamepad'));await page.waitForFunction(()=>document.getElementById('objective-caption').textContent.includes('RT / LT'));
 await page.evaluate(()=>{const g=window.__cosmos.game;g.timePaused=false;g.actualRate=1;});
 const oldFuel=await page.evaluate(()=>window.__cosmos.game.fuel);
 await page.keyboard.down('w');await page.waitForFunction(()=>window.__cosmos.game.thrustFeedback?.state==='firing');
 assert.ok(await page.locator('#thrust-feedback').isVisible());
 opening.thrustImpulse=await page.evaluate(()=>window.__cosmos.game.thrustFeedback.deltaV);
 assert.ok(opening.thrustImpulse>0);assert.ok(await page.evaluate(()=>window.__cosmos.game.fuel)<oldFuel);
 await page.screenshot({path:'tests/screenshots/opening-'+name+'-thrust.png'});
 await page.keyboard.up('w');await page.waitForFunction(()=>window.__cosmos.game.thrustFeedback?.state==='coasting');
 await page.evaluate(()=>{const a=window.__cosmos;a.game.timePaused=true;for(let i=0;i<110;i++)a.updateFlight(.05,a.zeroInput);});
 await page.waitForFunction(()=>document.getElementById('hud').dataset.introduction==='time');
 assert.ok(await page.locator('#time-toggle').isVisible());assert.equal(await page.locator('#photo-button').isVisible(),false);
 assert.match(await page.locator('#objective-caption').textContent(),/T speeds up time; \[ slows it/);
 await page.evaluate(()=>window.__cosmos.input.setDevice('gamepad'));await page.waitForFunction(()=>document.getElementById('objective-caption').textContent.includes('D-pad'));

 await page.keyboard.press('t');await page.evaluate(()=>{const a=window.__cosmos;for(let i=0;i<125;i++)a.updateFlight(.05,a.zeroInput);});
 await page.waitForFunction(()=>document.getElementById('hud').dataset.introduction==='explore');
 assert.ok(await page.locator('#map-button').isVisible());assert.ok(await page.locator('#photo-button').isVisible());
 assert.deepEqual(await page.evaluate(()=>window.__cosmos.game.experience.seen),[],'Covered science remains unread');
 await page.screenshot({path:`tests/screenshots/opening-${name}-explore.png`});
 // Choosing another viewpoint ends the introduction immediately.
 await page.click('#map-button');await page.click('[data-action=study][data-value=moon]');
 assert.equal(await page.locator('#hud').getAttribute('data-introduction'),'');
 const idleIntroduction=await page.evaluate(async()=>{const a=window.__cosmos;await a.startJourney(false);a.game.timePaused=true;const phases=[];for(let i=0;i<1100;i++){a.updateFlight(.05,a.zeroInput);a.experienceGuide.render();const phase=document.getElementById('hud').dataset.introduction;if(phases.at(-1)!==phase)phases.push(phase);}return phases;});
 assert.deepEqual(idleIntroduction,['look','flight','time','explore','']);opening.idleIntroduction=idleIntroduction;
 opening.layouts=[];
 for(const viewport of [{width:1440,height:900},{width:1024,height:640},{width:800,height:600}]){
  await page.setViewportSize(viewport);await page.evaluate(async()=>{await window.__cosmos.startJourney(false);window.__cosmos.game.timePaused=true;});
  for(const [phase,steps] of [['look',0],['flight',285],['time',205],['explore',365]]){
   await page.evaluate(steps=>{const a=window.__cosmos;for(let i=0;i<steps;i++)a.updateFlight(.05,a.zeroInput);},steps);
   await page.waitForFunction(phase=>document.getElementById('hud').dataset.introduction===phase,phase);
   const layout=await page.evaluate(()=>{
    const r=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,height:b.height,width:b.width};};
    const reading=r(document.getElementById('scene-reading')),buttons=[...document.querySelectorAll('#hud button')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility==='visible').map(e=>({id:e.id,...r(e)}));
    const feedback=r(document.getElementById('thrust-feedback'));
    return{reading,buttons,feedback,phase:document.getElementById('hud').dataset.introduction};
   });
   assert.ok(layout.reading.left>=0&&layout.reading.top>=0&&layout.reading.right<=viewport.width&&layout.reading.bottom<=viewport.height-100,JSON.stringify(layout));
   assert.ok(layout.buttons.every(b=>b.left>=0&&b.right<=viewport.width&&b.top>=0&&b.bottom<=viewport.height&&b.height>=44),JSON.stringify(layout));
   assert.ok(layout.buttons.some(b=>b.id==='map-button'));
   if(phase==='look')assert.deepEqual(layout.buttons.map(b=>b.id).sort(),['controls-button','map-button','pause-button']);
   if(phase==='flight')assert.ok(!layout.buttons.some(b=>b.id==='time-toggle'||b.id==='photo-button'));
   if(phase==='time')assert.ok(layout.buttons.some(b=>b.id==='time-toggle')&&!layout.buttons.some(b=>b.id==='photo-button'));
   opening.layouts.push({viewport,...layout});
   if(viewport.width===800)await page.screenshot({path:'tests/screenshots/opening-'+name+'-'+phase+'-compact.png'});
  }
 }
 await page.setViewportSize({width:1440,height:900});

 await page.evaluate(()=>window.__cosmos.startChapter(0));
 await page.evaluate(()=>{window.__cosmos.game.timePaused=true;});
 // Keyboard activation of HUD buttons must not also change the flight clock.
 await page.focus('#photo-button');await page.keyboard.press('Space');await page.waitForFunction(()=>!document.getElementById('photo-receipt').hidden);
 assert.equal(await page.evaluate(()=>window.__cosmos.game.timePaused),true);assert.equal(await page.evaluate(()=>window.__cosmos.archive.memory.size),1);
 await page.focus('#view-button');await page.keyboard.press('Space');assert.equal(await page.locator('#panel').getAttribute('data-view'),'camera');await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'universe');await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>window.__cosmos.game.timePaused),false);assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'play');await page.evaluate(()=>{window.__cosmos.game.timePaused=true;});
 // Pointer actions relinquish button focus, so the next Space press controls
 // time. Clicking/dragging the scene also returns focus to the flight view.
 await page.click('#photo-button');assert.equal(await page.evaluate(()=>document.activeElement.id),'universe');
 await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>window.__cosmos.game.timePaused),false);
 await page.evaluate(()=>{window.__cosmos.game.timePaused=true;});await page.focus('#photo-button');await page.mouse.click(640,300);assert.equal(await page.evaluate(()=>document.activeElement.id),'universe');
 await page.click('#pause-button');
 const before=await page.evaluate(()=>{const g=window.__cosmos.game;return {p:g.player.position.toArray(),v:g.player.velocity.toArray(),rate:g.rateIndex,view:g.view,fuel:g.fuel};});
 assert.equal((await active()).action,'resume');await page.keyboard.press('ArrowDown');assert.equal((await active()).action,'review');
 await page.keyboard.press('ArrowDown');assert.equal((await active()).action,'map');await page.keyboard.press('Enter');assert.equal(await page.locator('#panel').getAttribute('data-view'),'map');
 for(const key of ['c','h','z','n','p','g','v','l'])await page.keyboard.press(key);
 const after=await page.evaluate(()=>{const g=window.__cosmos.game;return {p:g.player.position.toArray(),v:g.player.velocity.toArray(),rate:g.rateIndex,view:g.view,fuel:g.fuel};});
 assert.deepEqual(after,before);
 await page.keyboard.press('End');const last=await active();assert.equal(last.action,'depart');await page.keyboard.press('Tab');assert.equal((await active()).id,'panel-close');await page.keyboard.press('Shift+Tab');assert.deepEqual(await active(),last);
 await page.keyboard.press('Escape');await page.click('#pause-button');await page.click('[data-action=settings]');
 await page.focus('#volume');const volume=Number(await page.inputValue('#volume'));await page.keyboard.press('ArrowRight');assert.ok(Number(await page.inputValue('#volume'))>volume);
 await page.evaluate(()=>{window.testPad={id:'Synthetic Xbox test',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.testPad]});});
 const oldVolume=Number(await page.inputValue('#volume'));await pad(15);assert.ok(Number(await page.inputValue('#volume'))>oldVolume);
 await pad(13);assert.equal((await active()).id,'feedback');await pad(12);assert.equal((await active()).id,'volume');
 await page.click('[data-settings-tab=picture]');await page.focus('#quality');const quality=await page.locator('#quality').evaluate(el=>el.selectedIndex);await pad(15);assert.equal(await page.locator('#quality').evaluate(el=>el.selectedIndex),Math.min(quality+1,3));
 await page.click('[data-settings-tab=sound]');await page.focus('#settings-sound');const wasMuted=await page.evaluate(()=>window.__cosmos.audio.muted);await pad(0);assert.equal(await page.evaluate(()=>window.__cosmos.audio.muted),!wasMuted);assert.equal(await page.locator('#settings-sound').getAttribute('aria-pressed'),String(wasMuted));await pad(0);
 await pad(1);assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'play');
 await pad(9);assert.equal((await active()).action,'resume');await pad(13);assert.equal((await active()).action,'review');await pad(0);assert.equal(await page.locator('#panel').getAttribute('data-view'),'review');await pad(1);assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'play');
 await page.click('#map-button');await page.locator('[data-action=study]').first().click();await page.evaluate(()=>window.__cosmos.game.timePaused=true);
 await page.click('#map-button');await page.screenshot({path:`tests/screenshots/menu-navigation-${name}-encounter.png`});
 const hiddenFocus=[];for(let i=0;i<20;i++){await pad(13);hiddenFocus.push(await page.evaluate(()=>!!document.activeElement.closest('details:not([open])')&&!document.activeElement.matches('summary')));}assert.ok(hiddenFocus.every(v=>!v));
 // Viewpoints precede the chart in the reading/focus order, and every local
 // pass is visible on first entry even in the compact supported viewport.
 const studies=await page.evaluate(async()=>(await import('/src/encounter-context.js')).STUDIES);
 // A revisit must not mark an unread note while its invitation covers it.
 await page.click('[data-action=map-tab][data-value=voyage]');await page.click('[data-action=chapter][data-value="0"]');
 await page.evaluate(()=>{const a=window.__cosmos;a.game.timePaused=true;a.game.experience.seen=[];a.game.chapterTime=13;a.experienceGuide.guide.reset();});
 await page.waitForFunction(()=>window.__cosmos.experienceGuide.guide.active,null,{timeout:10000});
 const unread=await page.evaluate(()=>window.__cosmos.experienceGuide.guide.active.id);
 await page.click('#map-button');await page.click('[data-action=restart]');await page.click('#time-toggle');
 await page.waitForTimeout(4500);
 const invitation=await page.evaluate(()=>{const a=window.__cosmos;return {caption:document.querySelector('#objective-caption').textContent,seen:[...a.game.experience.seen],active:a.experienceGuide.guide.active,time:a.game.chapterTime};});
 assert.ok(invitation.time<12);assert.equal(invitation.active,null);assert.ok(!invitation.seen.includes(unread));assert.match(invitation.caption,/Sunlit oceans/);
 await page.evaluate(()=>window.__cosmos.game.chapterTime=12);
 await page.waitForFunction(id=>window.__cosmos.experienceGuide.guide.active?.id===id,unread);
 const returned=await page.evaluate(()=>{const a=window.__cosmos,g=a.game;return {caption:document.querySelector('#objective-caption').textContent,note:a.experienceGuide.guide.active.text,position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),fuel:g.fuel,seconds:g.localSeconds};});
 assert.equal(returned.caption,returned.note);
 await page.waitForFunction(id=>window.__cosmos.game.experience.seen.includes(id),unread,{timeout:10000});
 const retained=await page.evaluate(()=>{const g=window.__cosmos.game;return {position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),fuel:g.fuel,seconds:g.localSeconds};});
 for(const key of ['position','velocity','fuel','seconds'])assert.deepEqual(retained[key],returned[key]);
 const scienceRevisit={note:unread,unreadDuringInvitation:true,returnedAfterInvitation:true,readAfterVisibleDwell:true,physicalStatePreserved:true};
 await page.click('#map-button');
 const encounterLayouts=[],studyVisits=[];
 const photographCount=await page.evaluate(()=>window.__cosmos.archive.memory.size);
 for(const chapter of [0,1,2]){
  await page.click('[data-action=map-tab][data-value=voyage]');await page.click(`[data-action=chapter][data-value="${chapter}"]`);await page.click('#map-button');
  for(const viewport of [{width:1440,height:900},{width:1024,height:640},{width:800,height:600}]){
   await page.setViewportSize(viewport);
   await page.evaluate(()=>{for(const e of document.querySelectorAll('.atlas-body,.encounter-inspector'))e.scrollTop=0;return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
   const layout=await page.evaluate(()=>{
    const footer=document.querySelector('.atlas-footer').getBoundingClientRect(),top=document.querySelector('.atlas-body').getBoundingClientRect().top;
    const studies=[...document.querySelectorAll('[data-action=study]')].map(e=>{const r=e.getBoundingClientRect();return{id:e.dataset.value,text:e.textContent,top:r.top,bottom:r.bottom,height:r.height,left:r.left,right:r.right};});
    const first=document.querySelector('.exploration-map button');return{top,footerTop:footer.top,footerBottom:footer.bottom,studies,firstAction:first.dataset.action,duplicateEntries:document.querySelectorAll('[data-action=opportunity],[data-action=suggestion]').length};
   });
   assert.equal(layout.firstAction,'study');assert.equal(layout.duplicateEntries,0);
   assert.equal(layout.studies.length,studies.filter(s=>s.chapter===chapter).length);
   assert.ok(layout.studies.every(s=>s.top>=layout.top&&s.bottom<=layout.footerTop&&s.height>=44&&s.left>=0&&s.right<=viewport.width),JSON.stringify({chapter,viewport,layout}));
   assert.ok(layout.footerBottom<=viewport.height);encounterLayouts.push({chapter,viewport,...layout});
   await page.screenshot({path:`tests/screenshots/encounter-menu-${name}-${chapter}-${viewport.width}.png`});
  }
  for(const study of studies.filter(s=>s.chapter===chapter)){
   const entry=page.locator(`[data-action=study][data-value="${study.id}"]`);await entry.focus();
   if(study.id==='io')await pad(0);else await page.keyboard.press(study.id==='ring-plane'?'Space':'Enter');
   await page.waitForFunction(id=>window.__cosmos.game.mode==='play'&&window.__cosmos.game.study===id,study.id);
   const state=await page.evaluate(()=>{const a=window.__cosmos,g=a.game;g.timePaused=true;return {study:g.study,epoch:a.world.epoch,title:document.getElementById('chapter-title').textContent,date:document.getElementById('chapter-date').textContent,seconds:g.localSeconds,anchor:a.world.ephemeris.epochs[a.world.epoch],photos:a.archive.memory.size,speed:g.player.velocity.length(),position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),fuel:g.fuel};});
   assert.equal(state.study,study.id);assert.equal(state.epoch,study.epoch);assert.equal(state.title,study.title);assert.ok(state.date.includes(new Date(Date.parse(state.anchor+'Z')+Math.floor(state.seconds)*1000).toISOString().slice(11,19)+' UTC'));assert.ok(state.speed>0);assert.equal(state.photos,photographCount);
   await page.click('#map-button');assert.equal(await page.locator(`[data-action=study][data-value="${study.id}"]`).getAttribute('aria-current'),'location');
   const subject=await page.locator('[data-action=destination]').last().getAttribute('data-value');await page.click(`[data-action=destination][data-value="${subject}"]`);
   const afterBearing=await page.evaluate(()=>{const g=window.__cosmos.game;return {destination:g.destination,position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),fuel:g.fuel};});
   assert.equal(afterBearing.destination,subject);for(const key of ['position','velocity','fuel'])assert.deepEqual(afterBearing[key],state[key]);
   assert.equal(await page.locator('#toast').isVisible(),false);assert.equal(await page.locator('#toast').textContent(),'');
   await page.click('#map-button');studyVisits.push({id:study.id,epoch:state.epoch,photos:state.photos,activation:study.id==='io'?'synthetic Xbox A':study.id==='ring-plane'?'Space':'Enter',bearingPreservesFlight:true,bearingUsesExistingMarker:true});
  }
 }
 await page.setViewportSize({width:1024,height:640});await page.click('#panel-close');await page.click('#pause-button');
 const fit=await page.locator('.pause-menu button').evaluateAll(es=>es.every(el=>el.getBoundingClientRect().bottom<=innerHeight));assert.ok(fit);
 await page.click('[data-action=resume]');await page.click('#depart');
 await page.waitForFunction(()=>document.getElementById('map-button').textContent==='Voyage');
 await page.click('#map-button');assert.equal(await page.locator('[data-action=map-tab][aria-pressed=true]').getAttribute('data-value'),'solar');
 assert.deepEqual(errors,[]);
 const report={version:JSON.parse(await fs.readFile('package.json','utf8')).version,nativeHUDButtonSpace:true,pointerReturnsToFlightKeys:true,panelReturnRestoresFlightKeys:true,keyboardArrows:true,nativeRangeKeys:true,tabFocusTrap:true,flightShortcutsDoNotChangePausedFlight:true,syntheticXboxNavigation:true,controllerRangesAndSelects:true,controllerSoundToggle:true,controllerReviewAndCancellation:true,closedDetailsSkipped:true,scienceRevisit,encounterLayouts,studyVisits,contextualExploreVoyageEntry:true,compactPauseFits:true,physicalXboxTested:false,errors};
 outcomes.push({name,engineVersion:browser.version(),opening,...report});console.log({name,passed:true});
}finally{await browser.close();}

}
await fs.writeFile('tests/menu-navigation-results.json',JSON.stringify({version:JSON.parse(await fs.readFile('package.json','utf8')).version,outcomes},null,2)+'\n');
