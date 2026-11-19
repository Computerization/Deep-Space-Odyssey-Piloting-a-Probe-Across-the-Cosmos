import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const previous=await fs.readFile(process.env.COSMOS_PREVIOUS_SATURN||'assets/textures/saturn.avif');
const candidate=await fs.readFile(process.env.COSMOS_CANDIDATE_SATURN||'assets/textures/saturn.avif');
const previousShader=process.env.COSMOS_PREVIOUS_SHADER?await fs.readFile(process.env.COSMOS_PREVIOUS_SHADER,'utf8'):null;
const capHash=createHash('sha256').update(await fs.readFile('assets/textures/saturn-polar.avif')).digest('hex');
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&process.env.COSMOS_TEST_ENGINE!==name)continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],views=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');
  await page.evaluate(async source=>{
   const material=window.__cosmos.world.bodies.saturn.mesh.material;
   window.polarShaders={candidate:material.fragmentShader,previous:material.fragmentShader};
   if(source){
    const resolved=source.replace(/from '([^']+)'/g,(_,p)=>`from '${new URL(p,new URL('/src/rendering/shaders.js',location.href))}'`);
    const url=URL.createObjectURL(new Blob([resolved],{type:'text/javascript'}));
    window.polarShaders.previous=(await import(url)).fragment;URL.revokeObjectURL(url);
   }
  },previousShader);
  const geometry=await page.evaluate(async({previous,candidate})=>{
   const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(2);a.game.mode='panel';w.setQuality('ultra');window.polarTextures={};
   for(const [id,bytes] of Object.entries({previous,candidate})){
    const texture=await new t.TextureLoader().loadAsync('data:image/avif;base64,'+bytes);
    texture.colorSpace=t.SRGBColorSpace;texture.wrapS=t.RepeatWrapping;texture.anisotropy=w.textures['saturn.avif'].anisotropy;window.polarTextures[id]=texture;
   }
   const dims=Object.fromEntries(Object.entries(window.polarTextures).map(([id,tex])=>[id,[tex.image.width,tex.image.height]]));
   const sun=w.bodyPositions.saturn.clone().negate().normalize(),up=new t.Vector3(0,1,0).applyQuaternion(w.bodies.saturn.group.quaternion);return{dims,sunElevation:Math.asin(sun.dot(up))*180/Math.PI};
  },{previous:previous.toString('base64'),candidate:candidate.toString('base64')});
  assert.deepEqual(geometry.dims.previous,geometry.dims.candidate);
  for(const label of ['encounter','north','north-detail','north-side','north-exact','north-rotated','south','rings']){
   await page.evaluate(async label=>{
    const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(2,0,label==='rings'?'ring-plane':null);a.game.mode='panel';a.game.timePaused=true;a.game.view='probe';a.game.look.identity();w.setFov(label==='north-detail'?18:label.startsWith('north')?40:58);
    if(label.startsWith('north')||label==='south'){
     const body=w.bodies.saturn,c=w.bodyPositions.saturn,up=new t.Vector3(0,1,0).applyQuaternion(body.group.quaternion),sun=c.clone().negate().normalize(),equator=sun.clone().addScaledVector(up,-sun.dot(up)).normalize();
     if(label==='north-side')equator.applyAxisAngle(up,Math.PI/2);
     if(label==='north-rotated')a.game.localSeconds=8000;
     const p=c.clone().addScaledVector(up,(label==='south'?-2.3:2.3)*60268).addScaledVector(equator,(label==='north-exact'?0:.85)*60268),target=c.clone().addScaledVector(up,(label==='south'?-.7:.7)*60268);
     a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,target,new t.Vector3(0,0,1).applyQuaternion(body.group.quaternion)));
    }
    w.followReady=false;
   },label);
   const draws={};
   for(const mode of ['previous','candidate']){
    const capture=await page.evaluate(mode=>{
     const a=window.__cosmos,w=a.world,m=w.bodies.saturn.mesh.material;
     m.fragmentShader=window.polarShaders[mode];m.needsUpdate=true;
     w.bodies.saturn.uniforms.surfaceMap.value=window.polarTextures[mode];w.update(a.game.player,0,{view:'probe',look:a.game.look,exposure:1,time:a.game.localSeconds});
     return{png:w.canvas.toDataURL().split(',')[1],calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles};
    },mode);
    await fs.writeFile(`tests/screenshots/saturn-polar-${name}-${label}-${mode}.png`,Buffer.from(capture.png,'base64'));draws[mode]={calls:capture.calls,triangles:capture.triangles};
   }
   assert.deepEqual(draws.previous,draws.candidate);views.push({label,draws});
  }
  if(process.env.COSMOS_POLAR_VIEWS_ONLY){
   assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),geometry,views,errors,passed:true});console.log({name,views:views.length,passed:true});
  }else{
  await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(2);a.game.timePaused=true;});
  await page.click('#map-button');
  const layouts=[];
  for(const viewport of [{width:1280,height:800},{width:1024,height:640},{width:800,height:600}]){
   await page.setViewportSize(viewport);await page.locator('[data-action=study][data-value=north-pole]').scrollIntoViewIfNeeded();
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const layout=await page.evaluate(()=>{const b=document.querySelector('[data-action=study][data-value=north-pole]').getBoundingClientRect(),f=document.querySelector('.atlas-footer').getBoundingClientRect();return {studyBottom:b.bottom,footerTop:f.top,footerBottom:f.bottom,height:innerHeight};});
   assert.ok(layout.studyBottom<=layout.footerTop&&layout.footerBottom<=layout.height);layouts.push({viewport,...layout});
   await page.screenshot({path:`tests/screenshots/saturn-polar-${name}-menu-${viewport.width}.png`});
  }
  await page.setViewportSize({width:1280,height:800});await page.click('[data-action=study][data-value=north-pole]');
  const study=await page.evaluate(()=>{const a=window.__cosmos,g=a.game;g.mode='panel';g.timePaused=true;a.world.update(g.player,0,{view:g.view,look:g.look,exposure:1});return {id:g.study,epoch:a.world.epoch,date:document.getElementById('chapter-date').textContent,fov:a.world.camera.fov,speed:g.player.velocity.length(),position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),q:g.player.quaternion.toArray()};});
  assert.equal(study.id,'north-pole');assert.equal(study.epoch,2);assert.equal(study.fov,40);assert.match(study.date,/12 November 1980.*23:46:30 UTC/);
  const science=await page.evaluate(()=>{const a=window.__cosmos,g=a.game;g.experience.seen=[];g.chapterTime=20;a.experienceGuide.guide.reset();
   for(let i=0;i<420;i++)a.updateFlight(1/60,a.zeroInput);
   return {seen:g.experience.seen,position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),q:g.player.quaternion.toArray()};});
  assert.ok(science.seen.includes('saturn-hexagon'));for(const key of ['position','velocity','q'])assert.deepEqual(science[key],study[key]);
  await page.evaluate(()=>{const a=window.__cosmos;a.game.mode='play';a.experienceGuide.render();});
  await page.screenshot({path:`tests/screenshots/saturn-polar-${name}-study.png`});
  const coast=await page.evaluate(()=>{const a=window.__cosmos,g=a.game;g.mode='panel';g.timePaused=false;g.rateIndex=2;const before=g.player.position.clone();for(let i=0;i<120;i++){a.updateFlight(1/60,a.zeroInput);a.flightHistory.record(g,1/60);}g.timePaused=true;g.mode='play';return {distance:g.player.position.distanceTo(before),seconds:g.localSeconds,held:g.boundaryPaused,history:a.flightHistory.samples.length};});
  assert.ok(coast.distance>10&&coast.seconds>1&&!coast.held&&coast.history>1,JSON.stringify(coast));
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(160);await page.keyboard.up('ArrowRight');
  assert.notDeepEqual(await page.evaluate(()=>window.__cosmos.game.player.quaternion.toArray()),study.q);
  await page.click('#review-button');await page.locator('#review-range').fill('0');await page.click('#review-apply');
  assert.equal(await page.evaluate(()=>window.__cosmos.world.camera.fov),40);assert.equal(await page.evaluate(()=>window.__cosmos.game.localSeconds),0);
  await page.click('#pause-button');await page.reload();await page.waitForFunction(()=>window.__cosmos);await page.click('#continue');
  const restored=await page.evaluate(()=>{const a=window.__cosmos;return {study:a.game.study,epoch:a.world.epoch,fov:a.world.camera.fov,notes:a.game.experience.seen};});
  assert.equal(restored.study,'north-pole');assert.equal(restored.epoch,2);assert.equal(restored.fov,40);assert.ok(restored.notes.includes('saturn-hexagon'));
  await page.keyboard.press('j');await page.click('[data-action=journal-tab][data-value=notes]');assert.ok((await page.locator('.field-notes').textContent()).includes('25 June 2013'));await page.keyboard.press('Escape');
  await page.click('#map-button');await page.click('[data-action=depart]');assert.equal(await page.evaluate(()=>window.__cosmos.game.stage),'transit');
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),geometry,views,layouts,study,science,coast,restored,studyDeparture:true,errors,passed:true});console.log({name,geometry,passed:true});
  }
 }finally{await browser.close();}
 await fs.writeFile(`tests/saturn-polar${process.env.COSMOS_TEST_ENGINE?'-'+name:''}-results.json`,JSON.stringify({version:JSON.parse(await fs.readFile('package.json','utf8')).version,capHash,viewsOnly:!!process.env.COSMOS_POLAR_VIEWS_ONLY,outcomes},null,2)+'\n');
}
