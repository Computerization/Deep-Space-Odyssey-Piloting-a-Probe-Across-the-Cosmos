import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const version=JSON.parse(await fs.readFile('package.json','utf8')).version,results=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],passages=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 for(let chapter=0;chapter<5;chapter++)for(const progress of [.1,.5,.9]){
  await page.evaluate(({chapter,progress})=>{const a=window.__cosmos;a.startChapter(chapter);a.beginTransit(progress);a.game.timePaused=true},{chapter,progress});
  const physical=await page.evaluate(()=>{const g=window.__cosmos.game;return {position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),jd:g.transit.jd}});
  await page.click('#map-button');assert.equal(await page.locator('[data-action=map-tab][aria-pressed=true]').getAttribute('data-value'),'solar');await page.locator('.chart-object-list [data-value=voyager]').click();
  const measured=await page.evaluate(async()=>{
   const a=window.__cosmos,{solarChartState}=await import('/src/solar-chart-state.js'),{formatDistance,signalTime}=await import('/src/flight.js');
   const state=solarChartState(a.world,a.game),position=a.game.player.position,earth=state.positions.earth;
   const distance=Math.hypot(position.x-earth[0],-position.z-earth[1],position.y-earth[2]);
   const marker=document.querySelector('.chart-object[data-value=voyager]'),r=marker.getBoundingClientRect();
   const arrival=document.querySelector('.chart-arrival'),end=arrival.getBoundingClientRect(),curve=document.querySelector('.chart-voyage-remaining');
   const from=curve.getPointAtLength(0),to=curve.getPointAtLength(curve.getTotalLength()),aMatrix=arrival.transform.baseVal.consolidate().matrix,mMatrix=marker.transform.baseVal.consolidate().matrix;
   const extent=Number(document.querySelector('[data-action=chart-scale][aria-pressed=true]').dataset.value),{eclipticPoint}=await import('/src/solar-chart-state.js');
   const visible=[...document.querySelectorAll('.solar-chart .chart-object text,.solar-chart .chart-arrival text')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect());
   const labelsOverlap=visible.some((a,i)=>visible.slice(i+1).some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top));
   const route={remaining:!!curve,arrivalVisible:end.top>=0&&end.bottom<=innerHeight&&end.left>=0&&end.right<=innerWidth,startError:Math.hypot(from.x-mMatrix.e,from.y-mMatrix.f),endError:Math.hypot(to.x-aMatrix.e,to.y-aMatrix.f),fullLegFits:state.route.remaining.every(p=>{const q=eclipticPoint(p);return Math.hypot(q[0],q[1])<=extent;}),dateText:document.querySelector('.chart-route').textContent,predicted:state.route.predicted,labelsOverlap};
   return {route,date:document.querySelector('.chart-inspector .eyebrow').textContent,flightDate:document.querySelector('#chapter-date').textContent,expectedDate:state.date,values:[...document.querySelectorAll('.chart-inspector dd')].map(e=>e.textContent),expectedSolarDistance:formatDistance(position.length()),expectedEarthDistance:formatDistance(distance),expectedLightTime:signalTime(distance),trail:!!document.querySelector('.chart-voyage-trail'),markerVisible:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,jd:a.game.transit.jd,selectedExtent:Number(document.querySelector('[data-action=chart-scale][aria-pressed=true]').dataset.value)};
  });
  assert.ok(measured.route.remaining&&measured.route.arrivalVisible&&measured.route.fullLegFits);assert.ok(measured.route.startError<.02&&measured.route.endError<.02);assert.equal(measured.route.labelsOverlap,false);assert.equal(measured.route.predicted,chapter===4);if(chapter===4)assert.match(measured.route.dateText,/projected/);assert.equal(measured.date,measured.expectedDate);assert.ok(measured.date.startsWith(measured.flightDate.split(' · projected')[0]));assert.equal(measured.values[0],measured.expectedSolarDistance);assert.equal(measured.values[1],measured.expectedEarthDistance);assert.equal(measured.values[2],measured.expectedLightTime);assert.ok(measured.trail&&measured.markerVisible);
  if(chapter===3&&progress===.5)await page.screenshot({path:`tests/screenshots/transit-chart-${name}.png`});
  await page.keyboard.press('Escape');await page.keyboard.press('i');assert.ok((await page.locator('#panel-content').textContent()).includes(measured.expectedLightTime));assert.ok(!(await page.locator('#panel-content').textContent()).includes('Local study'));
  await page.keyboard.press('Escape');assert.deepEqual(await page.evaluate(()=>{const g=window.__cosmos.game;return {position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),jd:g.transit.jd}}),physical);
  passages.push({chapter,progress,...measured});
 }
 // Choosing a far body locates it; explicitly narrowing the chart afterward is respected.
 await page.click('#map-button');await page.click('[data-action=chart-scale][data-value="2"]');await page.locator('.chart-object-list [data-value=neptune]').click();assert.equal(await page.locator('[data-action=chart-scale][aria-pressed=true]').textContent(),'35 AU');assert.equal(await page.locator('.chart-object.selected').getAttribute('data-value'),'neptune');await page.click('[data-action=chart-scale][data-value="2"]');assert.equal(await page.locator('[data-action=chart-scale][aria-pressed=true]').textContent(),'2 AU');await page.keyboard.press('Escape');await page.click('#map-button');assert.equal(await page.locator('[data-action=chart-scale][aria-pressed=true]').textContent(),'2 AU');
 await page.keyboard.press('Escape');await page.click('#pause-button');await page.click('[data-action=home]');await page.click('#chapter-select');assert.equal(await page.locator('[data-action=map-tab][aria-pressed=true]').getAttribute('data-value'),'voyage');await page.click('[data-action=map-tab][data-value=solar]');assert.ok((await page.locator('.chart-inspector .eyebrow').textContent()).includes('5 September 1977'));
 const layouts=[];
 for(const [width,height] of [[1440,900],[1024,640],[720,640]]){
  await page.setViewportSize({width,height});await page.keyboard.press('Escape');
  await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(2);a.beginTransit(.3);a.game.timePaused=true;});await page.click('#map-button');
  const layout=await page.evaluate(()=>{const footer=document.querySelector('.atlas-footer').getBoundingClientRect(),svg=document.querySelector('.solar-chart').getBoundingClientRect(),controls=[...document.querySelectorAll('.atlas-footer button,.chart-playback output')].map(e=>e.getBoundingClientRect());return {overflow:document.getElementById('panel').scrollWidth>innerWidth,footerVisible:footer.bottom<=innerHeight&&footer.top>=0,chartWidth:svg.width,arrival:!!document.querySelector('.chart-arrival'),controlsVisible:controls.every(r=>r.width>0&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth),controlsOverlap:controls.some((a,i)=>controls.slice(i+1).some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top))};});
  assert.ok(!layout.overflow&&layout.footerVisible&&layout.chartWidth>200&&layout.arrival&&layout.controlsVisible&&!layout.controlsOverlap);layouts.push({width,height,...layout});
  await page.screenshot({path:`tests/screenshots/transit-chart-${name}-${width}.png`});
 }
 // The chart advances the existing historical clock only after explicit Play.
 await page.keyboard.press('Escape');await page.setViewportSize({width:1280,height:800});
 await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(0);a.beginTransit(.15);a.game.timePaused=false;});await page.click('#map-button');await page.waitForTimeout(250);
 const initial=await page.evaluate(()=>{const a=window.__cosmos;window.chartPlayNode=document.querySelector('#chart-play');window.chartProbeNode=document.querySelector('.chart-object[data-value=voyager]');return{jd:a.game.transit.jd,marker:chartProbeNode.getAttribute('transform'),renders:a.world.renderCount,heading:a.game.player.quaternion.toArray(),fuel:a.game.fuel};});
 await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__cosmos.game.transit.jd),initial.jd);
 await page.focus('#chart-play');await page.keyboard.press('Space');await page.waitForFunction(jd=>window.__cosmos.game.transit.jd>jd+2,initial.jd);
 await page.keyboard.down('w');await page.keyboard.down('ArrowRight');await page.waitForTimeout(250);await page.keyboard.up('ArrowRight');await page.keyboard.up('w');
 const moving=await page.evaluate(()=>{const a=window.__cosmos;return {jd:a.game.transit.jd,marker:document.querySelector('.chart-object[data-value=voyager]').getAttribute('transform'),renders:a.world.renderCount,heading:a.game.player.quaternion.toArray(),fuel:a.game.fuel,focusStable:document.activeElement===chartPlayNode,buttonRetained:document.querySelector('#chart-play')===chartPlayNode,markerRetained:document.querySelector('.chart-object[data-value=voyager]')===chartProbeNode};});
 assert.ok(moving.jd>initial.jd);assert.notEqual(moving.marker,initial.marker);assert.equal(moving.renders,initial.renders);assert.deepEqual(moving.heading,initial.heading);assert.equal(moving.fuel,initial.fuel);assert.ok(moving.focusStable&&moving.buttonRetained&&moving.markerRetained);
 const rate=await page.evaluate(()=>window.__cosmos.game.rateIndex);await page.click('#chart-faster');assert.equal(await page.evaluate(()=>window.__cosmos.game.rateIndex),rate+1);await page.click('#chart-slower');assert.equal(await page.evaluate(()=>window.__cosmos.game.rateIndex),rate);
 await page.click('[data-action=chart-scale][data-value="35"]');assert.equal(await page.locator('#chart-play').textContent(),'Pause passage');await page.locator('.chart-object-list [data-value=jupiter]').click();assert.equal(await page.locator('#chart-play').textContent(),'Pause passage');await page.waitForTimeout(200);assert.equal(await page.locator('.chart-inspector h3').textContent(),'Jupiter');
 await page.click('#chart-play');
 const held=await page.evaluate(async()=>{const a=window.__cosmos,g=a.game,{solarChartState}=await import('/src/solar-chart-state.js'),{trajectoryState}=await import('/src/trajectory.js');const state=solarChartState(a.world,g),expected=trajectoryState(a.world.cruise.objects.voyager,g.transit.jd);return{jd:g.transit.jd,held:g.timePaused,date:document.querySelector('.chart-inspector .eyebrow').textContent,expectedDate:state.date,position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),expectedPosition:[expected.position[0],expected.position[2],-expected.position[1]],expectedVelocity:[expected.velocity[0],expected.velocity[2],-expected.velocity[1]]};});
 assert.ok(held.held);assert.equal(held.date,held.expectedDate);assert.deepEqual(held.position,held.expectedPosition);assert.deepEqual(held.velocity,held.expectedVelocity);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__cosmos.game.transit.jd),held.jd);
 await page.screenshot({path:`tests/screenshots/transit-chart-${name}-playback.png`});
 await page.click('#chart-play');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.locator('#chart-play').textContent(),'Play passage');const blurJd=await page.evaluate(()=>window.__cosmos.game.transit.jd);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__cosmos.game.transit.jd),blurJd);
 // Native keyboard activation and Xbox A share the same visible control.
 await page.focus('#chart-play');await page.keyboard.press('Space');assert.equal(await page.locator('#chart-play').textContent(),'Pause passage');
 await page.evaluate(()=>{window.chartPad={id:'Synthetic Xbox test',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.chartPad]});chartPad.buttons[0]={pressed:true,touched:true,value:1};});
 await page.waitForFunction(()=>document.querySelector('#chart-play').textContent==='Play passage');await page.evaluate(()=>{chartPad.buttons[0]={pressed:false,touched:false,value:0};});await page.waitForTimeout(60);await page.evaluate(()=>{delete navigator.getGamepads;});
 await page.click('#chart-play');await page.evaluate(()=>{window.chartRecovery=window.__cosmos.world.renderer.getContext().getExtension('WEBGL_lose_context');chartRecovery.loseContext();});
 await page.waitForFunction(()=>window.__cosmos.world.renderer.getContext().isContextLost());assert.equal(await page.locator('#chart-play').textContent(),'Play passage');const lostJd=await page.evaluate(()=>window.__cosmos.game.transit.jd);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__cosmos.game.transit.jd),lostJd);await page.evaluate(()=>chartRecovery.restoreContext());await page.waitForFunction(()=>!window.__cosmos.world.renderer.getContext().isContextLost());assert.equal(await page.locator('#chart-play').textContent(),'Play passage');
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.__cosmos.game.timePaused),true);await page.click('#map-button');await page.click('#chart-play');await page.click('[data-action=map-tab][data-value=voyage]');const tabJd=await page.evaluate(()=>window.__cosmos.game.transit.jd);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__cosmos.game.transit.jd),tabJd);await page.click('[data-action=map-tab][data-value=solar]');assert.equal(await page.locator('#chart-play').textContent(),'Play passage');
 const livePlayback={explicitStart:true,advancingDateAndMarker:true,headingAndFuelPreserved:true,menuInputDoesNotSteer:true,noHiddenSceneDraws:true,persistentControlAndMarkerNodes:true,rateAndSelectionRetained:true,physicalTrajectoryAndVelocity:true,exactPauseReadout:true,blurHoldsTime:true,keyboardAndSyntheticXbox:true,graphicsRecoveryHoldsTime:true,tabChangeStopsPlayback:true};
 // An actual UI sequence: choose the Moon, take a photograph, depart,
 // inspect the route, accelerate calendar playback and explore Jupiter.
 await page.setViewportSize({width:1280,height:800});await page.keyboard.press('Escape');await page.click('#map-button');await page.click('[data-action=map-tab][data-value=voyage]');await page.click('[data-action=chapter][data-value="0"]');
 await page.click('#map-button');assert.equal(await page.locator('[data-action=map-tab][aria-pressed=true]').getAttribute('data-value'),'local');await page.click('[data-action=study][data-value=moon]');
 assert.equal(await page.locator('#toast').evaluate(el=>el.classList.contains('visible')),false,'A study uses its own heading and invitation without a duplicate notice');
 await page.waitForFunction(()=>document.getElementById('objective-caption').textContent==='Watch the lunar limb move against distant Earth.');
 await page.click('#photo-button');await page.waitForFunction(()=>!document.getElementById('photo-button').disabled&&window.__cosmos.archive.memory.size>0);
 await page.waitForFunction(()=>!document.getElementById('photo-receipt').hidden);
 await page.keyboard.press('c');assert.equal(await page.locator('#toast').evaluate(el=>el.classList.contains('visible')),true);
 await page.click('#depart');
 assert.equal(await page.locator('#toast').evaluate(el=>el.classList.contains('visible')),false,'Scene transition clears the previous camera notice');
 assert.equal(await page.locator('#toast').textContent(),'');assert.equal(await page.locator('#toast').evaluate(el=>el.hidden),true);
 assert.equal(await page.locator('#photo-receipt').evaluate(el=>el.hidden),true,'Scene transition clears the previous photograph receipt');
 await page.waitForFunction(()=>document.getElementById('objective-title').textContent==='Towards Jupiter');
 await page.screenshot({path:`tests/screenshots/transit-chart-${name}-clean-departure.png`});
 await page.click('#map-button');assert.ok(await page.locator('.chart-voyage-remaining').count());await page.click('#chart-play');await page.keyboard.down('w');
 for(let i=0;i<4;i++){if(await page.evaluate(()=>window.__cosmos.game.stage!=='transit'))break;await page.click('#chart-faster');await page.waitForTimeout(100);}
 await page.waitForFunction(()=>window.__cosmos.game.chapter===1&&window.__cosmos.game.stage==='encounter',null,{timeout:10000});
 assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'play');assert.equal(await page.evaluate(()=>window.__cosmos.game.thrust),0);await page.keyboard.up('w');
 await page.click('#map-button');assert.equal(await page.locator('[data-action=map-tab][aria-pressed=true]').getAttribute('data-value'),'local');assert.ok(await page.locator('[data-action=study][data-value=io]').isVisible());assert.ok(await page.evaluate(()=>window.__cosmos.archive.memory.size>0));
 assert.deepEqual(errors,[]);results.push({name,engineVersion:browser.version(),passages,layouts,livePlayback,naturalMoonToJupiterFlow:true,studyUsesExistingInvitation:true,sceneTransitionClearsOldNoticesAndPhotoReceipt:true,selectionFits:true,manualScaleRetained:true,titleSnapshotCorrect:true,flightStatePreserved:true,errors,passed:true});console.log({name,passages:passages.length,passed:true});
 await fs.writeFile('tests/transit-chart-results.json',JSON.stringify({version,results},null,2)+'\n');
 }finally{await browser.close()}
}
