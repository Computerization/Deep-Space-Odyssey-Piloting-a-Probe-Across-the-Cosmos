import * as THREE from 'three';

// Volumetric integration has its own resolution budget. The opaque worlds,
// atmosphere, stars and spacecraft retain the main framebuffer's resolution.
// High-density frames share one full-resolution cloud/atmosphere composite.
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
    const composite=atmosphere.material.fragmentShader.replace(
      'varying vec3 vLocal;',
      'varying vec3 vLocal;uniform sampler2D cloudColor;uniform vec2 viewport;'
    ).replace('gl_FragColor=vec4(scatter/max(opacity,.001),opacity);',`
      vec4 cloud=texture2D(cloudColor,gl_FragCoord.xy/viewport);
      // Keep resampled cloud colour inside its physical shell at full
      // resolution. The atmospheric limb retains its own larger support.
      float cloudAlong=dot(o,d);
      float cloudHit=cloudAlong*cloudAlong-dot(o,o)+1.00143*1.00143;
      if(cloudHit<0.)cloud=vec4(0.);
      vec3 airRadiance=scatter*(opacity/max(opacity,.001));
      gl_FragColor=vec4(airRadiance+cloud.rgb*(1.-opacity),opacity+cloud.a*(1.-opacity));
    `);
    this.resolve=new THREE.ShaderMaterial({
      uniforms:{...atmosphere.material.uniforms,cloudColor:{value:this.target.texture},viewport:{value:new THREE.Vector2()}},
      vertexShader:atmosphere.material.vertexShader,fragmentShader:composite,
      transparent:true,premultipliedAlpha:true,depthWrite:false
    });
    this.air=new THREE.Mesh(atmosphere.geometry,this.resolve);
    this.air.matrixAutoUpdate=false;this.air.frustumCulled=false;
    this.air.renderOrder=2;
    this.resolveScene.add(this.air);
    // Multisampled framebuffers need the original cloud shell's per-sample
    // coverage. A fragment-level analytic mask cannot reproduce that coverage
    // while also blending the larger atmosphere in the same draw.
    this.splitScene=new THREE.Scene();
    this.splitCloud=new THREE.Mesh(cloud.geometry,new THREE.ShaderMaterial({
      uniforms:{...cloud.material.uniforms,cloudColor:{value:this.target.texture},viewport:this.resolve.uniforms.viewport},
      vertexShader:cloud.material.vertexShader,
      fragmentShader:`#include <logdepthbuf_pars_fragment>
        uniform sampler2D cloudColor;uniform vec2 viewport;
        void main(){
          #include <logdepthbuf_fragment>
          vec4 cloud=texture2D(cloudColor,gl_FragCoord.xy/viewport);
          if(cloud.a<.0001)discard;
          gl_FragColor=cloud;
        }`,
      transparent:true,premultipliedAlpha:true,depthWrite:false
    }));
    this.splitAir=new THREE.Mesh(atmosphere.geometry,atmosphere.material);
    for(const mesh of [this.splitCloud,this.splitAir]){mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;}
    this.splitCloud.renderOrder=1;this.splitAir.renderOrder=2;
    this.splitScene.add(this.splitCloud,this.splitAir);
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

  render(renderer, camera, frameTarget, width, height, preserveCoverage=false) {
    this.target.setSize(width, height);
    this.volume.matrix.copy(this.cloud.matrixWorld);
    this.air.matrix.copy(this.atmosphere.matrixWorld);
    const alpha=renderer.getClearAlpha();
    renderer.setRenderTarget(this.target);
    renderer.setClearAlpha(0);renderer.clear();
    renderer.render(this.volumeScene,camera);
    renderer.setClearAlpha(alpha);
    renderer.setRenderTarget(frameTarget);
    this.resolve.uniforms.viewport.value.set(frameTarget.width,frameTarget.height);
    // Preserve shell coverage when multisampling or enlarging a reduced
    // adaptive cloud grid. Full-budget high-density frames share one blend.
    if(frameTarget.samples>0||preserveCoverage){
      this.splitCloud.matrix.copy(this.cloud.matrixWorld);
      this.splitAir.matrix.copy(this.atmosphere.matrixWorld);
      renderer.render(this.splitScene,camera);
    }else renderer.render(this.resolveScene,camera);
  }
}
