import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const name='Chrome';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const normal=process.argv.includes('--normal');
const errors=[],result={engine:name};
try{
 const page=await browser.newPage({viewport:normal?{width:1280,height:800}:{width:1440,height:900},deviceScaleFactor:normal?2:1});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text().slice(0,600))}});
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});
 if(process.argv.includes('--portraits')){
  Object.assign(result,await (await import('./planet-portraits.mjs')).checkPlanetPortraits(page,name));
 }else if(normal){
  Object.assign(result,await (await import('./normal-view-check.mjs')).checkNormalView(page,name));
 }else{
 await page.evaluate(async()=>{
  const {game:g,world:w,startChapter}=__cosmos,T=await import('/vendor/three/three.module.js');
  startChapter(0);g.timePaused=true;g.showHud=false;document.querySelector('#hud').hidden=true;g.tracking=null;g.freeLook=false;g.look.identity();
  const latitude=25*Math.PI/180,longitude=-105,u=(longitude+180)/360,rotation=w.bodies.earth.data.mapPhase,a=(u-rotation)*Math.PI*2;
  const n=new T.Vector3(-Math.cos(a)*Math.cos(latitude),Math.sin(latitude),Math.sin(a)*Math.cos(latitude)).applyQuaternion(w.bodies.earth.group.quaternion);
  g.player.position.copy(w.bodyPositions.earth).addScaledVector(n,w.bodies.earth.data.radius*1.3);
  g.player.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(g.player.position,w.bodyPositions.earth,new T.Vector3(0,1,0)));g.player.velocity.set(0,0,0);w.setFov(40);w.needsRender=true;
 });
 await page.waitForFunction(()=>__cosmos.world.surfaceDetail.active&&!__cosmos.world.surfaceDetail.pending&&__cosmos.world.bodies.earth.uniforms.surfacePatchWeight.value===1,null,{timeout:30000});
 await page.waitForTimeout(800);await page.screenshot({path:`tests/screenshots/surface-${name}-earth-detail.png`});
 result.patch=await page.evaluate(()=>{const w=__cosmos.world;return{key:w.surfaceDetail.active.key,cache:w.surfaceDetail.cache.size,loads:w.surfaceDetail.loads,width:w.bodies.earth.uniforms.surfacePatchMap.value.image.width,base:w.bodies.earth.uniforms.surfaceMap.value.image.width}});
 // Hold the same camera, illumination, clouds and source palette for the comparison.
 await page.evaluate(()=>{const w=__cosmos.world;w.surfaceDetail.enabled=false;w.bodies.earth.uniforms.surfacePatchWeight.value=0;w.needsRender=true;});await page.waitForTimeout(500);await page.screenshot({path:`tests/screenshots/surface-${name}-earth-overview.png`});
 assert.ok(result.patch.cache<=8);assert.equal(result.patch.width,4096);
 await page.evaluate(()=>{__cosmos.world.surfaceDetail.enabled=true;__cosmos.world.needsRender=true;});
 await page.waitForFunction(()=>__cosmos.world.bodies.earth.uniforms.surfacePatchWeight.value===1);
 // Compare native surface views on other bodies without inventing extra texture information.
 for(const [chapter,study,body] of [[0,'moon','moon'],[1,null,'jupiter'],[1,'io','io'],[2,null,'saturn']]){
  await page.evaluate(async({chapter,study,body})=>{const {game:g,world:w}=__cosmos,T=await import('/vendor/three/three.module.js');__cosmos.startChapter(chapter,0,study);g.timePaused=true;g.tracking=null;g.freeLook=false;g.look.identity();g.showHud=false;document.querySelector('#hud').hidden=true;
   const f=w.getFrame(body);g.player.position.copy(w.fromFrame(f,[.25,.16,1.18],w.bodies[body].data.radius));g.player.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(g.player.position,f.center,f.y));w.setFov(40);w.needsRender=true;},{chapter,study,body});
  await page.waitForTimeout(900);
  if(body==='io')assert.equal(await page.evaluate(()=>__cosmos.world.bodies.io.uniforms.surfaceMap.value.image.width),11444);
  await page.screenshot({path:`tests/screenshots/surface-${name}-${body}.png`});
 }
 // Resume preserves the assisted local state and photographs independently of older velocities.
 await page.evaluate(()=>{__cosmos.startChapter(0);__cosmos.observationCamera.follow('earth');});
 await page.keyboard.down('d');await page.waitForTimeout(1000);await page.keyboard.up('d');await page.waitForTimeout(600);await page.keyboard.press('Escape');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cosmos-voyager-save-v2')));assert.equal(saved.physicsVersion,3);
 await page.reload();await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});
 // Sample on the actual Continue click, after the game's handler but before the
 // next animation frame transports the coasting velocity around the planet.
 await page.evaluate(()=>document.querySelector('#continue').addEventListener('click',()=>{
  const g=__cosmos.game;window.restoredPose={chapter:g.chapter,tracking:g.tracking,position:g.player.position.toArray(),velocity:g.player.velocity.toArray()};
 },{once:true}));
 await page.click('#continue');const resumed=await page.evaluate(()=>window.restoredPose);
 assert.equal(resumed.chapter,saved.chapter);assert.equal(resumed.tracking,'earth');assert.deepEqual(resumed.position,saved.position);assert.deepEqual(resumed.velocity,saved.velocity);result.resume=true;
 }
 assert.deepEqual(errors,[]);result.errors=errors;await fs.writeFile(`tests/${process.argv.includes('--portraits')?'portraits':normal?'normal':'surface'}-${name}-${result.label||'current'}-results.json`,JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{await browser.close()}
