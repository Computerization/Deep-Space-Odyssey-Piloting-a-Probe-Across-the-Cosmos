// Lunar silhouette against the measured height field and denser mesh controls.
import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const previous=process.env.COSMOS_VISUAL_PREVIOUS,source=process.env.COSMOS_LUNAR_HEIGHT_REFERENCE;
assert.ok(previous&&source,'Supply the previous archive and native Float32 height reference.');
const files=['src/world.js','src/rendering/scene-factory.js','assets/textures/moon-height.webp'],hash=b=>createHash('sha256').update(b).digest('hex');
const hashes=Object.fromEntries(await Promise.all([...files,source,path.join(previous,'assets/textures/moon-relief.bin')].map(async p=>[p,hash(await fs.readFile(p))]))),outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1000,height:625}}),errors=[],views=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  await page.route('**/geometry/old.bin',r=>r.fulfill({path:path.join(previous,'assets/textures/moon-relief.bin')}));
  await page.route('**/geometry/native.bin',r=>r.fulfill({path:source}));
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
  const fields=await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0,0,'moon');a.game.mode='loading';a.game.timePaused=true;a.game.look.identity();w.setQuality('ultra');document.querySelectorAll('body>*:not(canvas)').forEach(e=>e.style.display='none');
   const old=new Uint16Array(await(await fetch('/geometry/old.bin')).arrayBuffer()),native=new Float32Array(await(await fetch('/geometry/native.bin')).arrayBuffer()),b=w.bodies.moon;
   if(old.length!==257*145||native.length!==5760*2880)throw Error('Terrain source dimensions');
   // Native reference is bottom-first, unlike the runtime image. Interpolate
   // Float32 elevations independently; keep sub-R8 source precision.
   const width=5760,height=2880,poles=[0,0];for(let x=0;x<width;x++){poles[0]+=native[x]/width;poles[1]+=native[(height-1)*width+x]/width;}
   function elevation(u,v){
    if(v===0)return poles[0]*21-10;if(v===1)return poles[1]*21-10;
    const x=u*width-.5,y=Math.max(0,Math.min(height-1,v*height-.5)),i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j;
    const read=(dx,dy)=>native[Math.min(height-1,j+dy)*width+((i+dx)%width+width)%width];
    return ((1-fx)*(1-fy)*read(0,0)+fx*(1-fy)*read(1,0)+(1-fx)*fy*read(0,1)+fx*fy*read(1,1))*21-10;
   }
   const geometries={candidate:b.mesh.geometry,previous:new t.SphereGeometry(1,256,144),convergence:new t.SphereGeometry(1,1024,576),reference:new t.SphereGeometry(1,2048,1152)},fields={};
   for(const [mode,g] of Object.entries(geometries)){
    const p=g.attributes.position,uv=g.attributes.uv,errors=[];
    for(let i=0;i<p.count;i++){
     const h=elevation(uv.getX(i),uv.getY(i));
     if(mode!=='candidate'){const scale=1+(mode==='previous'?(old[i]-20000)/2000:h)/b.data.radius;p.setXYZ(i,p.getX(i)*scale,p.getY(i)*scale,p.getZ(i)*scale);}
     if(mode==='previous'||mode==='candidate')errors.push(Math.abs((Math.hypot(p.getX(i),p.getY(i),p.getZ(i))-1)*b.data.radius-h)*1000);
    }
    if(mode!=='candidate')g.computeBoundingSphere();
    if(errors.length){errors.sort((a,b)=>a-b);fields[mode]={meanMetres:errors.reduce((a,b)=>a+b)/errors.length,p95Metres:errors[Math.floor(errors.length*.95)],maxMetres:errors.at(-1),vertices:p.count,triangles:g.index.count/3};}
   }
   const g=geometries.candidate,p=g.attributes.position,columns=g.parameters.widthSegments+1,rows=g.parameters.heightSegments+1;let seam=0,pole=0;
   for(let y=0;y<rows;y++)seam=Math.max(seam,Math.hypot(p.getX(y*columns)-p.getX((y+1)*columns-1),p.getY(y*columns)-p.getY((y+1)*columns-1),p.getZ(y*columns)-p.getZ((y+1)*columns-1)));
   for(const y of [0,rows-1])for(let x=1;x<columns;x++)pole=Math.max(pole,Math.abs(p.getY(y*columns+x)-p.getY(y*columns)));
   window.lunarGeometry={geometries,frames:{},original:b.mesh.material.fragmentShader,mask:'#include <logdepthbuf_pars_fragment>\nvoid main(){\n#include <logdepthbuf_fragment>\ngl_FragColor=vec4(1.);}',state:()=>JSON.stringify([a.game.player.position.toArray(),a.game.player.velocity.toArray(),a.game.player.quaternion.toArray(),a.game.localSeconds,a.game.fuel])};
   return {...fields,seam,pole,bounds:{centre:g.boundingSphere.center.toArray(),radius:g.boundingSphere.radius,maxRadius:Array.from({length:p.count},(_,i)=>Math.hypot(p.getX(i),p.getY(i),p.getZ(i))).reduce((a,b)=>Math.max(a,b),0)}};
  });
  assert.ok(fields.candidate.meanMetres<18&&fields.candidate.maxMetres<42,'Silhouette vertices agree with unquantized LOLA within R8 precision');assert.ok(fields.candidate.meanMetres<fields.previous.meanMetres*.35,'Replace the old coarse terrain source');assert.ok(fields.seam<1e-12&&fields.pole===0,'Closed longitude seam and shared pole height');assert.deepEqual(fields.bounds.centre,[0,0,0]);assert.ok(Math.abs(fields.bounds.radius-fields.bounds.maxRadius)<1e-12,'Origin-centred terrain envelope');
  for(const [label,phase,roll] of [['north',.5,0],['south',.5,Math.PI],['east',.5,Math.PI/2],['west',.5,-Math.PI/2],['north-oblique',1.1,0],['south-oblique',1.1,Math.PI]]){
   await page.evaluate(async({phase,roll})=>{
    const a=window.__cosmos,w=a.world,t=await import('three'),b=w.bodies.moon,c=w.bodyPositions.moon,sun=c.clone().negate().normalize(),up=new t.Vector3(0,1,0),side=new t.Vector3().crossVectors(sun,up).normalize();
    a.game.player.position.copy(c).addScaledVector(sun,b.data.radius*3*Math.cos(phase)).addScaledVector(side,b.data.radius*3*Math.sin(phase));
    const n=a.game.player.position.clone().sub(c).normalize(),rise=up.clone().addScaledVector(n,-up.dot(n)).normalize().applyAxisAngle(n,roll),target=c.clone().addScaledVector(n,b.data.radius/3).addScaledVector(rise,b.data.radius*Math.sqrt(8/9));
    a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(a.game.player.position,target,rise));w.setFov(4);w.followReady=false;lunarGeometry.frames={};
   },{phase,roll});
   for(const mode of ['previous','candidate','convergence','reference']){
    const r=await page.evaluate(mode=>{
     const a=window.__cosmos,w=a.world,b=w.bodies.moon,g=lunarGeometry,before=g.state();b.mesh.geometry=g.geometries[mode];
     const canvas=document.createElement('canvas');canvas.width=w.canvas.width;canvas.height=w.canvas.height;const ctx=canvas.getContext('2d');
     b.mesh.material.fragmentShader=g.original;b.mesh.material.needsUpdate=true;w.update(a.game.player,0,{view:'probe',exposure:1,look:a.game.look});ctx.drawImage(w.canvas,0,0);const png=canvas.toDataURL();
     b.mesh.material.fragmentShader=g.mask;b.mesh.material.needsUpdate=true;w.update(a.game.player,0,{view:'probe',exposure:1,look:a.game.look});ctx.drawImage(w.canvas,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
     const profile=[];for(let x=0;x<canvas.width;x++){let y=0;while(y<canvas.height&&pixels[(y*canvas.width+x)*4]<100)y++;profile.push(y);}g.frames[mode]=profile;
     return{png,preserved:g.state()===before};
    },mode);assert.ok(r.preserved);
    if(name==='Chrome'&&['north','east','north-oblique'].includes(label)&&mode!=='convergence')await fs.writeFile(`tests/screenshots/lunar-geometry-${label}-${mode}.png`,Buffer.from(r.png.split(',')[1],'base64'));
   }
   const metrics=await page.evaluate(()=>{const f=lunarGeometry.frames,out={};for(const mode of ['previous','candidate','convergence']){const errors=f[mode].map((v,i)=>Math.abs(v-f.reference[i])).sort((a,b)=>a-b);out[mode]={meanPixels:errors.reduce((a,b)=>a+b)/errors.length,p95Pixels:errors[Math.floor(errors.length*.95)],maxPixels:errors.at(-1)};}return out;});views.push({label,metrics});console.log({name,label,metrics});
  }
  const sum=mode=>views.reduce((n,v)=>n+v.metrics[mode].meanPixels,0);
  assert.ok(sum('candidate')<sum('previous')*.75,'Resolve the silhouette closer to the measured terrain');assert.ok(sum('convergence')<sum('candidate')*.7,'Denser control must approach the reference');assert.deepEqual(errors,[]);
  outcomes.push({name,engineVersion:browser.version(),fields,views,errors,passed:true});console.log({name,fields,passed:true});
 }finally{await browser.close();}
}
await fs.writeFile(process.env.COSMOS_LUNAR_GEOMETRY_REPORT||'tests/lunar-geometry-results.json',JSON.stringify({version:JSON.parse(await fs.readFile('package.json')).version,hashes,reference:'Native NASA LOLA Float32 elevation; independent bottom-first sampler, 2048x1152 reference mesh and 1024x576 convergence control. No vertical exaggeration.',outcomes},null,2)+'\n');
