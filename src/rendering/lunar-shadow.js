import * as THREE from 'three';
import {lunarVisibility} from './shaders.js';

// Filter visibility, rather than averaged terrain heights. One reusable R8
// field covers the current sunlight direction; magnified views still trace
// the source terrain directly. No downloaded image or invented relief.
export class LunarShadow {
 constructor(world){
  this.world=world;this.body=world.bodies.moon;this.sun=new THREE.Vector3(Infinity,Infinity,Infinity);this.updates=0;
  const image=this.body.uniforms.reliefHeight.value.image,limit=world.renderer.capabilities.maxTextureSize;
  const scale=Math.min(1,limit/image.width);
  this.target=new THREE.WebGLRenderTarget(Math.floor(image.width*scale),Math.floor(image.height*scale),{
   format:THREE.RedFormat,type:THREE.UnsignedByteType,depthBuffer:false,
   minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter,
   generateMipmaps:true,wrapS:THREE.RepeatWrapping,anisotropy:Math.min(16,world.renderer.capabilities.getMaxAnisotropy())
  });
  this.body.uniforms.reliefVisibility.value=this.target.texture;
  const material=new THREE.ShaderMaterial({
   uniforms:{reliefHeight:this.body.uniforms.reliefHeight,localSun:{value:new THREE.Vector3()},sunAngle:{value:0}},
   vertexShader:'varying vec2 fieldUV;void main(){fieldUV=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}',
   fragmentShader:`uniform sampler2D reliefHeight;uniform vec3 localSun;uniform float sunAngle;varying vec2 fieldUV;
    ${lunarVisibility}
    void main(){float lon=fieldUV.x*6.283185307,lat=(fieldUV.y-.5)*3.141592654;
     vec3 direction=vec3(-cos(lon)*cos(lat),sin(lat),sin(lon)*cos(lat));
     gl_FragColor=vec4(lunarVisibility(direction),0.,0.,1.);
    }`,depthTest:false,depthWrite:false,toneMapped:false
  });
  this.scene=new THREE.Scene();this.scene.add(new THREE.Mesh(world.resolveScene.children[0].geometry,material));this.material=material;
  world.canvas.addEventListener('webglcontextrestored',()=>{this.sun.set(Infinity,Infinity,Infinity);});
 }
 prepare(sun,sunAngle){
  if(this.sun.equals(sun)&&this.sunAngle===sunAngle)return;
  const renderer=this.world.renderer,previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel();
  this.material.uniforms.localSun.value.copy(sun);this.material.uniforms.sunAngle.value=sunAngle;
  try{renderer.setRenderTarget(this.target);renderer.render(this.scene,this.world.resolveCamera);}
  finally{renderer.setRenderTarget(previous,face,mip);}
  this.sun.copy(sun);this.sunAngle=sunAngle;this.updates++;
 }
 update(){
  const w=this.world,b=this.body,u=b.uniforms;
  // Unresolved distant moons retain the direct path. The near-Moon field is
  // prepared while loading, so ordinary Earth/Moon exploration never bakes.
  const pixels=w.frameTarget.height/(u.localCamera.value.length()*Math.tan(w.camera.fov*Math.PI/360));
  if(pixels>8)this.prepare(u.localSun.value,u.sunAngle.value);
  u.reliefVisibilityReady.value=this.sun.equals(u.localSun.value)&&this.sunAngle===u.sunAngle.value?1:0;
 }
}
