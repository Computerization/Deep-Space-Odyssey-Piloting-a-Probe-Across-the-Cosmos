import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const heightOnly=process.env.COSMOS_PROFILE_HEIGHT==='1';
const surfaceOnly=process.env.COSMOS_PROFILE_SURFACES==='1';
const lunarOnly=process.env.COSMOS_PROFILE_LUNAR==='1'||surfaceOnly||heightOnly;
const geometryOnly=process.env.COSMOS_PROFILE_GEOMETRY==='1',reflectionOnly=process.env.COSMOS_PROFILE_REFLECTIONS==='1';
assert.ok(lunarOnly||geometryOnly||process.env.COSMOS_PREVIOUS_WORLD,'Supply a previous renderer or select geometry profiling.');assert.ok(!reflectionOnly||geometryOnly);
const current=await(await fetch(BASE_URL+'/src/world.js')).text(),previous=geometryOnly||lunarOnly?current:await fs.readFile(process.env.COSMOS_PREVIOUS_WORLD,'utf8');
const version=(await(await fetch(BASE_URL+'/package.json')).json()).version,digest=s=>createHash('sha256').update(s).digest('hex');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:2}),errors=[],samples=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.route('**/src/world.js?cost-reference=1',r=>r.fulfill({body:previous,contentType:'application/javascript'}));
 if(lunarOnly){assert.ok(process.env.COSMOS_PREVIOUS_SHADER);const shader=(await fs.readFile(process.env.COSMOS_PREVIOUS_SHADER,'utf8')).replaceAll("from './","from '/src/rendering/").replaceAll("from '../","from '/src/");await page.route('**/profile-previous-shaders.js',r=>r.fulfill({body:shader,contentType:'text/javascript'}));}
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 await page.evaluate(async({geometryOnly,lunarOnly,heightOnly})=>{
  const w=window.__cosmos.world;
  if(heightOnly){
   const t=await import('three'),current=w.bodies.moon.uniforms.reliefHeight.value,old=current.clone(),update=w.update;
   old.anisotropy=Math.min(16,w.renderer.capabilities.getMaxAnisotropy());old.generateMipmaps=true;old.minFilter=t.LinearMipmapLinearFilter;old.needsUpdate=true;w.renderer.initTexture(old);
   const variant=texture=>function(...args){this.bodies.moon.uniforms.reliefHeight.value=texture;return update.apply(this,args);};
   window.costVariants={previous:{resize:w.resize,update:variant(old)},current:{resize:w.resize,update:variant(current)}};
  }else if(lunarOnly){
   const old=(await import('/profile-previous-shaders.js')).fragment,current=w.bodies.moon.mesh.material.fragmentShader,update=w.update;
   const variant=shader=>function(...args){const m=this.bodies[window.costBody||'moon'].mesh.material;if(m.fragmentShader!==shader){m.fragmentShader=shader;m.needsUpdate=true;}return update.apply(this,args);};
   window.costVariants={previous:{resize:w.resize,update:variant(old)},current:{resize:w.resize,update:variant(current)}};
  }else if(geometryOnly){
   const update=w.update,variant=enabled=>function(...args){this.geometryDetail.enabled=enabled;if(!enabled)this.geometryDetail.restore();if(args[2]?.view==='chase')this.environmentDirty=true;return update.apply(this,args);};
   window.costVariants={previous:{resize:w.resize,update:variant(false)},current:{resize:w.resize,update:variant(true)}};
  }else{const {CosmosWorld}=await import('/src/world.js?cost-reference=1');window.costVariants={previous:{resize:CosmosWorld.prototype.resize,update:CosmosWorld.prototype.update},current:{resize:w.resize,update:w.update}};}
 },{geometryOnly,lunarOnly,heightOnly});
 const cases=surfaceOnly?[['Moon',0,'probe','moon',58],['Moon detail',0,'probe','moon',4],['Jupiter',1,'probe','jupiter',58],['Jupiter detail',1,'probe','jupiter',4]]:lunarOnly?[['Moon',0,'probe'],['Moon close',0,'probe']]:geometryOnly?(reflectionOnly?[['Jupiter',1,'chase'],['Saturn',2,'chase']]:[['Earth',0,'probe'],['Jupiter',1,'chase'],['Saturn',2,'chase']]):[['Earth',0,'probe'],['Saturn',2,'chase']];
 for(const [label,chapter,view,body,fov] of cases){
  await page.evaluate(({chapter,view,lunarOnly,label,body,fov})=>{const a=window.__cosmos;a.game.view=view;window.costBody=body||'moon';a.startChapter(chapter,0,lunarOnly&&(!body||body==='moon')?'moon':null);a.game.mode='loading';a.world.setQuality('high');a.world.ratio=lunarOnly?2:1.25;a.world.cloudScale=.75;if(lunarOnly)a.world.setFov(fov??(label==='Moon'?58:18));},{chapter,view,lunarOnly,label,body,fov});
  const rows=await page.evaluate(async reflectionOnly=>{
   const a=window.__cosmos,w=a.world,gl=w.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),pending=[],groups=Array.from({length:4},()=>({previous:{gpu:[],cpu:[]},current:{gpu:[],cpu:[]}}));
   if(!ext)throw Error('GPU timing unavailable');
   const drain=()=>{for(let n=pending.length-1;n>=0;n--){const {q,group,mode}=pending[n];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(ext.GPU_DISJOINT_EXT))groups[group][mode].gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);pending.splice(n,1);}}};
   // Alternate A B B A on consecutive animation ticks, rather than placing
   // each variant in multi-second windows vulnerable to clock/thermal drift.
   for(let i=0;i<240+256;i++){
    await new Promise(requestAnimationFrame);
    const measured=i>=240,mode=measured?['previous','current','current','previous'][(i-240)%4]:i<120?'previous':'current',group=Math.floor((i-240)/64);
    Object.assign(w,costVariants[mode]);w.resize();
    const q=measured?gl.createQuery():null,environmentUpdate=w.environmentCamera.update;let used=false;
    if(q&&reflectionOnly)w.environmentCamera.update=function(...args){used=true;gl.beginQuery(ext.TIME_ELAPSED_EXT,q);try{return environmentUpdate.apply(this,args);}finally{gl.endQuery(ext.TIME_ELAPSED_EXT);}};
    if(q&&!reflectionOnly){used=true;gl.beginQuery(ext.TIME_ELAPSED_EXT,q);}
    const start=performance.now();try{w.update(a.game.player,0,{view:a.game.view,look:a.game.look,exposure:1});}finally{w.environmentCamera.update=environmentUpdate;}
    if(measured){const r=groups[group][mode];r.cpu.push(performance.now()-start);r.output=[w.canvas.width,w.canvas.height];r.scene=[w.frameTarget.width,w.frameTarget.height];r.calls=w.renderer.info.render.calls;r.triangles=w.renderer.info.render.triangles;r.memory={...w.renderer.info.memory};}
    if(q){if(!reflectionOnly)gl.endQuery(ext.TIME_ELAPSED_EXT);if(used)pending.push({q,group,mode});else gl.deleteQuery(q);}drain();
   }
   for(let i=0;i<30&&pending.length;i++){await new Promise(requestAnimationFrame);drain();}for(const {q} of pending)gl.deleteQuery(q);
   return groups.flatMap((g,group)=>Object.entries(g).map(([mode,{gpu,cpu,...rest}])=>{gpu.sort((a,b)=>a-b);cpu.sort((a,b)=>a-b);return{group,mode,gpuSamples:gpu.length,gpuMedianMs:gpu[Math.floor(gpu.length*.5)]??null,gpuP95Ms:gpu[Math.floor(gpu.length*.95)]??null,cpuMedianMs:cpu[Math.floor(cpu.length*.5)],...rest};}));
  },reflectionOnly);
  for(const row of rows){samples.push({label,...row});console.log({label,...row});}
 }
 assert.equal(samples.length,cases.length*8);assert.ok(samples.every(s=>s.gpuSamples===32));assert.deepEqual(errors,[]);
 for(const [label] of cases){const rows=samples.filter(s=>s.label===label);for(const r of rows){assert.deepEqual(r.scene,rows[0].scene);assert.deepEqual(r.memory,rows[0].memory);assert.equal(r.calls,rows[0].calls);}}
 await fs.writeFile(process.env.COSMOS_PROFILE_REPORT||'tests/profile-renderer-results.json',JSON.stringify({version,geometryOnly,reflectionOnly,lunarOnly,surfaceOnly,heightOnly,candidateFragmentSha256:digest((await import('../src/rendering/shaders.js')).fragment),referenceShaderSha256:lunarOnly?digest(await fs.readFile(process.env.COSMOS_PREVIOUS_SHADER)):null,gpuScope:reflectionOnly?'Six reflection-face draws, excluding prefilter and main display':'Complete frame including output resolve',geometrySourceSha256:geometryOnly?digest(await fs.readFile('src/rendering/geometry-detail.js')):null,reflectionRefreshEveryDraw:geometryOnly,worldSha256:digest(current),referenceWorldSha256:digest(previous),geometryComparison:geometryOnly?'Full meshes versus viewport-selected meshes; each chase draw refreshes the reflection. This measures refresh cost, not normal steady-flight frequency.':null,method:`1280 x 800 DPR 2, High ratio ${lunarOnly?2:1.25} and cloud scale .75. Warm 120 draws per variant; then 64 interleaved ABBA groups on consecutive animation ticks, reported in four chunks of 32 GPU samples per variant. CPU values always measure the complete update.`,samples,errors},null,2)+'\n');
}finally{await browser.close();}
