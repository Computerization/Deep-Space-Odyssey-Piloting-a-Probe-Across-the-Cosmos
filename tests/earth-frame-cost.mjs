// Compare just the changed GPU programs, in one warmed Chrome context with shared textures.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium,BASE_URL} from './browser.mjs';
const reference=process.env.COSMOS_REFERENCE_ROOT;
assert.ok(reference,'Set COSMOS_REFERENCE_ROOT to an extracted reference release.');
const shaders=path.resolve(reference,'src/rendering/earth-shaders.js'),surface=path.resolve(reference,'src/rendering/shaders.js');
const manifest=JSON.parse(await fs.readFile(path.resolve(reference,'MANIFEST.sha256.json')));
for(const file of [shaders,surface])assert.equal(createHash('sha256').update(await fs.readFile(file)).digest('hex'),manifest[path.relative(reference,file)]);
const e=await import(pathToFileURL(shaders)),s=await import(pathToFileURL(surface));
const programs={surface:s.fragment,air:e.earthAtmosphereFragment,transmission:e.earthTransmittanceFragment,composite:e.earthCloudCompositeFragment,cloud:[e.cloudShader(),e.cloudShader(false,true)],volume:[e.cloudShader(true),e.cloudShader(true,true)]};
const bench=process.argv.includes('--bench'),stages=process.argv.includes('--stages'),dpr=Number(process.env.COSMOS_DPR||2),errors=[];
const benchCases=(process.env.COSMOS_BENCH_CASES||'near,arrival').split(',');
assert.ok(!(bench&&stages),'Use separate runs for whole-frame and per-stage timing.');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:dpr});
 page.on('pageerror',err=>errors.push(String(err)));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
 await page.goto(BASE_URL+'/?test=1',{waitUntil:'domcontentloaded',timeout:90000});await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});
 await page.evaluate(ref=>{
  const a=__cosmos,w=a.world,l=w.cloudLayer,b=w.bodies.earth;
  const variant=(m,source)=>{if(m.fragmentShader===source)return m;const copy=m.clone();copy.uniforms=m.uniforms;copy.fragmentShader=source;return copy;};
  const live={surface:b.mesh.material,air:l.atmosphere.material,transmission:l.transmission.material,composite:l.resolve,cloud:l.cloudMaterials,volume:l.volumeMaterials};
  const old={};for(const key of Object.keys(live))old[key]=Array.isArray(live[key])?live[key].map((m,i)=>variant(m,ref[key][i])):variant(live[key],ref[key]);
  window.usePrograms=before=>{const v=before?old:live;b.mesh.material=v.surface;l.splitAir.material=l.atmosphere.material=v.air;l.splitTransmission.material=l.resolveTransmission.material=l.transmission.material=v.transmission;l.air.material=l.resolve=v.composite;l.cloudMaterials=v.cloud;l.volumeMaterials=v.volume;l.selectDetail(0);};
 },programs);
 const records=[];
 const cases=(process.env.COSMOS_CASES||'near,arrival,turn,orbit,limb,zoom,night,pole,seam,direct').split(',');
 for(const shot of cases){
  await page.evaluate(async shot=>{
   const a=__cosmos,g=a.game,w=a.world,T=await import('three');a.startChapter(0);g.mode='loading';g.timePaused=true;g.look.identity();w.setQuality('high');w.setFov(58);
   const c=w.bodyPositions.earth,r=w.bodies.earth.data.radius,up=new T.Vector3(0,1,0),p=g.player.position;
   if(shot!=='arrival')p.sub(c).normalize().multiplyScalar(r*(shot==='zoom'?1.11:1.55)).add(c);
   if(shot==='turn')g.player.quaternion.multiply(new T.Quaternion().setFromAxisAngle(up,.24));
   if(shot==='orbit'){p.sub(c).applyAxisAngle(up,1.1).add(c);g.player.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(p,c,up));}
   if(['pole','seam','night'].includes(shot)){const b=w.bodies.earth,lon=-2*Math.PI*(b.data.mapPhase-9/b.data.rotationPeriod),lat=shot==='pole'?1.56:0,n=shot==='night'?c.clone().normalize():new T.Vector3(-Math.cos(lon)*Math.cos(lat),Math.sin(lat),Math.sin(lon)*Math.cos(lat)).applyQuaternion(b.group.quaternion);p.copy(c).addScaledVector(n,r*1.55);g.player.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(p,c,up));}
   if(shot==='limb'||shot==='zoom'){const radial=p.clone().sub(c),range=radial.length()/r;radial.normalize();const tangent=radial.clone().cross(up).normalize(),target=c.clone().addScaledVector(radial,r/range).addScaledVector(tangent,r*Math.sqrt(1-1/range**2));g.player.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(p,target,up));if(shot==='zoom')w.setFov(6);}
   window.drawCost=()=>w.update(g.player,0,{look:g.look,exposure:1,time:9,settled:shot==='direct'});usePrograms(false);drawCost();
  },shot);
  await page.waitForFunction(()=>{drawCost();const w=__cosmos.world;return [w.cloudDetail,w.surfaceDetail].every(d=>!d.pending&&(!d.wanted||d.uniforms[d.prefix+'Weight'].value===1))},null,{timeout:30000});
  const row=await page.evaluate(async({bench,stages,shot})=>{
   const w=__cosmos.world,r=w.renderer,gl=r.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
   const frame=()=>new Promise(requestAnimationFrame),read=a=>gl.readPixels(0,0,a.length===4?1:gl.drawingBufferWidth,a.length===4?1:gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,a);
   const n=gl.drawingBufferWidth*gl.drawingBufferHeight*4,x=new Uint8Array(n),y=new Uint8Array(n);
   usePrograms(true);drawCost();read(x);usePrograms(false);drawCost();read(y);
   let changed=0,max=0;for(let i=0;i<n;i++){const delta=Math.abs(x[i]-y[i]);if(delta){changed++;max=Math.max(max,delta);}}
   const summary=s=>{const sorted=s.slice().sort((a,b)=>a-b);return{count:s.length,medianMs:sorted[Math.floor(s.length*.5)],p95Ms:sorted[Math.floor(s.length*.95)]};};
   const row={shot,samples:w.frameTarget.samples,cloudPatch:w.bodies.earth.uniforms.cloudPatchWeight.value,pixels:[gl.drawingBufferWidth,gl.drawingBufferHeight],layered:w.cloudLayer.enabled(w),resolved:w.cloudLayer.detailWeight.value,changedChannels:changed,maxError:max};
   if(bench||stages){
    const draws=[],complete=new Uint8Array(4),stageCosts={},original=r.render,tag=s=>s===w.sky?'sky':s===w.scene?'surface':s===w.cloudLayer.volumeScene?'cloud volume':s===w.cloudLayer.resolveScene||s===w.cloudLayer.splitScene?'clear air + composite':s===w.resolveScene?'display':'other';
    const pending=[],drain=()=>{for(let i=pending.length-1;i>=0;i--){const {q,i:at}=pending[i];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(ext.GPU_DISJOINT_EXT))draws[at].gpu=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;gl.deleteQuery(q);pending.splice(i,1);}}};
    const count=bench?80:16;
    for(let i=-20;i<count;i++){
     await frame();const before=[true,false,false,true][(i+20)%4];usePrograms(before);let q=null;
     if(stages&&i>=0){r.render=function(scene,cam){const t=performance.now(),result=original.call(this,scene,cam);const type=gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);gl.readPixels(0,0,1,1,gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT),type,type===gl.HALF_FLOAT?new Uint16Array(4):type===gl.FLOAT?new Float32Array(4):complete);(stageCosts[tag(scene)]??=[]).push(performance.now()-t);return result;};}
     if(ext&&i>=0&&!stages){q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);}
     const t=performance.now();try{drawCost();}finally{r.render=original;}if(q)gl.endQuery(ext.TIME_ELAPSED_EXT);read(complete);
     if(i>=0){draws.push({before,ms:performance.now()-t});if(q)pending.push({q,i});}drain();
    }
    for(let i=0;i<30&&pending.length;i++){await frame();drain();}for(const {q} of pending)gl.deleteQuery(q);
    if(bench)for(const [key,before] of [['reference',true],['candidate',false]]){const a=draws.filter(d=>d.before===before);row[key]={sync:summary(a.map(d=>d.ms)),gpu:summary(a.flatMap(d=>d.gpu??[]))};}
    if(stages)row.stages=Object.fromEntries(Object.entries(stageCosts).map(([k,v])=>[k,summary(v)]));
   }
   if(gl.getError()!==gl.NO_ERROR)throw new Error('WebGL error');return row;
  },{shot,bench:bench&&benchCases.includes(shot),stages:stages&&shot==='near'});records.push(row);console.log(JSON.stringify(row));
 }
 const report={method:'Chrome/Metal, High, fixed camera/time and warmed resident textures. 20 warm-ups, then 80 ABBA full frames when benchmarking. Sync includes a one-pixel readback; GPU is the complete render timer where available. RGBA8 comparisons include the whole display buffer.',dpr,reference:JSON.parse(await fs.readFile(path.resolve(reference,'package.json'))).version,candidate:JSON.parse(await fs.readFile('package.json')).version,records,errors};
 if(process.env.COSMOS_COST_REPORT)await fs.writeFile(process.env.COSMOS_COST_REPORT,JSON.stringify(report,null,2)+'\n');
 assert.deepEqual(errors,[]);assert.ok(records.every(r=>r.pixels[0]===1280*dpr&&r.pixels[1]===800*dpr));
 for(const r of records){if(r.reference){assert.equal(r.reference.sync.count,40);assert.equal(r.candidate.sync.count,40);}
  if(r.shot==='zoom')assert.ok(r.resolved>0);if(r.shot==='direct')assert.ok(!r.layered);if(r.shot==='near')assert.ok(r.layered);}
 assert.ok(records.every(r=>r.changedChannels===0),'rendered frames differ');
}finally{await browser.close();}
