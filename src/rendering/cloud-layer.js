import * as THREE from 'three';
import {cloudShader,cloudReconstruction} from './earth-shaders.js';
import {cloudPremultipliedFragment,earthCloudCompositeFragment} from './shaders.js';

// Volumetric integration has its own resolution budget. The opaque worlds,
// atmosphere, stars and spacecraft retain the main framebuffer's resolution.
// High-density frames share one full-resolution cloud/atmosphere composite.
export class CloudLayer {
  constructor(cloud, atmosphere, transmission) {
    this.cloud = cloud;
    this.atmosphere = atmosphere;
    this.transmission = transmission;
    this.target = new THREE.WebGLRenderTarget(1, 1, {type: THREE.HalfFloatType, depthBuffer:false});
    const material = cloud.material.clone();
    material.uniforms = cloud.material.uniforms;
    material.blending = THREE.NoBlending;
    material.transparent = false;
    material.depthWrite = false;
    material.depthTest = false;
    // Filter premultiplied radiance so clear pixels do not darken cloud edges.
    material.fragmentShader = cloudPremultipliedFragment;
    this.detailWeight = {value: 0};
    cloud.material.uniforms.cloudDetail = this.detailWeight;
    // Share all textures/uniforms. Compile-time specialization keeps ordinary
    // views free of the resolved-density shader's arithmetic and register cost.
    const resolved = (base, premultiplied) => {
      const result = base.clone();
      result.uniforms = base.uniforms;
      result.fragmentShader = cloudShader(premultiplied, true);
      return result;
    };
    this.cloudMaterials = [cloud.material, resolved(cloud.material, false)];
    this.volumeMaterials = [material, resolved(material, true)];
    this.volumeScene = new THREE.Scene();
    this.volume = new THREE.Mesh(cloud.geometry, material);
    this.volume.matrixAutoUpdate = false;
    this.volume.frustumCulled = false;
    this.volumeScene.add(this.volume);
    this.resolveScene = new THREE.Scene();
    this.resolve=new THREE.ShaderMaterial({
      uniforms:{...atmosphere.material.uniforms,cloudColor:{value:this.target.texture},viewport:{value:new THREE.Vector2()}},
      vertexShader:atmosphere.material.vertexShader,fragmentShader:earthCloudCompositeFragment,
      transparent:true,premultipliedAlpha:true,depthWrite:false
    });
    this.air=new THREE.Mesh(atmosphere.geometry,this.resolve);
    this.air.matrixAutoUpdate=false;this.air.frustumCulled=false;
    this.air.renderOrder=2;
    this.resolveTransmission=transmission.clone();
    this.resolveTransmission.matrixAutoUpdate=false;this.resolveTransmission.frustumCulled=false;
    this.resolveScene.add(this.resolveTransmission,this.air);
    // Multisampled framebuffers need the original cloud shell's per-sample
    // coverage. A fragment-level analytic mask cannot reproduce that coverage
    // while also blending the larger atmosphere in the same draw.
    this.splitScene=new THREE.Scene();
    this.splitCloud=new THREE.Mesh(cloud.geometry,new THREE.ShaderMaterial({
      uniforms:{...cloud.material.uniforms,cloudColor:{value:this.target.texture},viewport:this.resolve.uniforms.viewport},
      vertexShader:cloud.material.vertexShader,
      fragmentShader:`#include <logdepthbuf_pars_fragment>
        ${cloudReconstruction}
        uniform vec3 localCamera;uniform float flatten;varying vec3 vLocal;
        void main(){
          #include <logdepthbuf_fragment>
          vec3 o=localCamera/vec3(1.,flatten,1.),d=normalize(vLocal*1.00143/vec3(1.,flatten,1.)-o);
          vec4 cloud=sampleCloud(gl_FragCoord.xy/viewport,o,d);
          if(cloud.a<.0001)discard;
          gl_FragColor=cloud;
        }`,
      transparent:true,premultipliedAlpha:true,depthWrite:false
    }));
    this.splitAir=new THREE.Mesh(atmosphere.geometry,atmosphere.material);
    for(const mesh of [this.splitCloud,this.splitAir]){mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;}
    this.splitCloud.renderOrder=3;this.splitAir.renderOrder=2;
    this.splitTransmission=this.resolveTransmission.clone();
    this.splitScene.add(this.splitCloud,this.splitTransmission,this.splitAir);
  }

  selectDetail(weight) {
    const index = weight > 0 ? 1 : 0;
    this.detailWeight.value = weight;
    this.cloud.material = this.cloudMaterials[index];
    this.volume.material = this.volumeMaterials[index];
  }

  updateDetail(camera) {
    const position = this.cloud.parent.position;
    const distance = this.cloudMaterials[0].uniforms.localCamera.value.length();
    const zoom = 1 - THREE.MathUtils.smoothstep(camera.fov, 8, 16);
    const near = 1 - THREE.MathUtils.smoothstep(distance, 1.15, 1.2);
    if (!this.cloud.parent.visible || !zoom || !near) { this.selectDetail(0); return; }
    const axis = camera.matrixWorld.elements;
    const cosine = -(position.x * axis[8] + position.y * axis[9] + position.z * axis[10]) / position.length();
    const angle = Math.acos(THREE.MathUtils.clamp(cosine, -1, 1));
    const limb = Math.asin(Math.min(1, 1.00143 / distance));
    const halfView = Math.atan(Math.tan(camera.fov * Math.PI / 360) * Math.hypot(1, camera.aspect));
    // Match the shader's grazing-angle band, including views just inside the
    // horizon. Fade outside the visible band before returning to the base program.
    const grazing = Math.asin(Math.min(1, Math.sqrt(1 - .35 * .35) / distance));
    const edge = THREE.MathUtils.smoothstep(angle + halfView, grazing - .025, grazing) *
      (1 - THREE.MathUtils.smoothstep(angle - halfView, limb, limb + .025));
    this.selectDetail(zoom * near * edge);
  }

  enabled(world) {
    const base=world.quality==='high' && !world.capturing && !world.lastRender?.options.settled &&
      this.cloud.parent.visible &&
      this.cloud.visible && this.atmosphere.visible;
    if(!base)return false;
    const projection=world.project(world.bodyPositions.earth,world.lastRender.player);
    const radius=Math.asin(Math.min(1,world.bodies.earth.data.radius/projection.distance));
    const extent=Math.tan(radius)/Math.tan(world.camera.fov*Math.PI/360);
    return projection.front && extent*innerHeight>80 &&
      Math.abs(projection.x)<1+extent/world.camera.aspect && Math.abs(projection.y)<1+extent;
  }

  render(renderer, camera, frameTarget, width, height, preserveCoverage=false) {
    this.target.setSize(width, height);
    this.volume.matrix.copy(this.cloud.matrixWorld);
    this.air.matrix.copy(this.atmosphere.matrixWorld);
    this.resolveTransmission.matrix.copy(this.transmission.matrixWorld);
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
      this.splitTransmission.matrix.copy(this.transmission.matrixWorld);
      renderer.render(this.splitScene,camera);
    }else renderer.render(this.resolveScene,camera);
  }
}
