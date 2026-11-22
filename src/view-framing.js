const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

// Closest ray in a rectangular camera cone. Reflection symmetry means that an
// offscreen centre only needs the two edges in its own quadrant and their corner.
export function discFraming(projection,radius,verticalFov,aspect){
 const ty=Math.tan(verticalFov*Math.PI/360),tx=ty*aspect;
 const z=Math.cos(projection.angle),depth=Math.max(Math.abs(z),.0001);
 const x=projection.x*depth*tx,y=projection.y*depth*ty,norm=Math.hypot(x,y,z);
 const dx=x/norm,dy=y/norm,dz=z/norm,ax=Math.abs(dx),ay=Math.abs(dy);
 let closest=1;
 if(!(dz>0&&ax<=dz*tx&&ay<=dz*ty)){
  const score=(u,v)=>(ax*u+ay*v+dz)/Math.sqrt(1+u*u+v*v);
  closest=score(tx,ty);
  // The maximum on each edge is either its corner or an interior stationary point.
  const vertical=ax*tx+dz,horizontal=ay*ty+dz;
  if(vertical>0){const v=ay*(1+tx*tx)/vertical;if(v<ty)closest=Math.max(closest,score(tx,v));}
  if(horizontal>0){const u=ax*(1+ty*ty)/horizontal;if(u<tx)closest=Math.max(closest,score(u,ty));}
 }
 const angularRadius=Math.asin(Math.min(1,radius/Math.max(radius,projection.distance)));
 const separation=Math.acos(clamp(closest,-1,1));
 const penetration=angularRadius-separation;
 const s=Math.sin(angularRadius),denominator=dz*dz-s*s;
 // Perspective shifts an off-axis sphere's apparent ellipse away from the
 // projected centre. Tangent planes give its exact enclosing rectangle.
 const bounds=dz>s?{
  x:dx*dz/denominator/tx,y:dy*dz/denominator/ty,
  halfWidth:s*Math.sqrt(Math.max(0,dx*dx+dz*dz-s*s))/denominator/tx,
  halfHeight:s*Math.sqrt(Math.max(0,dy*dy+dz*dz-s*s))/denominator/ty
 }:null;
 // In screen coordinates the perspective silhouette is a rotated ellipse.
 // Its axes use vertical NDC units; multiply by half the viewport height.
 const ellipse=bounds?{
  major:s*Math.sqrt(1.-s*s)/denominator/ty,
  minor:s/Math.sqrt(denominator)/ty,
  angle:Math.atan2(-dy,dx)
 }:null;
 return {visible:penetration>0,angularRadius,separation,penetration,
  prominence:angularRadius*Math.max(0,penetration),bounds,ellipse};
}

// Intersect a planar annulus with the rectangular camera cone. Coordinates
// use camera-right/up/forward; u and v map the ring's local plane into it.
// Clipping the outer square leaves a convex polygon. Its radial range tells
// whether it crosses the annulus, including a view entirely inside the hole.
export function annulusFraming(center,u,v,inner,outer,verticalFov,aspect){
 const ty=Math.tan(verticalFov*Math.PI/360),tx=ty*aspect;
 const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 const tilt=Math.abs(normal.reduce((n,x,i)=>n+x*center[i],0))/Math.max(1e-30,Math.hypot(...normal)*Math.hypot(...center));
 if(tilt<1e-8)return {visible:false,depth:0,tilt};
 let polygon=[[-outer,-outer],[outer,-outer],[outer,outer],[-outer,outer]];
 const planes=[[u[0]-tx*u[2],v[0]-tx*v[2],center[0]-tx*center[2]],
  [-u[0]-tx*u[2],-v[0]-tx*v[2],-center[0]-tx*center[2]],
  [u[1]-ty*u[2],v[1]-ty*v[2],center[1]-ty*center[2]],
  [-u[1]-ty*u[2],-v[1]-ty*v[2],-center[1]-ty*center[2]],[-u[2],-v[2],-center[2]]];
 for(const [a,b,c] of planes){
  const clipped=[];
  for(let i=0;i<polygon.length;i++){
   const p=polygon[i],q=polygon[(i+1)%polygon.length],dp=a*p[0]+b*p[1]+c,dq=a*q[0]+b*q[1]+c;
   if(dp<=0)clipped.push(p);
   if((dp<=0)!==(dq<=0)){const t=dp/(dp-dq);clipped.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}
  }
  polygon=clipped;if(polygon.length<3)return {visible:false,depth:0,tilt};
 }
 let minimum=Infinity,maximum=0,area=0,containsOrigin=true;
 for(let i=0;i<polygon.length;i++){
  const p=polygon[i],q=polygon[(i+1)%polygon.length],dx=q[0]-p[0],dy=q[1]-p[1];
  const cross=p[0]*q[1]-p[1]*q[0];area+=cross;containsOrigin&&=cross>=0;
  const t=clamp(-(p[0]*dx+p[1]*dy)/Math.max(1e-30,dx*dx+dy*dy),0,1);
  minimum=Math.min(minimum,Math.hypot(p[0]+t*dx,p[1]+t*dy));maximum=Math.max(maximum,Math.hypot(...p));
 }
 if(containsOrigin)minimum=0;
 const depth=Math.min(outer-minimum,maximum-inner,outer-inner);
 return {visible:area>1e-12&&depth>1e-8,depth:Math.max(0,depth),tilt};
}

// All four corner rays have the same length. The least-aligned one has
// horizontal/vertical signs opposite the centre ray: no per-corner rotations.
export function cornerBeyondLimb(x,y,z,tanX,tanY,limb){
 return -z-Math.abs(x)*tanX-Math.abs(y)*tanY < Math.cos(limb+.003)*Math.sqrt(1+tanX*tanX+tanY*tanY);
}
