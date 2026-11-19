import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const version=(await(await fetch(BASE_URL+'/package.json')).json()).version,outcomes=[];
const selected=(process.env.COSMOS_TEST_ENGINE||'Chrome,Firefox,WebKit').split(',');
const native=process.env.COSMOS_RECOVERY_NATIVE==='1';
const dpr=Number(process.env.COSMOS_TEST_DPR||1);assert.ok([1,2].includes(dpr));
const cases=[
 ['flying-io',1,'io','probe'],['held-io',1,'io','probe','held'],
 ['flying-jupiter',1,null,'probe'],['review-jupiter',1,null,'chase','review'],
 ['held-rings',2,'ring-plane','probe','held'],['held-north-pole',2,'north-pole','probe','held'],['flying-moon',0,'moon','probe'],['flying-earth',0,null,'chase'],
 ['historical-passage',0,null,'probe','transit'],['held-earth',0,null,'probe','held'],['held-moon',0,'moon','probe','held'],
 ['paused-titan',2,'titan','chase','pause'],['review-moon',0,'moon','probe','review'],['review-chase',2,null,'chase','review'],
].filter(([label])=>!process.env.COSMOS_RECOVERY_CASES||process.env.COSMOS_RECOVERY_CASES.split(',').includes(label));
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(!selected.includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1000,height:625},deviceScaleFactor:dpr}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
  await page.evaluate(()=>{
   window.recoveryState=()=>{
    const {game:g,world:w,flightHistory:h}=window.__cosmos;
    return {p:g.player.position.toArray(),v:g.player.velocity.toArray(),q:g.player.quaternion.toArray(),fuel:g.fuel,
     time:g.localSeconds,elapsed:g.elapsed,progress:g.transit?.progress,rate:g.rateIndex,held:g.timePaused,
     fov:w.camera.fov,look:g.look.toArray(),camera:w.camera.quaternion.toArray(),follow:w.follow.toArray(),followReady:w.followReady,preview:g.reviewPreview?JSON.stringify(g.reviewPreview):null,history:JSON.stringify(h.samples),output:[w.canvas.width,w.canvas.height],scene:[w.frameTarget.width,w.frameTarget.height]};
   };
  });
  for(const [label,chapter,study,view,state] of cases){
   await page.evaluate(({chapter,study,view,state,native})=>{
    const a=window.__cosmos;a.flightReview.clear();a.game.view=view;a.startChapter(chapter,0,study);a.game.rateIndex=2;
    a.game.timePaused=state==='held';if(state==='transit'){a.beginTransit(.3);a.game.rateIndex=5;}
    a.world.setQuality('high');a.world.ratio=Math.min(devicePixelRatio,native?2:1.25);if(native)a.world.cloudScale=.75;a.world.resize();if(study==='ring-plane')a.world.setFov(4);
   },{chapter,study,view,state,native});
   if(label==='review-chase')await page.keyboard.down('ArrowRight');
   await page.waitForTimeout(700);
   if(label==='review-chase'){
    await page.waitForFunction(()=>window.__cosmos.flightHistory.samples.filter(s=>s.follow).length>=2);
    await page.keyboard.up('ArrowRight');
   }
   if(state==='pause')await page.click('#pause-button');
   if(state==='review'){
    await page.click('#review-button');await page.locator('#review-range').focus();await page.keyboard.press('Home');
    if(label==='review-chase')await page.keyboard.press('ArrowRight');
   }
   // Observe the selected picture, not the pending state before its first draw.
   await page.waitForFunction(()=>!window.__cosmos.world.needsRender&&!window.__cosmos.world.needsRefinement()&&window.__cosmos.world.followReady);
   const heldBefore=state==='held'?await page.evaluate(()=>window.__cosmos.world.canvas.toDataURL()):null;
   if(heldBefore)await fs.writeFile(`tests/screenshots/context-${name}-${label}-before.png`,Buffer.from(heldBefore.split(',')[1],'base64'));
   const beforeLoss=await page.evaluate(()=>window.recoveryState());
   assert.deepEqual(beforeLoss.output,[1000*dpr,625*dpr]);assert.deepEqual(beforeLoss.scene,[Math.floor(1000*Math.min(dpr,native?2:1.25)),Math.floor(625*Math.min(dpr,native?2:1.25))]);
   await page.evaluate(async()=>{
    const w=window.__cosmos.world;window.lossExtension=w.renderer.getContext().getExtension('WEBGL_lose_context');
    if(!window.lossExtension)throw Error('Context-loss extension unavailable');
    const lost=new Promise(r=>w.canvas.addEventListener('webglcontextlost',r,{once:true}));window.lossExtension.loseContext();await lost;
   });
   const frozen=await page.evaluate(()=>({pose:window.recoveryState(),mode:window.__cosmos.game.mode,renders:window.__cosmos.world.renderCount}));
   assert.equal(frozen.mode,'panel');
   if(state==='review')assert.equal(frozen.pose.preview,beforeLoss.preview);
   else{
    assert.equal(await page.locator('[data-action=resume]').isDisabled(),true);
    assert.match(await page.locator('#panel-title').innerText(),/Restoring view/i);
   }
   // Neither a close shortcut nor flight input can resume an unseen voyage.
   await page.keyboard.press('Escape');await page.keyboard.down('w');
   if(label==='flying-moon'){
    await page.evaluate(()=>{
     window.testPad={id:'Synthetic Xbox',index:0,connected:true,mapping:'standard',axes:[.8,0,0,0],buttons:Array.from({length:17},(_,i)=>({pressed:i===7,touched:i===7,value:i===7?1:0}))};
     Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.testPad]});
    });
    const photos=await page.evaluate(async()=>(await window.__cosmos.archive.all()).length);
    await page.click('[data-action=photo]');
    assert.equal(await page.evaluate(async()=>(await window.__cosmos.archive.all()).length),photos);
    assert.match(await page.locator('#toast').innerText(),/recovering/);
   }
   await page.waitForTimeout(800);
   const whileLost=await page.evaluate(()=>({pose:window.recoveryState(),mode:window.__cosmos.game.mode,renders:window.__cosmos.world.renderCount}));
   assert.deepEqual(whileLost,frozen,'No physical time, review, fuel, camera, history or rendering advances while lost');
   await page.screenshot({path:`tests/screenshots/context-${name}-${label}-recovering.png`});
   await page.evaluate(async()=>{
    const w=window.__cosmos.world,restored=new Promise(r=>w.canvas.addEventListener('webglcontextrestored',r,{once:true}));
    window.lossExtension.restoreContext();await restored;
   });
   await page.waitForTimeout(1600);
   await page.waitForFunction(n=>{const w=window.__cosmos.world;return w.renderCount>n&&!w.needsRender&&!w.needsRefinement();},frozen.renders,{timeout:30000});
   const restored=await page.evaluate(()=>{
    const a=window.__cosmos,w=a.world,c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;
    const x=c.getContext('2d');x.drawImage(w.canvas,0,0);const p=x.getImageData(0,0,c.width,c.height).data;let lit=0;
    for(let i=0;i<p.length;i+=4)if(p[i]+p[i+1]+p[i+2]>15)lit++;
    return {pose:window.recoveryState(),mode:a.game.mode,renders:w.renderCount,lit,keys:[...a.input.keys],anisotropy:w.textures['earth-clouds.avif'].anisotropy};
   });
   assert.deepEqual(restored.pose,frozen.pose);assert.equal(restored.mode,'panel');assert.deepEqual(restored.keys,[]);
   assert.ok(restored.renders>frozen.renders);assert.ok(restored.lit>20,`${name} ${label}: restored view has ${restored.lit} lit pixels`);assert.equal(restored.anisotropy,1);
   await page.waitForTimeout(500);
   assert.equal(await page.evaluate(()=>window.__cosmos.world.renderCount),restored.renders,'Recovered paused picture settles');
   await page.screenshot({path:`tests/screenshots/context-${name}-${label}-restored.png`});
   let heldImage=null;
   if(heldBefore){
    await fs.writeFile(`tests/screenshots/context-${name}-${label}-after.png`,Buffer.from((await page.evaluate(()=>window.__cosmos.world.canvas.toDataURL())).split(',')[1],'base64'));
    heldImage=await page.evaluate(async png=>{const w=window.__cosmos.world,c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(w.canvas,0,0);const after=x.getImageData(0,0,c.width,c.height).data,image=new Image();image.src=png;await image.decode();x.drawImage(image,0,0);const before=x.getImageData(0,0,c.width,c.height).data;let error=0,max=0;for(let i=0;i<before.length;i++){const d=Math.abs(before[i]-after[i]);error+=d;max=Math.max(max,d);}return{mean:error/before.length,max};},heldBefore);
    assert.equal(heldImage.max,0,JSON.stringify({message:'Held surface and texture mip chains survive context restoration',name,label,heldImage}));
   }
   const resume=page.locator('[data-action=resume]');assert.equal(await resume.isDisabled(),false);await resume.click();
   await page.waitForTimeout(350);
   const resumed=await page.evaluate(()=>({pose:window.recoveryState(),mode:window.__cosmos.game.mode}));assert.equal(resumed.mode,'play');
   assert.equal(resumed.pose.fuel,frozen.pose.fuel,'Held keys/triggers must not fire on recovery');
   if(state==='held')assert.equal(resumed.pose.time,frozen.pose.time);
   else if(state==='transit')assert.ok(resumed.pose.progress>frozen.pose.progress);
   else assert.ok(resumed.pose.time>frozen.pose.time);
   if(label==='flying-moon'){
    assert.deepEqual(resumed.pose.q,frozen.pose.q,'Held stick must not steer after recovery');
    await page.evaluate(()=>{window.testPad.axes[0]=0;window.testPad.buttons[7]={pressed:false,touched:false,value:0};});
    await page.waitForTimeout(100);await page.keyboard.up('w');await page.keyboard.down('w');await page.waitForTimeout(250);await page.keyboard.up('w');
    assert.ok(await page.evaluate(()=>window.__cosmos.game.fuel)<resumed.pose.fuel,'Fresh input flies normally');
    await page.evaluate(()=>delete navigator.getGamepads);
   }else await page.keyboard.up('w');
   checks.push({label,heldImage,preservedWhileLost:true,preservedAfterRestoration:true,explicitResume:true,litPixels:restored.lit,settledDraws:0,heldInputBlocked:true});
   console.log({name,label,passed:true});
  }
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),checks,errors});
 }finally{await browser.close();}
}
await fs.writeFile('tests/context-recovery-results.json',JSON.stringify({version,dpr,native,simulatedContextLoss:true,underlyingDriverResetReproduced:false,outcomes},null,2)+'\n');
