// Compare delivered coverage with a same-source 8K control and exact 16K R8.
// Fresh contexts keep only one full-resolution cloud field resident at a time.
import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const source=process.env.COSMOS_CLOUD_MAP_SOURCE;
assert.ok(source,'Supply the output directory of docs/build-cloud-detail.py.');
const files={control:source+'/hybrid-8192.png',reference:source+'/reference-r8.bin',candidate:'assets/textures/earth-clouds.avif'};
const digest=b=>createHash('sha256').update(b).digest('hex');
const hashes={};
for(const file of [...Object.values(files),'assets/textures/earth-cloud-height.png','src/world.js','src/rendering/scene-factory.js','src/rendering/earth-shaders.js'])hashes[file]=digest(await fs.readFile(file));
const limit=Number(process.env.COSMOS_DETAIL_TEXTURE_LIMIT||0);
const shots='tests/screenshots/cloud-source';await fs.mkdir(shots,{recursive:true});
const cases=[['day',2.35,35],['terminator',2.35,90],['crescent',2.35,150],['close',1.08,35],['grazing',1.08,90],['resolved-limb',1.05,35,1.2645,4],['pole',1.05,35,0,18],['seam',1.05,35,0,18],['transition',1.08,35,0,35]].filter(s=>!process.env.COSMOS_CLOUD_MAP_CASES||process.env.COSMOS_CLOUD_MAP_CASES.split(',').includes(s[0]));
// Stream large sources over HTTP: passing 134 MB through automation interception
// needlessly duplicates it. The whitelist and CORS are limited to this QA server.
const server=createServer((req,res)=>{
 const file=files[req.url.slice(1)];if(!file){res.writeHead(404).end();return;}
 res.writeHead(200,{'Access-Control-Allow-Origin':'*','Content-Type':file.endsWith('.bin')?'application/octet-stream':'image/png'});createReadStream(file).pipe(res);
});
server.listen(0,'127.0.0.1');await once(server,'listening');const origin='http://127.0.0.1:'+server.address().port;
const reportPath=process.env.COSMOS_CLOUD_MAP_REPORT||'tests/cloud-source-results.json';
const prior=process.env.COSMOS_CLOUD_MAP_RESUME?JSON.parse(await fs.readFile(reportPath)):null;
if(prior){assert.deepEqual(prior.hashes,hashes);assert.equal(prior.textureLimit,limit);}
const outcomes=prior?.outcomes||[],runnerSha256=digest(await fs.readFile(new URL(import.meta.url)));
try{
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(outcomes.some(o=>o.name===name)||process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const probe=await engine.launch(options),probePage=await probe.newPage();
 const capacity=await probePage.evaluate(()=>{const gl=document.createElement('canvas').getContext('webgl2',{powerPreference:'high-performance'});return gl.getParameter(gl.MAX_TEXTURE_SIZE);});await probe.close();
 const constrained=!!limit||capacity<16384,modes=constrained?['candidate']:['control','candidate','reference'];
 const views={},errors=[];let engineVersion;
 for(const mode of modes){
  const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:800,height:500},deviceScaleFactor:2});engineVersion=browser.version();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  try{
   await page.addInitScript(limit=>{
    window.cloudUploads=new WeakMap();const gl=WebGL2RenderingContext.prototype,get=gl.getParameter,storage=gl.texStorage2D;
    gl.getParameter=function(p){const n=get.call(this,p);return limit&&p===this.MAX_TEXTURE_SIZE?Math.min(n,limit):n;};
    gl.texStorage2D=function(...a){if(a[0]===this.TEXTURE_2D)cloudUploads.set(this.getParameter(this.TEXTURE_BINDING_2D),[a[3],a[4]]);return storage.apply(this,a);};
   },limit);
   if(mode!=='candidate'){
    const code=await fs.readFile('src/world.js','utf8'),needle="let tex=await (sourceFile.endsWith('.ktx2')?compressed:loader).loadAsync(`assets/textures/${sourceFile}`);";
    assert.ok(code.includes(needle));
    const replacement=mode==='control'?"let tex=await (sourceFile.endsWith('.ktx2')?compressed:loader).loadAsync(file==='earth-clouds.avif'?'"+origin+"/control':`assets/textures/${sourceFile}`);":`let tex;if(file==='earth-clouds.avif'){tex=new THREE.DataTexture(new Uint8Array(await (await fetch('${origin}/reference')).arrayBuffer()),16384,8192,THREE.RedFormat);tex.generateMipmaps=true;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.needsUpdate=true;}else tex=await (sourceFile.endsWith('.ktx2')?compressed:loader).loadAsync(\`assets/textures/\${sourceFile}\`);`;
    await page.route('**/src/world.js',r=>r.fulfill({contentType:'text/javascript',body:code.replace(needle,replacement)}));
   }
   await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:120000});await page.click('#begin');
   await page.evaluate(()=>{window.__cosmos.game.mode='loading';document.querySelectorAll('body>*:not(canvas)').forEach(e=>e.style.display='none');});
   for(const quality of ['ultra','high'])for(const scene of cases){
    const result=await page.evaluate(async({scene,quality})=>{
     const [label,radius,phase,yaw=0,fov=58]=scene,a=window.__cosmos,w=a.world,g=a.game,t=await import('three');a.startChapter(0);g.mode='loading';g.timePaused=true;g.look.identity();w.setQuality(quality);w.cloudScale=.75;w.setFov(fov);
     const b=w.bodies.earth,c=w.bodyPositions.earth,sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize();
     const p=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180)).multiplyScalar(b.data.radius*radius).add(c);
     if(label==='pole')p.copy(new t.Vector3(Math.sin(Math.PI/90),Math.cos(Math.PI/90),0).applyQuaternion(b.group.quaternion).multiplyScalar(b.data.radius*radius).add(c));
     if(label==='seam'||label==='transition'){const u=-.12*Math.PI*2,lat=label==='transition'?55*Math.PI/180:.2;p.copy(new t.Vector3(-Math.cos(u)*Math.cos(lat),Math.sin(lat),Math.sin(u)*Math.cos(lat)).applyQuaternion(b.group.quaternion).multiplyScalar(b.data.radius*radius).add(c));}
     g.player.position.copy(p);g.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0))).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),yaw));w.followReady=false;
     const state=()=>JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.localSeconds,g.fuel]),before=state();
     for(let i=0;i<8;i++)w.update(g.player,0,{view:'probe',look:g.look});
     const capture=()=>{const gl=w.renderer.getContext();gl.finish();const raw=new Uint8Array(w.canvas.width*w.canvas.height*4),pixels=new Uint8ClampedArray(raw.length);gl.readPixels(0,0,w.canvas.width,w.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,raw);for(let y=0;y<w.canvas.height;y++)pixels.set(raw.subarray(y*w.canvas.width*4,(y+1)*w.canvas.width*4),(w.canvas.height-1-y)*w.canvas.width*4);const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;c.getContext('2d').putImageData(new ImageData(pixels,c.width,c.height),0,0);return c.toDataURL();};
     const png=capture();w.update(g.player,0,{view:'probe',look:g.look});const repeat=capture();
     const maps=['cloudMap','cloudHeightMap'].map(key=>{const m=b.uniforms[key].value;return{size:cloudUploads.get(w.renderer.properties.get(m).__webglTexture),format:m.format};});
     return{label,quality,physicalStatePreserved:before===state(),physical:before,png,repeat,maps,heightLodBias:b.uniforms.cloudHeightLodBias.value,resources:{calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,textures:w.renderer.info.memory.textures,geometries:w.renderer.info.memory.geometries,programs:w.renderer.info.programs.length},graphicsError:w.renderer.getContext().getError()};
    },{scene,quality});
    assert.ok(result.physicalStatePreserved);assert.equal(result.graphicsError,0);assert.deepEqual(result.maps[1],{size:[2048,1024],format:1028});
    const width=Math.min(mode==='control'?8192:16384,limit||capacity);assert.deepEqual(result.maps[0],{size:[width,width/2],format:1028});assert.equal(result.heightLodBias,Math.log2(2048/width));
    const key=quality+'-'+result.label;views[key]??={};views[key][mode]=result;
    await fs.writeFile(`${shots}/${name}-${key}-${mode}.png`,Buffer.from(result.png.split(',')[1],'base64'));
   }
   // Compare small displayed frames in the browser after disposing all previous
   // source contexts. Reference images contain the same weather and lighting.
   if(mode==='reference'||constrained)for(const [key,v]of Object.entries(views)){
    const metrics=await page.evaluate(async v=>{
     const images={};for(const [name,item]of Object.entries(v))for(const field of ['png','repeat']){const image=new Image();image.src=item[field];await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,0,0);images[name+field]=x.getImageData(0,0,c.width,c.height).data;}
     const error=(a,b)=>{let sq=0,gradient=0,max=0;for(let i=0;i<a.length;i++){if(i%4===3)continue;const e=a[i]-b[i];sq+=e*e;max=Math.max(max,Math.abs(e));if(i%6400>=4){const d=a[i]-a[i-4]-b[i]+b[i-4];gradient+=d*d;}}return{rmse:Math.sqrt(sq/(a.length*.75)),gradientRMSE:Math.sqrt(gradient/(1599*1000*3)),max};};
     return{errors:images.referencepng?Object.fromEntries(['control','candidate'].map(m=>[m,error(images[m+'png'],images.referencepng)])):null,repeats:Object.fromEntries(Object.keys(v).map(m=>[m,error(images[m+'png'],images[m+'repeat'])]))};
    },v);
    for(const item of Object.values(v)){delete item.png;delete item.repeat;}
    v.metrics=metrics;
    if(!constrained){
     assert.equal(v.control.physical,v.candidate.physical);assert.equal(v.reference.physical,v.candidate.physical);assert.deepEqual(v.control.resources,v.candidate.resources);assert.deepEqual(v.reference.resources,v.candidate.resources);
     const e=metrics.errors,r=metrics.repeats,margin=r.control.rmse+r.candidate.rmse+2*r.reference.rmse;
     // Lossless 8K can slightly outperform compressed 16K at broad/polar views.
     // Bound that trade at 0.1 display code value; require both detail metrics
     // to improve in the resolved near-field cases, outside repeat variation.
     assert.ok(e.candidate.rmse<=e.control.rmse+.1+margin,JSON.stringify({name,key,metrics}));
     if(['close','grazing','resolved-limb'].includes(v.candidate.label))for(const k of ['rmse','gradientRMSE'])assert.ok(e.candidate[k]<e.control[k]-(r.control[k]+r.candidate[k]+2*r.reference[k]),JSON.stringify({name,key,metrics}));
    }
   }
   console.log({name,mode,views:cases.length*2,textureLimit:limit});
  }finally{await browser.close();}
 }
 assert.deepEqual(errors,[]);outcomes.push({name,engineVersion,runnerSha256,maxTextureSize:capacity,constrained,views,errors});
 await fs.writeFile(process.env.COSMOS_CLOUD_MAP_REPORT||'tests/cloud-source-results.json',JSON.stringify({version:JSON.parse(await fs.readFile('package.json')).version,files,hashes,textureLimit:limit,inProgress:true,outcomes},null,2)+'\n');
}
}finally{await new Promise(resolve=>server.close(resolve));}
await fs.writeFile(process.env.COSMOS_CLOUD_MAP_REPORT||'tests/cloud-source-results.json',JSON.stringify({version:JSON.parse(await fs.readFile('package.json')).version,files,hashes,textureLimit:limit,reference:'Exact bottom-first R8 source; lossless same-source 8K control. Shared 2K inferred-height field and production shaders. Native source retention, not measured 3D weather or photographic equivalence. Polar gradient and broad-view tradeoffs are retained in the metrics.',outcomes},null,2)+'\n');
