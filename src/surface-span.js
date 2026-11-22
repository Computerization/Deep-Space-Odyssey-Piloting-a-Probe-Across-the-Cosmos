import {Vector3} from '../vendor/three/three.core.js';
const origin=new Vector3(),ray=new Vector3(),a=new Vector3(),b=new Vector3();
// Choose the nearer reference surface. A ring measurement is on its plane,
// not on an individual ice particle. Do not bridge a sky gap or two surfaces.
function endpoint(x,y,tan,camera,body,c,point){
 const f=body.data.flatten||1;
 ray.set(x*tan*camera.aspect,y*tan,-1).applyQuaternion(camera.quaternion).applyQuaternion(body.inverseOrientation);ray.y/=f;
 const v=origin.dot(ray),disc=v*v-ray.lengthSq()*c;
 let depth=v<0&&disc>=0?c/(-v+Math.sqrt(disc)):Infinity,kind='globe';
 if(body.ring&&Math.abs(ray.y)>1e-10){
  const plane=-origin.y/ray.y;
  if(plane>0&&plane<depth){const r=Math.hypot(origin.x+plane*ray.x,origin.z+plane*ray.z),{innerRadius,outerRadius}=body.ring.geometry.parameters;
   if(r>=innerRadius&&r<=outerRadius){depth=plane;kind='rings';}}
 }
 if(!Number.isFinite(depth))return null;
 point.copy(origin).addScaledVector(ray,depth);point.y*=f;return kind;
}
export function surfaceMeasurement(player,center,body,camera,halfWidthNDC,yNDC){
 const {radius,flatten=1}=body.data,tan=Math.tan(camera.fov*Math.PI/360);
 origin.copy(player.position).sub(center).applyQuaternion(body.inverseOrientation).divideScalar(radius);origin.y/=flatten;
 const c=origin.lengthSq()-1;if(c<=0)return null;
 const kind=endpoint(-halfWidthNDC,yNDC,tan,camera,body,c,a);
 if(!kind||endpoint(halfWidthNDC,yNDC,tan,camera,body,c,b)!==kind)return null;
 return {km:a.distanceTo(b)*radius,kind};
}
