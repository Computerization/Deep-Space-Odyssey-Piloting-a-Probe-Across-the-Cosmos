import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const name='Chrome';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const errors=[],results={engine:name,checks:[]};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text().slice(0,600))}});
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});
 if(process.argv.includes('--interface')){
  await page.click('#begin');await page.waitForFunction(()=>!!document.pointerLockElement);
  for(const [width,height] of [[1440,900],[1024,640],[800,600]]){
   await page.setViewportSize({width,height});
   const layout=await page.evaluate(()=>({film:document.querySelector('#launch-film').getBoundingClientRect().bottom,copy:document.querySelector('.passage-copy').getBoundingClientRect().top}));
   assert.ok(layout.copy>=layout.film,JSON.stringify({width,height,...layout}));
  }
  await page.setViewportSize({width:1440,height:900});await page.screenshot({path:`tests/screenshots/interface-${name}-launch.png`});
  await page.keyboard.press('n');await page.waitForFunction(()=>__cosmos.game.stage==='encounter');
  await page.waitForFunction(()=>!document.querySelector('#hud').classList.contains('arrival-flight'));
  const hud=await page.evaluate(()=>{
   const action=document.querySelector('#journey-action'),keys=document.querySelector('#flight-keys');
   const observer=new MutationObserver(()=>{}),opts={attributes:true,childList:true,subtree:true};
   __cosmos.journey.render();observer.observe(action,opts);observer.observe(keys,opts);
   for(let i=0;i<120;i++)__cosmos.journey.render();
   const mutations=observer.takeRecords().length;observer.disconnect();return {updates:120,mutations};
  });assert.equal(hud.mutations,0,'steady field actions and controls keep their DOM nodes');results.steadyHUD=hud;
  const unmapped=await page.locator('#hud button').evaluateAll(nodes=>nodes.filter(n=>n.checkVisibility()&&!n.disabled&&!n.hasAttribute('aria-keyshortcuts')).map(n=>n.id));
  assert.deepEqual(unmapped,[],'every visible flight action has a shortcut');
  await page.screenshot({path:`tests/screenshots/interface-${name}-flight.png`});
  const resume=async()=>{await page.waitForTimeout(300);await page.keyboard.press('Escape');await page.waitForFunction(()=>__cosmos.game.mode==='play');await page.waitForTimeout(300);};
  await page.keyboard.press('k');await page.locator('#panel[data-view=camera]').waitFor();
  assert.equal(await page.evaluate(()=>!!document.pointerLockElement),false);
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'camera-chase');
  await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>__cosmos.game.view),'chase');await resume();
  await page.keyboard.press('c');assert.equal(await page.evaluate(()=>__cosmos.game.view),'probe');
  for(const [key,view] of [['m','map'],['j','journal'],['u','review'],['/','guide']]){
   await page.keyboard.press(key);await page.locator(`#panel[data-view=${view}]`).waitFor();await resume();
  }
  await page.keyboard.press('p');await page.locator('#photo-receipt').waitFor();await page.keyboard.press('o');await page.locator('#panel[data-view=photograph]').waitFor();await page.waitForTimeout(300);await page.keyboard.press('Escape');await page.locator('#panel[data-view=journal]').waitFor();await resume();
  await page.keyboard.press('Tab');await page.locator('#panel[data-view=pause]').waitFor();await resume();
  for(const chapter of [1,2,3,4,5]){
   await page.evaluate(chapter=>__cosmos.startChapter(chapter),chapter);await page.waitForTimeout(400);
   assert.deepEqual(await page.locator('#hud button').evaluateAll(nodes=>nodes.filter(n=>n.checkVisibility()&&!n.disabled&&!n.hasAttribute('aria-keyshortcuts')).map(n=>n.id)),[]);
   if(chapter===2){
    assert.ok(!(await page.locator('#journey-caption').textContent()).includes('Face the world'),'an already visible discovery does not ask the player to turn towards it');
    for(const [width,height] of [[1024,640],[800,600]]){
     await page.setViewportSize({width,height});await page.waitForTimeout(200);
     const box=await page.locator('#flight-keys').boundingBox();assert.ok(box.x+box.width<=width&&box.y+box.height<=height);
    }
    await page.waitForFunction(()=>document.querySelector('#hud').classList.contains('upper-field-guide'));
    assert.ok(await page.locator('#waypoint').evaluate(el=>el.classList.contains('resolved')),'observed Saturn uses a limb or margin label, not a marker across the clouds');
    const guideBox=await page.locator('#journey-direction').boundingBox(),headingBox=await page.locator('.chapter-heading').boundingBox();
    assert.ok(guideBox.y>headingBox.y+headingBox.height&&guideBox.y+guideBox.height<360,'compact guide clears the heading and the lower Saturn disc');
    await page.screenshot({path:`tests/screenshots/interface-${name}-compact.png`});await page.setViewportSize({width:1440,height:900});
   }
  }
  assert.deepEqual(errors,[]);results.checks=['launch-captions-outside-film','all-flight-actions-mapped','camera-menu-and-view-switch','Tab-Enter-menu-navigation','map-journal-review-help-shortcuts','recent-photo-shortcut','Tab-pause','later-chapter-shortcuts','compact-flight-layout'];results.errors=errors;
  await fs.writeFile(`tests/interface-${name}-results.json`,JSON.stringify(results,null,2)+'\n');console.log('Interface passed');
 }else if(process.argv.includes('--free')){
  Object.assign(results,await (await import('./free-exploration.mjs')).checkFreeExploration(page,name));
  assert.deepEqual(errors,[]);results.errors=errors;await fs.writeFile(`tests/free-exploration-${name}-results.json`,JSON.stringify(results,null,2)+'\n');console.log('Free exploration passed');
 }else if(process.argv.includes('--discovery')){
  await page.click('#begin');await page.waitForFunction(()=>!!document.pointerLockElement);await page.keyboard.press('n');await page.waitForFunction(()=>__cosmos.game.stage==='encounter');
  await page.locator('#journey-marker').waitFor({state:'visible'});
  assert.equal(await page.locator('#journey-marker').textContent(),'The blue horizon');
  await page.screenshot({path:`tests/screenshots/journey-${name}-opening.png`});
  // Follow the visible cues with real flight controls, without steering the ship from the fixture.
  await page.keyboard.down('w');await page.waitForFunction(()=>document.querySelector('#journey-caption').textContent.startsWith('Release W'),null,{timeout:12000});
  await page.keyboard.up('w');await page.waitForFunction(()=>document.querySelector('#journey-caption').textContent.startsWith('Coasting'),null,{timeout:4000});
  await page.waitForFunction(()=>document.querySelector('#journey-caption').textContent.startsWith('Hold Space'),null,{timeout:12000});
  await page.keyboard.down('Space');await page.waitForFunction(()=>document.querySelector('#journey-caption').textContent.includes('slowing'),null,{timeout:2500});
  await page.waitForTimeout(2000);await page.keyboard.up('Space');
  await page.waitForFunction(()=>__cosmos.game.experience.seen.includes('trail-earth-horizon'),null,{timeout:10000});
  assert.equal(await page.evaluate(()=>__cosmos.archive.memory.size),0,'discovery does not force a photograph');
  await page.screenshot({path:`tests/screenshots/journey-${name}-first-discovery.png`});
  await page.keyboard.press('j');await page.locator('.field-notes').waitFor();assert.equal(await page.locator('[data-action=journal-tab][aria-pressed=true]').getAttribute('data-value'),'notes');
  await page.waitForTimeout(300);await page.keyboard.press('Escape');await page.waitForTimeout(300);await page.keyboard.press('x');await page.waitForFunction(()=>__cosmos.game.journeyStep===1);
  await page.evaluate(async()=>{const a=__cosmos,T=await import('three');a.game.player.position.copy(a.game.routeTarget.goal);a.game.player.velocity.set(0,0,0);a.game.angular.set(0,0,0);a.game.player.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(a.game.player.position,a.world.bodyPositions.earth,new T.Vector3(0,1,0)));});
  await page.waitForFunction(()=>__cosmos.game.experience.seen.includes('trail-earth-night'),null,{timeout:10000});
  await page.screenshot({path:`tests/screenshots/journey-${name}-crescent-discovery.png`});
  assert.equal(await page.evaluate(()=>__cosmos.game.mode),'play');assert.deepEqual(errors,[]);
  results.checks=['opening-with-one-instruction','first-discovery-through-keyboard-flight','release-coast-brake-cues','notes-without-photographs','crescent-discovery','no-forced-modal'];results.errors=errors;await fs.writeFile(`tests/discovery-${name}-results.json`,JSON.stringify(results,null,2)+'\n');console.log('Discovery flow passed');
 }else if(process.argv.includes('--local')){
  for(const [chapter,study,body] of [[0,'moon','earth'],[1,'io','jupiter']]){
   await page.evaluate(({chapter,study})=>{const a=__cosmos;a.startChapter(chapter);a.beginTransit(0,{chapter,study,name:study});},{chapter,study});
   const samples=[];
   for(let i=0;i<8;i++){
    await page.waitForTimeout(1000);
    samples.push(await page.evaluate(body=>{const a=__cosmos,t=a.game.transit;return{progress:t.progress,local:t.local,showWorlds:t.showWorlds,veil:Number(document.querySelector('#passage-veil').style.opacity),range:a.game.player.position.distanceTo(a.world.bodyPositions[body])/a.world.bodies[body].data.radius};},body));
    if(i===3)await page.screenshot({path:`tests/screenshots/journey-${name}-local-${study}.png`});
   }
   assert.ok(samples.every(s=>s.local&&s.showWorlds&&s.veil===0&&s.range>1));
   await page.waitForFunction(study=>__cosmos.game.stage==='encounter'&&__cosmos.game.study===study,study,{timeout:15000});
   results.checks.push({study,samples});
  }
  await page.evaluate(()=>{__cosmos.startChapter(2);__cosmos.game.showHud=false;document.querySelector('#hud').hidden=true});await page.waitForTimeout(1200);await page.screenshot({path:`tests/screenshots/journey-${name}-saturn-clouds-rings.png`});
  assert.deepEqual(errors,[]);results.errors=errors;await fs.writeFile(`tests/local-transfer-${name}-results.json`,JSON.stringify(results,null,2)+'\n');console.log('Local transfers passed');
 }else{
 await page.click('#begin');
 assert.equal(await page.evaluate(()=>__cosmos.game.stage),'launch');
 await page.waitForTimeout(2500);assert.ok(await page.evaluate(()=>document.querySelector('#launch-film').currentTime>1));assert.ok(await page.evaluate(()=>!!document.pointerLockElement));
 const launchLayout=await page.evaluate(()=>({film:document.querySelector('#launch-film').getBoundingClientRect().bottom,copy:document.querySelector('.passage-copy').getBoundingClientRect().top}));assert.ok(launchLayout.copy>=launchLayout.film,'launch captions sit outside the film');
 await page.screenshot({path:`tests/screenshots/journey-${name}-launch.png`});
 await page.keyboard.press('Escape');await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>__cosmos.game.mode),'panel');assert.ok(await page.evaluate(()=>document.querySelector('#launch-film').paused));
 await page.click('[data-action=resume]');await page.keyboard.press('n');await page.waitForFunction(()=>__cosmos.game.stage==='encounter');
 await page.locator('#journey-marker').waitFor({state:'visible',timeout:10000});
 const sample=()=>page.evaluate(()=>({position:__cosmos.game.player.position.toArray(),velocity:__cosmos.game.player.velocity.toArray(),attitude:__cosmos.game.player.quaternion.toArray(),look:__cosmos.game.look.toArray(),stage:__cosmos.game.stage}));
 const initial=await sample();await page.mouse.move(850,460);await page.waitForTimeout(500);const turned=await sample();assert.notDeepEqual(turned.attitude,initial.attitude,'mouse turns without holding a button');
 await page.keyboard.down('w');await page.waitForTimeout(1300);await page.keyboard.up('w');const powered=await sample();await page.waitForTimeout(800);const coasting=await sample();assert.ok(Math.hypot(...powered.velocity)>100);assert.ok(Math.hypot(...coasting.velocity.map((v,i)=>v-powered.velocity[i]))<.001,'release retains momentum');
 await page.keyboard.down('Space');await page.waitForTimeout(2300);await page.keyboard.up('Space');const braking=await sample();assert.ok(Math.hypot(...braking.velocity)<Math.hypot(...powered.velocity)*.15);
 await page.keyboard.down('q');await page.waitForTimeout(600);await page.keyboard.up('q');const rolled=await sample();assert.notDeepEqual(rolled.attitude,braking.attitude);
 await page.keyboard.down('r');await page.waitForTimeout(700);await page.keyboard.up('r');assert.ok(Math.hypot(...(await sample()).velocity)>100);await page.keyboard.down('Space');await page.waitForTimeout(1800);await page.keyboard.up('Space');
 results.controls={initial,turned,powered,coasting,braking,rolled};results.checks.push('mouse-without-drag','inertial-coast','active-brake','QE-roll','RF-vertical');
 // Reproduce the actual fieldwork geometry, then use the normal X interaction.
 await page.evaluate(async()=>{const a=__cosmos,t=await import('three');a.game.player.position.copy(a.game.routeTarget.goal);a.game.player.velocity.set(0,0,0);a.game.look.identity();a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(a.game.player.position,a.world.bodyPositions.earth,new t.Vector3(0,1,0)));});
 await page.waitForFunction(()=>__cosmos.game.journeyReady);await page.keyboard.press('x');await page.waitForFunction(()=>__cosmos.game.experience.seen.includes('trail-earth-horizon'));
 assert.ok(await page.evaluate(()=>__cosmos.archive.memory.size>0));await page.screenshot({path:`tests/screenshots/journey-${name}-discovery.png`});await page.keyboard.press('x');await page.waitForTimeout(250);assert.equal(await page.locator('#journey-marker').textContent(),'Earth at dusk');results.checks.push('fieldwork-photo-and-note','next-local-discovery');
 // Discover a second view without X, retaining manual flight and an optional onward exit.
 await page.evaluate(async()=>{const a=__cosmos,T=await import('three');a.game.player.position.copy(a.game.routeTarget.goal);a.game.player.velocity.set(0,0,0);a.game.angular.set(0,0,0);a.game.player.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(a.game.player.position,a.world.bodyPositions.earth,new T.Vector3(0,1,0)));});
 const freePose=await sample();
 await page.waitForFunction(()=>__cosmos.game.experience.seen.includes('trail-earth-night'),null,{timeout:10000});
 assert.deepEqual((await sample()).position,freePose.position,'discovery never moves the player');
 assert.equal(await page.evaluate(()=>__cosmos.game.mode),'play');
 assert.ok(await page.locator('#depart').isVisible());
 await page.screenshot({path:`tests/screenshots/journey-${name}-automatic-discovery.png`});
 await page.waitForFunction(()=>__cosmos.game.journeyStep===2,null,{timeout:15000});
 assert.equal(await page.locator('#journey-action').textContent(),'X · Moon →');
 results.checks.push('automatic-viewpoint-discovery','uninterrupted-manual-flight','next-discovery-without-click');
 await page.keyboard.press('Escape');await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>__cosmos.game.mode),'panel');const paused=await sample();await page.waitForTimeout(400);assert.deepEqual(await sample(),paused);await page.click('[data-action=resume]');
 if(!process.argv.includes('--controls')){
 for(const [chapter,study,label] of [[1,null,'jupiter'],[2,'titan','titan'],[2,null,'saturn'],[3,null,'pale'],[4,null,'interstellar'],[5,null,'lightday']]){
  await page.keyboard.press('n');assert.equal(await page.evaluate(()=>__cosmos.game.stage),'transit');
  if(label==='jupiter'){await page.waitForTimeout(4500);await page.screenshot({path:`tests/screenshots/journey-${name}-passage.png`});}
  await page.waitForFunction(({chapter,study})=>__cosmos.game.stage==='encounter'&&__cosmos.game.chapter===chapter&&(__cosmos.game.study||null)===study,{chapter,study},{timeout:16000});
  await page.waitForTimeout(500);assert.ok(await page.locator('#journey-marker').isVisible());assert.ok(await page.locator('#depart').isVisible());
  await page.screenshot({path:`tests/screenshots/journey-${name}-${label}.png`});results.checks.push(label);console.log('Arrived',label);
  if(label==='pale'){
   await page.keyboard.press('x');await page.locator('.historic-earth').evaluate(img=>img.decode());assert.ok(await page.locator('#earth-locator').isHidden());
   await page.keyboard.press('Tab');await page.keyboard.press('Enter');assert.ok(await page.locator('#earth-locator').isVisible());
   await page.screenshot({path:'tests/screenshots/v107-archive.png'});await page.keyboard.press('Enter');assert.ok(await page.locator('#earth-locator').isHidden());
   await page.keyboard.press('Escape');await page.waitForTimeout(350);results.checks.push('locate-earth-on-archive');
  }
  if(label==='lightday'){
   const before=await sample();await page.keyboard.press('x');await page.locator('#radio-step').waitFor();
   await page.keyboard.press('Tab');await page.keyboard.press('Enter');assert.equal(await page.locator('#radio-step').textContent(),'Advance to Voyager reception');
   await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'radio-hours');
   await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#radio-time').textContent(),'1 h');
   await page.keyboard.press('Tab');await page.keyboard.press('Enter');assert.equal(await page.locator('#radio-time').textContent(),'24 h');
   await page.screenshot({path:'tests/screenshots/v107-signal.png'});await page.keyboard.press('Enter');assert.equal(await page.locator('#radio-time').textContent(),'48 h');
   await page.keyboard.press('Escape');await page.waitForFunction(()=>__cosmos.game.mode==='play');assert.deepEqual((await sample()).position,before.position);results.checks.push('round-trip-radio-without-moving-probe');
  }
 }
 await page.keyboard.press('n');assert.equal(await page.locator('#panel-title').textContent(),'Still travelling');results.checks.push('future-outlook');
 await page.screenshot({path:`tests/screenshots/journey-${name}-future.png`});
 }
 assert.deepEqual(errors,[]);results.errors=errors;
 await fs.writeFile(`tests/${process.argv.includes('--controls')?'controls':'journey'}-${name}-results.json`,JSON.stringify(results,null,2)+'\n');console.log('Voyage passed');
 }
}finally{await browser.close()}
