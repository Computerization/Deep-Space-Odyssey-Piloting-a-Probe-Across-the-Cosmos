import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const version=JSON.parse(await fs.readFile('package.json','utf8')).version,outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const snapshot=()=>page.evaluate(()=>{const a=window.__cosmos;return {frames:a.game.frameCount,renders:a.world.renderCount,p:a.game.player.position.toArray(),v:a.game.player.velocity.toArray(),q:a.game.player.quaternion.toArray(),camera:a.world.camera.quaternion.toArray(),notes:a.game.experience.seen.length};});
 async function stable(){
  let before=await snapshot();for(let i=0;i<24;i++){await page.waitForTimeout(350);const after=await snapshot();if(after.renders===before.renders)return after;before=after;}throw Error(`${name}: held view did not settle`);
 }
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
  await page.evaluate(()=>{const a=window.__cosmos;a.game.timePaused=true;a.game.chapterTime=30;a.game.experience.seen=[];a.experienceGuide.guide.reset();});
  const first=await stable(),pixels=await page.locator('#universe').evaluate(c=>c.toDataURL());await page.waitForTimeout(1200);const held=await snapshot();
  assert.equal(held.renders,first.renders);assert.ok(held.frames>first.frames+15);assert.deepEqual(held.p,first.p);assert.equal(await page.locator('#universe').evaluate(c=>c.toDataURL()),pixels);
  const beforeTurn=await snapshot();await page.keyboard.down('ArrowRight');await page.waitForFunction(n=>window.__cosmos.world.renderCount>n,beforeTurn.renders);const turn=await snapshot();await page.keyboard.up('ArrowRight');
  assert.ok(turn.frames-beforeTurn.frames<=4);assert.notDeepEqual(turn.q,beforeTurn.q);assert.deepEqual(turn.p,beforeTurn.p);assert.deepEqual(turn.v,beforeTurn.v);
  await stable();const beforeLens=await snapshot();await page.mouse.wheel(0,120);await page.waitForFunction(n=>window.__cosmos.world.renderCount>n,beforeLens.renders);await stable();
  await page.keyboard.press('c');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(220);await page.keyboard.up('ArrowLeft');
  const chase=await stable();await page.waitForTimeout(700);assert.equal((await snapshot()).renders,chase.renders);
  const phase=await page.evaluate(()=>{const a=window.__cosmos;return a.audio.channels.get(a.audio.current).el.currentTime;});await page.waitForTimeout(500);
  assert.ok(await page.evaluate(t=>{const a=window.__cosmos;return a.audio.channels.get(a.audio.current).el.currentTime>t+.2;},phase));
  await page.keyboard.press('c');await stable();await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(0);a.game.timePaused=true;a.game.chapterTime=30;a.game.experience.seen=[];a.experienceGuide.guide.reset();});await stable();await page.waitForFunction(()=>window.__cosmos.game.experience.seen.length>0,null,{timeout:9000});
  await page.click('#pause-button');await page.click('[data-action=settings]');await page.click('[data-settings-tab=picture]');const beforeExposure=await snapshot();await page.locator('#exposure').fill('1.2');await page.waitForFunction(n=>window.__cosmos.world.renderCount>n,beforeExposure.renders);assert.equal(await page.evaluate(()=>window.__cosmos.world.renderer.toneMappingExposure),1.2);await page.locator('#exposure').fill('1');await page.click('[data-action=resume]');await stable();
  const beforeResize=await snapshot();await page.setViewportSize({width:1024,height:640});await page.waitForFunction(n=>window.__cosmos.world.renderCount>n,beforeResize.renders);await stable();
  await page.evaluate(()=>{const g=window.__cosmos.game;g.timePaused=false;g.rateIndex=0;g.actualRate=1;});const flight=await snapshot();await page.waitForTimeout(600);const flightAfter=await snapshot();assert.ok(flightAfter.renders>flight.renders+8);assert.notDeepEqual(flightAfter.p,flight.p);
  // Hold a straight coast before the next periodic reflection update.
  await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(0);a.game.view='chase';a.game.rateIndex=0;a.game.actualRate=1;});
  await page.waitForTimeout(180);await page.evaluate(()=>window.__cosmos.game.timePaused=true);
  await page.waitForFunction(()=>{const a=window.__cosmos;return !a.world.environmentNeedsUpdate(a.game.player.position);});
  const reflected=await stable();await page.waitForTimeout(500);assert.equal((await snapshot()).renders,reflected.renders);
  const reflections=await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,t=await import('three'),scenes=[];
   const render=()=>w.update(a.game.player,.81,{view:'chase',exposure:1,look:a.game.look});
   const pixels=()=>{const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const x=c.getContext('2d');x.drawImage(w.canvas,0,0);return x.getImageData(0,0,c.width,c.height).data;};
   const original=w.environmentCamera.update.bind(w.environmentCamera);let updates=0;
   w.environmentCamera.update=(...args)=>{updates++;return original(...args);};
   try{
    for(const [chapter,study,label] of [[0,null,'Earth'],[0,'moon','Moon'],[1,null,'Jupiter'],[1,'io','Io'],[2,null,'Saturn'],[2,'ring-plane','Ring-plane'],[2,'titan','Titan'],[3,null,'Pale Blue Dot'],[4,null,'Heliopause']]){
     a.startChapter(chapter,0,study);a.game.mode='panel';a.game.timePaused=true;w.setQuality('high');render();
     const start=a.game.player.position.clone(),velocity=a.game.player.velocity.clone();
     const margin=Math.min(...w.bodyEntries.filter(([id])=>id!=='sun').map(([id,b])=>start.distanceTo(w.bodyPositions[id])-b.reflectionRadius*b.data.radius));
     const bound=Math.max(0,margin)/(4*w.environmentTarget.width),images=[];let preview;
     for(const axis of [new t.Vector3(1,0,0),new t.Vector3(0,1,0),new t.Vector3(0,0,1),new t.Vector3(-1,0,0),new t.Vector3(0,-1,0),new t.Vector3(0,0,-1)]){
      a.game.player.position.copy(start);w.environmentDirty=true;render();
      a.game.player.position.addScaledVector(axis,bound*.95);const before=updates;render();const cached=pixels(),reused=updates===before;
      const show=axis.x===1&&['Earth','Ring-plane'].includes(label);if(show)preview={cached:w.canvas.toDataURL().split(',')[1]};
      w.environmentDirty=true;render();const exact=pixels();if(show)preview.exact=w.canvas.toDataURL().split(',')[1];let total=0,max=0,overTwo=0;
      for(let i=0;i<exact.length;i++)if(i%4!==3){const d=Math.abs(cached[i]-exact[i]);total+=d;max=Math.max(max,d);overTwo+=d>2;}
      images.push({reused,mean:total/(exact.length*.75),max,overTwo});
     }
     // Same physical coast, once with the former exact-position invalidation,
     // once with the bounded map reuse. Count real cube renders, not RAF ticks.
     const policy=w.environmentNeedsUpdate,counts=[];
     for(const previous of [true,false]){
      a.game.player.position.copy(start);w.environmentDirty=true;render();const before=updates;
      if(previous)w.environmentNeedsUpdate=position=>w.environmentDirty||!w.environmentPosition.equals(position);
      for(let i=1;i<=16;i++){a.game.player.position.copy(start).addScaledVector(velocity,.81*i);render();}
      counts.push(updates-before);w.environmentNeedsUpdate=policy;
     }
     a.game.player.position.copy(start);w.environmentDirty=true;render();
     a.game.player.position.x+=bound*1.1+1;const required=w.environmentNeedsUpdate(a.game.player.position),before=updates;render();
     const state={p:a.game.player.position.toArray(),v:a.game.player.velocity.toArray(),q:a.game.player.quaternion.toArray()};
     const refreshed=updates===before+1&&!w.environmentNeedsUpdate(a.game.player.position);render();
     scenes.push({label,boundKm:bound,images,preview,previousCoastUpdates:counts[0],candidateCoastUpdates:counts[1],required,refreshed,physicsUnchanged:JSON.stringify(state)===JSON.stringify({p:a.game.player.position.toArray(),v:a.game.player.velocity.toArray(),q:a.game.player.quaternion.toArray()})});
    }
   }finally{w.environmentCamera.update=original;}
   return scenes;
  });
  for(const scene of reflections){if(scene.preview){if(name==='Chrome')for(const [mode,png] of Object.entries(scene.preview))await fs.writeFile(`tests/screenshots/reflection-${scene.label.toLowerCase()}-${mode}.png`,Buffer.from(png,'base64'));delete scene.preview;}assert.ok(scene.required&&scene.refreshed&&scene.physicsUnchanged,JSON.stringify(scene));assert.ok(scene.images.every(x=>x.reused&&x.mean<.001&&x.max<=2),JSON.stringify(scene));assert.ok(scene.candidateCoastUpdates<=scene.previousCoastUpdates,JSON.stringify(scene));}
  assert.ok(reflections.reduce((n,s)=>n+s.candidateCoastUpdates,0)<reflections.reduce((n,s)=>n+s.previousCoastUpdates,0));
  assert.deepEqual(errors,[]);const report={name,engineVersion:browser.version(),heldViewDraws:held.renders-first.renders,heldFramesProcessed:held.frames-first.frames,identicalHeldPixels:true,turnResponseFrames:turn.frames-beforeTurn.frames,chaseSettles:true,boundedReflectionsFinishBeforeCaching:true,lensExposureAndResizeRefresh:true,scienceAndMusicContinue:true,coastingKeepsRendering:true,reflections,errors,passed:true};outcomes.push(report);console.log(report);
 }finally{await browser.close();}
 await fs.writeFile('tests/held-view-results.json',JSON.stringify({version,outcomes},null,2));
}
