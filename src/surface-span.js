import {Vector3} from '../vendor/three/three.core.js';
const origin=new Vector3(),ray=new Vector3(),a=new Vector3(),b=new Vector3();
// Intersect the two ends of a screen-space bracket with the *reference*
// ellipsoid. Return their chord in km; sky has no measurable surface span.
export function surfaceSpan(player,center,body,camera,halfWidthNDC,yNDC){
 const {radius,flatten=1}=body.data,tan=Math.tan(camera.fov*Math.PI/360),inv=body.inverseOrientation;
 origin.copy(player.position).sub(center).applyQuaternion(inv).divideScalar(radius);origin.y/=flatten;
 const c=origin.lengthSq()-1;if(c<=0)return null;
 for(const [point,x] of [[a,-halfWidthNDC],[b,halfWidthNDC]]){
  ray.set(x*tan*camera.aspect,yNDC*tan,-1).applyQuaternion(camera.quaternion).applyQuaternion(inv);ray.y/=flatten;
  const v=origin.dot(ray),disc=v*v-ray.lengthSq()*c;if(v>=0||disc<0)return null;
  const depth=c/(-v+Math.sqrt(disc));point.copy(origin).addScaledVector(ray,depth);point.y*=flatten;
 }
 return a.distanceTo(b)*radius;
}
