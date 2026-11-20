import {discFraming,annulusFraming} from './view-framing.js';
import {decodeChartEphemeris} from './chart-ephemeris.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {BODY_DATA,surfaceRotation} from './mission.js';
import {AU,clamp,angularDiameter} from './flight.js';
import {ringIrradianceMap,ringTransmissionProfile} from './rendering/ringshine.js';
import {solarVisibility} from './rendering/lighting.js';
import {CloudDetail} from './rendering/cloud-detail.js';
import {CloudLayer} from './rendering/cloud-layer.js';
import {LunarShadow} from './rendering/lunar-shadow.js';
import {GeometryDetail} from './rendering/geometry-detail.js';
import {resolveFragment} from './rendering/shaders.js';
import {createBodies,createStars,createSunGlare,spacecraftMaterials} from './rendering/scene-factory.js';
const V=THREE.Vector3;
export const icrf = a => new V(a[0],a[2],-a[1]);
export class CosmosWorld {
 constructor(canvas,onProgress){
  this.canvas=canvas;this.onProgress=onProgress;
  this.scratch={forward:new V(),relative:new V(),unitRelative:new V(),sun:new V(),occluder:new V(),localSun:new V(),inverseFollow:new THREE.Quaternion(),nextFollow:new THREE.Quaternion(),project:new V(),projectRotation:new THREE.Quaternion()};
  this.renderCount=0;this.needsRender=true;this.environmentPosition=new V(Infinity,Infinity,Infinity);this.environmentDirty=true;
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:false,logarithmicDepthBuffer:true});
  this.renderer.setClearColor(0x000000);this.renderer.autoClear=false;
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.toneMapping=THREE.NeutralToneMapping;this.renderer.toneMappingExposure=1.05;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.camera=new THREE.PerspectiveCamera(58,1,.001,40000);
  this.scene=new THREE.Scene();this.sky=new THREE.Scene();this.shipScene=new THREE.Scene();
  this.shipCamera=new THREE.PerspectiveCamera(58,1,.01,200);
  // Keep the neutral chase silhouette above the reading area and time line.
  // A fixed offset preserves independent look and the shared physical lens.
  this.shipCamera.position.set(-10,-2.5,26);this.follow=new THREE.Quaternion();this.followReady=false;
  this.shipKey=new THREE.DirectionalLight(0xfffaf0,3.7);this.shipKey.castShadow=true;this.shipKey.shadow.mapSize.set(2048,2048);Object.assign(this.shipKey.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:1,far:100});this.shipKey.shadow.bias=-.0001;this.shipKey.shadow.normalBias=.005;this.shipScene.add(this.shipKey);
  this.shipKey.shadow.autoUpdate=false;
  // Readability aid for the *external model* far from a reflecting planet.
  // Not a physical light source; it cannot illuminate planets or cast shadows.
  this.chaseFill=new THREE.HemisphereLight(0xd2deec,0x98908b,0);
  this.shipScene.add(this.chaseFill);
  this.shadowPose={direction:new V(Infinity,Infinity,Infinity),orientation:new THREE.Quaternion(),updates:0};
  this.environmentTarget=new THREE.WebGLCubeRenderTarget(64,{type:THREE.HalfFloatType});this.environmentCamera=new THREE.CubeCamera(.05,40000,this.environmentTarget);this.environmentClock=10;this.pmrem=new THREE.PMREMGenerator(this.renderer);this.pmrem.compileCubemapShader();
  this.shipRoot=new THREE.Group();this.shipScene.add(this.shipRoot);
  this.bodies={};this.textures={};this.bodyPositions={};this.ratio=1.5;
  this.exposure=1;this.view='probe';this.look=new THREE.Quaternion();
  this.quality='high';
  this.frameTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:2});
  this.resolveScene=new THREE.Scene();this.resolveCamera=new THREE.Camera();
  this.resolveMaterial=new THREE.ShaderMaterial({uniforms:{sceneColor:{value:this.frameTarget.texture}},vertexShader:'varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:resolveFragment,depthTest:false,depthWrite:false});
  this.resolveScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.resolveMaterial));
  this.renderer.info.autoReset=false;this.resize();
  canvas.addEventListener('webglcontextrestored',()=>{
   // Restore a held frame through the same native-detail path immediately.
   this.restoreSettledView=!!this.lastRender?.options.settled;
   this.environmentDirty=true;this.environmentClock=10;
   this.shadowPose.direction.set(Infinity,Infinity,Infinity);this.needsRender=true;
  });
 }
 async load({onModel,onWarmup}={}){
  let done=0;const files=[...new Set(Object.values(BODY_DATA).map(x=>x.map).filter(Boolean)),'earth-clouds.avif','earth-cloud-height.png','earth-water.png','saturn-ring.png','moon-normal.avif','moon-height.webp','moon-polar-color.avif','moon-polar-normal.avif','saturn-polar.avif','milky-way.webp'];
  const loader=new THREE.TextureLoader(),compressed=new KTX2Loader().setTranscoderPath('vendor/three/addons/libs/basis/').setWorkerLimit(1).detectSupport(this.renderer);
  const lunarCompressed=new KTX2Loader().setTranscoderPath('vendor/three/addons/libs/basis/').setWorkerLimit(1).detectSupport(this.renderer);
  // The opaque lunar map uses four-bit blocks where available, keeping the
  // larger source practical without changing any other world's colour format.
  if(lunarCompressed.workerConfig.dxtSupported||lunarCompressed.workerConfig.etc2Supported)lunarCompressed.workerConfig.bptcSupported=false;
  const texJobs=files.map(async file=>{
   const dimension=file.endsWith('.ktx2')?16384:0;
   const limit=this.renderer.capabilities.maxTextureSize;
   const sourceFile=dimension>limit&&limit<8192?file.replace('.ktx2','.avif'):file;
   const decoder=sourceFile.endsWith('.ktx2')?(file==='moon.ktx2'?lunarCompressed:compressed):loader;
   let tex=await decoder.loadAsync(`assets/textures/${sourceFile}`);
   if(tex.isCompressedTexture&&tex.image.width>limit){
    while(tex.mipmaps[0].width>limit)tex.mipmaps.shift();
    tex.image.width=tex.mipmaps[0].width;tex.image.height=tex.mipmaps[0].height;
   }
   // Proportional resizing would round a one-row ring profile down to zero.
   // Keep that row; shadow and indirect-light profiles read this same image.
   if(tex.image.height===1&&tex.image.width>this.renderer.capabilities.maxTextureSize){
    const strip=document.createElement('canvas');strip.width=this.renderer.capabilities.maxTextureSize;strip.height=1;
    strip.getContext('2d').drawImage(tex.image,0,0,strip.width,1);tex.image=strip;
   }
   tex.colorSpace=(file==='earth-clouds.avif'||file==='earth-cloud-height.png'||file==='earth-water.png'||file.endsWith('-normal.avif')||file==='moon-height.webp')?THREE.NoColorSpace:THREE.SRGBColorSpace;
   // The single-channel fields only read .r in the shaders. R8 retains
   // that channel exactly while avoiding three unused channels and mip chains.
   if(file==='earth-clouds.avif'||file==='earth-cloud-height.png'||file==='earth-water.png'||file==='moon-height.webp')tex.format=THREE.RedFormat;
   if(file.endsWith('-normal.avif'))tex.format=THREE.RGFormat;
   tex.anisotropy=file.startsWith('earth-cloud')?1:Math.min(16,this.renderer.capabilities.getMaxAnisotropy());
   // Terrain rays explicitly read level zero; the silhouette reads the image
   // on the CPU. No height consumer needs an anisotropic or mipmapped sample.
   if(file==='moon-height.webp'){tex.anisotropy=1;tex.generateMipmaps=false;tex.minFilter=THREE.LinearFilter;}
   tex.wrapS=file.includes('-polar')?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;this.textures[file]=tex;
   this.renderer.initTexture(tex);
   this.onProgress?.(++done/(files.length+5));
  });
  const dataJobs=[fetch('assets/chart-ephemeris.bin').then(r=>r.arrayBuffer()).then(b=>{this.chartEphemeris=decodeChartEphemeris(b);this.onProgress?.(++done/(files.length+5));}),fetch('assets/cruise.json').then(r=>r.json()).then(d=>{this.cruise=d;this.onProgress?.(++done/(files.length+5));}),fetch('assets/ephemeris.json').then(r=>r.json()).then(d=>{this.ephemeris=d;this.onProgress?.(++done/(files.length+5));}),
   fetch('assets/stars-compact.json').then(r=>r.json()).then(d=>{this.starData=d;this.onProgress?.(++done/(files.length+5));}),
   new GLTFLoader().loadAsync('assets/models/voyager-compact.glb').then(g=>{
    const box=new THREE.Box3().setFromObject(g.scene);const size=box.getSize(new V());const center=box.getCenter(new V());
    g.scene.position.sub(center);const wrap=new THREE.Group();wrap.add(g.scene);wrap.scale.setScalar(12/Math.max(size.x,size.y,size.z));
    wrap.rotation.set(-.28,.4,-1.08);this.shipRoot.add(wrap);this.ship=wrap;const configured=new Set();
    g.scene.traverse(o=>{
     if(!o.isMesh)return;
     o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;
     for(const mat of (Array.isArray(o.material)?o.material:[o.material]))if(!configured.has(mat)){
      spacecraftMaterials(mat);configured.add(mat);
      for(const value of Object.values(mat))if(value?.isTexture)this.renderer.initTexture(value);
     }
    });
    this.onProgress?.(++done/(files.length+5));onModel?.();
   })];
  await Promise.all([...texJobs,...dataJobs]).finally(()=>{compressed.dispose();lunarCompressed.dispose();});
  // Warm-up now owns the shared framebuffer until its native viewport is restored.
  onWarmup?.();
  const ringImage=this.textures['saturn-ring.png'].image,profile=document.createElement('canvas');
  profile.width=ringImage.width;profile.height=1;const profileContext=profile.getContext('2d');profileContext.drawImage(ringImage,0,0,profile.width,1);
  this.ringProfile=profileContext.getImageData(0,0,profile.width,1).data;this.ringLightCache=new Map();
  this.createBodies();this.createStars();this.createSunGlare();
  // Finish this small cache while loading, yielding between epochs. Selecting
  // a viewpoint then only binds an existing texture, without integration work.
  for(let epoch=0;epoch<this.ephemeris.objects.saturn.length;epoch++){
   this.ringLightTexture(epoch);await new Promise(resolve=>setTimeout(resolve,0));
  }
  const moonPosition=icrf(this.ephemeris.objects.moon[0].position);
  this.lunarShadow.prepare(moonPosition.clone().negate().normalize().applyQuaternion(this.bodies.moon.inverseOrientation),695700/moonPosition.length());
  this.setEpoch(2);
  // Compile the pipelines actually used in flight: linear scene targets,
  // indirect spacecraft light, and both adaptive cloud compositions.
  // The first chase frame replaces this empty reflection with its real scene.
  this.renderer.initRenderTarget(this.environmentTarget);
  this.shipEnvironment=this.pmrem.fromCubemap(this.environmentTarget.texture);
  this.shipScene.environment=this.shipEnvironment.texture;
  // Some drivers finish a compiled pipeline on its first draw. Use one
  // offscreen pixel while loading, including spacecraft and shadow pipelines.
  this.frameTarget.viewport.set(0,0,1,1);
  this.renderer.setRenderTarget(this.frameTarget);
  try{
   for(const scene of [this.scene,this.sky,this.cloudLayer.volumeScene,this.cloudLayer.resolveScene,this.cloudLayer.splitScene]){
    await this.renderer.compileAsync(scene,this.camera);this.renderer.render(scene,this.camera);
   }
   this.cloudLayer.selectDetail(1);
   for(const scene of [this.scene,this.cloudLayer.volumeScene]){
    await this.renderer.compileAsync(scene,this.camera);this.renderer.render(scene,this.camera);
   }
   this.cloudLayer.selectDetail(0);
   await this.renderer.compileAsync(this.shipScene,this.shipCamera);
   this.shipKey.shadow.needsUpdate=true;
   this.renderer.clearDepth();this.renderer.render(this.shipScene,this.shipCamera);
   this.geometryDetail.prepare(this.renderer,this.scene,this.camera);
  }finally{this.frameTarget.viewport.set(0,0,this.frameTarget.width,this.frameTarget.height);this.renderer.setRenderTarget(null);}
  await this.renderer.compileAsync(this.resolveScene,this.resolveCamera);
 }
 createBodies(){createBodies(this);this.bodyEntries=Object.entries(this.bodies);
  this.geometryDetail=new GeometryDetail(this.bodies);
  this.lunarShadow=new LunarShadow(this);
  this.cloudDetail=new CloudDetail(this);
  this.surfaceDetail=new CloudDetail(this,{surface:true});
  this.cloudLayer=new CloudLayer(this.bodies.earth.clouds,this.bodies.earth.atmosphere,this.bodies.earth.transmission);
 }
 createStars(){createStars(this);}
 createSunGlare(){createSunGlare(this);}
 setEpoch(epoch){
  this.needsRender=true;
  this.followReady=false;this.environmentClock=10;this.environmentDirty=true;this.epoch=epoch;this.bodyPositions={sun:new V()};
  for(const [id,records]of Object.entries(this.ephemeris.objects))this.bodyPositions[id]=icrf(records[epoch].position);
  this.bodies.saturn.uniforms.ringIrradiance.value=this.ringLightTexture(epoch);
  if(this.ringShadowEpoch!==epoch){
   const saturn=this.bodies.saturn,sun=this.bodyPositions.saturn.clone().negate().normalize().applyQuaternion(saturn.inverseOrientation);
   const shadow=saturn.uniforms.ringShadow.value;
   shadow.image.data.set(Uint16Array.from(ringTransmissionProfile(this.ringProfile,sun.y),THREE.DataUtils.toHalfFloat));
   shadow.needsUpdate=true;this.ringShadowEpoch=epoch;
  }
 }
 ringLightTexture(epoch){
  if(!this.ringLightCache.has(epoch)){
   const saturn=this.bodies.saturn,sun=icrf(this.ephemeris.objects.saturn[epoch].position).negate().normalize().applyQuaternion(saturn.inverseOrientation);
   const map=ringIrradianceMap(this.ringProfile,sun.toArray(),{flatten:saturn.data.flatten});
   const data=Uint16Array.from(map.data,THREE.DataUtils.toHalfFloat);
   const texture=new THREE.DataTexture(data,map.width,map.height,THREE.RGBAFormat,THREE.HalfFloatType);
   texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.wrapS=THREE.RepeatWrapping;texture.generateMipmaps=false;texture.needsUpdate=true;
   this.ringLightCache.set(epoch,texture);
  }
  return this.ringLightCache.get(epoch);
 }

 getFrame(body){
  const center=this.bodyPositions[body].clone();
  const towardSun=center.clone().negate().normalize();
  const up=new V(0,1,0);let right=new V().crossVectors(up,towardSun).normalize();
  if(right.length()<.1)right.set(1,0,0);
  const z=towardSun.clone().multiplyScalar(.72).addScaledVector(right,.69).normalize();
  const x=new V().crossVectors(up,z).normalize();const y=new V().crossVectors(z,x).normalize();
  return {center,x,y,z};
 }
 fromFrame(frame,coords,radius){return frame.center.clone().addScaledVector(frame.x,coords[0]*radius).addScaledVector(frame.y,coords[1]*radius).addScaledVector(frame.z,coords[2]*radius);}
 resize(){
  this.needsRender=true;
  const w=innerWidth,h=innerHeight,ratio=Math.min(devicePixelRatio,this.ratio),size=this.renderer.getSize(new THREE.Vector2());
  // High keeps worlds and clouds on the same display grid, including during turns.
  const outputRatio=this.quality==='high'?Math.min(devicePixelRatio,2):ratio;
  if(size.x!==w||size.y!==h||this.renderer.getPixelRatio()!==outputRatio)this.renderer.setDrawingBufferSize(w,h,outputRatio);
  if(this.frameTarget){
   const samples=devicePixelRatio>1?0:Math.min(4,this.renderer.capabilities.maxSamples);
   if(this.frameTarget.samples!==samples){this.frameTarget.dispose();this.frameTarget.samples=samples;}
   this.frameTarget.setSize(Math.floor(w*ratio),Math.floor(h*ratio));
  }
  this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.shipCamera.aspect=w/h;this.shipCamera.updateProjectionMatrix();
  if(this.starMaterial)this.starMaterial.uniforms.pixelRatio.value=ratio;
 }
 setQuality(q){
  this.quality=['ultra','high','balanced','performance'].includes(q)?q:'high';
  this.ratio=['high','ultra'].includes(this.quality)?Math.min(devicePixelRatio,2):this.quality==='balanced'?1.25:.75;
  this.resize();
 }
 setFov(value){this.needsRender=true;this.camera.fov=value;this.camera.updateProjectionMatrix();this.shipCamera.fov=value;this.shipCamera.updateProjectionMatrix();}
 cloudRatio(){return Math.min(devicePixelRatio,this.ratio);}
 environmentNeedsUpdate(position,time=0){
  if(this.environmentDirty)return true;
  const travel=this.environmentPosition.distanceTo(position);

  // Bound translation against the nearest reflecting surface and keep its
  // angular change below a texel in this 64px map. Map rotation uses the
  // same angular budget. Direct sunlight and
  // spacecraft shadows still follow every rendered pose.
  const texels=4*this.environmentTarget.width;
  return this.bodyEntries.some(([id,b])=>{
   if(id==='sun')return false;
   const distance=this.environmentPosition.distanceTo(this.bodyPositions[id]),radius=b.reflectionRadius*b.data.radius;
   const spin=b.data.rotationPeriod?Math.abs(time-this.environmentTime)*2*Math.PI/b.data.rotationPeriod:0;
   return travel>0&&travel*texels>=distance-radius||spin*Math.min(1,radius/distance)*texels>=1;
  });
 }
 viewSettling(player,dt,view,time=0){
  if(view!=='chase')return false;
  if(!this.followReady)return true;
  // Finish a pending reflection update before caching a held chase view.
  // Its normal interval advances only when a frame is rendered.
  if(this.environmentNeedsUpdate(player.position,time))return true;
  // Predict exactly the next interpolation, without advancing the camera.
  // Keep drawing until that step no longer changes its stored components.
  return !this.scratch.nextFollow.copy(this.follow).slerp(player.quaternion,1-Math.exp(-dt*7)).equals(this.follow);
 }
 cameraState(view){
  return {fov:this.camera.fov,...(view==='chase'&&this.followReady?{follow:this.follow.toArray()}:{})};
 }
 restoreCameraState({fov,follow}){
  if(Number.isFinite(fov))this.setFov(fov);
  this.followReady=!!follow;if(follow)this.follow.fromArray(follow);
  this.needsRender=true;
 }
 update(player,dt,{view='probe',exposure=1,time=0,menu=false,look=null,transit=false,settled=false}={}){
  if(this.restoreSettledView){settled=true;this.restoreSettledView=false;}
  this.renderCount++;this.needsRender=false;
  this.lastRender={player,options:{view,exposure,time,menu,look,transit,settled}};
  this.camera.position.set(0,0,0);if(!this.followReady){this.follow.copy(player.quaternion);this.followReady=true;}this.follow.slerp(player.quaternion,1-Math.exp(-dt*7));this.camera.quaternion.copy(view==='chase'?this.follow:player.quaternion);
  if(look)this.camera.quaternion.multiply(look);
  this.camera.updateMatrixWorld();
  let visibleBright=0;
  const work=this.scratch,forward=work.forward.set(0,0,-1).applyQuaternion(this.camera.quaternion);
  for(const [id,b]of this.bodyEntries){
   if(transit&&id!=='sun'){b.group.visible=false;continue;}
   const pos=this.bodyPositions[id];if(!pos)continue;
   const relative=work.relative.copy(pos).sub(player.position);const distance=relative.length();
   // Scale position and radius by the SAME amount. Angular size is invariant.
   const displayDistance=distance<=5e6?distance/1000:5000+Math.log1p((distance-5e6)/5e6)*800;
   const factor=displayDistance/Math.max(distance,.001);
   b.group.position.copy(relative).multiplyScalar(factor);b.group.scale.setScalar(b.data.radius*factor);
   const sun=work.sun.copy(pos).negate().normalize();b.uniforms.sunlight.value.copy(sun);
   b.uniforms.localSun.value.copy(sun).applyQuaternion(b.inverseOrientation);
   b.uniforms.localCamera.value.copy(relative).negate().divideScalar(b.data.radius).applyQuaternion(b.inverseOrientation);
   const moon={earth:'moon',moon:'earth',jupiter:'io',io:'jupiter',saturn:'titan',titan:'saturn'}[id];
   if(moon&&this.bodyPositions[moon]){const o=work.occluder.copy(this.bodyPositions[moon]).sub(pos).divideScalar(b.data.radius).applyQuaternion(b.inverseOrientation);b.uniforms.occluder.value.set(o.x,o.y,o.z,BODY_DATA[moon].radius/b.data.radius);b.uniforms.sunAngle.value=695700/pos.length();}
   b.uniforms.rotation.value=surfaceRotation(b.data,time);b.uniforms.cloudTime.value=time;
   const angle=angularDiameter(b.data.radius,distance);
   const unitRelative=work.unitRelative.copy(relative).normalize(),gaze=forward.dot(unitRelative);
   if(gaze>0.3)visibleBright=Math.max(visibleBright,Math.min(1,angle*3)*clamp((gaze-.3)/.4,0,1)*Math.sqrt(clamp((1+-sun.dot(unitRelative))*.5,0,1)));
   b.group.visible=distance>b.data.radius*.98;
  }
  const sunDistance=player.position.length();
  // A dark-adapted display outside the bright planetary encounters; catalogue
  // positions and relative flux are unchanged. This is not historic camera exposure.
  const outer=clamp((sunDistance/AU-16)/20,0,1),darkAdapt=1+2*outer*(1-visibleBright);
  // Diffuse light from unresolved stars is separate from the sharp bright-star
  // catalogue. Fade it near bright limbs; never enlarge bodies to fill the sky.
  const gain=(.38+.74*outer)*(1-clamp(visibleBright*2,0,1));
  this.galacticSky.visible=gain>.005;
  this.galacticSky.material.color.setScalar(gain);
  this.chaseFill.intensity=1.6*outer;
  this.starMaterial.uniforms.visibility.value=(.75-visibleBright*.72)*Math.pow(exposure,.7)*darkAdapt;
  const sunlightFraction=solarVisibility(player.position,this.bodyPositions,BODY_DATA);
  this.sunlightFraction=sunlightFraction;
  this.sunGlare.position.copy(this.bodies.sun.group.position);this.sunGlare.visible=sunlightFraction>.001;
  const renderRatio=Math.min(devicePixelRatio,this.ratio);
  const solarPixels=angularDiameter(695700,sunDistance)/(this.camera.fov*Math.PI/180)*innerHeight*renderRatio;
  this.sunGlare.material.uniforms.size.value=Math.max(8*renderRatio,solarPixels*3);
  this.sunGlare.material.uniforms.intensity.value=exposure*sunlightFraction;

  this.lunarShadow.update();
  this.cloudDetail.update();this.surfaceDetail.update();
  this.geometryDetail.select(this.camera,this.frameTarget.width,this.frameTarget.height,this.environmentTarget.width);
  this.renderer.toneMappingExposure=exposure;this.renderer.info.reset();
  this.environmentClock+=dt;
  if(view==='chase'&&(this.environmentClock>.8||dt===0)&&this.environmentNeedsUpdate(player.position,time)){
   this.cloudLayer.selectDetail(0);
   const auto=this.renderer.autoClear,sunVisible=this.bodies.sun.group.visible,glareVisible=this.sunGlare.visible;this.renderer.autoClear=true;
   // Direct sunlight already has a physical direction and shadow. Only the
   // surrounding worlds contribute indirect illumination and reflections.
   this.bodies.sun.group.visible=false;this.sunGlare.visible=false;
   this.environmentCamera.update(this.renderer,this.scene);
   this.bodies.sun.group.visible=sunVisible;this.sunGlare.visible=glareVisible;
   this.shipEnvironment=this.pmrem.fromCubemap(this.environmentTarget.texture,this.shipEnvironment);
   this.shipScene.environment=this.shipEnvironment.texture;this.renderer.autoClear=auto;this.environmentClock=0;this.environmentPosition.copy(player.position);this.environmentTime=time;this.environmentDirty=false;
  }
  this.cloudLayer.updateDetail(this.camera);
  this.renderer.setRenderTarget(this.frameTarget);
  this.renderer.clear();this.renderer.render(this.sky,this.camera);this.renderer.clearDepth();
  const layered=this.cloudLayer.enabled(this);
  if(layered){this.cloudLayer.cloud.visible=false;this.cloudLayer.atmosphere.visible=false;this.cloudLayer.transmission.visible=false;}
  this.renderer.render(this.scene,this.camera);
  if(layered){
   this.cloudLayer.cloud.visible=true;this.cloudLayer.atmosphere.visible=true;this.cloudLayer.transmission.visible=true;
   const cloudRatio=this.cloudRatio();
   this.cloudLayer.render(this.renderer,this.camera,this.frameTarget,Math.round(innerWidth*cloudRatio),Math.round(innerHeight*cloudRatio));
  }
  if(view==='chase'){
   const localSun=work.localSun.copy(player.position).negate().normalize().applyQuaternion(work.inverseFollow.copy(this.follow).invert());
   if(look)this.shipCamera.quaternion.copy(look);else this.shipCamera.quaternion.identity();
   this.shipKey.position.copy(localSun).multiplyScalar(50);this.shipKey.intensity=3.7*sunlightFraction;
   const rotation=this.shipScene.environmentRotation;rotation.setFromQuaternion(this.follow);rotation.set(-rotation.x,-rotation.y,-rotation.z,rotation.order);
   this.shipRoot.quaternion.copy(this.follow).invert().multiply(player.quaternion);
   // Reuse an unchanged shadow exactly. Even a subpixel pose tolerance can
   // expose depth-comparison changes on thin antennas, so any input change
   // refreshes the map; held views avoid redundant shadow draws.
   const shadow=this.shadowPose;
   if(!this.shipKey.shadow.map||!shadow.direction.equals(localSun)||!shadow.orientation.equals(this.shipRoot.quaternion)){
    this.shipKey.shadow.needsUpdate=true;shadow.direction.copy(localSun);shadow.orientation.copy(this.shipRoot.quaternion);shadow.updates++;
   }
   this.renderer.clearDepth();this.renderer.render(this.shipScene,this.shipCamera);
  }
  this.renderer.setRenderTarget(null);this.renderer.clear();this.renderer.render(this.resolveScene,this.resolveCamera);
 }
 // Solid body and atmosphere share a spherical observing envelope. Ring
 // geometry retains its separate planar extent; it is not a filled sphere.
 observationRadius(id){
  const b=this.bodies[id];
  return b.data.radius*Math.max(b.mesh.geometry.boundingSphere.radius,b.atmosphere?.scale.x||1);
 }
 // Photography and science share the visible subject, including ring-only
 // compositions. Most views finish at the existing solid/atmosphere test.
 observationFraming(id,player){
  const b=this.bodies[id],projection=this.project(this.bodyPositions[id],player);
  const frame=discFraming(projection,this.observationRadius(id),this.camera.fov,this.camera.aspect);
  frame.range=projection.distance;
  if(frame.visible||!b.ring)return frame;
  const {innerRadius,outerRadius}=b.ring.geometry.parameters;
  const envelope=discFraming(projection,outerRadius*b.data.radius,this.camera.fov,this.camera.aspect);
  if(!envelope.visible)return frame;
  const rotation=this.camera.quaternion.clone().invert(),plane=rotation.clone().multiply(b.group.quaternion);
  const center=this.bodyPositions[id].clone().sub(player.position).divideScalar(b.data.radius).applyQuaternion(rotation);
  const u=new V(1,0,0).applyQuaternion(plane),v=new V(0,0,1).applyQuaternion(plane),forward=p=>[p.x,p.y,-p.z];
  const ring=annulusFraming(forward(center),forward(u),forward(v),innerRadius,outerRadius,this.camera.fov,this.camera.aspect);
  if(!ring.visible)return frame;
  return {...envelope,range:projection.distance,feature:'rings',
   penetration:Math.min(envelope.penetration,ring.depth*b.data.radius/projection.distance),
   prominence:envelope.prominence*ring.tilt*(1-innerRadius*innerRadius/(outerRadius*outerRadius))};
 }
 project(target,player){
  const delta=this.scratch.project.copy(target).sub(player.position);const distance=delta.length();
  const v=delta.normalize().applyQuaternion(this.scratch.projectRotation.copy(this.camera.quaternion).invert());
  const front=v.z<0;
  const tan=Math.tan(this.camera.fov*Math.PI/360);
  const x=v.x/(Math.max(Math.abs(v.z),.0001)*tan*this.camera.aspect);
  const y=v.y/(Math.max(Math.abs(v.z),.0001)*tan);
  return {x,y,front,distance,angle:Math.acos(clamp(-v.z,-1,1))};
 }
 capture(player,options){
  const ratio=this.ratio,full=Math.min(devicePixelRatio,2),last=player?{player,options}:this.lastRender;
  if(!last)return this.canvas.toDataURL('image/jpeg',.94);
  const restore=!!this.capturing;
  try{
   this.capturing=true;
   if(['high','ultra'].includes(this.quality)&&ratio<full){this.ratio=full;this.resize();}
   this.update(last.player,0,last.options);
   return this.canvas.toDataURL('image/jpeg',.94);
  }finally{
   this.capturing=restore;
   if(this.ratio!==ratio){this.ratio=ratio;this.resize();}
   this.update(last.player,0,last.options);
  }
 }
}
