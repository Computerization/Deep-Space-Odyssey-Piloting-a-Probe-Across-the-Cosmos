import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 const metrics=await page.evaluate(async()=>{
  const a=window.__cosmos,w=a.world,t=await import('three');a.game.mode='panel';
  const shader=w.bodies.earth.clouds.material.fragmentShader;
  const start=shader.indexOf('bool cloudSunMap('),helper=shader.slice(start,shader.indexOf('\n }',start)+3);
  if(!helper.startsWith('bool cloudSunMap'))throw Error('Missing runtime mapping helper');
  const width=128,height=128,count=width*height,positions=new Float32Array(count*4),spans=new Float32Array(count*4),groups=[];
  let seed=0x8e192a;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<count/4;i++){
   const group=i%4,r=1+(1.4+random()*7.6)/6371;
   let lat=Math.asin(2*random()-1),lon=random()*Math.PI*2;
   if(group===1)lat=(random()<.5?-1:1)*(Math.PI/2-random()*.075);
   if(group===2)lon=(random()<.5?-1:1)*(Math.PI-random()*.0001);
   const normal=new t.Vector3(-Math.cos(lat)*Math.cos(lon),Math.sin(lat),Math.cos(lat)*Math.sin(lon));
   const side=new t.Vector3().crossVectors(normal,Math.abs(normal.y)>.9?new t.Vector3(1,0,0):new t.Vector3(0,1,0)).normalize(),other=new t.Vector3().crossVectors(normal,side);
   const angle=random()*Math.PI*2,mu=group===3?random()*.11-.055:random();
   const sun=normal.clone().multiplyScalar(mu).addScaledVector(side,Math.sqrt(1-mu*mu)*Math.cos(angle)).addScaledVector(other,Math.sqrt(1-mu*mu)*Math.sin(angle));
   const q=normal.multiplyScalar(r),b=q.dot(sun),end=-b+Math.sqrt(b*b-r*r+1.00143**2),span=sun.multiplyScalar(end);
   for(let j=0;j<4;j++){const k=(i*4+j)*4;positions.set([q.x,q.y,q.z,end],k);spans.set([span.x,span.y,span.z,(j*j+(j+1)*(j+1))/32],k);groups[i*4+j]=['general','pole','seam','horizon'][group];}
  }
  const texture=data=>{const x=new t.DataTexture(data,width,height,t.RGBAFormat,t.FloatType);x.needsUpdate=true;return x;};
  const p=texture(positions),s=texture(spans),target=new t.WebGLRenderTarget(width,height,{type:t.FloatType,depthBuffer:false});
  const material=new t.ShaderMaterial({uniforms:{points:{value:p},spans:{value:s},rotation:{value:.137}},vertexShader:'varying vec2 uvMap;void main(){uvMap=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D points;uniform sampler2D spans;uniform float rotation;varying vec2 uvMap;${helper}
   void main(){vec4 p=texture2D(points,uvMap),s=texture2D(spans,uvMap);vec2 mid,slope,curve;bool local=cloudSunMap(p.xyz,s.xyz,p.w,mid,slope,curve);vec3 m=p.xyz+s.xyz*s.w;vec2 exact=vec2(atan(m.z,-m.x)/6.283185307+rotation,asin(clamp(m.y/length(m),-1.,1.))/3.141592654+.5);float f=s.w-.5;vec2 mapped=local?mid+f*(slope+f*.5*curve):exact;vec2 delta=mapped-exact;delta.x-=floor(delta.x+.5);gl_FragColor=vec4(delta*vec2(8192.,4096.),local?1.:0.,1.);}`});
  const scene=new t.Scene();scene.add(new t.Mesh(new t.PlaneGeometry(2,2),material));w.renderer.setRenderTarget(target);w.renderer.render(scene,new t.Camera());const result=new Float32Array(count*4);w.renderer.readRenderTargetPixels(target,0,0,width,height,result);w.renderer.setRenderTarget(null);
  const out={samples:count,local:0,exactFallback:0,maxTexelError:0,rmsTexelError:0,groups:{}};let sq=0;
  for(let i=0;i<count;i++){
   const x=result[i*4],y=result[i*4+1],local=result[i*4+2]>.5,group=groups[i];if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Non-finite map');
   const e=Math.hypot(x,y);out.maxTexelError=Math.max(out.maxTexelError,e);sq+=e*e;out[local?'local':'exactFallback']++;
   const g=out.groups[group]??={samples:0,local:0,maxTexelError:0};g.samples++;g.local+=local;g.maxTexelError=Math.max(g.maxTexelError,e);
  }out.rmsTexelError=Math.sqrt(sq/count);target.dispose();p.dispose();s.dispose();material.dispose();scene.children[0].geometry.dispose();return out;
 });
 assert.ok(metrics.local>1000&&metrics.exactFallback>1000,JSON.stringify(metrics));assert.ok(metrics.maxTexelError<.03,JSON.stringify(metrics));assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),metrics,errors,passed:true});console.log(outcomes.at(-1));
 }finally{await browser.close()}
 await fs.writeFile('tests/cloud-map-results.json',JSON.stringify({version,method:'Compile the actual runtime Sun-map helper; compare its four sample coordinates with exact spherical mapping on GPU for 4096 seeded geometric paths, including poles, seams and long horizon paths. Error uses full-resolution 8192x4096 source texels.',outcomes},null,2));
}
