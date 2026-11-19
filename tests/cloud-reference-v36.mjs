// Reusable density/lighting integration review; historical filename retained.
import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {cloudFragment,cloudShader} from '../src/rendering/earth-shaders.js';
const source=process.env.COSMOS_CLOUD_PREVIOUS||'tests/fixtures/cloud-v69.glsl';
const candidateSource=process.env.COSMOS_CLOUD_CANDIDATE;
const fidelityOnly=process.env.COSMOS_CLOUD_FIDELITY_ONLY==='1';
const fieldChanged=process.env.COSMOS_CLOUD_REFERENCE_FIELD==='candidate';
const candidate=candidateSource?await fs.readFile(candidateSource,'utf8'):cloudFragment;
const previous=await fs.readFile(source,'utf8'),version=JSON.parse(await fs.readFile('package.json')).version;
const budget='int upperSteps=int(clamp(ceil(sampleDensity*(split-begin)),8.,32.));\n int lowerSteps=int(clamp(ceil(sampleDensity*(end-split)),12.,32.));';
assert.ok(previous.includes(budget));
const reference=(source,n)=>source.replace(budget,`int upperSteps=${n*2}; int lowerSteps=${n*3};`).replace('i<64',`i<${n*5}`);
const changed=candidate!==previous||!candidateSource&&cloudShader(false,true)!==previous;
const referenceField=fieldChanged?candidate:previous;
const variants={previous,candidate,reference:reference(referenceField,80),dense:reference(referenceField,160),...(fieldChanged?{previousReference:reference(previous,80)}:{})};
const cases=[['day',2.35,35,0,58],['night',2.35,175,0,58],['close',1.05,50,0,58],['resolved-cloud',1.05,50,0,20],['limb-left',1.05,35,1.264,4],['limb',1.05,35,1.2645,4],['limb-right',1.05,35,1.265,4],['horizon',1.05,35,1.2,4],['closest-limb',1.035,35,1.3,4],['pole',1.05,35,0,4],['seam',1.05,35,0,4]];
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_CLOUD_ENGINE&&process.env.COSMOS_CLOUD_ENGINE!==name)continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:800,height:500}}),errors=[],views=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');
  const packedCoverage=await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,t=await import('three'),packed=w.textures['earth-clouds.avif'];
   if(packed.format!==t.RGFormat)return null;
   a.game.mode='loading';
   const original=await new t.TextureLoader().loadAsync('/assets/textures/earth-clouds.avif');
   original.colorSpace=t.NoColorSpace;original.format=t.RedFormat;original.wrapS=t.RepeatWrapping;
   const material=new t.ShaderMaterial({uniforms:{packed:{value:packed},original:{value:original}},vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D packed,original;
    void main(){vec2 p=gl_FragCoord.xy,uv=fract(vec2(p.x*.61803398875+p.y*.113,p.x*.41421356237+p.y*.371));if(p.x<2.)uv.x=p.x<1.?0.:.999999;if(p.y<2.)uv.y=p.y<1.?0.:.999999;float lod=mod(floor(p.y),9.);vec2 field=texture2DLodEXT(packed,uv,lod).rg;gl_FragColor=vec4(field.x,texture2DLodEXT(original,uv,lod).r,field.y,1.);}`,depthTest:false,depthWrite:false});
   const geometry=new t.PlaneGeometry(2,2),scene=new t.Scene();scene.add(new t.Mesh(geometry,material));
   const target=new t.WebGLRenderTarget(512,64,{type:t.FloatType,depthBuffer:false}),pixels=new Float32Array(512*64*4);
   w.renderer.setRenderTarget(target);w.renderer.render(scene,new t.Camera());w.renderer.readRenderTargetPixels(target,0,0,512,64,pixels);w.renderer.setRenderTarget(null);
   let baseMax=0,mipMax=0,minHeight=1,maxHeight=0;
   for(let y=0;y<64;y++)for(let x=0;x<512;x++){const i=(y*512+x)*4,d=Math.abs(pixels[i]-pixels[i+1]);if(!Number.isFinite(d)||pixels[i+3]!==1)throw Error('Invalid cloud-field output');if(y%9===0)baseMax=Math.max(baseMax,d);else mipMax=Math.max(mipMax,d);minHeight=Math.min(minHeight,pixels[i+2]);maxHeight=Math.max(maxHeight,pixels[i+2]);}
   original.dispose();material.dispose();geometry.dispose();target.dispose();
   return {samples:512*64,baseMax,mipMax,minHeight,maxHeight,packedBytes:packed.image.data.byteLength,width:packed.image.width,height:packed.image.height};
  });
  if(packedCoverage){assert.ok(packedCoverage.baseMax<2e-6&&packedCoverage.mipMax<=1/255+2e-6,JSON.stringify(packedCoverage));assert.ok(packedCoverage.minHeight>=0&&packedCoverage.maxHeight<=1,JSON.stringify(packedCoverage));}
  const selection=await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,t=await import('three'),layer=w.cloudLayer;
   if(!layer.updateDetail)return null;
   a.startChapter(0);a.game.mode='loading';a.game.timePaused=true;
   const c=w.bodyPositions.earth,sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize();
   const direction=sun.multiplyScalar(Math.cos(35*Math.PI/180)).addScaledVector(side,Math.sin(35*Math.PI/180)),rows=[];
   const programs=w.renderer.info.programs.length;
   for(const quality of ['ultra','high'])for(const [radius,yaw,fov,expected] of [[1.05,0,4,0],[1.05,1.2645,58,0],[1.05,1.2645,16,0],[1.05,1.2645,15,.04296875],[1.05,1.2645,12,.5],[1.05,1.2645,8,1],[1.05,1.2645,4,1],[1.05,1.2,4,1],[1.18,1.05,4,.352],[1.2,1.05,4,0],[1.05,1.2645,58,0]]){
    const p=direction.clone().multiplyScalar(w.bodies.earth.data.radius*radius).add(c);a.game.player.position.copy(p);
    a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0))).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),yaw));
    w.setQuality(quality);w.setFov(fov);
    const before=JSON.stringify([p.toArray(),a.game.player.velocity.toArray(),a.game.player.quaternion.toArray(),a.game.localSeconds,a.game.fuel]);
    const start=performance.now();w.update(a.game.player,0,{view:'probe'});const drawMs=performance.now()-start;
    const after=JSON.stringify([a.game.player.position.toArray(),a.game.player.velocity.toArray(),a.game.player.quaternion.toArray(),a.game.localSeconds,a.game.fuel]);
    rows.push({quality,radius,yaw,fov,expected,weight:layer.detailWeight.value,selected:layer.cloud.material===layer.cloudMaterials[1],volumeSelected:layer.volume.material===layer.volumeMaterials[1],programs:w.renderer.info.programs.length,physicalStatePreserved:before===after,drawMs});
   }
   // The detailed program must meet the base program at zero weight.
   w.setQuality('ultra');w.setFov(4);const update=layer.updateDetail;
   const pixels=()=>{const canvas=document.createElement('canvas');canvas.width=w.canvas.width;canvas.height=w.canvas.height;const ctx=canvas.getContext('2d');ctx.drawImage(w.canvas,0,0);return ctx.getImageData(0,0,canvas.width,canvas.height).data;};
   layer.updateDetail=()=>layer.selectDetail(0);w.update(a.game.player,0,{view:'probe'});const base=pixels();
   layer.updateDetail=()=>{layer.selectDetail(1);layer.detailWeight.value=0;};w.update(a.game.player,0,{view:'probe'});const zero=pixels();
   layer.updateDetail=update;
   let maxDifference=0;for(let i=0;i<base.length;i++)maxDifference=Math.max(maxDifference,Math.abs(base[i]-zero[i]));
   return {programs,rows,zeroWeightMaxChannelDifference:maxDifference};
  });
  if(selection){
   assert.ok(selection.zeroWeightMaxChannelDifference<=1,JSON.stringify(selection));
   for(const r of selection.rows){assert.ok(Math.abs(r.weight-r.expected)<1e-8,JSON.stringify(r));assert.equal(r.selected,r.expected>0);assert.equal(r.volumeSelected,r.selected);assert.equal(r.programs,selection.programs);assert.ok(r.physicalStatePreserved);}
  }
  await page.evaluate(async variants=>{
   const a=window.__cosmos,w=a.world,t=await import('three');a.game.mode='loading';w.setQuality('ultra');
   window.variants=variants;
   const layer=w.cloudLayer;window.updateCloudDetail=layer.updateDetail?.bind(layer);
   window.selectCloudVariant=mode=>{
    const base=layer.cloudMaterials?.[0]||w.bodies.earth.clouds.material;
    base.fragmentShader=variants[mode];base.needsUpdate=true;
    if(window.updateCloudDetail){
     layer.updateDetail=mode==='candidate'&&!window.candidateOverride?window.updateCloudDetail:()=>layer.selectDetail(0);
    }
   };
   const material=w.bodies.earth.clouds.material.clone();material.uniforms=w.bodies.earth.clouds.material.uniforms;material.blending=t.NoBlending;material.transparent=false;material.depthTest=false;material.depthWrite=false;
   const mesh=new t.Mesh(w.bodies.earth.clouds.geometry,material);mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;
   const scene=new t.Scene();scene.add(mesh);
   window.numeric={material,mesh,scene,target:new t.WebGLRenderTarget(800,500,{type:t.HalfFloatType,depthBuffer:false}),lookup:Float32Array.from({length:65536},(_,i)=>t.DataUtils.fromHalfFloat(i)),motion:{}};
  },variants);
  await page.evaluate(({override,fieldChanged})=>{window.candidateOverride=override;window.fieldChanged=fieldChanged;},{override:!!candidateSource,fieldChanged});
  for(const [label,radius,phase,yaw,fov] of cases){
   await page.evaluate(async({label,radius,phase,yaw,fov})=>{
    const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0);a.game.mode='loading';a.game.timePaused=true;w.setQuality('ultra');w.setFov(fov);
    const c=w.bodyPositions.earth,sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize(),p=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180)).multiplyScalar(w.bodies.earth.data.radius*radius).add(c);
    if(label==='pole')p.copy(new t.Vector3(Math.sin(Math.PI/90),Math.cos(Math.PI/90),0).applyQuaternion(w.bodies.earth.group.quaternion).multiplyScalar(w.bodies.earth.data.radius*radius).add(c));
    if(label==='seam'){const u=-.12*Math.PI*2;p.copy(new t.Vector3(-Math.cos(u)*Math.cos(.2),Math.sin(.2),Math.sin(u)*Math.cos(.2)).applyQuaternion(w.bodies.earth.group.quaternion).multiplyScalar(w.bodies.earth.data.radius*radius).add(c));}
    a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0))).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),yaw));w.followReady=false;window.frames={};
   },{label,radius,phase,yaw,fov});
   const draws=[];
   for(const mode of Object.keys(variants)){
    const r=await page.evaluate(mode=>{
     const a=window.__cosmos,w=a.world,g=a.game,cloud=w.bodies.earth.clouds,n=window.numeric;
     const physical=()=>JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.fuel,g.localSeconds]),before=physical();
     selectCloudVariant(mode);w.update(g.player,0,{view:'probe',exposure:1,time:0});
     const c=document.createElement('canvas');c.width=800;c.height=500;const ctx=c.getContext('2d');ctx.drawImage(w.canvas,0,0,800,500);
     const frame={display:ctx.getImageData(0,0,800,500).data},draw={calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles};
     n.material.defines={...cloud.material.defines};n.material.fragmentShader=cloud.material.fragmentShader.replace('vec4(radiance/alpha,alpha)','vec4(radiance,alpha)');n.material.needsUpdate=true;n.mesh.matrix.copy(cloud.matrixWorld);w.renderer.setRenderTarget(n.target);w.renderer.setClearAlpha(0);w.renderer.clear();w.renderer.render(n.scene,w.camera);
     const raw=new Uint16Array(800*500*4);w.renderer.readRenderTargetPixels(n.target,0,0,800,500,raw);frame.linear=Float32Array.from(raw,x=>n.lookup[x]);frames[mode]=frame;w.renderer.setRenderTarget(null);w.renderer.setClearAlpha(1);
     return {draw,physicalStatePreserved:physical()===before,png:c.toDataURL().split(',')[1]};
    },mode);
    assert.ok(r.physicalStatePreserved);draws.push(r.draw);
    if(name==='Chrome'&&['limb','horizon','closest-limb','resolved-cloud'].includes(label))await fs.writeFile(`tests/screenshots/cloud-integration-${label}-${mode}.png`,Buffer.from(r.png,'base64'));
   }
   const metrics=await page.evaluate(label=>{
    const out={};
    for(const mode of ['previous','candidate','dense']){
     out[mode]={};for(const type of ['display','linear']){const a=frames[mode][type],b=frames[fieldChanged&&mode==='previous'?'previousReference':'reference'][type];let sum=0,sq=0,max=0,count=0;for(let i=0;i<a.length;i++){if(type==='display'&&i%4===3)continue;const e=Math.abs(a[i]-b[i]);if(!Number.isFinite(e))throw Error('Invalid output');sum+=e;sq+=e*e;max=Math.max(max,e);count++;}out[mode][type]={mae:sum/count,rmse:Math.sqrt(sq/count),max};}
    }
    out.change={};for(const type of ['display','linear']){const a=frames.candidate[type],b=frames.previous[type];let sq=0,max=0,count=0;for(let i=0;i<a.length;i++){if(type==='display'&&i%4===3)continue;const d=Math.abs(a[i]-b[i]);sq+=d*d;max=Math.max(max,d);count++;}out.change[type]={rmse:Math.sqrt(sq/count),max};}
    if(label.startsWith('limb'))numeric.motion[label]=frames;
    return out;
   },label);
   for(const d of draws)assert.deepEqual(d,draws[0]);
   // A near-zero reference error is allowed a small floating-point floor.
   // A changed density field has different geometry. Bound its integration
   // error against its own converged field, rather than the old field's error.
   // These ceilings retain the accepted 0.78 matrix's worst-case precision.
   if(fieldChanged){
    assert.ok(metrics.candidate.linear.rmse<=.01&&metrics.candidate.display.rmse<=1.5,JSON.stringify({name,label,metrics}));
    assert.ok(metrics.dense.linear.rmse<=metrics.candidate.linear.rmse*.2+.00005,JSON.stringify({name,label,metrics}));
   }else assert.ok(metrics.candidate.linear.rmse<=metrics.previous.linear.rmse*1.05+1e-5,JSON.stringify({name,label,metrics}));
   if(!changed)assert.deepEqual(metrics.candidate,metrics.previous);
   if(changed&&!fidelityOnly&&['limb','horizon'].includes(label)){
    assert.ok(metrics.candidate.display.rmse<metrics.previous.display.rmse*.75,JSON.stringify({name,label,metrics}));
    assert.ok(metrics.dense.linear.rmse<metrics.previous.linear.rmse*.1+1e-5,JSON.stringify({name,label,metrics}));
   }
   views.push({label,radius,phase,yaw,fov,metrics,draw:draws[0],physicalStatePreserved:true});console.log({name,label,previous:metrics.previous.display.rmse,candidate:metrics.candidate.display.rmse});
  }
  const motion=await page.evaluate(()=>{
   const f=numeric.motion,out={};for(const mode of ['previous','candidate']){let sq=0,count=0;for(const [a,b] of [[f['limb-left'],f.limb],[f.limb,f['limb-right']]])for(let i=0;i<a.reference.linear.length;i++){const ref=fieldChanged&&mode==='previous'?'previousReference':'reference';const e=(b[mode].linear[i]-a[mode].linear[i])-(b[ref].linear[i]-a[ref].linear[i]);sq+=e*e;count++;}out[mode]=Math.sqrt(sq/count);}return out;
  });
  if(fieldChanged)assert.ok(motion.candidate<=.005,JSON.stringify({name,motion}));
  else if(fidelityOnly)assert.ok(motion.candidate<=motion.previous*1.05+1e-5,JSON.stringify({name,motion}));
  else if(changed)assert.ok(motion.candidate<motion.previous*.8,JSON.stringify({name,motion}));else assert.equal(motion.candidate,motion.previous);assert.deepEqual(errors,[]);
  outcomes.push({name,engineVersion:browser.version(),packedCoverage,selection,views,motion,errors});
 }finally{await browser.close();}
}
await fs.writeFile('tests/cloud-reference-v36-results.json',JSON.stringify({version,fidelityOnly,fieldChanged,candidateShader:candidateSource||'runtime',candidateSha256:createHash('sha256').update(candidate).digest('hex'),changed,previousShader:source,previousSha256:createHash('sha256').update(previous).digest('hex'),shaderSourceSha256:createHash('sha256').update(await fs.readFile('src/rendering/earth-shaders.js')).digest('hex'),reference:'400 complete view/lighting segments of the designated field; 800 segments check convergence. A changed field compares the previous shader against its own 400-step reference. Linear premultiplied RGBA and displayed pixels. Integration fidelity, not photographic equivalence.',outcomes},null,2)+'\n');
