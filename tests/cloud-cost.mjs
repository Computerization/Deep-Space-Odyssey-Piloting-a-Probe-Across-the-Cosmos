import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import * as currentField from '../src/rendering/earth-shaders.js';
let lowPowerModeConfigured=null;try{if(process.platform==='darwin')lowPowerModeConfigured=execFileSync('pmset',['-g','custom'],{encoding:'utf8'}).match(/lowpowermode\s+(\d)/)?.[1]==='1';}catch{}
const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const shaderSourceSha256=createHash('sha256').update(await fs.readFile('src/rendering/earth-shaders.js')).digest('hex');
const previousModule=process.env.COSMOS_CLOUD_PREVIOUS_MODULE;
const oldField=previousModule?await import(pathToFileURL(previousModule).href):null;
const previous=oldField?.cloudFragment??await fs.readFile(process.env.COSMOS_CLOUD_PREVIOUS||'tests/fixtures/cloud-v69.glsl','utf8');
const field=oldField?Object.fromEntries([['previous',oldField],['candidate',currentField]].map(([name,m])=>[name,{density:m.earthCloudDensity,clouds:[m.cloudShader(),m.cloudShader(false,true)],volume:[m.cloudShader(true),m.cloudShader(true,true)]}])):null;
const candidateSource=process.env.COSMOS_CLOUD_CANDIDATE;
assert.ok(!field||!candidateSource,'Choose a complete field comparison or a fragment experiment.');
const readback=process.env.COSMOS_CLOUD_COST_READBACK==='1';
const candidate=candidateSource?await fs.readFile(candidateSource,'utf8'):null;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1}),errors=[],samples=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
try{
await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
await page.evaluate(async({candidate,previous,field})=>{
 const a=window.__cosmos,w=a.world,layer=w.cloudLayer;a.game.mode='loading';w.setQuality('ultra');
 window.cloudBase=candidate||w.bodies.earth.clouds.material.fragmentShader;
 const update=layer.updateDetail?.bind(layer),base=layer.cloudMaterials?.[0]||w.bodies.earth.clouds.material;
 const ground=w.bodies.earth.mesh.material,groundSource=ground.fragmentShader;
 const packed=w.bodies.earth.uniforms.cloudMap.value,t=await import('three');
 const oldMap=field&&packed.format===t.RGFormat?await new t.TextureLoader().loadAsync('assets/textures/earth-clouds.avif'):packed;
 if(oldMap!==packed){oldMap.colorSpace=t.NoColorSpace;oldMap.format=t.RedFormat;oldMap.wrapS=t.RepeatWrapping;w.renderer.initTexture(oldMap);}
 if(field&&!groundSource.includes(field.candidate.density))throw Error('Shared ground cloud field missing');
 window.selectCloudVariant=mode=>{
  if(field){
   w.bodies.earth.uniforms.cloudMap.value=mode==='previous'?oldMap:packed;
   for(let i=0;i<2;i++)for(const [materials,shaders] of [[layer.cloudMaterials,field[mode].clouds],[layer.volumeMaterials,field[mode].volume]]){materials[i].fragmentShader=shaders[i];materials[i].needsUpdate=true;}
   ground.fragmentShader=groundSource.replace(field.candidate.density,field[mode].density);ground.needsUpdate=true;layer.updateDetail=update;return;
  }
  base.fragmentShader=mode==='previous'?previous:window.cloudBase;base.needsUpdate=true;
  if(update)layer.updateDetail=mode==='candidate'&&!candidate?update:()=>layer.selectDetail(0);
 };
},{candidate,previous,field});
for(const [label,radius,phase,yaw=0,fov=58] of (process.env.COSMOS_CLOUD_COST_ZOOM?[['resolved-limb',1.05,35,1.2645,4]]:[['day',2.35,35],['close',1.05,50],['grazing',1.08,90],['resolved-limb',1.05,35,1.2645,4]])){
 if(process.env.COSMOS_CLOUD_COST_SCENES&&!process.env.COSMOS_CLOUD_COST_SCENES.split(',').includes(label))continue;
 await page.evaluate(async({radius,phase,yaw,fov})=>{const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0);a.game.mode='loading';a.game.timePaused=true;w.setFov(fov);const c=w.bodyPositions.earth,sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize(),p=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180)).multiplyScalar(w.bodies.earth.data.radius*radius).add(c);a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0))).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),yaw));w.followReady=false;},{radius,phase,yaw,fov});
 // Warm both complete pipelines before paired timing. Initial driver work
 // can otherwise dominate the first window even after shader compilation.
 for(const mode of ['previous','candidate'])await page.evaluate(async({mode,previous})=>{
  const a=window.__cosmos,w=a.world,m=w.bodies.earth.clouds.material;
  selectCloudVariant(mode);
  for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);w.update(a.game.player,0,{view:'probe',exposure:1});}
 },{mode,previous});
 for(const mode of ['previous','candidate','candidate','previous']){
 const r=await page.evaluate(async({mode,previous,readback})=>{
  const a=window.__cosmos,w=a.world,m=w.bodies.earth.clouds.material,gl=w.renderer.getContext(),ext=readback?null:gl.getExtension('EXT_disjoint_timer_query_webgl2'),pixel=readback?new Uint8Array(4):null;
  selectCloudVariant(mode);
  const gpu=[],cpu=[],pending=[];
  for(let i=0;i<140;i++){
   await new Promise(requestAnimationFrame);
   const query=i>=20&&ext?gl.createQuery():null;if(query)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
   if(readback)gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
   const began=performance.now();w.update(a.game.player,0,{view:'probe',exposure:1});if(readback)gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);const elapsed=performance.now()-began;if(i>=20)cpu.push(elapsed);
   if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(query)}
   for(let n=pending.length-1;n>=0;n--){const q=pending[n];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(ext.GPU_DISJOINT_EXT))gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);pending.splice(n,1)}}
  }
  for(let i=0;i<20&&pending.length;i++){
   await new Promise(requestAnimationFrame);
   for(let n=pending.length-1;n>=0;n--){const q=pending[n];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(ext.GPU_DISJOINT_EXT))gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);pending.splice(n,1)}}
  }
  for(const q of pending)gl.deleteQuery(q);gpu.sort((a,b)=>a-b);cpu.sort((a,b)=>a-b);
  if(gl.getError()!==gl.NO_ERROR)throw Error('Cloud timing generated a graphics error');
  return {readback,cpuSamples:cpu.length,cpuP95Ms:cpu[Math.floor(cpu.length*.95)],cloudProgram:w.renderer.properties.get(w.bodies.earth.clouds.material).currentProgram.id,detailWeight:w.cloudLayer.detailWeight?.value??0,gpuSamples:gpu.length,gpuMedianMs:gpu[Math.floor(gpu.length*.5)]??null,gpuP95Ms:gpu[Math.floor(gpu.length*.95)]??null,cpuMedianMs:cpu[Math.floor(cpu.length*.5)],drawCalls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,pixels:[w.canvas.width,w.canvas.height]};
 },{mode,previous,readback});samples.push({label,mode,yaw,fov,...r});console.log(samples.at(-1));
 }
}
assert.deepEqual(errors,[]);assert.ok(samples.every(s=>readback?s.cpuSamples===120:s.gpuSamples===120));
if(!candidateSource&&!field)for(const label of ['day','close','grazing']){const group=samples.filter(s=>s.label===label);if(group.length){assert.ok(group.every(s=>s.detailWeight===0));if(previous===await page.evaluate(()=>window.cloudBase))assert.equal(new Set(group.map(s=>s.cloudProgram)).size,1,`${label}: ordinary views reuse the identical compiled program`);}}
await fs.writeFile(`tests/cloud-cost${process.env.COSMOS_CLOUD_COST_ZOOM?'-zoom':''}-results.json`,JSON.stringify({version,readback,shaderSourceSha256,candidateShader:candidateSource||'runtime',candidateShaderSha256:createHash('sha256').update(await page.evaluate(()=>window.cloudBase)).digest('hex'),completeFieldComparison:!!field,previousShader:previousModule||process.env.COSMOS_CLOUD_PREVIOUS||'tests/fixtures/cloud-v69.glsl',lowPowerModeConfigured,method:'120 unmeasured renders per variant before ABBA windows; 20 warmup and 120 measured renders per window; fixed ultra 1280 x 800, no frame cache or adaptive resolution. '+(readback?'CPU elapsed intervals include completed drawing witnessed by a one-pixel readback; synchronization cost is included.':'Full-frame GPU timer queries; CPU intervals measure submission only.'),samples,errors},null,2));
}finally{await browser.close()}
