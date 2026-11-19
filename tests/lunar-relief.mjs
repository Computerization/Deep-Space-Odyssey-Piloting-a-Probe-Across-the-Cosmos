// Source-linked lunar slope, height and shadow review. No simulated flight is advanced.
import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const previous=process.env.COSMOS_VISUAL_PREVIOUS,reference=process.env.COSMOS_LUNAR_REFERENCE_ROOT;
assert.ok(previous&&reference,'Supply previous archive and generated lunar reference directory.');
const candidateNormal='assets/textures/moon-normal.avif';
const candidateHeight='assets/textures/moon-height.webp';
const normalExt=path.extname(candidateNormal),normalChannels='oct',steps=48,outcomes=[];
const encodingOnly=process.env.COSMOS_LUNAR_ENCODING_ONLY==='1';
const referenceNormal=encodingOnly?'normal-oct-5760.png':'normal-5760.png';
const previousChannels=(await fs.readFile(path.join(previous,'src/rendering/shaders.js'),'utf8')).includes('1.-abs(xy.x)-abs(xy.y)')?'oct':'rgb';
const hashes={};for(const p of [path.join(previous,candidateNormal),'src/rendering/shaders.js','src/world.js',candidateNormal,candidateHeight,path.join(reference,referenceNormal),path.join(reference,'height-reference.bin')])hashes[p]=createHash('sha256').update(await fs.readFile(p)).digest('hex');
const cases=[['study',0,0,false,58],['close',0,0,false,18],['full',4,20,false,18],['crescent',3,125,false,45],['polar',3,80,true,18]];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1000,height:625}}),errors=[],views=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  for(const [url,file] of [['old-normal.avif',path.join(previous,'assets/textures/moon-normal.avif')],['old-height.webp',path.join(previous,'assets/textures/moon-height.webp')],['new-normal'+normalExt,candidateNormal],['new-height.webp',candidateHeight],['reference-normal.png',path.join(reference,referenceNormal)],['reference-height.bin',path.join(reference,'height-reference.bin')]])await page.route('**/relief/'+url,r=>r.fulfill({path:file}));
  const oldShader=String(await fs.readFile(path.join(previous,'src/rendering/shaders.js'))).replaceAll("from './","from '/src/rendering/");
  await page.route('**/relief/previous-shaders.js',r=>r.fulfill({body:oldShader,contentType:'text/javascript'}));
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:120000});await page.click('#begin');
  await page.evaluate(async({normalExt,normalChannels,previousChannels,steps,encodingOnly})=>{
   const a=window.__cosmos,w=a.world,t=await import('three');a.game.mode='loading';if(w.lunarShadow)w.lunarShadow.update=()=>{w.bodies.moon.uniforms.reliefVisibilityReady.value=0;};w.setQuality('ultra');document.querySelectorAll('body>*:not(canvas)').forEach(e=>e.style.display='none');
   const image=new t.TextureLoader();
   const load=async name=>{const tex=await image.loadAsync('relief/'+name);tex.colorSpace=t.NoColorSpace;tex.wrapS=t.RepeatWrapping;tex.anisotropy=Math.min(16,w.renderer.capabilities.getMaxAnisotropy());if(name.endsWith('height.webp'))tex.format=t.RedFormat;if(name.includes('normal')&&(name.startsWith('old')?previousChannels==='oct':name.startsWith('new')?['rg','oct'].includes(normalChannels):encodingOnly))tex.format=t.RGFormat;w.renderer.initTexture(tex);return tex;};
   const oldNormal=await load('old-normal.avif'),oldHeight=await load('old-height.webp'),newNormal=await load('new-normal'+normalExt),newHeight=await load('new-height.webp'),refNormal=await load('reference-normal.png');
   const data=new Float32Array(await(await fetch('relief/reference-height.bin')).arrayBuffer());assertLength(data.length,5760*2880);
   const refHeight=new t.DataTexture(data,5760,2880,t.RedFormat,t.FloatType);refHeight.minFilter=refHeight.magFilter=t.LinearFilter;refHeight.wrapS=t.RepeatWrapping;refHeight.needsUpdate=true;w.renderer.initTexture(refHeight);
   const base=w.bodies.moon.mesh.material.fragmentShader,oldBase=(await import('/relief/previous-shaders.js')).fragment;
   const normalDecode='vec2 xy=texture2D(reliefNormal,uv).rg*2.-1.;\n  vec3 mapped=normalize(vec3(xy,max(0.,1.-abs(xy.x)-abs(xy.y))));';
   if(!base.includes(normalDecode)||!base.includes('i<48'))throw Error('Update the reference transformation for the current shader.');
   const dense=n=>base.replace('i<48',`i<${n}`).replace(/stepKm\*=([\d.]+);/,`stepKm*=${Math.pow(1.5,13/(n-1)).toFixed(12)};`);
   const referenceShader=n=>dense(n).replace(normalDecode,'vec3 mapped=texture2D(reliefNormal,uv).xyz*2.-1.;');
   window.relief={encodingOnly,previousChannels,sourceHeight:refHeight,maps:{previous:[oldNormal,oldHeight],candidate:[newNormal,newHeight],reference:[refNormal,encodingOnly?newHeight:refHeight],dense:[refNormal,refHeight],candidateDense:[newNormal,newHeight]},shaders:{previous:oldBase,candidate:base,reference:encodingOnly?base:referenceShader(128),dense:referenceShader(256),candidateDense:dense(128)},frames:{}};
   function assertLength(a,b){if(a!==b)throw Error('Reference dimensions mismatch');}
  },{normalExt,normalChannels,previousChannels,steps,encodingOnly});
  const fields=await page.evaluate(async({normalChannels,previousChannels,encodingOnly})=>{
   const w=window.__cosmos.world,t=await import('three'),uniforms={xyPacked:{value:0},normal:{value:null},height:{value:null},referenceNormal:{value:relief.maps.reference[0]},referenceHeight:{value:relief.sourceHeight}};
   const material=new t.ShaderMaterial({uniforms,vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D normal,height,referenceNormal,referenceHeight;uniform float xyPacked;void main(){vec2 p=gl_FragCoord.xy,uv=fract(vec2(p.x*.61803398875+p.y*.113,p.x*.41421356237+p.y*.371));vec4 value=texture2DLodEXT(normal,uv,0.);vec2 xy=mix(value.ra,value.rg,step(1.5,xyPacked))*2.-1.;vec3 a=normalize(mix(value.rgb*2.-1.,vec3(xy,mix(sqrt(max(0.,1.-dot(xy,xy))),max(0.,1.-abs(xy.x)-abs(xy.y)),step(2.5,xyPacked))),min(1.,xyPacked))),b=normalize(texture2DLodEXT(referenceNormal,uv,0.).rgb*2.-1.);${encodingOnly?'vec2 rxy=texture2DLodEXT(referenceNormal,uv,0.).rg*2.-1.;b=normalize(vec3(rxy,max(0.,1.-abs(rxy.x)-abs(rxy.y))));':''}float angle=atan(length(cross(a,b)),dot(a,b))*57.295779513;float h=texture2DLodEXT(height,uv,0.).r,ref=texture2DLodEXT(referenceHeight,uv,0.).r;gl_FragColor=vec4(angle,abs(h-ref)*21000.,h*21.-10.,1.);}`,depthTest:false,depthWrite:false});
   const geo=new t.PlaneGeometry(2,2),scene=new t.Scene();scene.add(new t.Mesh(geo,material));const target=new t.WebGLRenderTarget(512,64,{type:t.FloatType,depthBuffer:false}),raw=new Float32Array(512*64*4),out={};
   for(const mode of ['previous','candidate']){uniforms.xyPacked.value=mode==='candidate'?(normalChannels==='oct'?3:normalChannels==='rg'?2:normalChannels==='ra'?1:0):(previousChannels==='oct'?3:0);uniforms.normal.value=relief.maps[mode][0];uniforms.height.value=relief.maps[mode][1];w.renderer.setRenderTarget(target);w.renderer.render(scene,new t.Camera());w.renderer.readRenderTargetPixels(target,0,0,512,64,raw);const angles=[],heights=[];for(let i=0;i<raw.length;i+=4){if(!Number.isFinite(raw[i])||raw[i+3]!==1)throw Error('Invalid source-field sample');angles.push(raw[i]);heights.push(raw[i+1]);}const stats=a=>{a.sort((a,b)=>a-b);return{mean:a.reduce((x,y)=>x+y,0)/a.length,p95:a[Math.floor(a.length*.95)],max:a.at(-1)}};const normal=relief.maps[mode][0];out[mode]={angleDegrees:stats(angles),heightErrorMetres:stats(heights),normalDimensions:[normal.image.width,normal.image.height],normalFormat:normal.format,normalMipBytes:normal.mipmaps.reduce((n,m)=>n+m.data.byteLength,0)};}
   w.renderer.setRenderTarget(null);material.dispose();geo.dispose();target.dispose();return out;
  },{normalChannels,previousChannels,encodingOnly});
  for(const [label,radius,phase,polar,fov] of (process.env.COSMOS_LUNAR_FIELDS_ONLY?[]:cases)){
   await page.evaluate(async({radius,phase,polar,fov})=>{
    const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0,0,'moon');a.game.mode='loading';a.game.timePaused=true;a.game.look.identity();w.setFov(fov);const b=w.bodies.moon,c=w.bodyPositions.moon,sun=c.clone().negate().normalize(),up=new t.Vector3(0,1,0).applyQuaternion(b.group.quaternion),side=polar?up.clone().addScaledVector(sun,-up.dot(sun)).normalize():new t.Vector3().crossVectors(sun,up).normalize();
    if(radius){a.game.player.position.copy(c).addScaledVector(sun,b.data.radius*radius*Math.cos(phase*Math.PI/180)).addScaledVector(side,b.data.radius*radius*Math.sin(phase*Math.PI/180));a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(a.game.player.position,c,up));}w.followReady=false;relief.frames={};
   },{radius,phase,polar,fov});
   for(const mode of (encodingOnly?['previous','candidate','reference']:['previous','candidate','reference','dense','candidateDense'])){
    const unchanged=await page.evaluate(mode=>{const a=window.__cosmos,w=a.world,b=w.bodies.moon,g=a.game,state=()=>JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.localSeconds,g.fuel]),before=state();[b.uniforms.reliefNormal.value,b.uniforms.reliefHeight.value]=relief.maps[mode];b.mesh.material.fragmentShader=relief.shaders[mode];b.mesh.material.needsUpdate=true;w.update(g.player,0,{view:'probe',exposure:1,look:g.look});const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const ctx=c.getContext('2d');ctx.drawImage(w.canvas,0,0);relief.frames[mode]=ctx.getImageData(0,0,c.width,c.height).data;return before===state();},mode);assert.ok(unchanged);
    if(name==='Chrome'&&['close','crescent','polar'].includes(label))await page.screenshot({path:`tests/screenshots/lunar-relief-${label}-${mode}.png`});
   }
   const metrics=await page.evaluate(()=>{const f=relief.frames,out={};for(const mode of (relief.encodingOnly?['previous','candidate']:['previous','candidate','dense','candidateDense'])){const ref=mode==='candidateDense'?f.candidateDense:f.reference,a=mode==='candidateDense'?f.candidate:f[mode];let sq=0,count=0,max=0;for(let i=0;i<a.length;i+=4)if((relief.encodingOnly?['previous','candidate','reference']:['reference']).some(k=>Math.max(f[k][i],f[k][i+1],f[k][i+2])>15)||!relief.encodingOnly&&Math.max(a[i],a[i+1],a[i+2])>15)for(let k=0;k<3;k++){const d=Math.abs(a[i+k]-ref[i+k]);sq+=d*d;count++;max=Math.max(max,d);}out[mode]={rmse:Math.sqrt(sq/count),max,count};}return out;});
   views.push({label,metrics});console.log({name,label,metrics});
  }
  assert.ok(fields.candidate.angleDegrees.mean<1 && fields.candidate.angleDegrees.p95<2,'Slopes preserve the source within the declared typical angular tolerance');
  assert.ok(fields.candidate.heightErrorMetres.mean<16 && fields.candidate.heightErrorMetres.max<44,'Height quantization stays within the R8 source tolerance');
  if(encodingOnly){
   assert.ok(fields.candidate.angleDegrees.mean<fields.previous.angleDegrees.mean*.85,'Normal encoding must preserve more source detail');
   assert.ok(fields.candidate.angleDegrees.p95<fields.previous.angleDegrees.p95*.85,'Tail angular error must improve');
   assert.deepEqual(fields.candidate.normalDimensions,fields.previous.normalDimensions);
   assert.equal(fields.candidate.normalFormat,fields.previous.normalFormat);
   for(const {label,metrics:m} of views)assert.ok(m.candidate.rmse<=m.previous.rmse*1.01+1e-6,`${label}: encoding image error must not increase`);
   const squared=mode=>views.reduce((n,v)=>n+v.metrics[mode].rmse**2*v.metrics[mode].count,0);
   if(views.length)assert.ok(squared('candidate')<squared('previous')*.85,'Overall rendered encoding error must improve');
  }else for(const {label,metrics:m} of views){assert.ok(m.candidate.rmse<m.previous.rmse*.65,`${label}: substantial source-fidelity improvement`);assert.ok(m.dense.rmse<1.5,`${label}: dense reference convergence`);assert.ok(m.candidateDense.rmse<4,`${label}: bounded shadow sampling error`);}
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),fields,views,errors});
 }finally{await browser.close();}
}
await fs.writeFile(process.env.COSMOS_LUNAR_REPORT||'tests/lunar-relief-results.json',JSON.stringify({version:JSON.parse(await fs.readFile('package.json')).version,previous,candidateNormal,candidateHeight,normalChannels,previousChannels,encodingOnly,steps,hashes,reference:encodingOnly?'Lossless octahedral normals from the identical NASA-derived field. Same shader, height, geometry and polar maps isolate encoding error; no photographic-equivalence claim.':'NASA 16 samples/degree height field and lossless normal map generated from it; 128/256 shadow-ray samples over the same range. Source fidelity, not photographic equivalence.',outcomes},null,2)+'\n');
