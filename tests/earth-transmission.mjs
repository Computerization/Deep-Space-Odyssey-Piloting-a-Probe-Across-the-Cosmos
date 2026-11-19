import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const previous=await fs.readFile('tests/fixtures/earth-atmosphere-v41.glsl','utf8');
const previousCloud=await fs.readFile('tests/fixtures/cloud-v41.glsl','utf8');
const previousTransmission=await fs.readFile('tests/fixtures/earth-transmission-v45.glsl','utf8');
const previousGround=await fs.readFile('tests/fixtures/planet-v46.glsl','utf8');
const previousSurface=await fs.readFile('tests/fixtures/planet-v43.glsl','utf8');
const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1000,height:625},deviceScaleFactor:2}),errors=[],views=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
  await page.evaluate(async({previous,previousCloud,previousSurface,previousTransmission})=>{
   const a=window.__cosmos,w=a.world,t=await import('three'),{CloudLayer}=await import('/tests/fixtures/cloud-layer-v41.js');
   a.game.mode='panel';a.game.timePaused=true;document.getElementById('hud').hidden=true;
   const earth=w.bodies.earth,material=earth.atmosphere.material;
   window.transmissionCandidate=earth.transmission.material.fragmentShader;
   window.transmissionVariant=mode=>{const m=earth.transmission.material;m.fragmentShader=mode==='previous'?previousTransmission:transmissionCandidate;m.needsUpdate=true;};
   window.airCandidate=material;window.airPrevious=material.clone();airPrevious.uniforms=material.uniforms;airPrevious.fragmentShader=previous;airPrevious.blending=t.NormalBlending;
   window.cloudCandidate=earth.clouds.material;window.cloudPrevious=cloudCandidate.clone();cloudPrevious.uniforms=cloudCandidate.uniforms;cloudPrevious.fragmentShader=previousCloud;
   const oldCloud=earth.clouds.clone();oldCloud.material=cloudPrevious;
   const oldAir=earth.atmosphere.clone();oldAir.material=airPrevious;window.layerPrevious=new CloudLayer(oldCloud,oldAir);layerPrevious.transmission=earth.transmission;layerPrevious.atmosphere=earth.atmosphere;layerPrevious.cloud=earth.clouds;
   window.layerCandidate=w.cloudLayer;
   window.surfaceCandidate=earth.mesh.material.fragmentShader;
   window.surfaceVariant=mode=>{for(const b of Object.values(w.bodies))if(b.mesh.material.isShaderMaterial){b.mesh.material.fragmentShader=mode==='previous'?previousSurface:surfaceCandidate;b.mesh.material.needsUpdate=true;}};
   window.variant=mode=>{const old=mode==='previous';earth.clouds.material=old?cloudPrevious:cloudCandidate;earth.clouds.renderOrder=old?1:3;earth.atmosphere.material=old?airPrevious:airCandidate;earth.transmission.material.visible=!old;w.cloudLayer=old?layerPrevious:layerCandidate;};
   window.renderView=()=>{w.update(a.game.player,0,{view:a.game.view,exposure:1,look:a.game.look});};
   window.setScene=async({label,radius,phase,view='probe'})=>{
    const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0);a.game.mode='panel';a.game.timePaused=true;a.game.view=view;w.setQuality('high');w.ratio=2;w.cloudScale=1;w.resize();
    const c=w.bodyPositions.earth,sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize(),p=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180)).multiplyScalar(6371*radius).add(c);
    if(label==='pole'){const sign=Math.sign(c.clone().negate().applyQuaternion(w.bodies.earth.inverseOrientation).y);p.copy(c).add(new t.Vector3(0,sign*6371*radius,0).applyQuaternion(w.bodies.earth.group.quaternion));}
    if(label==='seam'){c.copy(new t.Vector3(-149600000,0,0).applyQuaternion(w.bodies.earth.group.quaternion));p.copy(c).add(new t.Vector3(6371*radius,0,0).applyQuaternion(w.bodies.earth.group.quaternion));}
    a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0)));w.followReady=false;
    if(label==='occlusion')w.bodyPositions.moon.copy(p).lerp(c,.45);
   };
  },{previous,previousCloud,previousSurface,previousTransmission});
  const transmissionViews=[];
  for(const [label,radius,phase,view='probe'] of [['day',2.35,35],['terminator',2.35,90],['crescent',2.35,150],['night',2.35,175],['close',1.08,90],['chase',2.35,35,'chase'],['occlusion',2.35,35]]){
   await page.evaluate(p=>setScene(p),{label,radius,phase,view});
   for(const mode of ['previous','candidate']){
    const r=await page.evaluate(mode=>{variant(mode);renderView();renderView();const w=window.__cosmos.world;return {png:w.canvas.toDataURL().split(',')[1],calls:w.renderer.info.render.calls,layered:w.cloudLayer.enabled(w),samples:w.frameTarget.samples};},mode);
    if(name==='Chrome')await fs.writeFile(`tests/screenshots/earth-transmission-${label}-${mode}.png`,Buffer.from(r.png,'base64'));delete r.png;views.push({label,mode,...r});
   }
   const comparison=await page.evaluate(()=>{
    variant('candidate');const w=window.__cosmos.world,images=[],renders=[];
    for(const mode of ['previous','candidate']){transmissionVariant(mode);renderView();renderView();const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const x=c.getContext('2d');x.drawImage(w.canvas,0,0);images.push(x.getImageData(0,0,c.width,c.height).data);renders.push({mode,png:c.toDataURL().split(',')[1],calls:w.renderer.info.render.calls,memory:{...w.renderer.info.memory}});}
    let total=0,max=0,overOne=0;for(let i=0;i<images[0].length;i++)if(i%4!==3){const e=Math.abs(images[0][i]-images[1][i]);total+=e;max=Math.max(max,e);overOne+=e>1;}
    return {renders,mean:total/(images[0].length*.75),max,overOne};
   });
   for(const r of comparison.renders){if(name==='Chrome')await fs.writeFile(`tests/screenshots/earth-column-${label}-${r.mode}.png`,Buffer.from(r.png,'base64'));delete r.png;}
   assert.equal(comparison.renders[0].calls,comparison.renders[1].calls);assert.deepEqual(comparison.renders[0].memory,comparison.renders[1].memory);
   assert.ok(comparison.mean<.01&&comparison.max<=2,JSON.stringify(comparison));
   transmissionViews.push({label,...comparison});
  }
  // Check every existing composition route at the same physical scene. The
  // lower cloud grid changes detail; the atmospheric RGB operations must match.
  const routes=await page.evaluate(()=>{
   const a=window.__cosmos,w=a.world;variant('candidate');a.game.view='probe';const routes=[];
   for(const [label,quality,ratio,scale,capture] of [['merged','high',2,1,false],['adaptive','high',2,.75,false],['multisampled','high',1,1,false],['direct','ultra',1,1,false],['capture','high',2,1,true]]){
    Object.defineProperty(window,'devicePixelRatio',{value:label==='multisampled'?1:2,configurable:true});w.setQuality(quality);w.ratio=ratio;w.cloudScale=scale;w.resize();w.capturing=capture;renderView();renderView();routes.push({label,layered:w.cloudLayer.enabled(w),calls:w.renderer.info.render.calls,samples:w.frameTarget.samples});
   }Object.defineProperty(window,'devicePixelRatio',{value:2,configurable:true});w.capturing=false;return routes;
  });
  const composition=await page.evaluate(async()=>{
   await setScene({label:'day',radius:2.35,phase:35});variant('candidate');const w=window.__cosmos.world;
   const original=w.cloudLayer.render.bind(w.cloudLayer),images=[];
   for(const split of [false,true]){w.cloudLayer.render=(r,c,f,x,y)=>original(r,c,f,x,y,split);renderView();const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const x=c.getContext('2d');x.drawImage(w.canvas,0,0);images.push(x.getImageData(0,0,c.width,c.height).data);}
   w.cloudLayer.render=original;let sum=0,max=0,overOne=0,count=0,edgeDistancePx=0;
   const t=await import('three'),body=w.bodies.earth,flat=new t.Vector3(1,body.uniforms.flatten.value,1),origin=body.uniforms.localCamera.value.clone().divide(flat),size=w.canvas;
   const hit=(x,y)=>{const d=new t.Vector3((x+.5)/size.width*2-1,1-(y+.5)/size.height*2,.5).unproject(w.camera).normalize().applyQuaternion(body.inverseOrientation).divide(flat).normalize(),along=origin.dot(d);return along*along-origin.lengthSq()+1.00143*1.00143;};
   for(let i=0;i<images[0].length;i++)if(i%4!==3){const e=Math.abs(images[0][i]-images[1][i]);sum+=e;max=Math.max(max,e);if(e>1){overOne++;const pixel=Math.floor(i/4),x=pixel%size.width,y=Math.floor(pixel/size.width),v=hit(x,y),gradient=Math.hypot(hit(x+1,y)-v,hit(x,y+1)-v);edgeDistancePx=Math.max(edgeDistancePx,Math.abs(v)/Math.max(gradient,1e-10));}count++;}
   return {mean:sum/count,max,overOne,channels:count,edgeDistancePx};
  });
  assert.ok(composition.mean<.025&&composition.overOne/composition.channels<.0002&&composition.edgeDistancePx<.25,JSON.stringify(composition));
  // Isolate incoming sunlight from the independent view-path comparison above.
  // Use unchanged imagery, exposure, clouds and camera poses for each pair.
  const sunlightViews=[];
  for(const [label,radius,phase] of [['day',2.35,35],['terminator',2.35,90],['crescent',2.35,150],['close-dawn',1.08,85],['night',2.35,175]]){
   await page.evaluate(p=>setScene(p),{label,radius,phase});
   const pair=await page.evaluate(()=>{
    variant('candidate');const w=window.__cosmos.world,out=[],images=[];
    for(const mode of ['previous','candidate']){surfaceVariant(mode);renderView();renderView();const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const x=c.getContext('2d');x.drawImage(w.canvas,0,0);images.push(x.getImageData(0,0,c.width,c.height).data);out.push({mode,png:c.toDataURL().split(',')[1],calls:w.renderer.info.render.calls,memory:{...w.renderer.info.memory}});}
    let total=0,max=0,changed=0;for(let i=0;i<images[0].length;i++)if(i%4!==3){const d=Math.abs(images[0][i]-images[1][i]);total+=d;max=Math.max(max,d);changed+=d>0;}
    return {out,difference:{mean:total/(images[0].length*.75),max,changed}};
   });
   for(const r of pair.out){if(name==='Chrome')await fs.writeFile(`tests/screenshots/earth-sunlight-${label}-${r.mode}.png`,Buffer.from(r.png,'base64'));delete r.png;}
   assert.equal(pair.out[0].calls,pair.out[1].calls);assert.deepEqual(pair.out[0].memory,pair.out[1].memory);sunlightViews.push({label,...pair});
  }
  // The shared surface shader must leave airless worlds and gas giants intact.
  const unchangedWorlds=await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,t=await import('three'),out=[];
   for(const [id,chapter] of [['moon',0],['jupiter',1],['saturn',2]]){
    a.startChapter(chapter);a.game.mode='panel';a.game.timePaused=true;a.game.view='probe';w.ratio=1;w.resize();
    const c=w.bodyPositions[id],sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize(),p=c.clone().addScaledVector(sun,w.bodies[id].data.radius*3).addScaledVector(side,w.bodies[id].data.radius*2);
    a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0)));w.followReady=false;
    const images=[];for(const mode of ['previous','candidate']){surfaceVariant(mode);renderView();renderView();const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const x=c.getContext('2d');x.drawImage(w.canvas,0,0);images.push(x.getImageData(0,0,c.width,c.height).data);}
    let max=0,changed=0;for(let i=0;i<images[0].length;i++){const d=Math.abs(images[0][i]-images[1][i]);max=Math.max(max,d);changed+=d>0;}out.push({id,identical:changed===0,max,changed,channels:images[0].length*.75});
   }return out;
  });
  assert.deepEqual(errors,[]);assert.ok(unchangedWorlds.every(v=>v.max<=1&&v.changed/(v.channels||1)<.0001),JSON.stringify(unchangedWorlds));
  // Test the production surface shader in a linear HDR target. White diffuse
  // and water reflection must attenuate by independently integrated air columns.
  const sunlight=await page.evaluate(async previousSurface=>{
   const w=window.__cosmos.world,t=await import('three'),r=w.renderer,b=w.bodies.earth;
   const u=t.UniformsUtils.clone(b.uniforms);u.opticalDepth.value=b.uniforms.opticalDepth.value;
   const scalar=value=>{const m=new t.DataTexture(new Uint8Array([value]),1,1,t.RedFormat);m.needsUpdate=true;return m;};
   const zero=scalar(0),one=scalar(255);u.cloudMap.value=zero;u.hasMap.value=0;u.earth.value=1;u.giant.value=u.hasRings.value=u.lunar.value=u.haze.value=0;u.surfaceGain.value=u.saturation.value=u.flatten.value=1;u.occluder.value.set(0,0,0,0);
   const vertex=`#include <common>
    #include <logdepthbuf_pars_vertex>
    varying vec2 vUv;varying vec3 vNormal,vPosition,vLocal;
    void main(){vUv=vec2(.5);vNormal=vec3(0,0,1);vPosition=vec3(0,0,-2);vLocal=vec3(0,0,1);gl_Position=vec4(position,1.);
    #include <logdepthbuf_vertex>
    }`;
   const material=new t.ShaderMaterial({uniforms:u,vertexShader:vertex,fragmentShader:surfaceCandidate}),geometry=new t.PlaneGeometry(2,2),scene=new t.Scene(),camera=new t.Camera(),target=new t.WebGLRenderTarget(8,8,{type:t.HalfFloatType,depthBuffer:false});scene.add(new t.Mesh(geometry,material));
   const samples=[],colour=r.getClearColor(new t.Color()),alpha=r.getClearAlpha(),raw=new Uint16Array(4);
   for(const water of [false,true])for(const degrees of [0,30,60,75,85,89]){
    const mu=Math.cos(degrees*Math.PI/180);u.sunlight.value.set(Math.sin(degrees*Math.PI/180),0,mu);u.localSun.value.copy(u.sunlight.value);u.waterMap.value=water?one:zero;
    const values={};for(const mode of ['previous','candidate']){material.fragmentShader=mode==='previous'?previousSurface:surfaceCandidate;material.needsUpdate=true;r.setRenderTarget(target);r.clear();r.render(scene,camera);r.readRenderTargetPixels(target,4,4,1,1,raw);values[mode]=[...raw].slice(0,3).map(t.DataUtils.fromHalfFloat);}
    const radius=6371,top=radius*1.018,end=-radius*mu+Math.sqrt(radius*radius*mu*mu+top*top-radius*radius),step=end/8192;let molecular=0,aerosol=0;
    for(let i=0;i<8192;i++){const distance=(i+.5)*step,h=Math.sqrt(radius*radius+distance*distance+2*radius*mu*distance)-radius;molecular+=Math.exp(-h/8)*step;aerosol+=Math.exp(-h/1.2)*step;}
    const expected=[.0058,.0135,.0331].map(beta=>Math.exp(-beta*molecular-.0033*aerosol)),floor=[.64,.43,.19].map(v=>v*.0006),measured=expected.map((_,c)=>(values.candidate[c]-floor[c])/(values.previous[c]-floor[c]));
    samples.push({water,degrees,expected,measured,error:Math.max(...expected.map((v,c)=>Math.abs(v-measured[c])))});
   }
   r.setRenderTarget(null);r.setClearColor(colour,alpha);material.dispose();geometry.dispose();target.dispose();zero.dispose();one.dispose();return samples;
  },previousSurface);
  assert.ok(sunlight.every(v=>v.error<.003),JSON.stringify(sunlight));
  // Isolate the revised ground shadow while retaining the current air and
  // cloud rendering. Dense marches compare the same reconstructed field.
  const groundViews=[];
  for(const [label,radius,phase] of [['day',2.35,35],['terminator',2.35,90],['close',1.05,65],['low-sun',1.05,85],['glint',1.05,35],['pole',1.08,35],['seam',1.08,35]]){
   await page.evaluate(p=>setScene(p),{label,radius,phase});
   const comparison=await page.evaluate(previousGround=>{
    variant('candidate');surfaceVariant('candidate');const w=window.__cosmos.world,e=w.bodies.earth,m=e.mesh.material,original=m.fragmentShader;
    const count=/int steps=int\(clamp\(ceil\(2\.\*length\(travel\*size\)\/exp2\(lod\)\),(\d+)\.,(\d+)\.\)\);/;
    const budget=count.exec(original);if(!budget)throw Error('Ground march not found');
    const dense=n=>original.replace(count,'int steps='+n+';').replace('for(int i=0;i<'+budget[2]+';i++){','for(int i=0;i<'+n+';i++){');
    w.setQuality('ultra');w.ratio=1;w.resize();const images={},screens={},draws={};
    for(const isolated of [false,true]){
     for(const material of [e.clouds.material,e.atmosphere.material,e.transmission.material])material.visible=!isolated;
     for(const mode of isolated?['previous','candidate','reference','dense']:['previous','candidate']){
      m.fragmentShader=mode==='previous'?previousGround:mode==='reference'?dense(128):mode==='dense'?dense(256):original;m.needsUpdate=true;renderView();renderView();
      const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const x=c.getContext('2d');x.drawImage(w.canvas,0,0);if(isolated)images[mode]=x.getImageData(0,0,c.width,c.height).data;
      else {screens[mode]=c.toDataURL().split(',')[1];draws[mode]={calls:w.renderer.info.render.calls,memory:{...w.renderer.info.memory}};}
     }
    }
    m.fragmentShader=original;m.needsUpdate=true;for(const material of [e.clouds.material,e.atmosphere.material,e.transmission.material])material.visible=true;
    const metrics={};for(const mode of ['previous','candidate','dense']){let total=0,max=0;for(let i=0;i<images.reference.length;i++)if(i%4!==3){const d=Math.abs(images[mode][i]-images.reference[i]);total+=d;max=Math.max(max,d);}metrics[mode]={mean:total/(images.reference.length*.75),max};}
    return {metrics,screens,draws};
   },previousGround);
   for(const [mode,png] of Object.entries(comparison.screens))if(name==='Chrome')await fs.writeFile(`tests/screenshots/ground-cloud-${label}-${mode}.png`,Buffer.from(png,'base64'));delete comparison.screens;
   assert.deepEqual(comparison.draws.previous,comparison.draws.candidate);
   if(!process.env.COSMOS_DIAGNOSTIC){assert.ok(comparison.metrics.candidate.mean<comparison.metrics.previous.mean*(['pole','seam'].includes(label)?1.02:.6)+.0005,JSON.stringify({name,label,...comparison}));assert.ok(comparison.metrics.dense.mean<comparison.metrics.candidate.mean*.4+.0005,JSON.stringify({name,label,...comparison}));}
   groundViews.push({label,...comparison});console.log({name,label,ground:comparison.metrics});
  }
  const groundColumns=await page.evaluate(async previousGround=>{
   const w=window.__cosmos.world,t=await import('three'),r=w.renderer,u=t.UniformsUtils.clone(w.bodies.earth.uniforms);u.opticalDepth.value=w.bodies.earth.uniforms.opticalDepth.value;
   const map=new t.DataTexture(new Uint8Array([0]),1,1,t.RedFormat);map.needsUpdate=true;u.cloudMap.value=u.waterMap.value=map;u.hasMap.value=0;u.earth.value=1;u.giant.value=u.hasRings.value=u.lunar.value=u.haze.value=0;u.surfaceGain.value=u.saturation.value=u.flatten.value=1;u.occluder.value.set(0,0,0,0);
   const vertex=`#include <common>
    #include <logdepthbuf_pars_vertex>
    varying vec2 vUv;varying vec3 vNormal,vPosition,vLocal;
    void main(){vUv=vec2(.5);vNormal=vec3(0,0,1);vPosition=vec3(0,0,-2);vLocal=vec3(0,0,1);gl_Position=vec4(position,1.);
    #include <logdepthbuf_vertex>
    }`;
   const material=new t.ShaderMaterial({uniforms:u,vertexShader:vertex,fragmentShader:surfaceCandidate,depthTest:false,depthWrite:false}),geometry=new t.PlaneGeometry(2,2),scene=new t.Scene(),camera=new t.Camera(),target=new t.WebGLRenderTarget(2,2,{type:t.HalfFloatType,depthBuffer:false});scene.add(new t.Mesh(geometry,material));
   // Read shadow transmission directly from the production material, before
   // tiny low-Sun radiance and half-float quantization can mask its error.
   const isolate=s=>s.replace('vec3 indirect=vec3(0.);','gl_FragColor=vec4(shadow,0.,0.,1.);return;\n vec3 indirect=vec3(0.);');
   const raw=new Uint16Array(4),out=[],smooth=(a,b,x)=>{x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x);};
   for(const weather of [.1,.3,.6,1])for(const degrees of [0,45,75,85,89,89.9]){
    const value=Math.round(weather*255),cover=value/255,mu=Math.cos(degrees*Math.PI/180);map.image.data[0]=value;map.needsUpdate=true;u.sunlight.value.set(Math.sin(degrees*Math.PI/180),0,mu);u.localSun.value.copy(u.sunlight.value);
    const values={};for(const mode of ['previous','candidate']){material.fragmentShader=isolate(mode==='previous'?previousGround:surfaceCandidate);material.needsUpdate=true;r.setRenderTarget(target);r.render(scene,camera);r.readRenderTargetPixels(target,0,0,1,1,raw);values[mode]=t.DataUtils.fromHalfFloat(raw[0]);}
    const radius=6371,top=radius*1.00143,length=-radius*mu+Math.sqrt(radius*radius*mu*mu+top*top-radius*radius),step=length/8192,width=1.3+smooth(.55,.95,cover)*6.3,optical=-Math.log(Math.max(.025,1-smooth(.025,.99,cover)));let depth=0;
    for(let i=0;i<8192;i++){const distance=(i+.5)*step,h=Math.sqrt(radius*radius+distance*distance+2*radius*mu*distance)-radius,l=(h-1.4)/width;depth+=smooth(0,.14,l)*(1-smooth(.6,1,l))*optical/(.73*width)*step;}
    const expected=Math.exp(-depth);out.push({cover,degrees,expected,...values,error:Math.abs(values.candidate-expected),previousError:Math.abs(values.previous-expected)});
   }
   r.setRenderTarget(null);map.dispose();target.dispose();material.dispose();geometry.dispose();return out;
  },previousGround);
  assert.ok(groundColumns.every(v=>v.error<.006),JSON.stringify(groundColumns.filter(v=>v.error>=.006)));
  const cost=[];
  if(name==='Chrome'&&(process.env.COSMOS_RENDER_COST||process.env.COSMOS_SUNLIGHT_COST||process.env.COSMOS_TRANSMISSION_COST||process.env.COSMOS_GROUND_COST)){
   await page.evaluate(({sunlight,transmission,ground,previousGround})=>{window.costVariant=mode=>{if(ground){variant('candidate');surfaceVariant('candidate');const m=window.__cosmos.world.bodies.earth.mesh.material;m.fragmentShader=mode==='previous'?previousGround:surfaceCandidate;m.needsUpdate=true;}else if(transmission){variant('candidate');surfaceVariant('candidate');transmissionVariant(mode);}else if(sunlight){variant('candidate');surfaceVariant(mode);}else variant(mode);};},{sunlight:!!process.env.COSMOS_SUNLIGHT_COST,transmission:!!process.env.COSMOS_TRANSMISSION_COST,ground:!!process.env.COSMOS_GROUND_COST,previousGround});
   for(const [label,radius,phase] of [['day',2.35,35],['close',1.08,90]]){
    await page.evaluate(p=>setScene(p),{label,radius,phase});
    await page.evaluate(()=>{const w=window.__cosmos.world;w.ratio=1;w.resize();});
    for(const mode of ['previous','candidate'])await page.evaluate(async mode=>{costVariant(mode);for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);renderView();}},mode);
    for(const mode of ['previous','candidate','candidate','previous']){
     const sample=await page.evaluate(async mode=>{
      costVariant(mode);const w=window.__cosmos.world,gl=w.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),gpu=[],pending=[],cpu=[];
      if(!ext)throw Error('GPU timer unavailable');
      for(let i=0;i<140;i++){
       await new Promise(requestAnimationFrame);const q=i>=20?gl.createQuery():null;if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);
       const start=performance.now();renderView();if(q){cpu.push(performance.now()-start);gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(q);}
       for(let n=pending.length-1;n>=0;n--){const q=pending[n];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(ext.GPU_DISJOINT_EXT))gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);pending.splice(n,1);}}
      }
      for(let i=0;i<30&&pending.length;i++){await new Promise(requestAnimationFrame);for(let n=pending.length-1;n>=0;n--){const q=pending[n];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(ext.GPU_DISJOINT_EXT))gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);pending.splice(n,1);}}}
      for(const q of pending)gl.deleteQuery(q);gpu.sort((a,b)=>a-b);cpu.sort((a,b)=>a-b);
      return {samples:gpu.length,gpuMedianMs:gpu[Math.floor(gpu.length*.5)],gpuP95Ms:gpu[Math.floor(gpu.length*.95)],cpuMedianMs:cpu[Math.floor(cpu.length*.5)],pixels:[w.canvas.width,w.canvas.height],calls:w.renderer.info.render.calls,memory:{...w.renderer.info.memory}};
     },mode);assert.equal(sample.samples,120);cost.push({label,mode,...sample});console.log(cost.at(-1));
    }
   }
  }
  const cloudReference=[];
  if(name==='Chrome'&&process.env.COSMOS_CLOUD_REFERENCE){
   await page.setViewportSize({width:800,height:500});
   for(const [label,radius,phase] of [['day',2.35,35],['terminator',2.35,90],['close',1.08,90]]){
    await page.evaluate(p=>setScene(p),{label,radius,phase});
    const comparison=await page.evaluate(async()=>{
     const w=window.__cosmos.world;variant('candidate');w.ratio=1;w.resize();
     const material=layerCandidate.volume.material,original=material.fragmentShader;
     let reference=original.replace('float opacity=1.-exp(-segment.x);',`float opacity=1.-exp(-segment.x);
       vec3 segmentScatter,segmentTransmission;
       airTransport(o,d,sun,t+stepSize*(segment.y-.5),segmentScatter,segmentTransmission);
       radiance+=through*opacity*segmentScatter;`)
       .replace('radiance+=through*opacity*solar*lighting*1.18;','radiance+=through*opacity*solar*lighting*1.18*segmentTransmission;')
       .replace('radiance=radiance*frontTransmission+alpha*frontScatter;','');
     const images=[];
     for(const shader of [original,reference]){material.fragmentShader=shader;material.needsUpdate=true;renderView();const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const x=c.getContext('2d');x.drawImage(w.canvas,0,0);images.push(x.getImageData(0,0,c.width,c.height).data);}
     material.fragmentShader=original;material.needsUpdate=true;
     const histogram=new Uint32Array(256);let sum=0,sq=0,max=0,count=0;
     for(let i=0;i<images[0].length;i++)if(i%4!==3){const e=Math.abs(images[0][i]-images[1][i]);sum+=e;sq+=e*e;max=Math.max(max,e);histogram[e]++;count++;}
     let total=0,p99=0;for(let i=0;i<256;i++){total+=histogram[i];if(total>=count*.99){p99=i;break;}}
     return {mean:sum/count,rmse:Math.sqrt(sq/count),max,p99,channels:count};
    });cloudReference.push({label,...comparison});console.log(cloudReference.at(-1));
   }
  }
  if(cost.length)await fs.writeFile(process.env.COSMOS_GROUND_COST?'tests/ground-cloud-cost-results.json':process.env.COSMOS_TRANSMISSION_COST?'tests/earth-column-cost-results.json':process.env.COSMOS_SUNLIGHT_COST?'tests/earth-sunlight-cost-results.json':'tests/earth-transmission-cost-results.json',JSON.stringify({version,cost},null,2)+'\n');
  if(cloudReference.length)await fs.writeFile('tests/earth-transmission-cloud-results.json',JSON.stringify({version,cloudReference},null,2)+'\n');
  await page.evaluate(()=>transmissionVariant('candidate'));
  // Read linear HDR pixels, independently integrate 8192 optical-depth steps,
  // and infer each channel's transmission from black/coloured backgrounds.
  // This tests real GL blending, not a second copy of the new composition code.
  const optical=await page.evaluate(async()=>{
   variant('candidate');const a=window.__cosmos,w=a.world,t=await import('three'),renderer=w.renderer,earth=w.bodies.earth;
   const size=128,target=new t.WebGLRenderTarget(size,size,{type:t.HalfFloatType,depthBuffer:false}),camera=new t.PerspectiveCamera(70,1,.01,10);camera.position.set(0,0,2);camera.lookAt(0,0,0);camera.updateMatrixWorld();
   const uniforms={...airCandidate.uniforms,localCamera:{value:new t.Vector3(0,0,2)},localSun:{value:new t.Vector3(1,0,0)},flatten:{value:1}};
   const air=new t.Mesh(earth.atmosphere.geometry,airCandidate.clone()),transmission=new t.Mesh(earth.transmission.geometry,earth.transmission.material.clone());
   air.scale.setScalar(1.018);transmission.scale.copy(air.scale);air.renderOrder=2;transmission.renderOrder=1;air.material.uniforms=transmission.material.uniforms=uniforms;
   const scene=new t.Scene();scene.add(air,transmission);const colour=renderer.getClearColor(new t.Color()),alpha=renderer.getClearAlpha();
   const coordinates=[[64,64],[90,64],[110,64],[115,64],[116,64]],samples=[];
   const read=()=>{const raw=new Uint16Array(size*size*4);renderer.readRenderTargetPixels(target,0,0,size,size,raw);return coordinates.map(([x,y])=>[0,1,2].map(c=>t.DataUtils.fromHalfFloat(raw[(y*size+x)*4+c])));};
   const sphere=(d,r)=>{const b=2*d.z,h=b*b-4+r*r;return h<0?null:[-b-Math.sqrt(h),-b+Math.sqrt(h)];};
   for(const altitudeKm of [0,3,9])for(const mode of altitudeKm===0?['previous','candidate']:['candidate']){
    const endpoint=`airSphereHit(o,d,1.+${altitudeKm.toFixed(1)}/6371.).x`;
    air.material.fragmentShader=mode==='previous'?airPrevious.fragmentShader:airCandidate.fragmentShader.replace('sun,1e8,scatter','sun,'+endpoint+',scatter');
    transmission.material.fragmentShader=earth.transmission.material.fragmentShader.replace('sun,1e8,scatter','sun,'+endpoint+',scatter');transmission.material.needsUpdate=true;air.material.blending=mode==='previous'?t.NormalBlending:t.CustomBlending;air.material.needsUpdate=true;transmission.visible=mode==='candidate';
    const values=[];for(const bg of [[0,0,0],[.4,0,0],[0,.4,0],[0,0,.4],[.4,.4,.4]]){renderer.setRenderTarget(target);renderer.setClearColor(new t.Color(...bg),1);renderer.clear();renderer.render(scene,camera);values.push(read());}
    for(let k=0;k<coordinates.length;k++){
     const [x,y]=coordinates[k],d=new t.Vector3((x+.5)/size*2-1,(y+.5)/size*2-1,.5).unproject(camera).sub(camera.position).normalize(),hit=sphere(d,1.018),ground=sphere(d,1+altitudeKm/6371);let columnR=0,columnM=0;
     const start=Math.max(0,hit[0]),end=ground?.[0]>0?Math.min(hit[1],ground[0]):hit[1],step=(end-start)/8192;
     for(let i=0;i<8192;i++){const distance=start+(i+.5)*step,h=Math.max(0,(Math.hypot(d.x*distance,d.y*distance,2+d.z*distance)-1)*6371);columnR+=Math.exp(-h/8)*step*6371;columnM+=Math.exp(-h/1.2)*step*6371;}
     const expected=[.0058,.0135,.0331].map(beta=>Math.exp(-beta*columnR-.0033*columnM)),measured=expected.map((_,c)=>(values[c+1][k][c]-values[0][k][c])/.4);
     const crossTalk=Math.max(...[0,1,2].flatMap(c=>[0,1,2].filter(j=>j!==c).map(j=>Math.abs(values[c+1][k][j]-values[0][k][j]))));
     const superposition=Math.max(...expected.map((_,c)=>Math.abs(values[4][k][c]-values[c+1][k][c])));
     samples.push({mode,altitudeKm,pixel:[x,y],expected,measured,error:Math.max(...expected.map((v,c)=>Math.abs(v-measured[c]))),crossTalk,superposition});
    }
   }
   renderer.setClearColor(colour,alpha);renderer.setRenderTarget(null);target.dispose();air.material.dispose();transmission.material.dispose();return samples;
  });
  // Exercise the production transmission shader on full and bounded rays,
  // including cameras inside the air and both sides of the tangent. The CPU
  // reference integrates density directly; it does not sample the lookup.
  const columns=await page.evaluate(async previousTransmission=>{
   const w=window.__cosmos.world,t=await import('three'),r=w.renderer,body=w.bodies.earth;
   const u={...body.transmission.material.uniforms,localCamera:{value:new t.Vector3()},flatten:{value:1},diagnosticDirection:{value:new t.Vector3()},diagnosticLimit:{value:1e8}};
   const shader=source=>source.replace('varying vec3 vLocal;','varying vec3 vLocal;uniform float diagnosticLimit;').replace('sun,1e8,scatter','sun,diagnosticLimit,scatter');
   const vertex=`#include <common>
    #include <logdepthbuf_pars_vertex>
    uniform vec3 localCamera,diagnosticDirection;varying vec3 vLocal;
    void main(){vLocal=(localCamera+diagnosticDirection*.1)/1.018;gl_Position=vec4(position,1.);
    #include <logdepthbuf_vertex>
    }`;
   const material=new t.ShaderMaterial({uniforms:u,vertexShader:vertex,fragmentShader:shader(transmissionCandidate),depthTest:false,depthWrite:false,toneMapped:false}),geometry=new t.PlaneGeometry(2,2),scene=new t.Scene(),camera=new t.Camera(),target=new t.WebGLRenderTarget(2,2,{type:t.HalfFloatType,depthBuffer:false});scene.add(new t.Mesh(geometry,material));
   const cases=[],sphere=(radius,mu,shell)=>{const b=radius*mu,h=b*b-radius*radius+shell*shell;return h<0?[1e8,-1e8]:[-b-Math.sqrt(h),-b+Math.sqrt(h)];};
   for(const altitudeKm of [.1,3,9,60,114.678,300,6371])for(const mu of [-1,-.3,-.1,-.02,0,.02,.1,.3,1])for(const fraction of altitudeKm<100?[.25,.75,1]:[1])cases.push({altitudeKm,mu,fraction});
   for(const radius of [1.05,2])for(const impact of [1.00001,1.001,1.005,1.01,1.017,1.019])cases.push({altitudeKm:(radius-1)*6371,mu:-Math.sqrt(1-(impact/radius)**2),fraction:1});
   const raw=new Uint16Array(4),samples=[],saved=r.getRenderTarget();
   for(const c of cases){
    const radius=1+c.altitudeKm/6371,hit=sphere(radius,c.mu,1.018),ground=sphere(radius,c.mu,1),start=Math.max(0,hit[0]),end=Math.min(hit[1],ground[0]>0?ground[0]:1e8),limit=end>start?start+(end-start)*c.fraction:1e8;
    u.localCamera.value.set(0,0,radius);u.diagnosticDirection.value.set(Math.sqrt(1-c.mu*c.mu),0,c.mu);u.diagnosticLimit.value=limit;
    let molecular=0,aerosol=0;const step=Math.max(0,Math.min(end,limit)-start)/8192;
    for(let i=0;i<8192;i++){const distance=start+(i+.5)*step,h=Math.max(0,(Math.sqrt(radius*radius+distance*distance+2*radius*c.mu*distance)-1)*6371);molecular+=Math.exp(-h/8)*step*6371;aerosol+=Math.exp(-h/1.2)*step*6371;}
    const expected=[.0058,.0135,.0331].map(beta=>Math.exp(-beta*molecular-.0033*aerosol)),values={};
    for(const mode of ['previous','candidate']){material.fragmentShader=shader(mode==='previous'?previousTransmission:transmissionCandidate);material.needsUpdate=true;r.setRenderTarget(target);r.render(scene,camera);r.readRenderTargetPixels(target,0,0,1,1,raw);const measured=[...raw].slice(0,3).map(t.DataUtils.fromHalfFloat);values[mode]={measured,error:Math.max(...expected.map((v,c)=>Math.abs(v-measured[c])))};}
    samples.push({...c,expected,...values});
   }
   r.setRenderTarget(saved);target.dispose();material.dispose();geometry.dispose();return samples;
  },previousTransmission);
  assert.ok(columns.every(c=>c.candidate.error<.006),JSON.stringify(columns.filter(c=>c.candidate.error>=.006)));
  assert.deepEqual(errors,[]);
  assert.ok(optical.filter(s=>s.mode==='candidate').every(s=>s.error<.012&&s.crossTalk===0&&s.superposition===0),JSON.stringify(optical));
  assert.ok(optical.filter(s=>s.mode==='previous').some(s=>s.error>.1));
  for(const label of new Set(views.map(v=>v.label))){const pair=views.filter(v=>v.label===label);assert.equal(pair[1].calls,pair[0].calls+1,JSON.stringify(pair));}
  assert.ok(routes.find(r=>r.label==='multisampled').samples>0);
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),views,transmissionViews,routes,composition,optical,columns,sunlightViews,unchangedWorlds,sunlight,groundViews,groundColumns,cost,cloudReference,errors});console.log({name,columnMax:Math.max(...columns.map(c=>c.candidate.error)),opticalMax:Math.max(...optical.filter(v=>v.mode==='candidate').map(v=>v.error)),passed:true});
 }finally{await browser.close();}
 await fs.writeFile('tests/earth-transmission-results.json',JSON.stringify({version,outcomes},null,2)+'\n');
}
