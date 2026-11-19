import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const outcomes=[];
for(const [name,engine,options] of [
 ['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],
 ['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]
]){
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const physical=()=>page.evaluate(()=>{const g=window.__cosmos.game;return {position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),orientation:g.player.quaternion.toArray(),fuel:g.fuel,seconds:g.localSeconds};});
 const picture=()=>page.evaluate(()=>{
  const w=window.__cosmos.world,c=document.createElement('canvas');c.width=144;c.height=90;
  const ctx=c.getContext('2d');ctx.drawImage(w.canvas,0,0,c.width,c.height);const p=ctx.getImageData(0,0,c.width,c.height).data;
  let sum=0;for(let i=0;i<p.length;i+=4)sum+=.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];
  return {luma:sum/(p.length/4),renderCount:w.renderCount,exposure:w.renderer.toneMappingExposure};
 });
 const set=async(id,value)=>{
  const count=await page.evaluate(()=>window.__cosmos.world.renderCount);
  await page.locator('#'+id).fill(String(value));
  if(id==='exposure')await page.waitForFunction(count=>window.__cosmos.world.renderCount>count,count);
 };
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});
  await page.click('#begin');await page.click('#pause-button');await page.click('[data-action=settings]');
  const state=await physical();
  assert.equal(await page.locator('#volume-value').textContent(),'60%');
  assert.equal(await page.locator('#exposure').getAttribute('aria-valuetext'),'1.00×');
  await set('exposure',.35);const dark=await picture();
  await set('exposure',1.5);const bright=await picture();
  assert.ok(bright.luma>dark.luma*1.35,`${name}: exposure preview did not change`);
  assert.equal(bright.exposure,1.5);assert.deepEqual(await physical(),state);
  const held=bright.renderCount;await page.waitForTimeout(250);
  assert.equal((await picture()).renderCount,held,'Static settings must stop rendering after a change');
  await set('volume',.23);await set('feedback',.42);await set('sensitivity',1.4);
  assert.equal(await page.locator('#volume-value').textContent(),'23%');
  const applied=await page.evaluate(()=>({volume:window.__cosmos.audio.volume,feedback:window.__cosmos.audio.feedbackVolume,sensitivity:window.__cosmos.input.sensitivity}));
  assert.deepEqual(applied,{volume:.23,feedback:.42,sensitivity:.002*1.4});
  await page.locator('#quality').selectOption('performance');
  assert.ok((await page.locator('#quality-note').textContent()).includes('0.75×'));
  await page.waitForFunction(()=>window.__cosmos.world.renderer.getPixelRatio()===.75);
  await page.locator('#quality').selectOption('high');await set('exposure',1);
  await page.screenshot({path:`tests/screenshots/v20-${name.toLowerCase()}-settings.png`});
  // Keyboard adjustment retains both the numeric label and the native range.
  await page.focus('#volume');await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#volume-value').textContent(),'24%');
  assert.equal(await page.locator('#volume').getAttribute('aria-valuetext'),'24%');
  const fit=[];
  for(const size of [{width:1024,height:640},{width:800,height:600}]){
   await page.setViewportSize(size);
   const boxes=await page.locator('#panel input,#panel select,.settings-actions button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.dataset.action,width:r.width,height:r.height,right:r.right,bottom:r.bottom};}));
   assert.ok(boxes.every(r=>r.width>=44&&r.height>=44),`${name}: small control target ${JSON.stringify(boxes)}`);
   assert.ok(boxes.every(r=>r.right<=size.width&&r.bottom<=size.height),`${name}: settings overflow ${JSON.stringify(boxes)}`);
   fit.push({size,boxes});
   await page.screenshot({path:`tests/screenshots/v20-${name.toLowerCase()}-settings-${size.width}.png`});
  }
  await page.setViewportSize({width:1440,height:900});
  // Real Fullscreen API where this engine exposes it, plus its live label.
  let fullscreen=false;
  if(await page.evaluate(()=>document.fullscreenEnabled)){
   await page.click('[data-action=fullscreen]');await page.waitForFunction(()=>!!document.fullscreenElement);
   await page.waitForFunction(()=>document.querySelector('[data-action=fullscreen]').textContent==='Exit full screen');
   assert.equal(await page.locator('[data-action=fullscreen]').getAttribute('aria-pressed'),'true');
   await page.click('[data-action=fullscreen]');await page.waitForFunction(()=>!document.fullscreenElement);
   await page.waitForFunction(()=>document.querySelector('[data-action=fullscreen]').textContent==='Full screen');fullscreen=true;
  }
  assert.deepEqual(await physical(),state);
  const settings=await page.evaluate(()=>JSON.parse(localStorage.getItem('cosmos-settings-v1')));
  await page.reload();await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});
  await page.click('#continue');await page.click('#pause-button');await page.click('[data-action=settings]');
  assert.equal(Number(await page.locator('#volume').inputValue()),settings.volume);
  assert.equal(await page.locator('#volume-value').textContent(),'24%');
  assert.equal(await page.locator('#sensitivity-value').textContent(),'1.4×');
  await page.click('[data-action=resume]');await page.click('#controls-button');
  const guide=await page.locator('#panel-content').textContent();assert.ok(guide.includes('Take photographP'));assert.ok(guide.includes('Record suggested viewHold X'));
  assert.deepEqual(errors,[]);
  outcomes.push({name,engineVersion:browser.version(),exposure:{dark,bright},physicalStateHeld:true,staticViewStopsRendering:true,persistedValues:true,keyboardValues:true,nativeFullscreenVerified:fullscreen,fit,guideClarifiesIndependentPhoto:true,errors,passed:true});
  console.log({name,passed:true,dark:dark.luma,bright:bright.luma});
 }catch(error){await page.screenshot({path:`tests/screenshots/v20-${name.toLowerCase()}-settings-failure.png`}).catch(()=>{});throw error;}
 finally{await browser.close();}
 await fs.writeFile('tests/settings-v20-results.json',JSON.stringify({version:'0.20.0',outcomes},null,2));
}
