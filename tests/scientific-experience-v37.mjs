import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});
 assert.equal(await page.locator('#departure').count(),0);
 assert.ok(await page.evaluate(()=>document.fonts.check('24px Barlow')));
 await page.click('#begin');await page.waitForTimeout(800);
 assert.ok(await page.locator('#waypoint').isVisible());
 await page.click('#time-toggle');await page.waitForTimeout(100);
 const held=await page.evaluate(()=>{const a=window.__cosmos;return {p:a.game.player.position.toArray(),v:a.game.player.velocity.toArray(),q:a.game.player.quaternion.toArray()};});
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(300);await page.keyboard.up('ArrowLeft');
 const afterHold=await page.evaluate(()=>{const a=window.__cosmos;return {p:a.game.player.position.toArray(),v:a.game.player.velocity.toArray(),q:a.game.player.quaternion.toArray(),rate:a.game.actualRate};});
 assert.deepEqual(afterHold.p,held.p);assert.deepEqual(afterHold.v,held.v);assert.notDeepEqual(afterHold.q,held.q);assert.equal(afterHold.rate,0);
 const gravityAndThrust=await page.evaluate(()=>{
  const a=window.__cosmos;a.startChapter(0);a.game.mode='panel';a.game.rateIndex=0;a.game.actualRate=1;
  const initial=a.game.player.velocity.length(),fuel=a.game.fuel;
  for(let i=0;i<600;i++)a.updateFlight(1/60,{...a.zeroInput,thrust:1,boost:true});
  return {initial,final:a.game.player.velocity.length(),fuelSpent:fuel-a.game.fuel,acceleration:a.game.thrustAcceleration,seconds:a.game.localSeconds};
 });
 assert.ok(gravityAndThrust.fuelSpent>0&&gravityAndThrust.fuelSpent<.01);assert.ok(gravityAndThrust.acceleration<2e-6);assert.ok(Math.abs(gravityAndThrust.initial-gravityAndThrust.final)<1);assert.ok(Math.abs(gravityAndThrust.seconds-10)<1e-7);
 const freedom=await page.evaluate(()=>{
  const a=window.__cosmos;a.startChapter(0);a.game.mode='panel';a.game.timePaused=true;a.game.chapterTime=13;
  for(let i=0;i<420;i++)a.updateFlight(1/60,{...a.zeroInput,observe:true});
  return {photos:a.game.discovered.length,notes:a.game.experience.seen,stage:a.game.stage,velocity:a.game.player.velocity.length()};
 });
 assert.ok(freedom.notes.length>0);assert.ok(freedom.photos>0);assert.equal(freedom.stage,'encounter');
 const boundaries=await page.evaluate(async()=>{
  const {REGIONS}=await import('/src/exploration.js');const a=window.__cosmos,results=[];
  for(let c=0;c<6;c++){
   a.startChapter(c);a.game.mode='panel';const r=REGIONS[c],center=a.world.bodyPositions[r.body];
   a.game.player.position.copy(center).add(a.game.frame.x.clone().multiplyScalar(r.radius-.01));a.game.player.velocity.copy(a.game.frame.x).multiplyScalar(17);
   const v=a.game.player.velocity.toArray();a.updateFlight(.05,a.zeroInput);
   results.push({c,held:a.game.boundaryPaused,range:a.game.player.position.distanceTo(center),radius:r.radius,speed:a.game.player.velocity.length(),preserved:v.every((x,i)=>Math.abs(x-a.game.player.velocity.toArray()[i])<1e-12)});
  }return results;
 });
 assert.ok(boundaries.every(r=>r.held&&r.range<=r.radius&&r.preserved));
 const passages=await page.evaluate(()=>{
  const a=window.__cosmos,out=[];
  for(let c=0;c<5;c++){
   a.startChapter(c);a.game.mode='panel';a.beginTransit();a.game.rateIndex=6;
   const start=a.game.transit.jd,speed=a.game.player.velocity.length();
   for(let i=0;i<10;i++)a.updateFlight(.05,a.zeroInput);
   const jd=a.game.transit.jd,velocity=a.game.player.velocity.clone(),position=a.game.player.position.clone();
   a.updateFlight(.05,{...a.zeroInput,brake:true,thrust:1,boost:true});
   const held=a.game.transit.jd===jd&&a.game.player.position.equals(position)&&a.game.player.velocity.equals(velocity);
   a.game.rateIndex=10;let frames=0;while(a.game.stage==='transit'&&frames++<1000)a.updateFlight(.05,a.zeroInput);
   out.push({c,speed,elapsed:(jd-start)*86400,held,arrival:a.game.chapter,frames});
  }return out;
 });
 assert.ok(passages.every((p,i)=>p.arrival===i+1&&p.held&&p.speed<45&&Math.abs(p.elapsed-500000)<.1));
 const milestone=await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(5);a.game.timePaused=true;return {title:document.getElementById('chapter-title').textContent,date:document.getElementById('chapter-date').textContent,lightHours:a.game.player.position.distanceTo(a.world.bodyPositions.earth)/299792.458/3600};});
 assert.ok(Math.abs(milestone.lightHours-24)<.00001);assert.match(milestone.date,/predicted/);await page.waitForTimeout(500);await page.screenshot({path:'tests/screenshots/v12-light-day.png'});
 // Save/reload a historical passage, including chosen time rate and hold state.
 await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(1);a.beginTransit();a.game.rateIndex=6;a.game.mode='panel';a.updateFlight(.05,a.zeroInput);a.game.timePaused=true;a.game.mode='play';});
 await page.click('#pause-button');const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('cosmos-voyager-save-v2')));
 await page.reload();await page.waitForFunction(()=>window.__cosmos);await page.click('#continue');await page.waitForTimeout(300);
 const restored=await page.evaluate(()=>({stage:window.__cosmos.game.stage,progress:window.__cosmos.game.transit.progress,rate:window.__cosmos.game.rateIndex,held:window.__cosmos.game.timePaused}));
 assert.equal(restored.stage,'transit');assert.equal(restored.progress,before.transit.progress);assert.equal(restored.rate,before.rateIndex);assert.equal(restored.held,true);
 await page.click('#map-button');await page.click('[data-action=map-tab][data-value=solar]');
 await page.click('[data-action=chart-scale][data-value="35"]');await page.locator('.chart-object-list [data-value=neptune]').click();assert.equal(await page.locator('.chart-inspector h3').textContent(),'Neptune');
 await page.screenshot({path:'tests/screenshots/v12-chart-outer.png'});
 await page.click('#panel-close');await page.evaluate(()=>{window.__cosmos.startChapter(2);window.__cosmos.game.timePaused=true;});await page.waitForTimeout(500);await page.screenshot({path:'tests/screenshots/v12-saturn.png'});
 await page.keyboard.press('Slash');assert.ok((await page.locator('#panel-content').textContent()).includes('Hold / resume time'));
 await page.click('#panel-close');await page.click('#pause-button');await page.setViewportSize({width:1024,height:640});await page.screenshot({path:'tests/screenshots/v12-pause-compact.png'});
 const menuFit=await page.locator('.pause-menu button').evaluateAll(els=>els.every(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));assert.ok(menuFit);
 // Browser-standard Xbox mapping; this does not claim a physical hardware test.
 await page.click('[data-action=resume]');await page.evaluate(()=>{
  window.__pad={id:'Xbox synthetic',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:0};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__pad]});window.__cosmos.game.timePaused=false;
 });
 await page.waitForTimeout(100);await page.evaluate(()=>{window.__pad.buttons[1]={pressed:true,value:1};});await page.waitForTimeout(100);
 const padHeld=await page.evaluate(()=>window.__cosmos.game.actualRate);assert.equal(padHeld,0);
 await page.evaluate(()=>{window.__pad.buttons[1]={pressed:false,value:0};window.__cameraBefore=window.__cosmos.game.view;window.__pad.buttons[3]={pressed:true,value:1};});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__cosmos.game.view!==window.__cameraBefore),true);
 const audio=await page.evaluate(()=>window.__cosmos.audio.status());assert.equal(audio.state,'running');
 assert.deepEqual(errors,[]);
 const report={version:JSON.parse(await fs.readFile('package.json','utf8')).version,milestone,timeHoldPreservesMomentum:true,gravityAndThrust,freedom,boundaries,passages,transitSaveRestore:restored,chartSelection:true,compactMenuFits:menuFit,controller:'Synthetic Xbox standard mapping: time hold and camera switch',audio,errors};
 await fs.writeFile('tests/scientific-experience-v37-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
