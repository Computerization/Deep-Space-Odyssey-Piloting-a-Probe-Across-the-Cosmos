// Polar filtering against lossless source-derived caps and motion controls.
import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const previous=process.env.COSMOS_VISUAL_PREVIOUS;
const normalSource=process.env.COSMOS_POLAR_NORMAL_SOURCE,colorSource=process.env.COSMOS_POLAR_COLOR_SOURCE;
assert.ok(previous&&normalSource&&colorSource);
const files=['src/rendering/shaders.js','src/rendering/scene-factory.js','src/world.js','assets/textures/moon-polar-color.avif','assets/textures/moon-polar-normal.avif'];
const hashes=Object.fromEntries(await Promise.all([...files,normalSource,colorSource].map(async p=>[p,createHash('sha256').update(await fs.readFile(p)).digest('hex')])));
const cases=[['north',1,80,18],['south',-1,80,18],['north-detail',1,86,4],['south-detail',-1,86,4],['north-blend',1,74,4],['south-blend',-1,74,4]];
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:640,height:400}}),errors=[],views=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  const oldShader=String(await fs.readFile(path.join(previous,'src/rendering/shaders.js'))).replaceAll("from './","from '/src/rendering/");
  await page.route('**/polar/old.js',r=>r.fulfill({body:oldShader,contentType:'text/javascript'}));
  for(const [url,file] of [['normal.png',normalSource],['colour.png',colorSource]])await page.route('**/polar/'+url,r=>r.fulfill({path:file}));
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
  await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,t=await import('three');a.game.mode='loading';w.setQuality('ultra');document.querySelectorAll('body>*:not(canvas)').forEach(e=>e.style.display='none');
   const loader=new t.TextureLoader(),normal=await loader.loadAsync('/polar/normal.png'),colour=await loader.loadAsync('/polar/colour.png');normal.colorSpace=t.NoColorSpace;colour.colorSpace=t.SRGBColorSpace;
   for(const map of [normal,colour]){map.wrapS=map.wrapT=t.ClampToEdgeWrapping;map.anisotropy=w.renderer.capabilities.getMaxAnisotropy();w.renderer.initTexture(map);}
   const b=w.bodies.moon,base=b.mesh.material.fragmentShader,old=(await import('/polar/old.js')).fragment;
   // The lossless, source-derived cap is a compression/filtering reference,
   // not an independent reconstruction of the lunar terrain.
   const reference=base.replace('vec2 xy=textureGrad(lunarPolarNormal,uv,dx,dy).rg*2.-1.;\n   vec3 mapped=normalize(vec3(xy,max(0.,1.-abs(xy.x)-abs(xy.y))));',
    'vec3 mapped=normalize(textureGrad(lunarPolarNormal,uv,dx,dy).xyz*2.-1.);');
   if(reference===base)throw Error('Reference must use lossless XYZ cap normals.');
   const mask=base.slice(0,base.indexOf(' void main(){'))+' void main(){gl_FragColor=vec4(step(.951056516295,abs(normalize(vLocal).y)),0.,0.,1.);}';
   window.polar={shaders:{previous:old,candidate:base,reference,convergence:reference,mask},source:[normal,colour],runtime:[b.uniforms.lunarPolarNormal.value,b.uniforms.lunarPolarColor.value],frames:{}};
   w.frameTarget.dispose();w.frameTarget.samples=0;
  });
  for(const [label,hemisphere,phase,fov] of cases){
   await page.evaluate(async({hemisphere,phase,fov})=>{
    const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0,0,'moon');a.game.mode='loading';a.game.timePaused=true;a.game.look.identity();w.setFov(fov);
    const b=w.bodies.moon,c=w.bodyPositions.moon,sun=c.clone().negate().normalize(),up=new t.Vector3(0,1,0).applyQuaternion(b.group.quaternion),side=sun.clone().addScaledVector(up,-up.dot(sun)).normalize();
    a.game.player.position.copy(c).addScaledVector(side,b.data.radius*3*Math.cos(phase*Math.PI/180)).addScaledVector(up,hemisphere*b.data.radius*3*Math.sin(phase*Math.PI/180));a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(a.game.player.position,c,up));w.followReady=false;polar.frames={};
   },{hemisphere,phase,fov});
   for(const [mode,factor] of [['previous',1],['candidate',1],['reference',4],['convergence',2],['mask',1]]){
    const result=await page.evaluate(({mode,factor})=>{
     const a=window.__cosmos,w=a.world,g=a.game,b=w.bodies.moon,state=()=>JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.localSeconds,g.fuel]),before=state();
     const source=['reference','convergence'].includes(mode);[b.uniforms.lunarPolarNormal.value,b.uniforms.lunarPolarColor.value]=source?polar.source:polar.runtime;
     b.mesh.material.fragmentShader=polar.shaders[mode];b.mesh.material.needsUpdate=true;
     w.renderer.setDrawingBufferSize(innerWidth,innerHeight,factor);w.frameTarget.setSize(innerWidth*factor,innerHeight*factor);w.update(g.player,0,{view:'probe',exposure:1,look:g.look});
     const canvas=document.createElement('canvas');canvas.width=w.canvas.width;canvas.height=w.canvas.height;const ctx=canvas.getContext('2d');ctx.drawImage(w.canvas,0,0);const raw=ctx.getImageData(0,0,canvas.width,canvas.height).data,small=new Uint8ClampedArray(innerWidth*innerHeight*4);
     for(let y=0;y<innerHeight;y++)for(let x=0;x<innerWidth;x++){const p=(y*innerWidth+x)*4;for(let k=0;k<3;k++){let sum=0;for(let j=0;j<factor;j++)for(let i=0;i<factor;i++)sum+=raw[((y*factor+j)*canvas.width+x*factor+i)*4+k];small[p+k]=sum/(factor*factor);}small[p+3]=255;}
     polar.frames[mode]=small;canvas.width=innerWidth;canvas.height=innerHeight;ctx.putImageData(new ImageData(small,innerWidth,innerHeight),0,0);return{unchanged:before===state(),png:canvas.toDataURL('image/png')};
    },{mode,factor});assert.ok(result.unchanged);
    if(name==='Chrome'&&mode!=='convergence')await fs.writeFile(`tests/screenshots/lunar-poles-${label}-${mode}.png`,Buffer.from(result.png.split(',')[1],'base64'));
   }
   const metrics=await page.evaluate(()=>{
    const f=polar.frames,out={};for(const mode of ['previous','candidate','convergence']){let sum=0,count=0,max=0;for(let p=0;p<f.mask.length;p+=4){if(f.mask[p]<150||f.mask[p+1]>60||f.mask[p+2]>60)continue;for(let k=0;k<3;k++){const d=Math.abs(f[mode][p+k]-f.reference[p+k]);sum+=d*d;count++;max=Math.max(max,d);}}out[mode]={rmse:Math.sqrt(sum/count),max,pixels:count/3};}return out;
   });for(const m of Object.values(metrics)){assert.ok(m.pixels>1000,`${label}: empty polar mask`);assert.ok(Number.isFinite(m.rmse));}
   // Broad/transition views mix global and cap mip levels; retain their errors
   // as diagnostics and gate the aggregate rather than each subpixel case.
   if(label==='north-detail')assert.ok(metrics.candidate.rmse<metrics.previous.rmse*.65,`${label}: radial smear must improve`);
   if(label.endsWith('detail'))assert.ok(metrics.convergence.rmse<metrics.candidate.rmse*.4,`${label}: reference convergence`);
   views.push({label,metrics});console.log({name,label,metrics});
  }
  const total=mode=>views.reduce((n,v)=>n+v.metrics[mode].rmse**2*v.metrics[mode].pixels,0);
  assert.ok(total('candidate')<total('previous')*.9,'Polar image error must improve overall');
  const motion=await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,g=a.game,t=await import('three'),b=w.bodies.moon,c=w.bodyPositions.moon;
   const up=new t.Vector3(0,1,0).applyQuaternion(b.group.quaternion),sun=c.clone().negate().normalize(),side=sun.clone().addScaledVector(up,-up.dot(sun)).normalize(),rows=[];
   const canvas=document.createElement('canvas');canvas.width=innerWidth;canvas.height=innerHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});
   w.renderer.setDrawingBufferSize(innerWidth,innerHeight,1);w.frameTarget.setSize(innerWidth,innerHeight);w.setFov(4);
   for(const hemisphere of [1,-1])for(const latitude of [72,78,88]){
    const values={};
    for(const mode of ['candidate','reference']){
     [b.uniforms.lunarPolarNormal.value,b.uniforms.lunarPolarColor.value]=mode==='reference'?polar.source:polar.runtime;
     b.mesh.material.fragmentShader=polar.shaders[mode];b.mesh.material.needsUpdate=true;
     let previous=null,delta=0,max=0,repeat=0;
     for(let step=0;step<24;step++){
      const angle=(latitude+(step-11.5)*.002)*Math.PI/180;
      g.player.position.copy(c).addScaledVector(side,b.data.radius*3*Math.cos(angle)).addScaledVector(up,hemisphere*b.data.radius*3*Math.sin(angle));g.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(g.player.position,c,up));
      w.update(g.player,0,{view:'probe',exposure:1,look:g.look});ctx.drawImage(w.canvas,0,0);const pixels=ctx.getImageData(0,0,innerWidth,innerHeight).data;
      if(previous){let sum=0;for(let i=0;i<pixels.length;i++)if(i%4!==3)sum+=Math.abs(pixels[i]-previous[i]);const mean=sum/(innerWidth*innerHeight*3);delta+=mean;max=Math.max(max,mean);if(!sum)repeat++;}previous=pixels;
     }
     values[mode]={meanDelta:delta/23,maxDelta:max,repeatedFrames:repeat};
    }
    rows.push({hemisphere,latitude,...values});
   }return rows;
  });
  for(const r of motion){assert.equal(r.candidate.repeatedFrames,0,'Small camera motion must stay responsive');assert.ok(r.candidate.maxDelta<r.reference.maxDelta*1.35+.3,'No extra seam or flicker relative to lossless source');}
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),views,motion,errors,passed:true});
  console.log({name,motionChecks:motion.length,passed:true});
 }finally{await browser.close();}
}
await fs.writeFile(process.env.COSMOS_POLAR_REPORT||'tests/lunar-poles-results.json',JSON.stringify({version:JSON.parse(await fs.readFile('package.json')).version,previous,hashes,reference:'Lossless colour and XYZ normals from source-derived stereographic reprojection; 4x display supersampling and 2x convergence control. This isolates runtime encoding and filtering, not independent terrain reconstruction.',outcomes},null,2)+'\n');
