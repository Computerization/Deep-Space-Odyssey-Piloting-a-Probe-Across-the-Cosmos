import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
// Called by the surface review. All comparisons use the ordinary 58° lens.
export async function checkNormalView(page,name){
 const label=process.env.COSMOS_COMPARISON_LABEL||'current',checks=[];
 await page.evaluate(()=>{__cosmos.world.setQuality('high');document.querySelector('#hud').style.visibility='hidden'});
 for(const [scene,chapter,range] of [['earth',0,null],['earth-near',0,1.55],['jupiter',1,null]]){
  await page.evaluate(({chapter,range})=>{const a=__cosmos;a.startChapter(chapter);if(range){const c=a.world.bodyPositions.earth;a.game.player.position.sub(c).normalize().multiplyScalar(a.world.bodies.earth.data.radius*range).add(c)}a.game.timePaused=false;}, {chapter,range});
  await page.waitForTimeout(1800);
  const pose=await page.evaluate(()=>({p:__cosmos.game.player.position.toArray(),q:__cosmos.game.player.quaternion.toArray(),look:__cosmos.game.look.toArray()}));
  const frames=await page.evaluate(async()=>{const ticks=[];let last=performance.now(),start=last;await new Promise(resolve=>{function tick(now){ticks.push(now-last);last=now;if(now-start<1800)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)});ticks.sort((a,b)=>a-b);return{medianMs:ticks[Math.floor(ticks.length*.5)],p95Ms:ticks[Math.floor(ticks.length*.95)],count:ticks.length}});
  const read=()=>page.evaluate(()=>{const w=__cosmos.world;return{fov:w.camera.fov,time:__cosmos.game.localSeconds,base:w.bodies.earth.uniforms.surfaceMap.value.image.width,scene:[w.frameTarget.width,w.frameTarget.height],clouds:w.cloudLayer.enabled(w)?[w.cloudLayer.target.width,w.cloudLayer.target.height]:[w.frameTarget.width,w.frameTarget.height]}});
  const idle=await read();await page.keyboard.down('ArrowRight');await page.waitForTimeout(450);const turning=await read();await page.keyboard.up('ArrowRight');await page.waitForTimeout(600);const released=await read();
  // Freeze only the comparison render, after separately checking live idle and turning.
  await page.evaluate(pose=>{const a=__cosmos;a.game.mode='loading';a.game.player.position.fromArray(pose.p);a.game.player.quaternion.fromArray(pose.q);a.game.look.fromArray(pose.look);a.world.followReady=false;a.world.update(a.game.player,0,{view:'probe',look:a.game.look,time:0,exposure:1,settled:false})},pose);
  await page.screenshot({path:`tests/screenshots/normal-${name}-${label}-${scene}.png`});
  const row={scene,frames,idle,turning,released};checks.push(row);console.log(row);
  assert.equal(idle.fov,58);assert.ok(turning.time>idle.time);
  if(label!=='before')for(const sample of [idle,turning,released])assert.deepEqual(sample.clouds,sample.scene,'High retains native cloud pixels without holding time');
 }
 return {label,checks};
}
