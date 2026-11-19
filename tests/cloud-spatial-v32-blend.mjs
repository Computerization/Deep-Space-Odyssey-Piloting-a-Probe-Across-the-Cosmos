import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const previous=await fs.readFile('tests/fixtures/cloud-v31.glsl','utf8');
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:640,height:400}}),errors=[],views=[];
let candidate;
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 await page.evaluate(async()=>{
  const a=window.__cosmos,w=a.world,t=await import('three');a.game.mode='panel';w.setQuality('ultra');
  const material=w.bodies.earth.clouds.material.clone();material.uniforms=w.bodies.earth.clouds.material.uniforms;material.blending=t.NoBlending;material.transparent=false;material.depthTest=false;material.depthWrite=false;
  const mesh=new t.Mesh(w.bodies.earth.clouds.geometry,material);mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;const scene=new t.Scene();scene.add(mesh);
  const target=new t.WebGLRenderTarget(640,400,{type:t.HalfFloatType,depthBuffer:false}),lookup=Float32Array.from({length:65536},(_,i)=>t.DataUtils.fromHalfFloat(i));window.spatial={t,material,mesh,scene,target,lookup,frames:{}};
 });
 candidate=await page.evaluate(()=>window.__cosmos.world.bodies.earth.clouds.material.fragmentShader);
 for(const [label,radius,phase,yaw=0]of [['day',2.35,35],['terminator',2.35,90],['crescent',2.35,150],['close',1.05,50],['grazing',1.08,90],['turn-left',2.35,35,-.001],['turn-right',2.35,35,.001]]){
  const result=await page.evaluate(({label,radius,phase,yaw,previous,candidate})=>{
   const a=window.__cosmos,w=a.world,s=window.spatial,t=s.t;a.startChapter(0);a.game.mode='panel';a.game.timePaused=true;
   const c=w.bodyPositions.earth,sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize(),p=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180)).multiplyScalar(6371*radius).add(c);
   a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0))).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),yaw));w.followReady=false;w.update(a.game.player,0,{view:'probe',exposure:1});s.mesh.matrix.copy(w.bodies.earth.clouds.matrixWorld);
   const samples={};
   for(const [mode,filter,scale] of [['previous',1,1],['candidate',2,1],['reference',16,4]]){
    const width=640*scale,height=400*scale;s.target.setSize(width,height);const map=w.textures['earth-clouds.avif'];map.anisotropy=filter;map.needsUpdate=true;
    s.material.fragmentShader=(mode==='previous'?previous:mode==='candidate'?candidate.replace('smoothstep(0.,1.,cloudLod));','smoothstep(0.,1.,cloudLod)*.5);').replace('}else weather=texture2DGradEXT(cloudMap,uv,cloudDx,cloudDy).r;','}else weather=texture2DGradEXT(cloudMap,uv,cloudDx,cloudDy).r*.5+(texture2DLodEXT(cloudMap,uv-cloudFootprint,cloudFineLod).r+texture2DLodEXT(cloudMap,uv+cloudFootprint,cloudFineLod).r)*.25;'):candidate).replace('vec4(radiance/alpha,alpha)','vec4(radiance,alpha)');s.material.defines={CLOUD_ANISOTROPIC:filter>1?1:0};s.material.needsUpdate=true;
    w.renderer.setRenderTarget(s.target);w.renderer.setClearAlpha(0);w.renderer.clear();w.renderer.render(s.scene,w.camera);
    const raw=new Uint16Array(width*height*4),data=new Float32Array(640*400*4);w.renderer.readRenderTargetPixels(s.target,0,0,width,height,raw);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
     const dest=(Math.floor(y/scale)*640+Math.floor(x/scale))*4,src=(y*width+x)*4;
     for(let channel=0;channel<4;channel++)data[dest+channel]+=s.lookup[raw[src+channel]]/(scale*scale);
    }
    samples[mode]=data;
   }
   const metrics={};
   for(const mode of ['previous','candidate']){
    let sum=0,sq=0,max=0,n=0;const data=samples[mode],reference=samples.reference;
    for(let i=0;i<data.length;i+=4)if(reference[i+3]>.02&&reference[i]+reference[i+1]+reference[i+2]>.003){
     for(let c=0;c<3;c++){const e=Math.abs(data[i+c]-reference[i+c]);sum+=e;sq+=e*e;max=Math.max(max,e);n++;}
    }
    metrics[mode]={channels:n,mean:n?sum/n:0,rmse:n?Math.sqrt(sq/n):0,max};
   }
   if(['day','turn-left','turn-right'].includes(label))s.frames[label]=samples;
   w.renderer.setRenderTarget(null);w.renderer.setClearAlpha(1);return {label,radius,phase,yaw,metrics};
  },{label,radius,phase,yaw,previous,candidate});views.push(result);const m=result.metrics;assert.ok(m.candidate.mean<=m.previous.mean*1.002+1e-7,JSON.stringify({name,...result}));if(['day','terminator','turn-left','turn-right'].includes(label))assert.ok(m.candidate.mean<m.previous.mean*.98,JSON.stringify({name,...result}));console.log({name,label,previous:m.previous.mean,candidate:m.candidate.mean});
 }
 const motion=await page.evaluate(()=>{
  const frames=window.spatial.frames,out={};
  for(const mode of ['previous','candidate']){
   let sq=0,n=0,max=0;
   for(const [before,after] of [['turn-left','day'],['day','turn-right']]){
    const a=frames[before],b=frames[after];
    for(let i=0;i<a.reference.length;i+=4)if(Math.max(a.reference[i+3],b.reference[i+3])>.02){
     for(let c=0;c<3;c++){const residual=(b[mode][i+c]-a[mode][i+c])-(b.reference[i+c]-a.reference[i+c]);sq+=residual*residual;n++;max=Math.max(max,Math.abs(residual));}
    }
   }out[mode]={channels:n,rmse:Math.sqrt(sq/n),max};
  }return out;
 });
 assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),views,motion,errors});
}finally{await browser.close();}

}
await fs.writeFile('tests/cloud-spatial-v32-blend-results.json',JSON.stringify({version:'0.32.0',reference:'Premultiplied linear cloud radiance integrated over 4x4 spatial subpixels at 16x anisotropy, compared with 640x400. Same 20 view and 4 sunlight integration steps. This measures spatial sampling, not photographic equivalence.',outcomes},null,2)+'\n');
