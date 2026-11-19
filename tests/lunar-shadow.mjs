// Native terrain rays versus pixel-filtered visibility, with a supersampled
// reference from the previous shader. Flight and source maps stay identical.
import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const previous=process.env.COSMOS_VISUAL_PREVIOUS;assert.ok(previous,'Supply the previous source directory.');
const oldSource=await fs.readFile(path.join(previous,'src/rendering/shaders.js'),'utf8');
const heightOnly=process.env.COSMOS_LUNAR_HEIGHT_ONLY==='1';
const exact=process.env.COSMOS_LUNAR_SHADOW_EXACT==='1';
const textureLimit=Number(process.env.COSMOS_LUNAR_TEXTURE_LIMIT||0);
const outcomes=[],cases=[['study',58,null],['close',18,null],['detail',4,null],['crescent',45,125],['full',25,25],['north',25,80,1],['south',25,80,-1]].filter(([label])=>!process.env.COSMOS_LUNAR_SHADOW_CASES||process.env.COSMOS_LUNAR_SHADOW_CASES.split(',').includes(label));
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:800,height:500}}),errors=[],views=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  if(textureLimit)await page.addInitScript(limit=>{const proto=WebGL2RenderingContext.prototype,get=proto.getParameter;proto.getParameter=function(p){const value=get.call(this,p);return p===this.MAX_TEXTURE_SIZE?Math.min(limit,value):value;};},textureLimit);
  await page.route('**/sampling/previous-shaders.js',r=>r.fulfill({body:oldSource.replaceAll("from './","from '/src/rendering/").replaceAll("from '../","from '/src/"),contentType:'text/javascript'}));
  if(heightOnly)await page.addInitScript(()=>{
   window.heightStorage=new WeakMap();
   const gl=WebGL2RenderingContext.prototype,storage=gl.texStorage2D,mips=gl.generateMipmap;
   gl.texStorage2D=function(target,levels,format,width,height){const texture=this.getParameter(this.TEXTURE_BINDING_2D);if(target===this.TEXTURE_2D)heightStorage.set(texture,{levels,format,width,height,mipGenerations:0});return storage.apply(this,arguments);};
   gl.generateMipmap=function(target){const item=heightStorage.get(this.getParameter(this.TEXTURE_BINDING_2D));if(target===this.TEXTURE_2D&&item)item.mipGenerations++;return mips.apply(this,arguments);};
  });
  const began=Date.now();await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:120000});const readyMs=Date.now()-began;await page.click('#begin');
  await page.evaluate(async heightOnly=>{
   const a=window.__cosmos,w=a.world;a.game.mode='loading';document.querySelectorAll('body>*:not(canvas)').forEach(e=>e.style.display='none');w.setQuality('ultra');w.frameTarget.dispose();w.frameTarget.samples=0;
   const old=(await import('/sampling/previous-shaders.js')).fragment;
   window.sampling={shaders:{previous:old,candidate:w.bodies.moon.mesh.material.fragmentShader,reference:old,convergence:old},frames:{},initialUpdates:w.lunarShadow.updates};
   if(heightOnly){
    const t=await import('three'),current=w.bodies.moon.uniforms.reliefHeight.value,previous=current.clone();
    previous.anisotropy=Math.min(16,w.renderer.capabilities.getMaxAnisotropy());previous.generateMipmaps=true;previous.minFilter=t.LinearMipmapLinearFilter;previous.needsUpdate=true;w.renderer.initTexture(previous);
    sampling.heightMaps={previous,current};const gl=w.renderer.getContext(),extension=gl.getExtension('EXT_texture_filter_anisotropic'),binding=gl.getParameter(gl.TEXTURE_BINDING_2D);
    sampling.heightStorage=Object.fromEntries(Object.entries(sampling.heightMaps).map(([name,texture])=>{const native=w.renderer.properties.get(texture).__webglTexture;gl.bindTexture(gl.TEXTURE_2D,native);return[name,{...heightStorage.get(native),minFilter:gl.getTexParameter(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER),anisotropy:extension?gl.getTexParameter(gl.TEXTURE_2D,extension.TEXTURE_MAX_ANISOTROPY_EXT):1}];}));gl.bindTexture(gl.TEXTURE_2D,binding);
   }
  },heightOnly);
  for(const [label,fov,phase,polar] of cases){
   await page.evaluate(async({fov,phase,polar})=>{
    const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0,0,'moon');a.game.mode='loading';a.game.timePaused=true;a.game.look.identity();w.setFov(fov);const b=w.bodies.moon,c=w.bodyPositions.moon;
    if(phase!==null){const sun=c.clone().negate().normalize(),up=new t.Vector3(0,1,0).applyQuaternion(b.group.quaternion),side=polar?up.clone().addScaledVector(sun,-up.dot(sun)).normalize().multiplyScalar(polar):new t.Vector3().crossVectors(sun,up).normalize();a.game.player.position.copy(c).addScaledVector(sun,b.data.radius*3*Math.cos(phase*Math.PI/180)).addScaledVector(side,b.data.radius*3*Math.sin(phase*Math.PI/180));a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(a.game.player.position,c,up));}w.followReady=false;sampling.frames={};
   },{fov,phase,polar});
   for(const [mode,factor] of (exact?[['previous',1],['candidate',1]]:[['previous',1],['candidate',1],['reference',4],['convergence',2]])){
    const result=await page.evaluate(({mode,factor})=>{
     const a=window.__cosmos,w=a.world,b=w.bodies.moon,g=a.game;const state=()=>JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.localSeconds,g.fuel]),before=state();
     if(sampling.heightMaps)b.uniforms.reliefHeight.value=sampling.heightMaps[mode==='candidate'?'current':'previous'];b.mesh.material.fragmentShader=sampling.shaders[mode];b.mesh.material.needsUpdate=true;
     w.renderer.setDrawingBufferSize(innerWidth,innerHeight,factor);w.frameTarget.setSize(innerWidth*factor,innerHeight*factor);w.update(g.player,0,{view:'probe',exposure:1,look:g.look});
     const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const ctx=c.getContext('2d');ctx.drawImage(w.canvas,0,0);const raw=ctx.getImageData(0,0,c.width,c.height).data,small=new Uint8ClampedArray(innerWidth*innerHeight*4);
     for(let y=0;y<innerHeight;y++)for(let x=0;x<innerWidth;x++){const p=(y*innerWidth+x)*4;for(let k=0;k<3;k++){let sum=0;for(let j=0;j<factor;j++)for(let i=0;i<factor;i++)sum+=raw[((y*factor+j)*c.width+x*factor+i)*4+k];small[p+k]=sum/(factor*factor);}small[p+3]=255;}
     sampling.frames[mode]=small;c.width=innerWidth;c.height=innerHeight;ctx.putImageData(new ImageData(small,innerWidth,innerHeight),0,0);
     return {unchanged:before===state(),png:c.toDataURL('image/png'),updates:w.lunarShadow.updates,ready:b.uniforms.reliefVisibilityReady.value};
    },{mode,factor});assert.ok(result.unchanged);assert.equal(result.ready,1);
    if(name==='Chrome'&&mode!=='convergence')await fs.writeFile(`tests/screenshots/lunar-shadow-${label}-${mode}.png`,Buffer.from(result.png.split(',')[1],'base64'));
   }
   const metrics=await page.evaluate(exact=>{
    const f=sampling.frames,out={};if(exact)f.reference=f.previous;for(const m of (exact?['previous','candidate']:['previous','candidate','convergence'])){let sum=0,count=0,max=0;for(let p=0;p<f.reference.length;p+=4)if(exact||['reference','previous','candidate'].some(key=>f[key][p]>10))for(let k=0;k<3;k++){const d=Math.abs(f[m][p+k]-f.reference[p+k]);sum+=d*d;count++;max=Math.max(max,d);}out[m]={rmse:Math.sqrt(sum/count),count,max};}return out;
   },exact);views.push({label,metrics});console.log({name,label,metrics});
  }
  const motion=await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,g=a.game,b=w.bodies.moon,t=await import('three'),results=[];
   a.startChapter(0,0,'moon');g.mode='loading';g.timePaused=true;w.setFov(58);const initial=g.player.quaternion.clone();
   const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
   const render=(mode,factor)=>{
    if(sampling.heightMaps)b.uniforms.reliefHeight.value=sampling.heightMaps[mode==='candidate'?'current':'previous'];b.mesh.material.fragmentShader=sampling.shaders[mode];b.mesh.material.needsUpdate=true;w.renderer.setDrawingBufferSize(innerWidth,innerHeight,factor);w.frameTarget.setSize(innerWidth*factor,innerHeight*factor);
    w.update(g.player,0,{view:'probe',look:g.look});canvas.width=w.canvas.width;canvas.height=w.canvas.height;ctx.drawImage(w.canvas,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,small=new Float32Array(innerWidth*innerHeight);
    for(let y=0;y<innerHeight;y++)for(let x=0;x<innerWidth;x++){let sum=0;for(let j=0;j<factor;j++)for(let i=0;i<factor;i++){const p=((y*factor+j)*canvas.width+x*factor+i)*4;sum+=pixels[p]*.2126+pixels[p+1]*.7152+pixels[p+2]*.0722;}small[y*innerWidth+x]=sum/(factor*factor);}return small;
   };
   let last;const sums={previous:0,candidate:0},spatial={previous:0,candidate:0};let count=0;
   for(let step=0;step<8;step++){
    g.player.quaternion.copy(initial).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),(step-3.5)*.00022));
    const frames={};for(const [mode,factor] of [['previous',1],['candidate',1],['reference',4]])frames[mode]=render(mode,factor);
    for(let p=0;p<frames.reference.length;p++)if(frames.reference[p]>10||frames.previous[p]>10||frames.candidate[p]>10){
     for(const mode of ['previous','candidate']){spatial[mode]+=(frames[mode][p]-frames.reference[p])**2;if(last)sums[mode]+=((frames[mode][p]-last[mode][p])-(frames.reference[p]-last.reference[p]))**2;}count++;
    }last=frames;
   }
   return {steps:8,spatialError:spatial,changeError:sums,pixels:count};
  });
  if(exact){assert.equal(motion.spatialError.candidate,motion.spatialError.previous);assert.equal(motion.changeError.candidate,motion.changeError.previous);}
  else{assert.ok(motion.spatialError.candidate<motion.spatialError.previous,'Moving views retain more source detail');assert.ok(motion.changeError.candidate<motion.changeError.previous,'Subpixel motion better matches dense reference changes');}
  const cost=await page.evaluate(()=>{
   const a=window.__cosmos,w=a.world,g=a.game,b=w.bodies.moon,gl=w.renderer.getContext(),rows=[];
   a.startChapter(0,0,'moon');g.mode='loading';g.timePaused=true;w.setFov(58);w.renderer.setDrawingBufferSize(innerWidth,innerHeight,2);w.frameTarget.setSize(innerWidth*2,innerHeight*2);
   for(const mode of ['previous','candidate','candidate','previous']){
    if(sampling.heightMaps)b.uniforms.reliefHeight.value=sampling.heightMaps[mode==='candidate'?'current':'previous'];b.mesh.material.fragmentShader=sampling.shaders[mode];b.mesh.material.needsUpdate=true;for(let i=0;i<5;i++)w.update(g.player,0,{view:'probe',look:g.look});gl.finish();
    const samples=[];for(let i=0;i<12;i++){const begin=performance.now();w.update(g.player,0,{view:'probe',look:g.look});gl.finish();samples.push(performance.now()-begin);}samples.sort((a,b)=>a-b);rows.push({mode,medianMs:samples[6],maxMs:samples.at(-1)});
   }return {pixels:[w.canvas.width,w.canvas.height],method:'CPU submission windows, five warm-up plus twelve draws including gl.finish; driver completion is not established and these values are not GPU time or FPS',rows};
  });
  console.log({name,motion,cost});
  const lifecycle=await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,g=a.game,b=w.bodies.moon,s=w.lunarShadow;
   w.renderer.setDrawingBufferSize(innerWidth,innerHeight,1);w.frameTarget.setSize(innerWidth,innerHeight);if(sampling.heightMaps)b.uniforms.reliefHeight.value=sampling.heightMaps.current;b.mesh.material.fragmentShader=sampling.shaders.candidate;b.mesh.material.needsUpdate=true;
   a.startChapter(0,0,'moon');g.mode='loading';g.timePaused=true;w.setFov(58);w.update(g.player,0,{view:'probe',look:g.look});
   const texture=s.target.texture.uuid,updates=s.updates,rows=[];
   for(let i=0;i<20;i++)w.update(g.player,0,{view:'probe',look:g.look});
   const heldUpdates=s.updates-updates;
   for(const chapter of [1,2,3,4,5,0]){a.startChapter(chapter);g.mode='loading';g.timePaused=true;w.update(g.player,0,{view:'probe',look:g.look});rows.push({chapter,ready:b.uniforms.reliefVisibilityReady.value,updates:s.updates});}
   const gl=w.renderer.getContext();return {heldUpdates,initialUpdates:sampling.initialUpdates,updates:s.updates,textureReused:texture===s.target.texture.uuid,rows,size:[s.target.width,s.target.height],maxSamplers:gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),graphicsError:gl.getError()};
  });
  assert.equal(lifecycle.heldUpdates,0);assert.equal(lifecycle.initialUpdates,1);assert.equal(lifecycle.updates,1);assert.ok(lifecycle.textureReused);assert.equal(lifecycle.graphicsError,0);if(textureLimit)assert.ok(lifecycle.size.every(n=>n<=textureLimit));
  assert.equal(lifecycle.rows.at(-1).ready,1);assert.ok(lifecycle.rows.slice(0,-1).every(r=>r.ready===0));
  const fields=exact?await page.evaluate(async control=>{
   const a=window.__cosmos,w=a.world,s=w.lunarShadow,t=await import('three'),current=(await import('/src/rendering/shaders.js')).lunarVisibility,old=(await import('/sampling/previous-shaders.js')).lunarVisibility;
   const full=s.material.fragmentShader;assertContains(full,current);const variants={previous:full.replace(current,old),candidate:full};if(control)variants.candidate=variants.previous;
   const suns=[0,2,6].map(epoch=>{const p=w.ephemeris.objects.moon[epoch].position,v=new t.Vector3(p[0],p[2],-p[1]);return{label:`epoch-${epoch}`,sun:v.clone().negate().normalize().applyQuaternion(w.bodies.moon.inverseOrientation),angle:695700/v.length()};});suns.push({label:'polar',sun:new t.Vector3(0,1,0),angle:.00465},{label:'equatorial',sun:new t.Vector3(1,0,0),angle:.00465});
   const rows=[],gl=w.renderer.getContext(),size=s.target.width*s.target.height,raw=new Uint8Array(size*4);
   for(const test of suns){
    let previous;const before=JSON.stringify([a.game.player.position.toArray(),a.game.player.velocity.toArray(),a.game.localSeconds,a.game.fuel]);
    for(const mode of ['previous','candidate']){
     if(sampling.heightMaps)w.bodies.moon.uniforms.reliefHeight.value=sampling.heightMaps[mode==='candidate'?'current':'previous'];s.material.fragmentShader=variants[mode];s.material.needsUpdate=true;s.sun.set(Infinity,Infinity,Infinity);s.prepare(test.sun,test.angle);
     const target=w.renderer.getRenderTarget();w.renderer.setRenderTarget(s.target);gl.readPixels(0,0,s.target.width,s.target.height,gl.RGBA,gl.UNSIGNED_BYTE,raw);w.renderer.setRenderTarget(target);if(gl.getError())throw Error('Visibility field readback failed');
     if(mode==='previous'){previous=Uint8Array.from({length:size},(_,i)=>raw[i*4]);}
     else{let max=0,changed=0,point=null;for(let i=0;i<size;i++){const d=Math.abs(previous[i]-raw[i*4]);if(d>max)point={x:i%s.target.width,y:Math.floor(i/s.target.width),previous:previous[i],candidate:raw[i*4]};max=Math.max(max,d);if(d)changed++;}rows.push({label:test.label,size:[s.target.width,s.target.height],max,changed,point,physicalStatePreserved:before===JSON.stringify([a.game.player.position.toArray(),a.game.player.velocity.toArray(),a.game.localSeconds,a.game.fuel])});}
    }
   }
   if(sampling.heightMaps)w.bodies.moon.uniforms.reliefHeight.value=sampling.heightMaps.current;s.material.fragmentShader=full;s.material.needsUpdate=true;s.sun.set(Infinity,Infinity,Infinity);s.prepare(w.bodies.moon.uniforms.localSun.value,w.bodies.moon.uniforms.sunAngle.value);return rows;
   function assertContains(a,b){if(!b||!a.includes(b))throw Error('Visibility reference does not match shared shader');}
  },process.env.COSMOS_LUNAR_FIELD_CONTROL==='1'):[];
  const storage=heightOnly?await page.evaluate(()=>sampling.heightStorage):null;
  if(storage){
   assert.equal(storage.current.format,33321);assert.equal(storage.previous.format,33321);
   assert.equal(storage.current.width,storage.previous.width);assert.equal(storage.current.height,storage.previous.height);
   assert.equal(storage.current.levels,1);assert.ok(storage.previous.levels>1);
   assert.equal(storage.current.mipGenerations,0);assert.equal(storage.previous.mipGenerations,1);
   assert.equal(storage.current.minFilter,9729);assert.equal(storage.previous.minFilter,9987);assert.equal(storage.current.anisotropy,1);
   const bytes=t=>Array.from({length:t.levels},(_,i)=>Math.max(1,Math.floor(t.width/2**i))*Math.max(1,Math.floor(t.height/2**i))).reduce((a,b)=>a+b,0);
   storage.bytesSaved=bytes(storage.previous)-bytes(storage.current);
  }
  assert.deepEqual(errors,[]);
  for(const {label,metrics:m} of views)if(exact)assert.equal(m.candidate.max,0,`${label}: identical pixels`);else assert.ok(m.candidate.rmse<m.previous.rmse*1.01,`${label}: preserve or improve source sampling`);
  const sum=mode=>views.reduce((n,v)=>n+v.metrics[mode].rmse**2*v.metrics[mode].count,0);
  if(exact)console.log(JSON.stringify({name,fields}));
  if(exact){for(const f of fields){assert.equal(f.max,0,`${f.label}: identical visibility field`);assert.ok(f.physicalStatePreserved);}}else assert.ok(sum('candidate')<sum('previous')*.85,'Reduce total spatial sampling error');
  outcomes.push({name,engineVersion:browser.version(),readyMs,views,motion,cost,lifecycle,fields,storage,errors,passed:true});
 }finally{await browser.close();}
}
await fs.writeFile(process.env.COSMOS_LUNAR_SHADOW_REPORT||'tests/lunar-shadow-results.json',JSON.stringify({version:JSON.parse(await fs.readFile('package.json')).version,exact,heightOnly,textureLimit,previous,previousShaderSha256:createHash('sha256').update(oldSource).digest('hex'),reference:exact?'Exact old/current pixels, motion and five complete native visibility fields.': 'Fourfold display sampling of unchanged source terrain rays; twofold convergence control. Tests rendering integration, not photographic equivalence.',outcomes},null,2)+'\n');
