// Bounded comparison of the cloud budget; retain full scene and source detail.
import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 const result=await page.evaluate(async()=>{
  const a=__cosmos,w=a.world,gl=w.renderer.getContext(),pixel=new Uint8Array(4);a.startChapter(0);a.game.mode='loading';a.game.timePaused=true;w.setQuality('high');w.setFov(18);
  const physical=JSON.stringify([a.game.player.position.toArray(),a.game.localSeconds]);
  const draw=settled=>{w.update(a.game.player,0,{view:'probe',look:a.game.look,settled});gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);};
  const rows=[];for(const scale of [.75,.5,.5,.75]){
   w.cloudScale=scale;for(let i=0;i<12;i++){await new Promise(requestAnimationFrame);draw(false)}
   const times=[];for(let i=0;i<24;i++){await new Promise(requestAnimationFrame);const t=performance.now();draw(false);times.push(performance.now()-t)}
   times.sort((a,b)=>a-b);rows.push({scale,medianMs:times[12],p95Ms:times[22],scene:[w.frameTarget.width,w.frameTarget.height],cloud:[w.cloudLayer.target.width,w.cloudLayer.target.height]});
  }
  w.cloudScale=.5;draw(true);return{rows,settledUsesNativeScene:!w.cloudLayer.enabled(w),physicalUnchanged:physical===JSON.stringify([a.game.player.position.toArray(),a.game.localSeconds]),glError:gl.getError()};
 });
 assert.equal(result.glError,0);assert.ok(result.physicalUnchanged);assert.ok(result.rows.every(r=>r.scene[0]===2880&&r.scene[1]===1800));assert.ok(result.settledUsesNativeScene);
 await page.screenshot({path:'tests/screenshots/experience-earth-detail.png'});
 await fs.writeFile('tests/experience-rendering-results.json',JSON.stringify({version:JSON.parse(await fs.readFile('package.json')).version,method:'Completed frame readback, interleaved cloud scale comparison at fixed physical pose. These diagnostic intervals are not display FPS.',...result},null,2)+'\n');console.log(result);
}finally{await browser.close()}
