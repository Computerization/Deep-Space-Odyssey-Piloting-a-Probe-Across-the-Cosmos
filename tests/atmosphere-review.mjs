// Paired transport output and live drawing cost, using the complete prior shader.
import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';import path from 'node:path';
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const previous=process.env.COSMOS_VISUAL_PREVIOUS;assert.ok(previous);
const source='src/rendering/earth-shaders.js';
const hashes=Object.fromEntries(await Promise.all(['previous','candidate'].map(async mode=>[mode,createHash('sha256').update(await fs.readFile(mode==='previous'?path.join(previous,source):source)).digest('hex')])));
const scenes=[['day',2.35,35],['terminator',2.35,90],['crescent',2.35,150],['night',2.35,175],['close',1.08,35],['grazing',1.08,90],['resolved-limb',1.05,35,1.2645,4],['inside-air',1.001,85,1.50,20]];
const routes=[['adaptive','high',2,.75,false],['direct','ultra',2,1,false],['merged','high',2,1,false],['multisampled','high',1,1,false],['capture','high',2,1,true]];
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:800,height:500},deviceScaleFactor:2}),errors=[],views=[],cost=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  const old=(await fs.readFile(path.join(previous,source),'utf8')).replace("from '../mission.js'","from '/src/mission.js'");
  await page.route('**/air-review/previous.js',r=>r.fulfill({body:old,contentType:'text/javascript'}));
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:120000});await page.click('#begin');
  await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,prior=await import('/air-review/previous.js');a.game.mode='loading';document.getElementById('hud').hidden=true;
   const materials=[[w.bodies.earth.atmosphere.material,prior.earthAtmosphereFragment],[w.bodies.earth.transmission.material,prior.earthTransmittanceFragment],[w.cloudLayer.resolve,prior.earthCloudCompositeFragment],...w.cloudLayer.cloudMaterials.map((m,i)=>[m,prior.cloudShader(false,!!i)]),...w.cloudLayer.volumeMaterials.map((m,i)=>[m,prior.cloudShader(true,!!i)])].map(([m,old])=>({m,old,current:m.fragmentShader}));
   window.selectAir=mode=>{for(const {m,old,current} of materials){const shader=mode==='previous'?old:current;if(m.fragmentShader!==shader){m.fragmentShader=shader;m.needsUpdate=true;}}};
   window.airScene=async(scene,route)=>{
    const [label,radius,phase,yaw=0,fov=58]=scene,[routeName,quality,dpr,scale,capturing]=route,t=await import('three');a.startChapter(0);const g=a.game;g.mode='loading';g.timePaused=true;g.look.identity();
    Object.defineProperty(window,'devicePixelRatio',{value:dpr,configurable:true});w.setQuality(quality);w.cloudScale=scale;w.capturing=capturing;w.setFov(fov);
    const c=w.bodyPositions.earth,sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize(),p=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180)).multiplyScalar(w.bodies.earth.data.radius*radius).add(c);
    g.player.position.copy(p);g.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0))).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),yaw));w.followReady=false;
   };
  });
  for(const scene of scenes)for(const route of (scene[0]==='day'?routes:routes.slice(0,2))){
   const result=await page.evaluate(async({scene,route})=>{
    await airScene(scene,route);const a=window.__cosmos,w=a.world,g=a.game,t=await import('three'),canvas=document.createElement('canvas');canvas.width=w.canvas.width;canvas.height=w.canvas.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});
    // Settle matrix/target state after changing scene or composition route;
    // transition latency is measured separately by encounter-performance.mjs.
    selectAir('previous');for(let i=0;i<2;i++)w.update(g.player,0,{view:'probe',look:g.look});
    const state=()=>JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.localSeconds,g.fuel]),before=state(),frames=[],resources=[];
    for(const mode of ['previous','previous','candidate']){
     selectAir(mode);w.update(g.player,0,{view:'probe',look:g.look});ctx.drawImage(w.canvas,0,0);const display=ctx.getImageData(0,0,canvas.width,canvas.height).data;
     const hdr=new Uint16Array(w.frameTarget.width*w.frameTarget.height*4);w.renderer.readRenderTargetPixels(w.frameTarget,0,0,w.frameTarget.width,w.frameTarget.height,hdr);
     frames.push({display,hdr});resources.push({calls:w.renderer.info.render.calls,textures:w.renderer.info.memory.textures,geometries:w.renderer.info.memory.geometries,pixels:[w.frameTarget.width,w.frameTarget.height],detailWeight:w.cloudLayer.detailWeight.value});
    }
    const difference=(a,b)=>{let sum=0,max=0,changed=0,hdrMax=0,hdrChanged=0,hdrOverTolerance=0;for(let i=0;i<a.display.length;i++)if(i%4!==3){const d=Math.abs(a.display[i]-b.display[i]);sum+=d;max=Math.max(max,d);changed+=d!==0;const x=t.DataUtils.fromHalfFloat(a.hdr[i]),y=t.DataUtils.fromHalfFloat(b.hdr[i]),delta=Math.abs(x-y);if(!Number.isFinite(delta))throw Error('Non-finite transport output');hdrMax=Math.max(hdrMax,delta);hdrChanged+=delta!==0;hdrOverTolerance+=delta>Math.max(.00002,Math.abs(x)*.001);}
     return{max,mean:sum/(a.display.length*.75),changed,channels:a.display.length*.75,hdrMax,hdrChanged,hdrOverTolerance};};
    const gl=w.renderer.getContext();if(gl.getError()!==gl.NO_ERROR)throw Error('Graphics error');
    return {referenceRepeat:difference(frames[0],frames[1]),candidate:difference(frames[1],frames[2]),resources,physicalStatePreserved:state()===before,png:scene[0]==='grazing'&&route[0]==='direct'?canvas.toDataURL():null};
   },{scene,route});
   if(result.png&&name==='Chrome')await fs.writeFile('tests/screenshots/atmosphere-grazing-current.png',Buffer.from(result.png.split(',')[1],'base64'));delete result.png;
   assert.ok(result.physicalStatePreserved);if(result.referenceRepeat.changed)console.log({name,scene:scene[0],route:route[0],...result});assert.equal(result.referenceRepeat.changed,0);assert.equal(result.referenceRepeat.hdrChanged,0);
   assert.ok(result.candidate.max<=1&&result.candidate.mean<.0001&&result.candidate.hdrOverTolerance===0,JSON.stringify({name,scene:scene[0],route:route[0],...result}));
   assert.deepEqual(result.resources[2],result.resources[1]);views.push({scene:scene[0],route:route[0],...result});
  }
  if(name==='Chrome'&&process.env.COSMOS_AIR_COST){
   await page.setViewportSize({width:1600,height:1000});
   for(const scene of [scenes[0],scenes[5]]){
    const rows=await page.evaluate(async scene=>{
     await airScene(scene,['adaptive','high',2,.75,false]);const a=window.__cosmos,w=a.world,g=a.game,gl=w.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),rows=[];if(!ext)throw Error('GPU timers unavailable');
     for(const mode of ['previous','candidate','candidate','previous']){
      selectAir(mode);const intervals=[],gpu=[],pending=[];let last;
      const drain=()=>{for(let i=pending.length-1;i>=0;i--){const q=pending[i];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(ext.GPU_DISJOINT_EXT))gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);pending.splice(i,1);}}};
      for(let i=0;i<150;i++){const now=await new Promise(requestAnimationFrame);if(i>=30)intervals.push(now-last);last=now;const q=i>=30?gl.createQuery():null;if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);w.update(g.player,0,{view:'probe',look:g.look});if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(q);}drain();}
      for(let i=0;i<40&&pending.length;i++){await new Promise(requestAnimationFrame);drain();}for(const q of pending)gl.deleteQuery(q);
      const stats=a=>{a.sort((x,y)=>x-y);return{samples:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)]}};
      rows.push({mode,interval:stats(intervals),gpu:stats(gpu),pixels:[w.frameTarget.width,w.frameTarget.height],cloudPixels:[w.cloudLayer.target.width,w.cloudLayer.target.height]});
     }return rows;
    },scene);assert.ok(rows.every(r=>r.gpu.samples===120&&r.interval.samples===120));cost.push({scene:scene[0],rows});
   }
  }
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),views,cost,errors});console.log({name,views:views.length,cost,passed:true});
 }finally{await browser.close();}
}
await fs.writeFile(process.env.COSMOS_AIR_REPORT||'tests/atmosphere-review-results.json',JSON.stringify({version:JSON.parse(await fs.readFile('package.json')).version,previous,source,hashes,method:'Repeated-prior and candidate display/HDR comparison at the same physical state, 6/12/20 integration samples and fixed render grids. Optional Chrome timing uses full-frame GPU queries and animation intervals in ABBA order, 30 warm-up and 120 measured frames per window; short local timing, not sustained hardware coverage.',outcomes},null,2)+'\n');
