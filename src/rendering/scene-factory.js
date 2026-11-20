import {cloudSkyTable} from './cloud-skylight.js';
import {gasCloudFragment} from './gas-clouds.js';
import * as THREE from 'three';
import {BODY_DATA} from '../mission.js';
import {clamp} from '../flight.js';
import {vertex,fragment,earthAtmosphereFragment,earthTransmittanceFragment,titanAtmosphereFragment,ringFragment,cloudFragment} from './shaders.js';
const V=THREE.Vector3;

// Optical columns to the top of the atmosphere. Precompute the sunlight
// integral once; fragment shading then needs one lookup per view-ray sample.
function atmosphereOpticalDepth(titan=false){
 const width=512,height=128,samples=96,radius=BODY_DATA[titan?'titan':'earth'].radius,top=radius*(titan?1.24:1.018);
 const data=new Uint16Array(width*height*2);
 for(let y=0;y<height;y++){
  const altitude=(y/(height-1))**2*(top-radius),r=radius+altitude;
  const horizon=-Math.sqrt(Math.max(0,1-radius*radius/(r*r)));
  for(let x=0;x<width;x++){
   const mu=Math.max((titan?-.7:-.2)+(titan?1.7:1.2)*x/(width-1),horizon+.000001);
   const end=-r*mu+Math.sqrt(r*r*mu*mu+top*top-r*r);let molecular=0,aerosol=0;
   for(let i=0;i<samples;i++){
    const a=(i/samples)**2*end,b=((i+1)/samples)**2*end,t=(a+b)*.5;
    const h=Math.max(0,Math.sqrt(r*r+t*t+2*r*mu*t)-radius);
    molecular+=Math.exp(-h/(titan?65:8))*(b-a);aerosol+=(titan?Math.exp(-.5*((h-BODY_DATA.titan.hazeLayer)/18)**2):Math.exp(-h/1.2))*(b-a);
   }
   const offset=(y*width+x)*2;data[offset]=THREE.DataUtils.toHalfFloat(molecular);data[offset+1]=THREE.DataUtils.toHalfFloat(aerosol);
  }
 }
 const texture=new THREE.DataTexture(data,width,height,THREE.RGFormat,THREE.HalfFloatType);
 texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;return texture;
}
export function spacecraftMaterials(material){
 if(material.name==='brass'){
  material.roughness=.34;material.metalness=.9;return;
 }
 if(material.name.startsWith('tex_02')){
  const ao=material.map.clone();ao.colorSpace=THREE.NoColorSpace;ao.channel=0;ao.needsUpdate=true;
  material.aoMap=ao;material.aoMapIntensity=.8;material.map=null;
  material.color.setRGB(.69,.70,.68);material.roughness=.58;material.metalness=.08;return;
 }
 if(material.name!=='tex_01'||!material.map)return;
 const image=material.map.image,canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
 const original=ctx.getImageData(0,0,canvas.width,canvas.height).data,packed=new Uint8Array(original.length),normal=new Uint8Array(original.length);
 const width=canvas.width,height=canvas.height;
 const luminance=i=>(original[i]*.2126+original[i+1]*.7152+original[i+2]*.0722)/255;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,r=original[i]/255,g=original[i+1]/255,b=original[i+2]/255,l=luminance(i);
  const gold=clamp((r-b-.08)*5,0,1)*clamp((r-.2)*4,0,1),dark=1-clamp((l-.09)/.13,0,1);
  const grey=(1-clamp(Math.max(r,g,b)-Math.min(r,g,b),0,1))*clamp((l-.2)*6,0,1)*(1-clamp((l-.55)*5,0,1));
  packed[i]=255;packed[i+1]=255*(.64+dark*.18-gold*.30-grey*.16);packed[i+2]=255*Math.max(gold*.92,grey*.55)*(1-dark);packed[i+3]=255;
  const dx=luminance((y*width+Math.min(width-1,x+1))*4)-luminance((y*width+Math.max(0,x-1))*4);
  const dy=luminance((Math.min(height-1,y+1)*width+x)*4)-luminance((Math.max(0,y-1)*width+x)*4);
  const nx=-clamp(dx,-.08,.08)*dark*3,ny=-clamp(dy,-.08,.08)*dark*3,inv=1/Math.sqrt(nx*nx+ny*ny+1);
  normal[i]=(nx*inv*.5+.5)*255;normal[i+1]=(ny*inv*.5+.5)*255;normal[i+2]=(inv*.5+.5)*255;normal[i+3]=255;
 }
 const make=data=>{const t=new THREE.DataTexture(data,width,height);t.flipY=false;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};
 material.roughness=1;material.metalness=1;material.roughnessMap=material.metalnessMap=make(packed);
 material.normalMap=make(normal);material.normalScale.set(.5,.5);
}

