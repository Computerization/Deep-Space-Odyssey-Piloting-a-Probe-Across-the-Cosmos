import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{}],['WebKit',webkit,{}]]){
 if(process.env.COSMOS_CONTEXT_ENGINE&&name!==process.env.COSMOS_CONTEXT_ENGINE)continue;
 const browser=await engine.launch({headless:true,...options}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
  await page.evaluate(async()=>{
   const a=window.__cosmos,T=await import('three');a.startChapter(0);a.game.timePaused=true;a.game.chapterTime=30;a.game.experience.seen=[];a.experienceGuide.guide.reset();
   a.game.view='probe';a.game.look.identity();a.game.angular.set(0,0,0);
   window.__contextBase=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(a.game.player.position,a.world.bodyPositions.earth,new T.Vector3(0,1,0)));
   window.__contextPitch=degrees=>{a.game.player.quaternion.copy(window.__contextBase).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),degrees*Math.PI/180));a.game.angular.set(0,0,0);a.world.followReady=false;};
   window.__contextPitch(0);
  });
  const physical=await page.evaluate(()=>{const g=window.__cosmos.game;return{p:g.player.position.toArray(),v:g.player.velocity.toArray(),fuel:g.fuel};});
  await page.waitForFunction(()=>window.__cosmos.experienceGuide.guide.active,null,{timeout:6000});
  assert.equal(await page.evaluate(()=>window.__cosmos.game.experience.seen.length),0);
  await page.evaluate(()=>window.__contextPitch(100));await page.waitForTimeout(180);
  assert.equal(await page.locator('#objective-caption').isVisible(),false);
  assert.equal(await page.evaluate(()=>window.__cosmos.game.experience.seen.length),0);
  await page.keyboard.press('h');await page.evaluate(()=>window.__contextPitch(0));await page.waitForTimeout(6500);
  assert.equal(await page.evaluate(()=>window.__cosmos.game.showHud),false);assert.equal(await page.evaluate(()=>window.__cosmos.game.experience.seen.length),0);
  assert.equal(await page.locator('#toast').evaluate(e=>e.classList.contains('visible')),false);
  await page.keyboard.press('h');await page.waitForTimeout(150);assert.equal(await page.locator('#objective-caption').isVisible(),false);
  await page.waitForFunction(()=>window.__cosmos.experienceGuide.guide.active,null,{timeout:6000});
  await page.screenshot({path:`tests/screenshots/v30-${name}-context-note.png`});
  await page.waitForFunction(()=>window.__cosmos.game.experience.seen.length===1,null,{timeout:6000});
  await page.evaluate(()=>window.__contextPitch(100));await page.waitForTimeout(150);assert.equal(await page.locator('#objective-caption').isVisible(),false);
  const geometry=await page.evaluate(()=>{const a=window.__cosmos,range=a.game.player.position.distanceTo(a.world.bodyPositions.earth);return{half:a.world.camera.fov/2,radius:Math.asin(6371/range)*180/Math.PI};});
  await page.evaluate(({half,radius})=>{const a=window.__cosmos;a.game.experience.seen=[];a.experienceGuide.guide.reset();window.__contextPitch(-(half+radius+3));},geometry);
  await page.waitForTimeout(2500);assert.equal(await page.locator('#objective-caption').isVisible(),false);
  await page.keyboard.press('p');await page.waitForFunction(()=>!document.getElementById('photo-receipt').hidden);
  const absent=await page.evaluate(()=>[...window.__cosmos.archive.memory.values()].at(-1).title);assert.equal(absent,'Deep space');
  await page.screenshot({path:`tests/screenshots/v30-${name}-outside-frame.png`});
  await page.evaluate(({half,radius})=>{window.__cosmos.experienceGuide.guide.reset();window.__contextPitch(-(half+radius*.25));},geometry);
  await page.waitForTimeout(300);
  const projection=await page.evaluate(()=>{const a=window.__cosmos;return a.world.project(a.world.bodyPositions.earth,a.game.player);});assert.ok(Math.abs(projection.y)>1);
  assert.ok(await page.locator('#waypoint.resolved').isVisible());
  const label=await page.locator('#waypoint').boundingBox();assert.ok(label.y>300&&label.y<400,'Partial-world bearing sits just beyond the visible Earth limb');
  await page.keyboard.press('p');await page.waitForFunction(()=>!document.getElementById('photo-button').disabled&&window.__cosmos.archive.memory.size===2);
  const clipped=await page.evaluate(()=>[...window.__cosmos.archive.memory.values()].at(-1).title);assert.match(clipped,/Earth/);
  await page.waitForFunction(()=>window.__cosmos.experienceGuide.guide.active,null,{timeout:6000});
  await page.screenshot({path:`tests/screenshots/v30-${name}-limb-context.png`});
  assert.deepEqual(await page.evaluate(()=>{const g=window.__cosmos.game;return{p:g.player.position.toArray(),v:g.player.velocity.toArray(),fuel:g.fuel};}),physical);
  await page.waitForFunction(()=>window.__cosmos.game.experience.seen.length===1,null,{timeout:6000});
  await page.keyboard.press('j');await page.waitForSelector('[data-action=journal-tab][data-value=notes]');await page.click('[data-action=journal-tab][data-value=notes]');await page.waitForFunction(()=>document.querySelector('.field-notes'));
  assert.deepEqual(errors,[]);
  const result={name,engineVersion:browser.version(),hiddenHudDoesNotConsumeNotes:true,cleanViewHasNoToggleToast:true,interruptedNoteReturns:true,readAfterVisibleDwell:true,noteLeavesWithSubject:true,verticalFraming:true,clippedLimbPhotograph:clipped,absentSubjectPhotograph:absent,readNoteInJournal:true,physicalStatePreserved:true,errors,passed:true};outcomes.push(result);console.log(result);
 }finally{await browser.close();}
}
await fs.writeFile('tests/context-v30-results.json',JSON.stringify({version:'0.30.0',outcomes},null,2)+'\n');
