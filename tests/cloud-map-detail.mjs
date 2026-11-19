// Review an source-derived cloud map before installing it in the game.
// Compare actual GPU samples against exact source crops, not sharpened renders.
import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const candidate=process.env.COSMOS_CLOUD_DETAIL_MAP,control=process.env.COSMOS_CLOUD_DETAIL_CONTROL,caseFile=process.env.COSMOS_CLOUD_DETAIL_CASES;
assert.ok(candidate&&control&&caseFile,'Supply a candidate map, same-source 8K coverage PNG, and exact source crops.');
const compressed=candidate.endsWith('.ktx2'),channels=1;
const cases=JSON.parse(await fs.readFile(caseFile)),outcomes=[];
const hash=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
const hashes={candidate:await hash(candidate),control:await hash(control),cases:await hash(caseFile)};
for(const c of cases)assert.equal(await hash(c.reference),c.sha256,c.name);
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:512,height:384}}),errors=[],regions=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await page.route('**/cloud-detail-review',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><script type="importmap">{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}</script>'}));
  await page.route('**/cloud-detail-map',r=>r.fulfill({path:candidate,contentType:compressed?'image/ktx2':'image/avif'}));
  await page.route('**/cloud-detail-control.png',r=>r.fulfill({path:control,contentType:'image/png'}));
  for(const c of cases)await page.route('**/cloud-detail-'+c.name+'.png',r=>r.fulfill({path:c.reference,contentType:'image/png'}));
  await page.goto(BASE_URL+'/cloud-detail-review');
  const maps=await page.evaluate(async compressed=>{
   const t=await import('three'),{KTX2Loader}=await import('three/addons/loaders/KTX2Loader.js');
   const uploads=new WeakMap(),gl=WebGL2RenderingContext.prototype,storage=gl.texStorage2D;gl.texStorage2D=function(...a){if(a[0]===this.TEXTURE_2D)uploads.set(this.getParameter(this.TEXTURE_BINDING_2D),[a[3],a[4]]);return storage.apply(this,a);};
   const renderer=new t.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(512,384);renderer.toneMapping=t.NoToneMapping;document.body.append(renderer.domElement);
   const loader=new KTX2Loader().setTranscoderPath('/vendor/three/addons/libs/basis/').setWorkerLimit(1).detectSupport(renderer);
   const candidate=await (compressed?loader:new t.TextureLoader()).loadAsync('/cloud-detail-map');loader.dispose();
   if(!compressed)candidate.format=t.RedFormat;
   const control=await new t.TextureLoader().loadAsync('/cloud-detail-control.png');control.format=t.RedFormat;
   const maps={control,candidate};for(const map of Object.values(maps)){map.wrapS=t.RepeatWrapping;map.colorSpace=t.NoColorSpace;map.anisotropy=1;renderer.initTexture(map);}
   const uniforms={map:{value:null},rect:{value:new t.Vector4()},size:{value:new t.Vector2()}};
   const material=new t.ShaderMaterial({uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'varying vec2 vUv;uniform sampler2D map;uniform vec4 rect;uniform vec2 size;void main(){vec2 uv=(rect.xy+vec2(vUv.x,1.-vUv.y)*rect.zw)/size;uv.y=1.-uv.y;gl_FragColor=vec4(texture2D(map,uv).rg,0.,1.);}',depthTest:false,depthWrite:false});
   const scene=new t.Scene();scene.add(new t.Mesh(new t.PlaneGeometry(2,2),material));
   window.review={renderer,maps,uniforms,scene,camera:new t.Camera()};
   return Object.fromEntries(Object.entries(maps).map(([name,map])=>[name,{sourceDimensions:[map.image.width,map.image.height],uploadedDimensions:uploads.get(renderer.properties.get(map).__webglTexture),format:map.format,compressed:!!map.isCompressedTexture,mips:map.mipmaps.length}]));
  },compressed);
  for(const c of cases){
   const result=await page.evaluate(async({c,channels})=>{
    const d=window.review,canvas=document.createElement('canvas');canvas.width=512;canvas.height=384;const ctx=canvas.getContext('2d',{willReadFrequently:true}),im=new Image();im.src='/cloud-detail-'+c.name+'.png';await im.decode();ctx.drawImage(im,0,0);const ref=ctx.getImageData(0,0,512,384).data;
    d.uniforms.rect.value.fromArray(c.rect);d.uniforms.size.value.fromArray(c.size);const results={};
    for(const [mode,map] of Object.entries(d.maps)){
     d.uniforms.map.value=map;d.renderer.clear();d.renderer.render(d.scene,d.camera);ctx.clearRect(0,0,512,384);ctx.drawImage(d.renderer.domElement,0,0);const pixels=ctx.getImageData(0,0,512,384).data,squared=[0,0],gradient=[0,0],max=[0,0];
     for(let i=0;i<pixels.length;i+=4)for(let k=0;k<channels;k++){const error=pixels[i+k]-ref[i+k];squared[k]+=error*error;max[k]=Math.max(max[k],Math.abs(error));if(i%2048>=4){const e=(pixels[i+k]-pixels[i+k-4])-(ref[i+k]-ref[i+k-4]);gradient[k]+=e*e;}}
     results[mode]={rmse:squared.slice(0,channels).map(s=>Math.sqrt(s/(512*384))),gradientRMSE:gradient.slice(0,channels).map(s=>Math.sqrt(s/(511*384))),max:max.slice(0,channels)};
    }
    if(d.renderer.getContext().getError()!==0)throw Error('Cloud texture graphics error');
    return results;
   },{c,channels});
   regions.push({name:c.name,...result});console.log({engine:name,region:c.name,...result});
  }
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),maps,regions,errors});
 }finally{await browser.close();}
}
await fs.writeFile(process.env.COSMOS_CLOUD_DETAIL_REPORT||'tests/cloud-map-detail-results.json',JSON.stringify({files:{candidate,control,caseFile},hashes,channels,method:'Coverage R, sampled by the actual GPU at native source pixels. Same-source 8K control. Metrics are observations, not a release-acceptance gate or proof of photographic realism.',outcomes},null,2)+'\n');
