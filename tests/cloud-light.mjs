import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const previous=await fs.readFile('tests/fixtures/cloud-v44.glsl','utf8');
const candidate=process.env.COSMOS_CLOUD_CANDIDATE?await fs.readFile(process.env.COSMOS_CLOUD_CANDIDATE,'utf8'):null;
const oldLoop='for(int j=0;j<4;j++){\n     float a=float(j)*.25,b=(float(j)+1.)*.25;a*=a;b*=b;';
assert.ok(previous.includes(oldLoop));
const reference=previous.replace(oldLoop,'for(int j=0;j<64;j++){\n     float a=float(j)/64.,b=(float(j)+1.)/64.;a*=a;b*=b;');
const dense=previous.replace(oldLoop,'for(int j=0;j<128;j++){\n     float a=float(j)/128.,b=(float(j)+1.)/128.;a*=a;b*=b;');
const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:800,height:500}}),errors=[],views=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 await page.evaluate(candidate=>{const a=window.__cosmos;a.game.mode='panel';a.world.setQuality('ultra');window.cloudIlluminated=candidate||a.world.bodies.earth.clouds.material.fragmentShader;
  // Historical 64/128-segment references isolate direct cloud illumination.
  // Suppress only the new sky contribution for that comparison; the additional
  // illuminated variant below checks the complete shipping shader separately.
  window.cloudCandidate=cloudIlluminated.replace('radiance+=airSkyIrradiance(max(0.,(length(centre)-1.)*6371.),dot(normalize(centre),sun))*skyWeight;','');},candidate);
 await page.evaluate(async()=>{
  const w=window.__cosmos.world,t=await import('three'),cloud=w.bodies.earth.clouds,material=cloud.material.clone();material.uniforms=cloud.material.uniforms;material.blending=t.NoBlending;material.transparent=false;material.depthTest=false;material.depthWrite=false;
  const mesh=new t.Mesh(cloud.geometry,material);mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;const scene=new t.Scene();scene.add(mesh);const target=new t.WebGLRenderTarget(800,500,{type:t.HalfFloatType,depthBuffer:false});window.numeric={material,mesh,scene,target,lookup:Float32Array.from({length:65536},(_,i)=>t.DataUtils.fromHalfFloat(i)),frames:{}};
 });
 for(const [label,radius,phase,yaw=0,fov=58]of [['day',2.35,35],['terminator',2.35,90],['crescent',2.35,150],['night',2.35,175],['close',1.05,50],['grazing',1.08,90],['turn-left',1.08,90,-.001],['turn-right',1.08,90,.001],['resolved-cloud',1.05,50,0,20],['resolved-limb',1.05,35,1.2645,4],['pole',2.35,35],['seam',2.35,35]]){
  await page.evaluate(async({label,radius,phase,yaw,fov})=>{
   const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0);a.game.mode='panel';a.game.timePaused=true;w.setFov(fov);
   const c=w.bodyPositions.earth;if(label==='seam')c.copy(new t.Vector3(-149600000,0,0).applyQuaternion(w.bodies.earth.group.quaternion));const sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize(),p=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180)).multiplyScalar(6371*radius).add(c);
   if(label==='pole'){const polarSign=Math.sign(c.clone().negate().applyQuaternion(w.bodies.earth.inverseOrientation).y);p.copy(c).add(new t.Vector3(0,polarSign*6371*radius,0).applyQuaternion(w.bodies.earth.group.quaternion));}if(label==='seam')p.copy(c).add(new t.Vector3(6371*radius,0,0).applyQuaternion(w.bodies.earth.group.quaternion));
   a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0))).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),yaw));w.followReady=false;window.cloudPixels={};window.cloudLinear={};
  },{label,radius,phase,yaw,fov});
  const draws={};
  for(const mode of ['off','previous','candidate','reference','dense','illuminated']){
   const r=await page.evaluate(({mode,previous,reference,dense,save})=>{
    const a=window.__cosmos,w=a.world,cloud=w.bodies.earth.clouds;cloud.visible=mode!=='off';cloud.material.fragmentShader=mode==='previous'?previous:mode==='reference'?reference:mode==='dense'?dense:mode==='illuminated'?window.cloudIlluminated:window.cloudCandidate;cloud.material.needsUpdate=true;
    w.update(a.game.player,0,{view:'probe',exposure:1});const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const x=c.getContext('2d');x.drawImage(w.canvas,0,0);window.cloudPixels[mode]=x.getImageData(0,0,c.width,c.height).data;
    const drawCalls=w.renderer.info.render.calls,triangles=w.renderer.info.render.triangles;
    if(mode!=='off'){
     const n=window.numeric;n.material.fragmentShader=cloud.material.fragmentShader.replace('vec4(radiance/alpha,alpha)','vec4(radiance,alpha)');n.material.needsUpdate=true;n.mesh.matrix.copy(cloud.matrixWorld);w.renderer.setRenderTarget(n.target);w.renderer.setClearAlpha(0);w.renderer.clear();w.renderer.render(n.scene,w.camera);const raw=new Uint16Array(800*500*4);w.renderer.readRenderTargetPixels(n.target,0,0,800,500,raw);cloudLinear[mode]=Float32Array.from(raw,v=>n.lookup[v]);w.renderer.setRenderTarget(null);w.renderer.setClearAlpha(1);
    }
    return {png:save?c.toDataURL().split(',')[1]:null,drawCalls,triangles};
   },{mode,previous,reference,dense,save:name==='Chrome'&&mode!=='off'});
   draws[mode]={calls:r.drawCalls,triangles:r.triangles};if(r.png)await fs.writeFile(`tests/screenshots/cloud-light-${label}-${mode}.png`,Buffer.from(r.png,'base64'));
  }
  const skyEffect=await page.evaluate(()=>{
   const a=cloudLinear.candidate,b=cloudLinear.illuminated;let max=0,added=0,changed=0;
   for(let i=0;i<a.length;i++){
    if(!Number.isFinite(b[i]))throw Error('Invalid full cloud radiance');
    if(i%4===3){if(a[i]!==b[i])throw Error('Sky light changed cloud coverage');continue;}
    const d=b[i]-a[i];if(d<-.001)throw Error('Sky light removed radiance');max=Math.max(max,d);added+=d;changed+=d>0;
   }return{max,mean:added/(a.length*.75),changed};
  });
  const metrics=await page.evaluate(()=>{
   const p=window.cloudPixels,out={};for(const mode of ['previous','candidate','dense']){let sum=0,sq=0,max=0,n=0,full=0,fullMax=0;for(let i=0;i<p.reference.length;i+=4){const visible=Math.max(...[0,1,2].map(c=>Math.abs(p.reference[i+c]-p.off[i+c])))>2;for(let c=0;c<3;c++){const e=Math.abs(p[mode][i+c]-p.reference[i+c]);full+=e;fullMax=Math.max(fullMax,e);if(visible){sum+=e;sq+=e*e;max=Math.max(max,e);n++}}}out[mode]={channels:n,mae:n?sum/n:0,rmse:n?Math.sqrt(sq/n):0,max,fullMean:full/(p.reference.length*.75),fullMax};}return out;
  });
  const linear=await page.evaluate(label=>{
   const p=window.cloudLinear,out={};for(const mode of ['previous','candidate','dense']){let sum=0,sq=0,max=0,count=0;for(let i=0;i<p.reference.length;i+=4)if(p.reference[i+3]>.01){for(let c=0;c<3;c++){const e=Math.abs(p[mode][i+c]-p.reference[i+c]);if(!Number.isFinite(e))throw Error('Invalid radiance');sum+=e;sq+=e*e;max=Math.max(max,e);count++;}}out[mode]={mean:count?sum/count:0,rmse:count?Math.sqrt(sq/count):0,max,count};}
   if(['grazing','turn-left','turn-right'].includes(label))numeric.frames[label]=p;return out;
  },label);
  assert.deepEqual(errors,[]);
  if(!process.env.COSMOS_DIAGNOSTIC){
   assert.ok(linear.candidate.mean<=linear.previous.mean*1.02+1e-6,JSON.stringify({name,label,linear}));
   if(['terminator','grazing','turn-left','turn-right'].includes(label))assert.ok(linear.candidate.mean<linear.previous.mean*(label==='terminator'?.8:.7),JSON.stringify({name,label,linear}));
   assert.ok(linear.dense.mean<linear.previous.mean*.15+1e-6,JSON.stringify({name,label,linear}));
  }
  assert.deepEqual(draws.candidate,draws.previous);views.push({label,radius,phase,yaw,fov,metrics,linear,draws,skyEffect});console.log({name,label,previous:metrics.previous.mae,candidate:metrics.candidate.mae,dense:metrics.dense.mae});
 }
 // A uniform weather field isolates complete Sun-path coverage. Integrate
 // the actual production loop on the GPU and compare with independent density
 // samples; a truncated final segment can pass image averages but fails here.
 const sunColumns=await page.evaluate(async()=>{
  const w=window.__cosmos.world,t=await import('three'),source=window.cloudCandidate,prefix=source.slice(0,source.indexOf(' void main(){',source.indexOf('float cloudProfileIntegral')));
  const begin=source.indexOf('float sunEnd=sphereHit(q,sun,1.00143).y;'),end=source.indexOf('vec3 solar=',begin);if(begin<0||end<0)throw Error('Sun integration missing');
  const white=new t.DataTexture(new Uint8Array([255]),1,1,t.RedFormat);white.needsUpdate=true;
  const uniforms={cloudMap:{value:white},testAltitude:{value:1.5},testMu:{value:.7}};
  const material=new t.ShaderMaterial({uniforms,vertexShader:'varying vec3 vLocal;void main(){vLocal=position;gl_Position=vec4(position,1.);}',fragmentShader:prefix+`uniform float testAltitude,testMu;void main(){cloudSize=vec2(8192.,4096.);cloudLod=0.;float sunlightFootprint=1.;float height=testAltitude;vec3 q=vec3(0,0,1.+height/6371.),sun=vec3(sqrt(1.-testMu*testMu),0,testMu);`+source.slice(begin,end)+'gl_FragColor=vec4(sunDepth,0,0,1);}',depthTest:false,depthWrite:false});
  const geometry=new t.PlaneGeometry(2,2),scene=new t.Scene(),camera=new t.Camera(),target=new t.WebGLRenderTarget(1,1,{type:t.HalfFloatType,depthBuffer:false});scene.add(new t.Mesh(geometry,material));const raw=new Uint16Array(4),out=[];
  const smooth=(a,b,x)=>{x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x);};
  for(const altitude of [1.5,4,7])for(const mu of [.7,.1,.02]){
   uniforms.testAltitude.value=altitude;uniforms.testMu.value=mu;w.renderer.setRenderTarget(target);w.renderer.clear();w.renderer.render(scene,camera);w.renderer.readRenderTargetPixels(target,0,0,1,1,raw);const measured=t.DataUtils.fromHalfFloat(raw[0]);
   const r=6371+altitude,top=6371*1.00143,length=-r*mu+Math.sqrt(r*r*mu*mu+top*top-r*r),step=length/8192;let expected=0;
   for(let i=0;i<8192;i++){const distance=(i+.5)*step,h=Math.sqrt(r*r+distance*distance+2*r*mu*distance)-6371,l=(h-1.4)/7.6;expected+=smooth(0,.14,l)*(1-smooth(.60,1,l))*(-Math.log(.025))/(.73*7.6)*step;}
   out.push({altitude,mu,expected,measured,relativeError:Math.abs(measured/expected-1)});
  }
  w.renderer.setRenderTarget(null);material.dispose();geometry.dispose();target.dispose();white.dispose();return out;
 });
 assert.ok(sunColumns.every(v=>v.relativeError<.02),JSON.stringify(sunColumns));

 // Independently integrate the plane-parallel single-scattering equation in
 // optical depth and elevation. This verifies the approximation's numerical
 // implementation, not its accuracy against a curved, multiply scattering sky.
 const skyIrradiance=await page.evaluate(async()=>{
  const w=window.__cosmos.world,t=await import('three'),source=window.cloudIlluminated;
  const prefix=source.slice(0,source.indexOf(' void main(){',source.indexOf('float cloudProfileIntegral')));
  const uniforms={cloudSky:w.bodies.earth.uniforms.cloudSky,opticalDepth:w.bodies.earth.uniforms.opticalDepth,altitude:{value:0},sunMu:{value:1}};
  const material=new t.ShaderMaterial({uniforms,vertexShader:'varying vec3 vLocal;void main(){vLocal=position;gl_Position=vec4(position,1.);}',fragmentShader:prefix+'uniform float altitude,sunMu;void main(){gl_FragColor=vec4(airSkyIrradiance(altitude,sunMu),1.);}',depthTest:false,depthWrite:false});
  const geometry=new t.PlaneGeometry(2,2),scene=new t.Scene(),camera=new t.Camera(),target=new t.WebGLRenderTarget(1,1,{type:t.HalfFloatType,depthBuffer:false}),raw=new Uint16Array(4),out=[];scene.add(new t.Mesh(geometry,material));
  for(const altitude of [0,1.4,4,9,20])for(const sunMu of [-.1,0,.001,.02,.1,.380690406958,.5,.966234757102,1]){
   uniforms.altitude.value=altitude;uniforms.sunMu.value=sunMu;w.renderer.setRenderTarget(target);w.renderer.clear();w.renderer.render(scene,camera);w.renderer.readRenderTargetPixels(target,0,0,1,1,raw);
   const measured=[...raw.slice(0,3)].map(t.DataUtils.fromHalfFloat),expected=[0,0,0];
   if(sunMu>0)for(let c=0;c<3;c++){
    const rayleigh=[.0058,.0135,.0331][c]*8*Math.exp(-altitude/8),tau=rayleigh+.0033*1.2*Math.exp(-altitude/1.2);
    // Midpoint elevation quadrature and analytic optical-depth integral.
    for(let i=0;i<8192;i++){
     const mu=(i+.5)/8192,d=sunMu-mu;
     const path=Math.abs(d)<1e-8?tau/mu*Math.exp(-tau/mu):sunMu/d*(Math.exp(-tau/sunMu)-Math.exp(-tau/mu));
     const phase=.375*(1+mu*mu*sunMu*sunMu+.5*(1-mu*mu)*(1-sunMu*sunMu));
     expected[c]+=path*phase*mu/8192*rayleigh/tau;
    }
   }
   out.push({altitude,sunMu,expected,measured,maxError:Math.max(...measured.map((v,c)=>Math.abs(v-expected[c])))});
  }
  w.renderer.setRenderTarget(null);material.dispose();geometry.dispose();target.dispose();return out;
 });
 assert.ok(skyIrradiance.every(v=>v.maxError<.00025&&v.measured.every(c=>Number.isFinite(c)&&c>=0&&c<.2)),JSON.stringify(skyIrradiance));
 assert.ok(skyIrradiance.filter(v=>v.sunMu<=0).every(v=>v.measured.every(c=>c===0)));
 const temporal=await page.evaluate(()=>{
  const f=numeric.frames,out=[];for(const label of ['turn-left','turn-right']){const a=f.grazing,b=f[label],metrics={};for(const mode of ['previous','candidate']){let sum=0,count=0;for(let i=0;i<a.reference.length;i++)if(i%4!==3){sum+=Math.abs((b[mode][i]-a[mode][i])-(b.reference[i]-a.reference[i]));count++;}metrics[mode]=sum/count;}out.push({label,metrics});}return out;
 });
 if(!process.env.COSMOS_DIAGNOSTIC)assert.ok(temporal.every(v=>v.metrics.candidate<v.metrics.previous*.75),JSON.stringify(temporal));
 assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),views,temporal,sunColumns,skyIrradiance,errors,passed:true});
 }finally{await browser.close()}
 await fs.writeFile('tests/cloud-light-results.json',JSON.stringify({version,candidateOverride:!!candidate,reference:'64 quadratic analytic-profile sunlight segments; 128 segments check convergence. Same imagery and view integration, with sky light isolated for the historical Sun-path comparison. Complete illuminated frames and independently integrated sky irradiance are checked separately. Numerical accuracy within the reconstruction, not photographic equivalence.',viewport:[800,500],outcomes},null,2));
}
