import * as THREE from 'three';

// Nested meshes share measured positions, normals and UVs with the original.
// Aligned diagonals make the maximum vertex deviation a bound throughout
// every triangle of the finer surface, rather than a radius-only estimate.
function simplify(source,width){
 const sw=source.parameters.widthSegments,sh=source.parameters.heightSegments,stride=sw/width,height=sh/stride;
 const geometry=new THREE.SphereGeometry(1,width,height);
 for(const [name,attribute] of Object.entries(geometry.attributes)){
  const original=source.attributes[name],size=attribute.itemSize;
  for(let y=0;y<=height;y++)for(let x=0;x<=width;x++){
   const from=(y*stride*(sw+1)+x*stride)*size,to=(y*(width+1)+x)*size;
   for(let k=0;k<size;k++)attribute.array[to+k]=original.array[from+k];
  }
 }
 const fine=source.attributes.position.array,coarse=geometry.attributes.position.array;
 let errorSquared=0;
 for(let y=0;y<=sh;y++)for(let x=0;x<=sw;x++){
  const cx=Math.min(width-1,Math.floor(x/stride)),cy=Math.min(height-1,Math.floor(y/stride)),fx=x/stride-cx,fy=y/stride-cy;
  const a=(cy*(width+1)+cx)*3,d=((cy+1)*(width+1)+cx+1)*3,b=fx>=fy?a+3:a+(width+1)*3;
  const wa=1-Math.max(fx,fy),wb=Math.abs(fx-fy),wd=Math.min(fx,fy),at=(y*(sw+1)+x)*3;
  let squared=0;for(let k=0;k<3;k++)squared+=(fine[at+k]-(coarse[a+k]*wa+coarse[b+k]*wb+coarse[d+k]*wd))**2;
  errorSquared=Math.max(errorSquared,squared);
 }
 // Keep physical observing and culling envelopes independent of render detail.
 geometry.boundingSphere=source.boundingSphere.clone();
 return {geometry,error:Math.sqrt(errorSquared)+1e-7};
}

export class GeometryDetail {
 constructor(bodies){
  this.enabled=false;
  const shared=new Map();
  this.entries=Object.values(bodies).map(({mesh,group})=>{
   const original=mesh.geometry;
   if(!shared.has(original))shared.set(original,[simplify(original,32)]);
   return {mesh,group,original,levels:shared.get(original)};
  });
 }
 restore(){for(const {mesh,original} of this.entries)mesh.geometry=original;}
 prepare(renderer,scene,camera){
  try{
   for(const entry of this.entries)entry.mesh.geometry=entry.levels[0].geometry;
   renderer.render(scene,camera);
  }finally{this.restore();this.enabled=true;}
 }
 select(camera,width,height,reflectionSize){
  if(!this.enabled)return;
  const p=camera.projectionMatrix.elements,pixels=.5*Math.max(width*Math.abs(p[0]),height*Math.abs(p[5]));
  const tangent=Math.hypot(1/p[0],1/p[5]),secant=Math.sqrt(1+tangent*tangent);
  for(const {mesh,group,original,levels} of this.entries){
   mesh.geometry=original;
   const scale=group.scale.x,radius=original.boundingSphere.radius*scale,distance=group.position.length(),gap=distance-radius;
   if(!camera.isPerspectiveCamera||gap<=0)continue;
   // Retain every potentially resolved world. This view-independent bound
   // also makes turning the camera leave the chosen geometry unchanged.
   if(pixels*radius*secant/gap>=1)continue;
   const level=levels[0],error=level.error*scale,near=gap/secant,cubeNear=gap/Math.sqrt(3);
   if(Math.min(near,cubeNear)<=error)continue;
   // A visible point lies inside the diagonal field of view. Bound the
   // projected displacement there and in every 90-degree reflection face.
   const primary=Math.SQRT2*pixels*error*(1+tangent)/(near-error);
   const reflection=Math.SQRT2*reflectionSize*.5*error*(1+Math.SQRT2)/(cubeNear-error);
   if(Math.max(primary,reflection)<=.04)mesh.geometry=level.geometry;
  }
 }
}