// Use the same measured height field for the silhouette and terrain shadows.
// Sample at texel centres; all duplicated pole vertices share one mean height.
function lunarGeometry(image){
 const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
 const context=canvas.getContext('2d');context.drawImage(image,0,0);
 const width=canvas.width,height=canvas.height,data=context.getImageData(0,0,width,height).data;
 canvas.width=canvas.height=1;
 const poles=[0,0];for(let x=0;x<width;x++){poles[0]+=data[x*4]/width;poles[1]+=data[((height-1)*width+x)*4]/width;}
 const geometry=new THREE.SphereGeometry(1,512,288),positions=geometry.attributes.position,uv=geometry.attributes.uv;
 let radiusSquared=0;
 for(let i=0;i<positions.count;i++){
  const u=uv.getX(i),v=uv.getY(i),x=u*width-.5,y=clamp((1-v)*height-.5,0,height-1);
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,left=(ix+width)%width,right=(left+1)%width,bottom=Math.min(height-1,iy+1);
  const topValue=data[(iy*width+left)*4]*(1-fx)+data[(iy*width+right)*4]*fx;
  const bottomValue=data[(bottom*width+left)*4]*(1-fx)+data[(bottom*width+right)*4]*fx;
  const value=v===1?poles[0]:v===0?poles[1]:topValue*(1-fy)+bottomValue*fy;
  const scale=1+(value/255*21-10)/BODY_DATA.moon.radius;
  positions.setXYZ(i,positions.getX(i)*scale,positions.getY(i)*scale,positions.getZ(i)*scale);
  radiusSquared=Math.max(radiusSquared,positions.getX(i)**2+positions.getY(i)**2+positions.getZ(i)**2);
 }
 // Bearings and reflection bounds are centred on the physical body origin.
 geometry.boundingSphere=new THREE.Sphere(new V(),Math.sqrt(radiusSquared));return geometry;
}

