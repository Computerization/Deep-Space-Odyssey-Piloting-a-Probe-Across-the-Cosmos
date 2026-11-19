import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],studies=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});
 await page.click('#begin');
 for(const [chapter,id,body,epoch] of [[0,'moon','moon',0],[0,'earth-shadow','earth',0],[1,'io','io',1],[2,'titan','titan',3],[2,'ring-plane','saturn',2]]){
  await page.evaluate(ch=>{window.__cosmos.startChapter(ch);window.__cosmos.game.timePaused=true;},chapter);
  await page.click('#map-button');
  const entry=page.locator(`[data-action=study][data-value=${id}]`);
  assert.ok(await entry.evaluate(el=>el.getBoundingClientRect().bottom<innerHeight));
  await entry.click();
  await page.evaluate(()=>window.__cosmos.game.timePaused=true);
  await page.waitForTimeout(350);
  const result=await page.evaluate(async ({id,body})=>{
   const a=window.__cosmos,g=a.game,w=a.world;
   const {GM}=await import('/src/propulsion.js'),{icrf}=await import('/src/world.js'),{BODY_DATA}=await import('/src/mission.js');
   const center=w.bodyPositions[body],v=icrf(w.ephemeris.objects.voyager[w.epoch].velocity).sub(icrf(w.ephemeris.objects[body][w.epoch].velocity));
   const historical=icrf(w.ephemeris.objects.voyager[w.epoch].position).distanceTo(center);
   const first=a.flightHistory.samples[0],initialPosition=g.player.position.clone().fromArray(first.position),initialVelocity=g.player.velocity.clone().fromArray(first.velocity);
   const r=initialPosition.distanceTo(center);
   const expected=v.lengthSq()/2-GM[body]/historical,actual=initialVelocity.lengthSq()/2-GM[body]/r;
   const {solarVisibility}=await import('/src/rendering/lighting.js');const local=g.player.position.clone().sub(center).applyQuaternion(w.bodies[body].group.quaternion.clone().invert());
   return {id,body,solarVisibility:solarVisibility(g.player.position,w.bodyPositions,BODY_DATA),latitude:Math.asin(local.y/local.length())*180/Math.PI,study:g.study,epoch:w.epoch,range:r,radii:r/BODY_DATA[body].radius,speed:g.player.velocity.length(),energyError:Math.abs(actual-expected),reference:g.referenceVelocity.toArray(),boundary:a.exploration.region(),history:a.flightHistory.samples.length,header:document.getElementById('chapter-date').textContent,motion:document.getElementById('motion-state').textContent};
  },{id,body});
  assert.equal(result.study,id);assert.equal(result.epoch,epoch);assert.equal(result.boundary.body,body);
  if(['moon','io','titan'].includes(id))assert.ok(Math.abs(result.radii-4)<.001);
  if(id==='earth-shadow')assert.ok(result.solarVisibility>.015&&result.solarVisibility<.985);
  if(id==='ring-plane')assert.ok(Math.abs(result.latitude)<4&&result.radii>2.5);
  assert.ok(result.energyError<1e-5);assert.match(result.motion,new RegExp(`Relative to ${body[0].toUpperCase()+body.slice(1)}`));
  assert.equal(await page.locator('#objective-title').isVisible(),false);
  await page.screenshot({path:`tests/screenshots/v19-${id}.png`});
  await page.click('#map-button');await page.screenshot({path:`tests/screenshots/v19-${id}-chart.png`});
  assert.match(await page.locator('.exploration-map').textContent(),/Unpowered coast forecast/);
  if(id==='titan'){
   await page.click('[data-action=map-tab][data-value=solar]');
   assert.match(await page.locator('.chart-inspector').textContent(),/05:41:00/);
   await page.click('[data-action=map-tab][data-value=local]');
  }
  await page.click('#panel-close');
  const state=await page.evaluate(()=>{
   const a=window.__cosmos;a.game.mode='panel';a.game.timePaused=false;
   for(let i=0;i<120;i++)a.updateFlight(1/60,{...a.zeroInput,thrust:1});
   a.game.timePaused=true;a.game.mode='play';a.flightHistory.record(a.game,0,true);
   return {p:a.game.player.position.toArray(),v:a.game.player.velocity.toArray(),fuel:a.game.fuel,time:a.game.localSeconds,history:a.flightHistory.samples.length};
  });
  assert.ok(state.fuel<104);assert.ok(state.history>1);
  await page.click('#pause-button'); // save
  await page.reload();await page.waitForFunction(()=>window.__cosmos,{timeout:90000});
  await page.click('#continue');await page.waitForTimeout(200);
  const resumed=await page.evaluate(()=>{const a=window.__cosmos;return {study:a.game.study,epoch:a.world.epoch,p:a.game.player.position.toArray(),v:a.game.player.velocity.toArray(),fuel:a.game.fuel,time:a.game.localSeconds};});
  assert.equal(resumed.study,id);assert.equal(resumed.epoch,epoch);assert.deepEqual(resumed.p,state.p);assert.deepEqual(resumed.v,state.v);assert.equal(resumed.fuel,state.fuel);assert.equal(resumed.time,state.time);
  assert.ok(await page.evaluate(()=>window.__cosmos.flightHistory.samples.length>1));
  await page.click('#review-button');await page.locator('#review-range').fill('0');await page.click('#review-apply');
  assert.equal(await page.evaluate(()=>window.__cosmos.game.localSeconds),0);
  assert.equal(await page.evaluate(()=>window.__cosmos.game.fuel),104);
  await page.click('#depart');
  const transit=await page.evaluate(()=>{const a=window.__cosmos;return {study:a.game.study,epoch:a.world.epoch,stage:a.game.stage,next:a.game.transit.next};});
  await page.waitForTimeout(100);assert.equal(await page.locator('#objective-title').isVisible(),true);
  assert.equal(transit.study,null);assert.equal(transit.stage,'transit');assert.equal(transit.next,chapter+1);assert.equal(transit.epoch,chapter);
  studies.push({...result,saveRestoresPhysicalState:true,reviewSurvivesReload:true,studyVisibleWithoutScrolling:true,returnsToHistoricalPassage:true});
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile('tests/studies-v19-results.json',JSON.stringify({version:'0.15.0',studies,errors},null,2));console.log(JSON.stringify(studies,null,2));
}finally{await browser.close();}
