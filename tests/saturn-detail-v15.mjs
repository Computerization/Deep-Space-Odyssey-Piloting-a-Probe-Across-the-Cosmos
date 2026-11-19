import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
assert.ok(process.env.COSMOS_SATURN_BASE,'Set COSMOS_SATURN_BASE to the v14 saturn.avif baseline.');
const baseline=await fs.readFile(process.env.COSMOS_SATURN_BASE),current=await fs.readFile('assets/textures/saturn.avif');
assert.notEqual(createHash('sha256').update(baseline).digest('hex'),createHash('sha256').update(current).digest('hex'));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.route('**/__qa__/saturn-base.avif',route=>route.fulfill({body:baseline,contentType:'image/avif'}));
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');
 await page.evaluate(async()=>{const a=window.__cosmos,t=await import('three');a.startChapter(2);a.game.timePaused=true;a.game.view='probe';a.game.mode='panel';a.world.setQuality('ultra');document.getElementById('hud').hidden=true;window.saturnCandidate=a.world.bodies.saturn.uniforms.surfaceMap.value;window.saturnBase=await new t.TextureLoader().loadAsync('/__qa__/saturn-base.avif');window.saturnBase.colorSpace=t.SRGBColorSpace;window.saturnBase.wrapS=t.RepeatWrapping;window.saturnBase.anisotropy=16;});
 for(const view of ['arrival','south']){
  if(view==='south')await page.evaluate(async()=>{const a=window.__cosmos,{Vector3,Matrix4}=await import('three'),body=a.world.bodies.saturn,center=a.world.bodyPositions.saturn;const sun=center.clone().negate().normalize().applyQuaternion(body.inverseOrientation);const dir=new Vector3(sun.x,0,sun.z).normalize().multiplyScalar(Math.cos(Math.PI/4)).add(new Vector3(0,-Math.sin(Math.PI/4),0)).applyQuaternion(body.group.quaternion);a.game.player.position.copy(center).addScaledVector(dir,60268*3.5);a.game.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(a.game.player.position,center,new Vector3(0,1,0).applyQuaternion(body.group.quaternion)));a.world.followReady=false;});
  for(const map of ['base','candidate']){
   await page.evaluate(map=>{const a=window.__cosmos;a.world.bodies.saturn.uniforms.surfaceMap.value=map==='base'?window.saturnBase:window.saturnCandidate;a.world.update(a.game.player,0,{view:'probe',exposure:1,look:a.game.look});},map);
   await page.screenshot({path:`tests/screenshots/v15-saturn-${view}-${map}.png`});
  }
 }
 assert.deepEqual(errors,[]);await fs.writeFile('tests/saturn-detail-v15-results.json',JSON.stringify({version:'0.15.0',views:['arrival','south'],maps:['v14 baseline','v15 current'],baseSha256:createHash('sha256').update(baseline).digest('hex'),currentSha256:createHash('sha256').update(current).digest('hex'),errors},null,2));
}finally{await browser.close();}