export function createBodies(world){
  // Resolve the shared physical footprint once, including device resizing.
  const limit=world.renderer.capabilities.maxTextureSize;
  const cloudWidth=Math.min(world.textures['earth-clouds.avif'].image.width,limit);
  const heightWidth=Math.min(world.textures['earth-cloud-height.png'].image.width,limit);
  const cloudHeightLodBias={value:Math.log2(heightWidth/cloudWidth)};
  const cloudPatch={cloudPatchMap:{value:world.textures['earth-clouds.avif']},cloudPatchRegion:{value:new THREE.Vector4()},cloudPatchWeight:{value:0},cloudPatchBias:{value:Math.log2(32768/cloudWidth)}};
  const sphere=new THREE.SphereGeometry(1,256,144),opticalDepth=atmosphereOpticalDepth(),titanDepth=atmosphereOpticalDepth(true);
  const ringShadow=new THREE.DataTexture(new Uint16Array(world.ringProfile.length/4),world.ringProfile.length/4,1,THREE.RedFormat,THREE.HalfFloatType);
  ringShadow.minFilter=THREE.LinearMipmapLinearFilter;ringShadow.magFilter=THREE.LinearFilter;ringShadow.generateMipmaps=true;
  for(const [id,d]of Object.entries(BODY_DATA)){
   const group=new THREE.Group();world.scene.add(group);
   if(d.poleRA!==undefined){const ra=d.poleRA*Math.PI/180,dec=d.poleDec*Math.PI/180;
    const axis=new V(Math.cos(dec)*Math.cos(ra),Math.sin(dec),-Math.cos(dec)*Math.sin(ra));group.quaternion.setFromUnitVectors(new V(0,1,0),axis);
   }
   const uniforms={planetRadius:{value:d.radius},cloudTime:{value:0},...cloudPatch,surfacePatchMap:{value:world.textures[BODY_DATA.earth.map]},surfacePatchRegion:{value:new THREE.Vector4()},surfacePatchWeight:{value:0},opticalDepth:{value:id==='titan'?titanDepth:opticalDepth},waterMap:{value:world.textures['earth-water.png']},ringIrradiance:{value:null},reliefHeight:{value:world.textures['moon-height.webp']},reliefShadows:{value:1},reliefVisibility:{value:world.textures['moon-height.webp']},reliefVisibilityReady:{value:0},lunar:{value:id==='moon'?1:0},reliefNormal:{value:world.textures['moon-normal.avif']},graphicMap:{value:id==='jupiter'?1:0},surfaceMap:{value:world.textures[d.map]||world.textures['saturn.avif']},ringMap:{value:world.textures['saturn-ring.png']},cloudMap:{value:world.textures['earth-clouds.avif']},cloudHeightMap:{value:world.textures['earth-cloud-height.png']},cloudHeightLodBias,
    sunlight:{value:new V(1,0,0)},localSun:{value:new V(1,0,0)},localCamera:{value:new V()},occluder:{value:new THREE.Vector4()},sunAngle:{value:0},surfaceGain:{value:id==='earth'?1:id==='saturn'?1.12:id==='jupiter'?1.05:1},giant:{value:['jupiter','saturn'].includes(id)?1:0},flatten:{value:d.flatten||1},hasMap:{value:d.map?1:0},hasRings:{value:d.rings?1:0},earth:{value:id==='earth'?1:0},rotation:{value:0},saturation:{value:id==='saturn'?.82:1.0}};
   uniforms.ringShadow={value:ringShadow};
   uniforms.lunarPolarColor={value:world.textures['moon-polar-color.avif']};uniforms.lunarPolarNormal={value:world.textures['moon-polar-normal.avif']};
   uniforms.saturnPolarColor={value:world.textures['saturn-polar.avif']};
   let mat=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment});
   if(id==='titan')mat=new THREE.MeshBasicMaterial({color:0x080604});
   if(id==='sun')mat=new THREE.MeshBasicMaterial({color:0xfff4e3,toneMapped:false});
   const bodyGeometry=id==='moon'?lunarGeometry(world.textures['moon-height.webp'].image):sphere;
   const mesh=new THREE.Mesh(bodyGeometry,mat);group.add(mesh);
   let ring;
   if(d.rings){
    const geo=new THREE.RingGeometry(1.235,2.323,512,4);geo.rotateX(-Math.PI/2);
    const rm=new THREE.ShaderMaterial({uniforms:{ringMap:uniforms.ringMap,localSun:uniforms.localSun,localCamera:uniforms.localCamera,sunAngle:uniforms.sunAngle,flatten:{value:1}},vertexShader:vertex,fragmentShader:ringFragment,transparent:true,side:THREE.DoubleSide,depthWrite:false});
    ring=new THREE.Mesh(geo,rm);ring.renderOrder=1;group.add(ring);
   }
   let atmosphere,clouds,transmission;
   if(d.atmosphere){
    const am=new THREE.ShaderMaterial({uniforms:{flatten:uniforms.flatten,sunlight:uniforms.sunlight,localSun:uniforms.localSun,localCamera:uniforms.localCamera,opticalDepth:uniforms.opticalDepth,sunAngle:uniforms.sunAngle,occluder:uniforms.occluder},vertexShader:vertex,fragmentShader:id==='earth'?earthAtmosphereFragment:titanAtmosphereFragment,transparent:true,depthWrite:false,blending:THREE.NormalBlending});
    if(id==='earth'){
     // First attenuate existing scene colour per channel, then add in-scattered
     // radiance. A single scalar alpha cannot represent wavelength extinction.
     am.blending=THREE.CustomBlending;am.blendSrc=am.blendDst=THREE.OneFactor;
     am.blendSrcAlpha=THREE.ZeroFactor;am.blendDstAlpha=THREE.OneFactor;
     const tm=am.clone();tm.uniforms=am.uniforms;tm.fragmentShader=earthTransmittanceFragment;
     tm.toneMapped=false;tm.blendSrc=THREE.ZeroFactor;tm.blendDst=THREE.SrcColorFactor;
     transmission=new THREE.Mesh(sphere,tm);transmission.scale.setScalar(1.018);
     transmission.renderOrder=1.5;group.add(transmission);
    }
    if(id==='titan')am.side=THREE.BackSide;
    const atm=atmosphere=new THREE.Mesh(sphere,am);atm.scale.setScalar(d.haze?1.24:1.018);atm.renderOrder=2;group.add(atm);
   }
   if(id==='earth'){
    const sky=cloudSkyTable();
    const skyMap=new THREE.DataTexture(Uint16Array.from(sky.data,THREE.DataUtils.toHalfFloat),sky.width,sky.height,THREE.RGBAFormat,THREE.HalfFloatType);
    skyMap.minFilter=skyMap.magFilter=THREE.LinearFilter;skyMap.needsUpdate=true;
    uniforms.cloudSky={value:skyMap};
    const cloudMat=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:cloudFragment,transparent:true,depthWrite:false});
    clouds=new THREE.Mesh(sphere,cloudMat);clouds.scale.setScalar(1.00143);clouds.renderOrder=3;group.add(clouds);
   }
   if(id==='jupiter'||id==='saturn'){
    const material=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:gasCloudFragment,transparent:true,depthWrite:false});
    clouds=new THREE.Mesh(sphere,material);clouds.scale.setScalar(1+90/d.radius);clouds.renderOrder=id==='saturn'?.5:3;group.add(clouds);
   }
   const reflectionRadius=Math.max(...group.children.map(o=>{
    if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();
    return o.geometry.boundingSphere.radius*Math.max(o.scale.x,o.scale.y,o.scale.z);
   }));
   world.bodies[id]={group,mesh,ring,uniforms,atmosphere,clouds,transmission,reflectionRadius,data:d,inverseOrientation:group.quaternion.clone().invert()};
  }
 }

