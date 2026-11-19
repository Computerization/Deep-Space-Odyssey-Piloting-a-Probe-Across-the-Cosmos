const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

// Closest camera ray inside the rectangular viewport, on the unit sphere.
// Testing all four edges also handles corners and a limb whose centre is offscreen.
export function discFraming(projection,radius,verticalFov,aspect){
 const ty=Math.tan(verticalFov*Math.PI/360),tx=ty*aspect;
 const z=Math.cos(projection.angle),depth=Math.max(Math.abs(z),.0001);
 const direction=[projection.x*depth*tx,projection.y*depth*ty,z];
 const norm=Math.hypot(...direction),[dx,dy,dz]=direction.map(v=>v/norm);
 let closest=-1;
 const consider=(x,y)=>{closest=Math.max(closest,(dx*x+dy*y+dz)/Math.hypot(x,y,1));};
 if(dz>0&&Math.abs(dx/dz)<=tx&&Math.abs(dy/dz)<=ty)closest=1;
 for(const x of [-tx,tx]){
  consider(x,-ty);consider(x,ty);
  const a=dx*x+dz;if(a>0)consider(x,clamp(dy*(1+x*x)/a,-ty,ty));
 }
 for(const y of [-ty,ty]){
  const a=dy*y+dz;if(a>0)consider(clamp(dx*(1+y*y)/a,-tx,tx),y);
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
