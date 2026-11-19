// Compare actual GPU texture samples with unsharpened source-image crops.
// The previous archive supplies its real lower-resolution delivery images.
import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const previous=process.env.COSMOS_VISUAL_PREVIOUS;
assert.ok(previous,'Set COSMOS_VISUAL_PREVIOUS to the previous archive.');
const caseFile=process.env.COSMOS_DETAIL_CASES||'tests/fixtures/surface-detail/cases.json';
const cases=JSON.parse(await fs.readFile(caseFile)),bodies=[...new Set(cases.map(c=>c.body))];
const textureLimit=Number(process.env.COSMOS_DETAIL_TEXTURE_LIMIT||0);
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:512,height:384}}),errors=[];
 await page.addInitScript(limit=>{
  window.detailUploads=new WeakMap();
  const record=(context,size)=>{if(limit&&(Math.min(...size)<1||Math.max(...size)>limit))throw Error('Invalid constrained texture size '+size);detailUploads.set(context.getParameter(context.TEXTURE_BINDING_2D),size);};
  const gl=WebGL2RenderingContext.prototype,get=gl.getParameter,upload=gl.texImage2D,compressed=gl.compressedTexImage2D,storage=gl.texStorage2D;
  gl.getParameter=function(p){const value=get.call(this,p);return limit&&p===this.MAX_TEXTURE_SIZE?Math.min(limit,value):value;};
  gl.texImage2D=function(...args){if(args[1]===0&&args[0]===this.TEXTURE_2D){const size=args.length===6?[args[5].width,args[5].height]:[args[3],args[4]];record(this,size);}return upload.apply(this,args);};
  gl.compressedTexImage2D=function(...args){if(args[1]===0&&args[0]===this.TEXTURE_2D)record(this,[args[3],args[4]]);return compressed.apply(this,args);};
  gl.texStorage2D=function(...args){if(args[0]===this.TEXTURE_2D)record(this,[args[3],args[4]]);return storage.apply(this,args);};
 },textureLimit);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  const oldFormats={};
  for(const body of bodies){
   const extension=textureLimit&&textureLimit<8192?'avif':await fs.access(path.join(previous,`assets/textures/${body}.ktx2`)).then(()=>'ktx2').catch(()=>'avif');oldFormats[body]=extension;
   await page.route(`**/previous-${body}.${extension}`,r=>r.fulfill({path:path.join(previous,`assets/textures/${body}.${extension}`),contentType:extension==='ktx2'?'image/ktx2':'image/avif'}));
  }
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:120000});
  await page.evaluate(async({bodies,oldFormats})=>{
   const a=window.__cosmos,w=a.world,t=await import('three');a.game.mode='loading';
   document.querySelectorAll('body>*:not(canvas)').forEach(e=>e.style.display='none');
   w.renderer.setPixelRatio(1);w.renderer.setSize(512,384);w.renderer.toneMapping=t.NoToneMapping;
   const uniforms={map:{value:null},rect:{value:new t.Vector4()},size:{value:new t.Vector2()}};
   const material=new t.ShaderMaterial({uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`varying vec2 vUv;uniform sampler2D map;uniform vec4 rect;uniform vec2 size;void main(){vec2 uv=(rect.xy+vec2(vUv.x,1.-vUv.y)*rect.zw)/size;uv.y=1.-uv.y;gl_FragColor=texture2D(map,uv);\n#include <colorspace_fragment>\n}`,depthTest:false,depthWrite:false});
   const scene=new t.Scene();scene.add(new t.Mesh(new t.PlaneGeometry(2,2),material));
   window.detail={uniforms,scene,camera:new t.Camera(),maps:{}};
   const {KTX2Loader}=await import('three/addons/loaders/KTX2Loader.js');
   const compressed=new KTX2Loader().setTranscoderPath('vendor/three/addons/libs/basis/').setWorkerLimit(1).detectSupport(w.renderer);
   for(const body of bodies){
    const extension=oldFormats[body],old=await(extension==='ktx2'?compressed:new t.TextureLoader()).loadAsync(`previous-${body}.${extension}`);old.colorSpace=t.SRGBColorSpace;old.wrapS=t.RepeatWrapping;
    detail.maps[body]={previous:old,candidate:w.bodies[body].uniforms.surfaceMap.value};
   }
   compressed.dispose();
  },{bodies,oldFormats});
  const results=[];
  for(const item of cases){
   const result=await page.evaluate(async item=>{
    const w=window.__cosmos.world,d=window.detail,c=document.createElement('canvas');c.width=512;c.height=384;const ctx=c.getContext('2d',{willReadFrequently:true});
    const image=new Image();image.src=`${item.folder}/${item.name}.png`;await image.decode();ctx.drawImage(image,0,0);const reference=ctx.getImageData(0,0,512,384).data;
    const output={};d.uniforms.rect.value.fromArray(item.rect);d.uniforms.size.value.fromArray(item.size);
    for(const [mode,map] of Object.entries(d.maps[item.body])){
     d.uniforms.map.value=map;w.renderer.setRenderTarget(null);w.renderer.clear();w.renderer.render(d.scene,d.camera);ctx.drawImage(w.canvas,0,0);const p=ctx.getImageData(0,0,512,384).data;let squared=0,gradient=0;
     for(let i=0;i<p.length;i+=4)for(let k=0;k<3;k++){squared+=(p[i+k]-reference[i+k])**2;if(i%2048<2044)gradient+=((p[i+k+4]-p[i+k])-(reference[i+k+4]-reference[i+k]))**2;}
     const uploaded=detailUploads.get(w.renderer.properties.get(map).__webglTexture);
     output[mode]={rmse:Math.sqrt(squared/(512*384*3)),gradientRmse:Math.sqrt(gradient/(511*384*3)),width:uploaded[0],height:uploaded[1],format:map.format,mips:map.mipmaps.length,bytes:map.mipmaps.reduce((n,m)=>n+m.data.byteLength,0),compressed:!!map.isCompressedTexture};
    }
    if(w.renderer.getContext().getError()!==0)throw Error('Texture graphics error');
    return output;
   },{...item,folder:path.dirname(caseFile)});
   await page.locator('canvas').first().screenshot({path:`tests/screenshots/detail-${name}-${item.name}.png`});
   console.log(JSON.stringify({engine:name,scene:item.name,...result}));
   if(textureLimit)assert.ok(result.candidate.width<=textureLimit,'Candidate respects the device texture limit');
   else assert.ok(result.candidate.width===result.previous.width?result.candidate.rmse<=result.previous.rmse+.01:result.candidate.rmse<result.previous.rmse,`${name} ${item.name}: closer to real source`);
   if(!textureLimit)assert.ok(result.candidate.width===result.previous.width?result.candidate.gradientRmse<=result.previous.gradientRmse+.01:result.candidate.gradientRmse<result.previous.gradientRmse,`${name} ${item.name}: better preservation of real detail`);
   results.push({name:item.name,...result});
  }
  await page.evaluate(()=>{const c=window.__cosmos.world.canvas;c.style.width='';c.style.height='';});
  await page.setViewportSize({width:1440,height:900});
  const closeViews=[];
  for(const body of bodies){
   const state=await page.evaluate(async body=>{
    const a=window.__cosmos,w=a.world,t=await import('three');const [chapter,study]={earth:[0,null],moon:[0,'moon'],jupiter:[1,null],io:[1,'io']}[body];a.startChapter(chapter,0,study);a.game.mode='loading';a.game.timePaused=true;a.game.look.identity();w.setQuality('ultra');w.setFov(18);w.renderer.toneMapping=t.NeutralToneMapping;w.followReady=false;
    const m=detail.maps[body];m.previous.anisotropy=m.candidate.anisotropy;m.previous.needsUpdate=true;
    return JSON.stringify([a.game.player.position.toArray(),a.game.player.velocity.toArray(),a.game.localSeconds,a.game.fuel]);
   },body);
   for(const mode of ['previous','candidate']){
    const current=await page.evaluate(({body,mode})=>{const a=window.__cosmos,w=a.world;w.bodies[body].uniforms.surfaceMap.value=detail.maps[body][mode];w.update(a.game.player,0,{view:'probe',exposure:1,look:a.game.look});return JSON.stringify([a.game.player.position.toArray(),a.game.player.velocity.toArray(),a.game.localSeconds,a.game.fuel]);},{body,mode});
    assert.equal(current,state,'Source-map comparison preserves physical flight');
    await page.locator('canvas').first().screenshot({path:`tests/screenshots/detail-${name}-${body}-close-${mode}.png`});
   }
   closeViews.push({body,fov:18,physicalStatePreserved:true});
  }
  const projectionChecks=bodies.includes('jupiter')?await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(1);a.game.mode='loading';a.game.timePaused=true;a.game.look.identity();w.setQuality('ultra');w.setFov(30);
   const b=w.bodies.jupiter,original=b.mesh.material,material=original.clone();
   // Read the actual surface shader's UV computation before illumination.
   material.fragmentShader=original.fragmentShader.replace('vec3 tex=mix(', 'gl_FragColor=vec4(fract(uv.x),uv.y,0.,1.);return;\nvec3 tex=mix(');
   b.mesh.material=material;
   const target=new t.WebGLRenderTarget(1001,625,{type:t.FloatType}),pixel=new Float32Array(4),rows=[];
   const physical=()=>JSON.stringify([a.game.player.position.toArray(),a.game.player.velocity.toArray(),a.game.player.quaternion.toArray(),a.game.fuel,a.game.localSeconds]);
   try{
    for(const latitude of [-80,-55,-25,0,25,55,80])for(const u of [.2,.5,.8]){
     const phi=latitude*Math.PI/180,lon=u*Math.PI*2,f=b.data.flatten;
     // A geodetic/planetographic normal intersects the oblate ellipsoid here.
     // This constructs the reference without repeating the shader's inverse.
     const normal=new t.Vector3(-Math.cos(lon)*Math.cos(phi),Math.sin(phi),Math.sin(lon)*Math.cos(phi));
     const surface=new t.Vector3(normal.x,f*f*normal.y,normal.z).multiplyScalar(b.data.radius/Math.hypot(normal.x,f*normal.y,normal.z));
     const point=surface.clone().applyQuaternion(b.group.quaternion).add(w.bodyPositions.jupiter);
     a.game.player.position.copy(surface).addScaledVector(normal,b.data.radius*3).applyQuaternion(b.group.quaternion).add(w.bodyPositions.jupiter);
     a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(a.game.player.position,point,new t.Vector3(0,1,0)));w.followReady=false;
     const before=physical();w.update(a.game.player,0,{view:'probe',look:a.game.look});
     // Odd dimensions place a sample exactly on the optical axis.
     const aspect=w.camera.aspect;w.camera.aspect=1001/625;w.camera.updateProjectionMatrix();
     w.renderer.setRenderTarget(target);w.renderer.clear();w.renderer.render(w.scene,w.camera);w.renderer.readRenderTargetPixels(target,500,312,1,1,pixel);
     w.camera.aspect=aspect;w.camera.updateProjectionMatrix();w.renderer.setRenderTarget(null);
     const expected=[(u+b.uniforms.rotation.value)%1,latitude/180+.5];
     rows.push({latitude,u,expected,actual:[pixel[0],pixel[1]],maxError:Math.max(Math.abs(pixel[0]-expected[0]),Math.abs(pixel[1]-expected[1])),physicalStatePreserved:before===physical()});
    }
   }finally{b.mesh.material=original;material.dispose();target.dispose();w.renderer.setRenderTarget(null);}
   return rows;
  }):[];
  for(const r of projectionChecks){assert.ok(r.physicalStatePreserved);assert.ok(r.maxError<.0001,`Planetographic mapping at ${r.latitude}: ${r.maxError}`);}
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),results,closeViews,projectionChecks,errors});console.log(JSON.stringify(outcomes.at(-1)));
 }finally{await browser.close();}
}
const hashes={};for(const body of bodies)for(const extension of ['ktx2','avif']){const f=`${body}.${extension}`,bytes=await fs.readFile('assets/textures/'+f).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(bytes)hashes[f]=createHash('sha256').update(bytes).digest('hex');}
const runtimeHashes=Object.fromEntries(await Promise.all(['src/world.js','src/mission.js','src/rendering/shaders.js','src/rendering/scene-factory.js'].map(async p=>[p,createHash('sha256').update(await fs.readFile(p)).digest('hex')])));
await fs.writeFile(process.env.COSMOS_DETAIL_REPORT||'tests/surface-detail-results.json',JSON.stringify({version:JSON.parse(await fs.readFile('package.json')).version,method:'GPU-sampled source crops at native pixels; colour and first-difference errors against source crops. The comparison directory supplies the lower-resolution image. This measures retained image detail, not photographic scene equivalence.',caseFile,textureLimit,hashes,runtimeHashes,outcomes},null,2)+'\n');
