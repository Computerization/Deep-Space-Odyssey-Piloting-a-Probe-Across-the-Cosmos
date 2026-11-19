import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const target=process.env.COSMOS_RING_COST_TARGET||'surface';assert.ok(['surface','ring'].includes(target));
const previous=process.env.COSMOS_RING_PREVIOUS;assert.ok(previous,'Set COSMOS_RING_PREVIOUS to the prior extracted source.');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 for(const file of ['shaders.js','earth-shaders.js','ringshine.js'])await page.route('**/cost-prior/'+file,r=>r.fulfill({path:path.join(previous,'src/rendering',file),contentType:'text/javascript'}));
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');
 const result=await page.evaluate(async target=>{
  const a=window.__cosmos,w=a.world,prior=(await import('/cost-prior/shaders.js'))[target==='ring'?'ringFragment':'fragment'],m=(target==='ring'?w.bodies.saturn.ring:w.bodies.saturn.mesh).material,current=m.fragmentShader,windows=[];
  w.setQuality('ultra');a.startChapter(2,0,'ring-plane');a.game.mode='loading';a.game.timePaused=true;const gl=w.renderer.getContext();
  const physical=()=>JSON.stringify([a.game.player.position.toArray(),a.game.player.velocity.toArray(),a.game.player.quaternion.toArray(),a.game.fuel,a.game.localSeconds]),before=physical();
  for(const fov of [58,12,4]){
   w.setFov(fov);
   for(const mode of ['previous','candidate','candidate','previous']){
    m.fragmentShader=mode==='previous'?prior:current;m.needsUpdate=true;const times=[];
    for(let i=0;i<70;i++){
     await new Promise(requestAnimationFrame);const start=performance.now();w.update(a.game.player,0,{view:'probe',look:a.game.look});gl.finish();
     if(i>=20)times.push(performance.now()-start);
    }
    times.sort((a,b)=>a-b);windows.push({fov,mode,frames:times.length,median:times[25],p95:times[47],calls:w.renderer.info.render.calls,textures:w.renderer.info.memory.textures,geometries:w.renderer.info.memory.geometries});
   }
  }
  m.fragmentShader=current;m.needsUpdate=true;return{windows,physicalStatePreserved:before===physical(),method:'Completed scene draw wall time: update plus gl.finish; 20 warm-up and 50 timed frames per ABBA window. This is not presented frame rate.'};
 },target);
 assert.ok(result.physicalStatePreserved);assert.deepEqual(errors,[]);
 const hashes={};for(const name of ['shaders.js','ringshine.js'])hashes[name]={previous:createHash('sha256').update(await fs.readFile(path.join(previous,'src/rendering',name))).digest('hex'),candidate:createHash('sha256').update(await fs.readFile('src/rendering/'+name)).digest('hex')};
 const report={target,version:JSON.parse(await fs.readFile('package.json')).version,previous:JSON.parse(await fs.readFile(path.join(previous,'package.json'))).version,engine:browser.version(),viewport:[1280,800],pixelRatio:1,quality:'ultra',hashes,...result,errors};
 await fs.writeFile('tests/ring-cost-results.json',JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await browser.close();}
