// Full-resolution photography must preserve the held flight and restore its
// adaptive flight target. The exact photograph must survive save/reload.
import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const outcomes=[];
const chapter=Number(process.env.COSMOS_PHOTO_CHAPTER||0),study=process.env.COSMOS_PHOTO_STUDY||null;
for(const [name,engine,options]of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1000,height:625},deviceScaleFactor:2}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:120000});await page.click('#begin');
  await page.evaluate(({chapter,study})=>{
   const a=window.__cosmos,w=a.world;a.startChapter(chapter,0,study);a.game.timePaused=true;w.setQuality('high');w.ratio=1;w.resize();w.update(a.game.player,0,{view:'probe',look:a.game.look});
   window.photoTargets=[];const update=w.update;w.update=function(...args){if(this.capturing)photoTargets.push([this.frameTarget.width,this.frameTarget.height]);return update.apply(this,args);};
   window.photoState=()=>JSON.stringify([a.game.player.position.toArray(),a.game.player.velocity.toArray(),a.game.player.quaternion.toArray(),a.game.localSeconds,a.game.fuel,a.game.look.toArray(),w.camera.fov]);
  },{chapter,study});
  const before=await page.evaluate(()=>({physical:photoState(),dimensions:[window.__cosmos.world.canvas.width,window.__cosmos.world.canvas.height],scene:[window.__cosmos.world.frameTarget.width,window.__cosmos.world.frameTarget.height]}));
  await page.keyboard.press('p');await page.waitForFunction(()=>window.__cosmos.archive.memory.size>0);
  const recorded=await page.evaluate(async()=>{const a=window.__cosmos,photos=await a.archive.all(),p=photos.find(p=>p.kind==='field'),im=await createImageBitmap(await(await fetch(p.photo)).blob());const dimensions=[im.width,im.height];im.close();window.recordedPhoto=p;return{id:p.id,photo:p.photo,dimensions,livePixels:[a.world.canvas.width,a.world.canvas.height],physical:photoState(),scene:[a.world.frameTarget.width,a.world.frameTarget.height],captureTargets:photoTargets};});
  assert.deepEqual(recorded.dimensions,[2000,1250]);assert.deepEqual(recorded.livePixels,before.dimensions);assert.equal(recorded.physical,before.physical);assert.deepEqual(recorded.scene,before.scene);assert.deepEqual(recorded.scene,[1000,625]);assert.ok(recorded.captureTargets.some(s=>s[0]===2000&&s[1]===1250));
  await page.keyboard.press('Escape');await page.reload();await page.waitForFunction(()=>window.__cosmos,null,{timeout:120000});await page.click('#continue');
  const saved=await page.evaluate(async id=>{const p=(await window.__cosmos.archive.all()).find(p=>p.id===id);return p.photo;},recorded.id);assert.equal(saved,recorded.photo);
  await page.keyboard.press('j');await page.waitForFunction(()=>document.querySelector('.photo-open'));
  assert.deepEqual(errors,[]);delete recorded.photo;outcomes.push({name,engineVersion:browser.version(),recorded,restoredExactImage:true,journalVisible:true,errors});console.log({name,passed:true});
 }finally{await browser.close();}
}
await fs.writeFile('tests/photo-resolution-results.json',JSON.stringify({version:JSON.parse(await fs.readFile('package.json')).version,chapter,study,outcomes},null,2)+'\n');
