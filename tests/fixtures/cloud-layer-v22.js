import * as THREE from 'three';

// Volumetric integration has its own resolution budget. The opaque worlds,
// atmosphere, stars and spacecraft retain the main framebuffer's resolution.
// The original shell geometry resolves at full resolution against scene depth.
export class CloudLayer {
  constructor(cloud, atmosphere) {
    this.cloud = cloud;
    this.atmosphere = atmosphere;
    this.target = new THREE.WebGLRenderTarget(1, 1, {type: THREE.HalfFloatType, depthBuffer:false});
    const material = cloud.material.clone();
    material.uniforms = cloud.material.uniforms;
    material.blending = THREE.NoBlending;
    material.transparent = false;
    material.depthWrite = false;
    material.depthTest = false;
    // Filter premultiplied radiance so clear pixels do not darken cloud edges.
    material.fragmentShader = material.fragmentShader.replace(
      'vec4(radiance/alpha,alpha)', 'vec4(radiance,alpha)');
    this.volumeScene = new THREE.Scene();
    this.volume = new THREE.Mesh(cloud.geometry, material);
    this.volume.matrixAutoUpdate = false;
    this.volume.frustumCulled = false;
    this.volumeScene.add(this.volume);
    this.resolveScene = new THREE.Scene();
    this.resolve = new THREE.ShaderMaterial({
      uniforms: {...cloud.material.uniforms, cloudColor:{value:this.target.texture}, viewport:{value:new THREE.Vector2()}},
      vertexShader: cloud.material.vertexShader,
      fragmentShader: `#include <logdepthbuf_pars_fragment>
        uniform sampler2D cloudColor;uniform vec2 viewport;
        void main(){
          #include <logdepthbuf_fragment>
          vec4 cloud=texture2D(cloudColor,gl_FragCoord.xy/viewport);
          if(cloud.a<.0001)discard;
          gl_FragColor=cloud;
        }`,
      transparent:true,premultipliedAlpha:true,depthWrite:false
    });
    // Reuse the original shell at the main framebuffer's resolution. Normal
    // depth testing preserves the limb and foreground objects without copying
    // a depth buffer or resampling depth across different pixel grids.
    this.shell=new THREE.Mesh(cloud.geometry,this.resolve);
    this.shell.matrixAutoUpdate=false;this.shell.frustumCulled=false;
    this.shell.renderOrder=1;
    this.air=new THREE.Mesh(atmosphere.geometry,atmosphere.material);
    this.air.matrixAutoUpdate=false;this.air.frustumCulled=false;
    this.air.renderOrder=2;
    this.resolveScene.add(this.shell,this.air);
  }

  enabled(world) {
    const base=world.quality==='high' && !world.capturing &&
      this.cloud.parent.visible &&
      this.cloud.visible && this.atmosphere.visible;
    if(!base)return false;
    const projection=world.project(world.bodyPositions.earth,world.lastRender.player);
    const radius=Math.asin(Math.min(1,6371/projection.distance));
    const extent=Math.tan(radius)/Math.tan(world.camera.fov*Math.PI/360);
    return projection.front && extent*innerHeight>80 &&
      Math.abs(projection.x)<1+extent/world.camera.aspect && Math.abs(projection.y)<1+extent;
  }

  render(renderer, camera, frameTarget, width, height) {
    this.target.setSize(width, height);
    this.volume.matrix.copy(this.cloud.matrixWorld);
    this.shell.matrix.copy(this.cloud.matrixWorld);
    this.air.matrix.copy(this.atmosphere.matrixWorld);
    const alpha=renderer.getClearAlpha();
    renderer.setRenderTarget(this.target);
    renderer.setClearAlpha(0);renderer.clear();
    renderer.render(this.volumeScene,camera);
    renderer.setClearAlpha(alpha);
    renderer.setRenderTarget(frameTarget);
    this.resolve.uniforms.viewport.value.set(frameTarget.width,frameTarget.height);
    // Keep the original ordering: surface, clouds, then atmospheric scatter.
    renderer.render(this.resolveScene,camera);
  }
}
