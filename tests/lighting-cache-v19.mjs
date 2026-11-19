import {chromium,BASE_URL} from './browser.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:2}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 await page.evaluate(()=>{const a=window.__cosmos;a.game.timePaused=true;a.game.view='chase';a.world.noteFrame=()=>{};});await page.waitForTimeout(1500);
 const cache=await page.evaluate(async()=>{
  const a=window.__cosmos,w=a.world,t=await import('three'),light=w.shipKey,shadow=light.shadow,original=shadow.updateMatrices.bind(shadow);let updates=0;shadow.updateMatrices=(...args)=>{updates++;return original(...args);};
  a.game.mode='panel';w.followReady=false;const options={view:'chase',exposure:1,look:a.game.look};w.update(a.game.player,0,options);const initial=updates;
  for(let i=0;i<30;i++)w.update(a.game.player,0,options);const heldUpdates=updates-initial;
  const canvas=document.createElement('canvas');canvas.width=w.canvas.width;canvas.height=w.canvas.height;const ctx=canvas.getContext('2d');const pixels=()=>{ctx.drawImage(w.canvas,0,0);return ctx.getImageData(0,0,canvas.width,canvas.height).data;};
  const cases=[];
  for(const [name,angle] of [['subtexel turn',.00002],['accumulated turn',.00008],['steering',.12]]){
   a.game.player.quaternion.multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),angle));w.followReady=false;const before=updates;w.update(a.game.player,0,options);const naturalUpdates=updates-before,cached=pixels();shadow.needsUpdate=true;w.update(a.game.player,0,options);const forced=pixels();let max=0,total=0,changed=0;for(let i=0;i<cached.length;i+=4)for(let c=0;c<3;c++){const delta=Math.abs(cached[i+c]-forced[i+c]);max=Math.max(max,delta);total+=delta;if(delta)changed++;}cases.push({name,naturalUpdates,maxChannelDifference:max,meanChannelDifference:total/(cached.length*.75),changedChannels:changed});
  }
  const beforeEpoch=updates;a.startChapter(2,0,'titan');a.game.mode='panel';a.game.timePaused=true;a.game.view='chase';w.update(a.game.player,0,options);const epochUpdates=updates-beforeEpoch;shadow.updateMatrices=original;a.game.mode='play';return {heldFrames:30,heldUpdates,cases,epochUpdates};
 });
 console.log(JSON.stringify(cache,null,2));await fs.writeFile('tests/lighting-cache-v19-probe.json',JSON.stringify(cache,null,2));
 assert.equal(cache.heldUpdates,0);assert.ok(cache.cases.find(c=>c.name==='steering').naturalUpdates>0);assert.ok(cache.epochUpdates>0);assert.ok(cache.cases.every(c=>c.meanChannelDifference<.01&&c.maxChannelDifference<=3));
 await page.click('#pause-button');await page.waitForTimeout(300);
 const recovery=await page.evaluate(async()=>{const a=window.__cosmos,w=a.world,ext=w.renderer.getContext().getExtension('WEBGL_lose_context');if(!ext)throw Error('Context loss simulation is unavailable');const before=w.renderCount,updates=w.shadowPose.updates;const lost=new Promise(r=>w.canvas.addEventListener('webglcontextlost',r,{once:true}));ext.loseContext();await lost;await new Promise(r=>setTimeout(r,100));const restored=new Promise(r=>w.canvas.addEventListener('webglcontextrestored',r,{once:true}));ext.restoreContext();await restored;await new Promise(r=>setTimeout(r,1200));const c=document.createElement('canvas');c.width=64;c.height=40;const x=c.getContext('2d');x.drawImage(w.canvas,0,0,64,40);const pixels=x.getImageData(0,0,64,40).data;let lit=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]+pixels[i+1]+pixels[i+2]>15)lit++;return {mode:a.game.mode,rendered:w.renderCount>before,shadowsRefreshed:w.shadowPose.updates>updates,environmentReady:!!w.shipScene.environment&&!w.environmentDirty,lit};});
 assert.equal(recovery.mode,'panel');assert.ok(recovery.rendered&&recovery.shadowsRefreshed&&recovery.environmentReady&&recovery.lit>20);await page.screenshot({path:'tests/screenshots/v19-restored-paused-flight.png'});assert.deepEqual(errors,[]);
 const report={cache,recovery,physicalHardwareContextLossTested:false,errors};await fs.writeFile('tests/lighting-cache-v19-results.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}
