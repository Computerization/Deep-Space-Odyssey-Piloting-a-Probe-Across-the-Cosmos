// GPU reconstruction against independent 16-tap CPU interpolation and a known
// continuous signal. Includes real magnified surfaces and unchanged minification.
import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const report=process.env.COSMOS_RECONSTRUCTION_REPORT||'tests/texture-reconstruction-results.json';
let cloudShaders=null;
if(process.env.COSMOS_VISUAL_PREVIOUS){
 const now=await import('../src/rendering/earth-shaders.js'),old=await import(pathToFileURL(process.env.COSMOS_VISUAL_PREVIOUS+'/src/rendering/earth-shaders.js'));
 const names=Object.keys(old).filter(k=>typeof old[k]==='string');
 for(const key of names)assert.equal(now[key],old[key],key+': byte-identical Earth shader');
 for(const a of [false,true])for(const b of [false,true])assert.equal(now.cloudShader(a,b),old.cloudShader(a,b));
 cloudShaders={byteIdentical:true,exports:names,generatedVariants:4};
}
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1200,height:750}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:120000});await page.click('#begin');
  const signal=await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,t=await import('three'),{surfaceReconstruction}=await import('/src/rendering/texture-sampling.js');a.game.mode='loading';
   const width=64,height=32,data=new Uint8Array(width*height*4);
   const wave=(x,y)=>.5+.22*Math.cos(x*Math.PI*12/width)+.17*Math.sin(y*Math.PI*6/height);
   for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set([Math.round(255*wave(x+.5,y+.5)),x<32?0:255,137,255],(y*width+x)*4);
   const source=new t.DataTexture(data,width,height);source.wrapS=t.RepeatWrapping;source.minFilter=t.LinearMipmapLinearFilter;source.magFilter=t.LinearFilter;source.generateMipmaps=true;source.needsUpdate=true;
   const uniforms={source:{value:source},rect:{value:new t.Vector4()},linear:{value:false}};
   const material=new t.ShaderMaterial({uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D source;uniform vec4 rect;uniform bool linear;varying vec2 vUv;${surfaceReconstruction}\nvoid main(){vec2 uv=(rect.xy+vUv*rect.zw)/vec2(textureSize(source,0));gl_FragColor=vec4(linear?texture2D(source,uv).rgb:sampleSurface(source,uv),1.);}`,depthTest:false,depthWrite:false});
   const scene=new t.Scene(),geometry=new t.PlaneGeometry(2,2);scene.add(new t.Mesh(geometry,material));const camera=new t.Camera(),target=new t.WebGLRenderTarget(256,128,{type:t.FloatType});
   const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
   const value=(x,y,k)=>data[(clamp(y,0,height-1)*width+((x%width)+width)%width)*4+k]/255;
   // Direct separable cubic convolution, independent of the nine bilinear taps.
   const kernel=x=>{x=Math.abs(x);return x<1?1-2.5*x*x+1.5*x*x*x:x<2?2-4*x+2.5*x*x-.5*x*x*x:0;};
   const rows=[];
   try{
    for(const [label,ox,oy,sx,sy] of [['magnified',3,4,.25,.25],['transition',3,4,.82,.82],['seam',61,4,.25,.25],['pole',3,-4,.25,.25],['native',3,4,1,1],['minified',3,4,2,2],['oblique',3,4,.25,2]]){
     uniforms.rect.value.set(ox,oy,256*sx,128*sy);const pixels={};
     for(const mode of ['linear','candidate']){uniforms.linear.value=mode==='linear';w.renderer.setRenderTarget(target);w.renderer.render(scene,camera);const p=new Float32Array(256*128*4);w.renderer.readRenderTargetPixels(target,0,0,256,128,p);pixels[mode]=p;}
     let maxError=0,maxDifference=0,linearError=0,cubicError=0,signalCount=0,boundExcess=0,constantError=0;
     const weight=1-smooth((Math.max(sx,sy)-.65)/.35);
     for(let y=0;y<128;y++)for(let x=0;x<256;x++){
      const px=ox+(x+.5)*sx,py=oy+(y+.5)*sy,ix=Math.floor(px-.5),iy=Math.floor(py-.5),fx=px-.5-ix,fy=py-.5-iy,i=(y*256+x)*4;
      for(let k=0;k<3;k++){
       const near=[value(ix,iy,k),value(ix+1,iy,k),value(ix,iy+1,k),value(ix+1,iy+1,k)];let cubic=0;
       for(let j=-1;j<=2;j++)for(let q=-1;q<=2;q++)cubic+=value(ix+q,iy+j,k)*kernel(q-fx)*kernel(j-fy);
       const lo=Math.min(...near),hi=Math.max(...near),expected=pixels.linear[i+k]*(1-weight)+clamp(cubic,lo,hi)*weight,v=pixels.candidate[i+k];
       maxError=Math.max(maxError,Math.abs(expected-v));maxDifference=Math.max(maxDifference,Math.abs(v-pixels.linear[i+k]));
       if(weight===1)boundExcess=Math.max(boundExcess,lo-v,v-hi);
      }
      constantError=Math.max(constantError,Math.abs(pixels.candidate[i+2]-137/255));
      if(label==='magnified'&&py<height-.5){const expected=wave(px,py);linearError+=(pixels.linear[i]-expected)**2;cubicError+=(pixels.candidate[i]-expected)**2;signalCount++;}
     }
     rows.push({label,weight,maxError,maxDifference,boundExcess,constantError,signalCount,linearRmse:signalCount?Math.sqrt(linearError/signalCount):null,candidateRmse:signalCount?Math.sqrt(cubicError/signalCount):null});
    }
    return{rows,graphicsError:w.renderer.getContext().getError()};
   }finally{w.renderer.setRenderTarget(null);target.dispose();source.dispose();material.dispose();geometry.dispose();}
  });
  console.log(JSON.stringify({name,signal}));
  for(const row of signal.rows){assert.ok(row.maxError<.002,`${name} ${row.label}: independent convolution`);assert.ok(row.boundExcess<1e-6,'bounded source values');assert.ok(row.constantError<1e-5,'flat colours preserved');if(row.weight===0)assert.equal(row.maxDifference,0,'minification unchanged');if(row.signalCount)assert.ok(row.candidateRmse<row.linearRmse*.8,'less reconstruction error against continuous signal');}
  assert.equal(signal.graphicsError,0);
  const views=[];
  for(const [body,chapter,study] of [['earth',0,null],['moon',0,'moon'],['jupiter',1,null],['io',1,'io'],['saturn',2,null]])for(const fov of [58,4]){
   const state=await page.evaluate(({body,chapter,study,fov})=>{
    const a=window.__cosmos,w=a.world;a.startChapter(chapter,0,study);a.game.mode='loading';a.game.timePaused=true;a.game.look.identity();w.setQuality('ultra');w.setFov(fov);document.getElementById('hud').hidden=true;
    const m=w.bodies[body].mesh.material;window.surfacePair={material:m,current:m.fragmentShader,previous:m.fragmentShader.replace('sampleSurface(surfaceMap,uv)','texture2D(surfaceMap,uv).rgb'),frames:{}};
    return JSON.stringify([a.game.player.position.toArray(),a.game.player.velocity.toArray(),a.game.player.quaternion.toArray(),a.game.localSeconds,a.game.fuel]);
   },{body,chapter,study,fov});
   let resources;
   for(const mode of ['previous','current']){
    const result=await page.evaluate(async mode=>{
     const a=window.__cosmos,w=a.world,p=window.surfacePair;p.material.fragmentShader=p[mode];p.material.needsUpdate=true;w.update(a.game.player,0,{view:'probe',look:a.game.look});
     if(w.cloudDetail)for(let i=0;i<100;i++){const d=w.cloudDetail;if(!d.pending&&(!d.wanted||d.active?.key===d.wanted.key&&d.uniforms.cloudPatchWeight.value===1))break;await new Promise(r=>setTimeout(r,40));w.update(a.game.player,0,{view:'probe',look:a.game.look});}
     const canvas=document.createElement('canvas');canvas.width=w.canvas.width;canvas.height=w.canvas.height;const ctx=canvas.getContext('2d');ctx.drawImage(w.canvas,0,0);p.frames[mode]=ctx.getImageData(0,0,canvas.width,canvas.height).data;
     return{physical:JSON.stringify([a.game.player.position.toArray(),a.game.player.velocity.toArray(),a.game.player.quaternion.toArray(),a.game.localSeconds,a.game.fuel]),calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,memory:{...w.renderer.info.memory},graphicsError:w.renderer.getContext().getError()};
    },mode);
    assert.equal(result.physical,state);assert.equal(result.graphicsError,0);if(resources)assert.deepEqual(result,resources);else resources=result;
    await page.locator('canvas').first().screenshot({path:`tests/screenshots/reconstruction-${name}-${body}-${fov}-${mode}.png`});
   }
   const changes=await page.evaluate(()=>{const p=surfacePair.frames;let squared=0,max=0,changed=0;for(let i=0;i<p.current.length;i+=4)for(let k=0;k<3;k++){const d=Math.abs(p.current[i+k]-p.previous[i+k]);squared+=d*d;max=Math.max(max,d);if(d)changed++;}return{rmse:Math.sqrt(squared/(p.current.length*.75)),max,changed};});
   views.push({body,fov,...changes,physicalStatePreserved:true,resources});console.log({name,body,fov,...changes});
  }
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),signal,views,errors,passed:true});
 }finally{await browser.close();}
}
await fs.writeFile(report,JSON.stringify({cloudShaders,version:JSON.parse(await fs.readFile('package.json')).version,samplingSha256:createHash('sha256').update(await fs.readFile('src/rendering/texture-sampling.js')).digest('hex'),outcomes},null,2)+'\n');
