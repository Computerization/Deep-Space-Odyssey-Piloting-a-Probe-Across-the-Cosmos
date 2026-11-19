import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const results=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const active=()=>page.evaluate(()=>({id:document.activeElement.id,action:document.activeElement.dataset.action}));
 const physical=()=>page.evaluate(()=>{const g=window.__cosmos.game;return {p:g.player.position.toArray(),v:g.player.velocity.toArray(),q:g.player.quaternion.toArray(),fuel:g.fuel,seconds:g.localSeconds,notes:JSON.stringify(g.experience)};});
 const flags=()=>page.evaluate(()=>{const g=window.__cosmos.game;return {precision:g.precision,showHud:g.showHud,guidance:g.guidance};});
 const pad=async(n,value=1)=>{
  await page.evaluate(({n,value})=>window.testPad.buttons[n]={value,pressed:true,touched:true},{n,value});await page.waitForTimeout(100);
  await page.evaluate(n=>window.testPad.buttons[n]={value:0,pressed:false,touched:false},n);await page.waitForTimeout(100);
 };
 const menuSettings=async()=>{
  await pad(9);assert.equal((await active()).action,'resume');
  for(let i=0;i<6;i++)await pad(13);
  assert.equal((await active()).action,'settings');await pad(0);
 };
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
  await page.evaluate(()=>{const g=window.__cosmos.game;g.timePaused=true;g.actualRate=0;window.testPad={id:'Synthetic Xbox test',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.testPad]});});
  await menuSettings();const held=await physical();
  assert.equal((await active()).id,'settings-tab-sound');await pad(15);assert.equal((await active()).id,'settings-tab-picture');await pad(15);assert.equal((await active()).id,'settings-tab-flight');
  assert.equal(await page.locator('[data-settings-page]:visible').getAttribute('data-settings-page'),'flight');
  await pad(13);assert.equal((await active()).id,'sensitivity');await pad(13);assert.equal((await active()).id,'flight-precision');await pad(0);
  await pad(13);assert.equal((await active()).id,'flight-showHud');await pad(0);
  assert.equal(await page.locator('#hud').evaluate(e=>e.inert&&getComputedStyle(e).opacity==='0'),true);
  await pad(13);assert.equal((await active()).id,'flight-guidance');await pad(0);
  assert.deepEqual(await flags(),{precision:true,showHud:false,guidance:false});
  assert.ok(await page.locator('#waypoint').evaluate(e=>e.hidden));assert.ok(await page.locator('#objective-caption').evaluate(e=>e.hidden));
  await pad(13);assert.equal((await active()).action,'instruments');await pad(0);
  assert.equal(await page.locator('#panel').getAttribute('data-view'),'instruments');assert.equal(await page.locator('.instrument-values dd').count(),6);
  await page.screenshot({path:`tests/screenshots/v31-${name}-instruments.png`});
  await pad(1);assert.equal(await page.locator('#panel').getAttribute('data-view'),'settings');assert.equal((await active()).action,'instruments');assert.equal(await page.locator('[data-settings-tab=flight]').getAttribute('aria-pressed'),'true');
  assert.deepEqual(await physical(),held,'Settings and instruments must not advance flight or consume science notes');
  await pad(1);assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'play');
  await menuSettings();assert.equal((await active()).id,'settings-tab-flight');
  // Every option is persisted through the existing voyage save.
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cosmos-voyager-save-v2')));assert.equal(saved.precision,true);assert.equal(saved.showHud,false);assert.equal(saved.guidance,false);
  await page.reload();await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#continue');assert.deepEqual(await flags(),{precision:true,showHud:false,guidance:false});
  await page.keyboard.press('Escape');await page.click('[data-action=settings]');await page.keyboard.press('ArrowLeft');assert.equal((await active()).id,'settings-tab-flight');
  for(const id of ['precision','showHud','guidance'])await page.click('#flight-'+id);
  await page.click('[data-action=resume]');assert.deepEqual(await flags(),{precision:false,showHud:true,guidance:true});assert.equal(await page.locator('#hud').evaluate(e=>e.inert),false);
  // Keyboard shortcuts and the menu operate on the same saved options.
  for(const key of ['z','h','g'])await page.keyboard.press(key);
  await page.keyboard.press('Escape');await page.click('[data-action=settings]');
  for(const id of ['precision','showHud','guidance'])assert.equal(await page.locator('#flight-'+id).getAttribute('aria-pressed'),String(id==='precision'));
  await page.click('#flight-showHud');await page.click('#flight-guidance');
  const layouts=[];
  for(const size of [{width:1280,height:800},{width:1024,height:640},{width:800,height:600}]){
   await page.setViewportSize(size);
   for(const tab of ['sound','picture','flight']){
    await page.click(`[data-settings-tab=${tab}]`);
    const measured=await page.locator('#panel button,#panel input,#panel select').evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.dataset.action,w:r.width,h:r.height,x:r.left,y:r.top,right:r.right,bottom:r.bottom};}));
    assert.ok(measured.every(r=>r.w>=44&&r.h>=44&&r.x>=0&&r.y>=0&&r.right<=size.width&&r.bottom<=size.height),JSON.stringify({name,size,tab,measured}));
    await page.screenshot({path:`tests/screenshots/v31-${name}-settings-${tab}-${size.width}.png`});layouts.push({size,tab,allTargetsFit:true});
   }
   await page.click('[data-action=instruments]');assert.equal(await page.locator('.instrument-values dd').count(),6);
   const fit=await page.locator('.instrument-values dd,.instruments-actions button').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}));assert.ok(fit);
   await page.click('[data-action=flight-settings]');assert.equal((await active()).action,'instruments');
  }
  await page.click('[data-action=resume]');
  // Apply actual thrust with Fine control enabled by the menu, then standard thrust.
  await page.evaluate(()=>{const g=window.__cosmos.game;g.timePaused=false;g.rateIndex=0;g.actualRate=1;});
  await page.keyboard.down('w');await page.waitForTimeout(220);const fine=await page.evaluate(()=>window.__cosmos.game.thrustAcceleration);await page.keyboard.up('w');
  assert.ok(fine>2.16e-7&&fine<2.22e-7);await page.keyboard.press('Escape');await page.click('[data-action=settings]');await page.click('#flight-precision');await page.click('[data-action=resume]');
  await page.keyboard.down('w');await page.waitForTimeout(220);const normal=await page.evaluate(()=>window.__cosmos.game.thrustAcceleration);await page.keyboard.up('w');assert.ok(normal>1.08e-6&&normal<1.11e-6);
  await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(3);a.beginTransit(.5);a.game.timePaused=true;});await page.keyboard.press('i');
  assert.equal(await page.locator('.instrument-values dd').count(),3);assert.ok((await page.locator('.instruments-context').textContent()).includes('historical passage'));
  const signal=await page.evaluate(async()=>{const a=window.__cosmos,{distanceToEarth}=await import('/src/solar-chart-state.js'),{signalTime}=await import('/src/flight.js');return signalTime(distanceToEarth(a.world,a.game));});assert.equal(await page.locator('.instrument-values dd').nth(1).textContent(),signal);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'play');
  assert.deepEqual(errors,[]);results.push({name,engineVersion:browser.version(),syntheticXboxOnlyOptionsAndReturn:true,hiddenInterfaceRecoverable:true,keyboardSyncAndPersistence:true,settingsPreservePhysicalStateAndScience:true,layouts,instrumentLayouts:3,instrumentOriginAwareBack:true,fineAcceleration:fine,normalAcceleration:normal,passageHasCurrentEarthLightTime:true,errors});console.log({name,passed:true});
 }catch(error){await page.screenshot({path:`tests/screenshots/v31-${name}-flight-options-failure.png`}).catch(()=>{});throw error;}
 finally{await browser.close();}
}
await fs.writeFile('tests/flight-options-v31-results.json',JSON.stringify({version:'0.31.0',physicalXboxTested:false,results},null,2)+'\n');