export function createStars(world){
  // NASA's J2000 plate has RA 0 at its centre, east towards the left.
  // SphereGeometry faces RA 0 at u=.5 too, but its u increases eastward.
  // Reflect only the diffuse map, not the sky or the catalogue coordinates.
  const map=world.textures['milky-way.webp'];map.repeat.x=-1;map.offset.x=1;
  const material=new THREE.MeshBasicMaterial({map,color:0xffffff,side:THREE.BackSide,depthTest:false,depthWrite:false});
  world.galacticSky=new THREE.Mesh(new THREE.SphereGeometry(1,96,48),material);
  world.galacticSky.frustumCulled=false;world.galacticSky.renderOrder=-1;world.sky.add(world.galacticSky);
  const p=[],col=[],sz=[];
  for(const [ra0,dec0,mag,bv0]of world.starData.stars){const ra=ra0*Math.PI/180,dec=dec0*Math.PI/180;
   p.push(Math.cos(dec)*Math.cos(ra)*12000,Math.sin(dec)*12000,-Math.cos(dec)*Math.sin(ra)*12000);
   const bv=(bv0==null||bv0==='') ? .5 : Number(bv0);const color=new THREE.Color().setRGB(clamp(1+bv*.15,.7,1),clamp(1-Math.abs(bv-.2)*.12,.7,1),clamp(1-bv*.28,.45,1));
   // Catalogue positions stay fixed. Compress magnitude range for a display;
   // the kernel below distributes each star's light instead of sampling a dot.
   const flux=7*Math.pow(10,-.32*mag);col.push(color.r*flux,color.g*flux,color.b*flux);sz.push(clamp(1.95-.13*mag,1.12,2.2));
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.setAttribute('size',new THREE.Float32BufferAttribute(sz,1));
  world.starMaterial=new THREE.ShaderMaterial({uniforms:{visibility:{value:1},pixelRatio:{value:1}},vertexShader:`
   attribute float size;attribute vec3 color;uniform float pixelRatio;
   varying vec3 flux;varying float radius,diameter;
   void main(){
    flux=color*pixelRatio*pixelRatio;radius=size*pixelRatio;diameter=ceil(radius*2.+2.);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=diameter;
   }`,fragmentShader:`
   uniform float visibility;varying vec3 flux;varying float radius,diameter;
   void main(){
    vec2 p=(gl_PointCoord-.5)*diameter;
    // Integrate a compact separable point-spread function over this pixel.
    // Differences of its CDF sum to one even as the star crosses pixel edges.
    vec2 w=smoothstep(vec2(-radius),vec2(radius),p+.5)-smoothstep(vec2(-radius),vec2(radius),p-.5);
    gl_FragColor=vec4(flux*(visibility*w.x*w.y),1.);
   }`,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  world.sky.add(new THREE.Points(geo,world.starMaterial));
 }

export function createSunGlare(world){
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0],3));
  const mat=new THREE.ShaderMaterial({uniforms:{size:{value:12},intensity:{value:1}},vertexShader:`uniform float size;void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=size;}`,fragmentShader:`uniform float intensity;void main(){float r=length(gl_PointCoord-.5)*2.;float a=exp(-r*r*14.)+.04*exp(-r*r*3.);gl_FragColor=vec4(vec3(1.,.94,.82)*intensity,a*smoothstep(1.,.8,r));}`,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending});
  world.sunGlare=new THREE.Points(geo,mat);world.sunGlare.frustumCulled=false;world.scene.add(world.sunGlare);world.sunGlare.renderOrder=10;
 }
