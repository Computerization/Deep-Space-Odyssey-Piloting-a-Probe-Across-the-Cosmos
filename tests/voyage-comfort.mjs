import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,BASE_URL} from './browser.mjs';
const browser=await chromium.launch({channel:'chrome',args:['--use-angle=metal','--ignore-gpu-blocklist']});
const checks=[],errors=[],samples=[];
try{
 const page=await browser.newPage({reducedMotion:'reduce',viewport:{width:1440,height:900}});
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 const wait=fn=>page.waitForFunction(fn,null,{timeout:90000});
 const panel=type=>page.locator(`#panel[data-view="${type}"]`).waitFor();
 const action=name=>page.locator(`#panel [data-action="${name}"]`).first().click();
 const focus=()=>page.evaluate(()=>document.activeElement.dataset.action);
 const physical=()=>page.evaluate(()=>{const g=__cosmos.game;return [g.player.position.toArray(),g.player.quaternion.toArray(),g.player.velocity.toArray(),g.localSeconds,g.transit?.progress];});
 const steady=()=>page.evaluate(()=>document.documentElement.classList.contains('steady-passages'));
 await page.goto(BASE_URL+'/?test=1');await wait(()=>window.__cosmos);assert.equal(await steady(),true);
 await page.click('#begin');assert.ok(await page.locator('#launch-film').isVisible());
 await page.evaluate(()=>__cosmos.journey.update(12.9));
 await wait(()=>__cosmos.world.lastRender?.player===__cosmos.journey.departureView);
 assert.match(await page.locator('#passage-keys').textContent(),/N · Take control/);
 const earth=await page.evaluate(()=>__cosmos.world.lastRender.player.position.toArray());
 const launchPose=await physical();await page.waitForTimeout(320);assert.notDeepEqual((await physical())[0],launchPose[0]);
 assert.deepEqual(await page.evaluate(()=>__cosmos.world.lastRender.player.position.toArray()),earth);
 await page.screenshot({path:'tests/screenshots/comfort-departure.png'});
 await page.keyboard.press('n');await wait(()=>__cosmos.game.stage==='encounter');
 const handover=(await physical())[0];assert.ok(Math.hypot(...earth.map((v,i)=>v-handover[i]))<.00001);
 checks.push('archival film, steady Earth view and same-position handover');
 await page.keyboard.down('w');await page.waitForTimeout(500);await page.keyboard.up('w');await page.keyboard.press('Escape');await panel('pause');
 const parked=await physical();assert.ok(Math.hypot(...parked[2])>0);
 await action('settings');await page.click('#settings-tab-flight');await action('instruments');await page.keyboard.press('Escape');await panel('settings');
 assert.equal(await focus(),'instruments');await page.click('#settings-tab-picture');assert.equal(await page.inputValue('#passageMotion'),'system');
 await page.selectOption('#passageMotion','steady');await page.emulateMedia({reducedMotion:'no-preference'});assert.equal(await steady(),true);
 await action('back');await panel('pause');assert.equal(await focus(),'settings');
 for(const [button,view] of [['guide','guide'],['camera','camera'],['journal','journal'],['map','map']]){
  await action(button);await panel(view);if(button==='map'){await action('review');await panel('review');await page.keyboard.press('Escape');await panel('map');assert.equal(await focus(),'review');}
  await page.keyboard.press('Escape');await panel('pause');assert.equal(await focus(),button);
 }
 await page.waitForTimeout(240);assert.deepEqual(await physical(),parked);assert.equal(await page.evaluate(()=>!!document.pointerLockElement),false);
 await action('resume');await wait(()=>__cosmos.game.mode==='play');await page.keyboard.press('k');await panel('camera');await page.keyboard.press('Escape');await wait(()=>__cosmos.game.mode==='play');
 assert.notDeepEqual((await physical())[0],parked[0]);checks.push('nested back, focus, coasting pause, explicit and shortcut resume');
 await page.reload();await wait(()=>window.__cosmos);assert.ok(await steady());await page.click('#continue');await wait(()=>__cosmos.game.stage==='encounter');
 await page.keyboard.press('n');await wait(()=>__cosmos.game.transit?.progress>.03);
 for(const [name,size] of [['dated',{width:1440,height:900}],['local',{width:800,height:600}]]){
  await page.setViewportSize(size);
  if(name==='local')await page.evaluate(()=>{__cosmos.startChapter(0);__cosmos.beginTransit(0,{chapter:0,study:'moon',name:'Moon'});});
  await wait(()=>__cosmos.game.transit.progress>.07);
  const before=await page.evaluate(()=>[__cosmos.world.renderCount,__cosmos.game.transit.progress]);
  await page.waitForTimeout(420);
  const after=await page.evaluate(()=>[__cosmos.world.renderCount,__cosmos.game.transit.progress]);
  assert.equal(after[0],before[0]);assert.ok(after[1]>before[1]);samples.push({name,worldDraws:after[0]-before[0],progressDelta:after[1]-before[1]});
  const chart=page.locator('#passage-chart');assert.ok(await chart.isVisible());assert.equal(await chart.evaluate(n=>getComputedStyle(n).opacity),'1');
  assert.equal(await page.locator('#passage').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(5, 9, 12)');
  const a=await chart.boundingBox(),b=await page.locator('.passage-copy').boundingBox();assert.ok(a.y+a.height<b.y,JSON.stringify({a,b}));
  const labels=await chart.locator('text:visible').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return {name:n.textContent,x:b.x,y:b.y,r:b.right,b:b.bottom,h:b.height};}));
  for(const [i,l] of labels.entries()){
   assert.ok(l.h>=12,`Small ${l.name} label: ${l.h}px`);
   for(const o of labels.slice(i+1))assert.ok(l.r<=o.x||o.r<=l.x||l.b<=o.y||o.b<=l.y,`${l.name} overlaps ${o.name}`);
  }
  await page.screenshot({path:`tests/screenshots/comfort-${name}.png`});
 }
 await page.keyboard.press('Escape');await panel('pause');const held=await physical();await action('settings');await page.click('#settings-tab-picture');
 await page.selectOption('#passageMotion','cinematic');assert.equal(await steady(),false);assert.ok(await page.locator('#passage-chart').isHidden());
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await steady(),false);
 await page.selectOption('#passageMotion','system');assert.ok(await steady());assert.ok(await page.locator('#passage-chart').isVisible());
 await page.emulateMedia({reducedMotion:'no-preference'});await wait(()=>!document.documentElement.classList.contains('steady-passages'));
 await page.emulateMedia({reducedMotion:'reduce'});await wait(()=>document.documentElement.classList.contains('steady-passages'));
 assert.deepEqual(await physical(),held);await action('back');await action('resume');await wait(()=>__cosmos.game.study==='moon'&&__cosmos.game.stage==='encounter');
 checks.push('preference persistence and live system changes without changing a paused transfer','dated and local charts, compact layout, zero hidden world draws and arrival');
 const states=async()=>page.evaluate(()=>['moon','jupiter'].map(name=>{
  const a=__cosmos,g=a.game;a.startChapter(0);a.beginTransit(0,{chapter:name==='moon'?0:1,study:name==='moon'?'moon':null,name});const rows=[];
  for(let i=0;i<92&&g.stage==='transit';i++){a.updateFlight(.1,a.zeroInput);if(i%13===0||g.stage!=='transit')rows.push([g.stage,g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.transit?.jd]);}return rows;
 }));
 const calm=await states();await page.emulateMedia({reducedMotion:'no-preference'});await wait(()=>!document.documentElement.classList.contains('steady-passages'));assert.deepEqual(await states(),calm);
 checks.push('identical dated and local transfer positions, velocities, attitudes and dates in both presentations');
 const observation=await page.evaluate(async()=>{
  const a=__cosmos,g=a.game,w=a.world,j=a.journey,T=await import('three');g.experience.seen=[];a.startChapter(0);g.chapterTime=30;j.update(0);
  g.player.position.copy(g.routeTarget.goal);const target=w.bodyPositions.earth.clone().addScaledVector(w.getFrame('earth').y,.4*w.bodies.earth.data.radius);
  const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(g.player.position,target,w.getFrame('earth').y));
  function view(away){w.camera.quaternion.copy(q);if(away)w.camera.rotateY(Math.PI);w.camera.updateMatrixWorld();}
  const tick=n=>{for(let i=0;i<n;i++)j.update(.05);j.render();return {meter:document.querySelector('#field-feedback-meter i').style.transform,note:g.experience.seen.includes('trail-earth-horizon'),ready:g.journeyReady,status:document.querySelector('#field-status').textContent};};
  view(false);const earned=tick(44);view(true);const off=tick(4);view(false);const recovered=tick(2);g.angular.y=.8;const moving=tick(5);g.angular.y=0;const complete=tick(4);
  return {earned,off,recovered,moving,complete};
 });
 assert.ok(observation.earned.ready,JSON.stringify(observation));for(const [held,prior] of [[observation.off,observation.earned],[observation.moving,observation.recovered]]){
  assert.equal(held.meter,prior.meter);assert.equal(held.ready,false);assert.equal(held.status,'Reframing');assert.equal(held.note,false);
 }
 assert.equal(observation.complete.note,true);checks.push('actual Earth framing: meter holds during two corrections, photograph disables, note completes only back on subject');
 assert.deepEqual(errors,[]);await fs.writeFile('tests/comfort-Chrome-results.json',JSON.stringify({checks,samples,errors},null,2)+'\n');console.log(checks,samples);
}finally{await browser.close();}
