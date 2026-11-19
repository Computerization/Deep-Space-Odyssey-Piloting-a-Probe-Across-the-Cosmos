import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const previous=await fs.readFile('tests/fixtures/planet-v33.glsl','utf8');
const beforeImage=process.env.COSMOS_PREVIOUS_EARTH;
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_EARTH_ENGINE&&process.env.COSMOS_EARTH_ENGINE!==name)continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],views=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  if(beforeImage)await page.route('**/tests/earth-before.avif',route=>route.fulfill({path:beforeImage,contentType:'image/avif'}));
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
  const resources=await page.evaluate(async before=>{
   const a=window.__cosmos,w=a.world,t=await import('three');a.game.mode='panel';w.setQuality('ultra');
   window.earthCandidate={shader:w.bodies.earth.mesh.material.fragmentShader,texture:w.textures['earth.avif'],atmosphere:w.bodies.earth.atmosphere.material.fragmentShader,composite:w.cloudLayer.resolve.fragmentShader};
   if(before){const old=await new t.TextureLoader().loadAsync('/tests/earth-before.avif');old.colorSpace=t.SRGBColorSpace;old.wrapS=t.RepeatWrapping;old.anisotropy=w.textures['earth.avif'].anisotropy;window.earthBefore=old;}
   const water=w.textures['earth-water.png'];return {colour:[w.textures['earth.avif'].image.width,w.textures['earth.avif'].image.height],water:[water.image.width,water.image.height],scalar:water.format===t.RedFormat,linear:water.colorSpace===t.NoColorSpace,repeat:water.wrapS===t.RepeatWrapping};
  },!!beforeImage);
  assert.deepEqual(resources,{colour:[8192,4096],water:[4096,2048],scalar:true,linear:true,repeat:true});
  for(const [label,radius,phase] of [['day',2.35,35],['terminator',2.35,90],['crescent',2.35,150],['close',1.05,50],['grazing',1.08,90],['night',2.35,175]]){
   await page.evaluate(async({radius,phase})=>{
    const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0);a.game.mode='panel';a.game.timePaused=true;
    const c=w.bodyPositions.earth,sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize(),p=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180)).multiplyScalar(6371*radius).add(c);
    a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0)));w.followReady=false;
   },{radius,phase});
   const captures={};
   for(const mode of beforeImage?['previous','candidate']:['candidate']){
    const frame=await page.evaluate(({mode,previous})=>{
     const a=window.__cosmos,w=a.world,b=w.bodies.earth,u=b.uniforms;
     b.mesh.material.fragmentShader=mode==='previous'?previous:window.earthCandidate.shader;b.mesh.material.needsUpdate=true;
     b.atmosphere.material.fragmentShader=mode==='previous'?window.earthCandidate.atmosphere.replace('*3.141592654;','*7.;'):window.earthCandidate.atmosphere;b.atmosphere.material.needsUpdate=true;w.cloudLayer.resolve.fragmentShader=mode==='previous'?window.earthCandidate.composite.replace('*3.141592654;','*7.;'):window.earthCandidate.composite;w.cloudLayer.resolve.needsUpdate=true;
     u.surfaceMap.value=mode==='previous'?window.earthBefore:window.earthCandidate.texture;u.saturation.value=mode==='previous'?.82:1;u.surfaceGain.value=mode==='previous'?1.08:1;
     w.update(a.game.player,0,{view:'probe',exposure:1});
     return {png:w.canvas.toDataURL().split(',')[1],calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles};
    },{mode,previous});
    await fs.writeFile(`tests/screenshots/v34-earth-${name.toLowerCase()}-${label}-${mode}.png`,Buffer.from(frame.png,'base64'));
    captures[mode]={calls:frame.calls,triangles:frame.triangles};
   }
   if(beforeImage)assert.deepEqual(captures.candidate,captures.previous);
   views.push({label,radius,phase,captures});
  }
  // Isolate material reflection with known geographic targets. Place the
  // Sun and observer along the local surface normal, then remove glint only.
  // The black cloud field removes weather occlusion for this diagnostic.
  const glint=await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,t=await import('three'),b=w.bodies.earth,u=b.uniforms,out=[];
   w.cloudLayer.enabled=()=>false;b.clouds.visible=b.atmosphere.visible=false;
   const empty=new t.DataTexture(new Uint8Array([0]),1,1,t.RedFormat);empty.needsUpdate=true;u.cloudMap.value=empty;
   for(const [label,lon,lat,water]of [['Pacific',-140,0,true],['Atlantic',-30,0,true],['Sahara',20,22,false],['Amazon',-64,-4,false],['Australia',134,-25,false],['Lake Superior',-87,47.7,true],['Caspian Sea',51,42,true],['Greenland',-42,74,false]]){
    const phi=((lon+180)/360-.12)*Math.PI*2,latitude=lat*Math.PI/180,flatten=b.data.flatten||1;
    const local=new t.Vector3(-Math.cos(phi)*Math.cos(latitude),Math.sin(latitude)*flatten,Math.sin(phi)*Math.cos(latitude));
    const n=new t.Vector3(local.x,local.y/(flatten*flatten),local.z).normalize().applyQuaternion(b.group.quaternion),c=w.bodyPositions.earth.copy(n).multiplyScalar(-149600000),target=local.multiplyScalar(6371).applyQuaternion(b.group.quaternion).add(c),p=target.clone().addScaledVector(n,6371*1.35);
    a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,target,new t.Vector3(0,1,0)));w.followReady=false;
    const pixels={};
    for(const mode of ['water-map','colour-rule','off']){
     b.mesh.material.fragmentShader=window.earthCandidate.shader.replace('float ocean=texture2D(waterMap,uv).r;',mode==='off'?'float ocean=0.;':mode==='colour-rule'?'float ocean=smoothstep(.015,.065,tex.b-max(tex.r,tex.g*.82));':'float ocean=texture2D(waterMap,uv).r;');b.mesh.material.needsUpdate=true;
     w.update(a.game.player,0,{view:'probe',exposure:1});const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.drawImage(w.canvas,Math.floor(w.canvas.width/2),Math.floor(w.canvas.height/2),1,1,0,0,1,1);pixels[mode]=[...x.getImageData(0,0,1,1).data].slice(0,3);
    }
    const signal=pixels['water-map'].reduce((s,v,i)=>s+v-pixels.off[i],0)/3,colourSignal=pixels['colour-rule'].reduce((s,v,i)=>s+v-pixels.off[i],0)/3;
    out.push({label,lon,lat,water,pixels,signal,colourSignal});
   }
   return out;
  });
  for(const p of glint){assert.ok(p.water?p.signal>25:Math.abs(p.signal)<=1,JSON.stringify({name,p}));}
  assert.ok(glint.find(p=>p.label==='Pacific').signal>glint.find(p=>p.label==='Pacific').colourSignal+25);
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),resources,views,glint,errors,passed:true});console.log({name,views:views.length,glint:glint.map(p=>({label:p.label,signal:p.signal})),passed:true});
 }finally{await browser.close()}
 await fs.writeFile('tests/earth-surface-v34-results.json',JSON.stringify({version:'0.34.0',previousImageCompared:!!beforeImage,interpretation:'Matched views and geographic reflection regression; not a claim of photographic equivalence.',outcomes},null,2));
}
