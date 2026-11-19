// Ring-to-planet irradiance for the existing single-scattering ring model.
// Distances use Saturn equatorial radii; radiance is relative to solar flux / pi.
// The cache is regenerated for an epoch, never for a camera movement.
const PI=Math.PI,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
export const RING_SHADOW_RANGE={start:1.18,span:1.2};
export function ringDepth(r,a){
 let tau=0;
 if(r<1.526)tau=.35*clamp(a/.45,0,1)**1.4;
 else if(r<1.950)tau=.4+2.1*smooth(.55,.97,a);
 else if(r<2.030)tau=.10*clamp(a/.45,0,1)**2;
 else if(r<2.270)tau=.4+.6*smooth(.45,.80,a);
 return tau*smooth(.015,.10,a)+.05*Math.exp(-.5*((r-2.320)/.00045)**2);
}
// Filter transmitted light, rather than exponentiating averaged opacity.
// Clear padding lets the same mip chain retain the physical ring edges.
export function ringTransmissionProfile(profile,sunElevation){
 const width=profile.length/4,data=new Float32Array(width),mu=Math.max(.025,Math.abs(sunElevation));
 for(let i=0;i<width;i++){
  const r=RING_SHADOW_RANGE.start+(i+.5)*RING_SHADOW_RANGE.span/width;
  const u=clamp((r-1.235)/1.085*width-.5,0,width-1),j=Math.floor(u),f=u-j;
  const alpha=(profile[j*4+3]*(1-f)+profile[Math.min(j+1,width-1)*4+3]*f)/255;
  data[i]=r>=1.235&&r<=2.323?Math.exp(-ringDepth(r,alpha)/mu):1;
 }
 return data;
}
export function ringScattering(tau,mu,mu0,reflected){
 mu=Math.max(.015,mu);mu0=Math.max(.015,mu0);
 if(reflected)return 2.3*mu0/(mu+mu0)*(1-Math.exp(-tau*(1/mu+1/mu0)));
 return 1.8*Math.max(0,Math.abs(mu-mu0)<.002?tau/mu*Math.exp(-tau/mu):mu0/(mu-mu0)*(Math.exp(-tau/mu)-Math.exp(-tau/mu0)));
}
export function createRingIntegrator(profile,sun,{flatten=.902,radialSteps=48,azimuthSteps=64}={}){
 const length=Math.hypot(...sun),s=sun.map(x=>x/length),mu0=Math.abs(s[1]),patches=[];
 // Delimit the physical ring regions before area quadrature.
 const edges=[1.235,1.526,1.950,2.030,2.270,2.323];
 const d=[s[0],s[1]/flatten,s[2]],dl=Math.hypot(...d);for(let i=0;i<3;i++)d[i]/=dl;
 for(let region=0;region<edges.length-1;region++){
  const lo=edges[region],hi=edges[region+1],count=Math.max(2,Math.round(radialSteps*(hi-lo)/(2.323-1.235)));
  for(let j=0;j<count;j++){
   const a=lo+(hi-lo)*j/count,b=lo+(hi-lo)*(j+1)/count,r=Math.sqrt((a*a+b*b)/2);
   const index=Math.round(clamp((r-1.235)/1.085,0,1)*(profile.length/4-1))*4,alpha=profile[index+3]/255,tau=ringDepth(r,alpha);
   if(tau<1e-8)continue;
   const rgb=[0,1,2].map(c=>clamp(linear(profile[index+c]/255)*2.6,0,.85));
   if(r>2.27)rgb.splice(0,3,.54,.52,.48);
   const area=PI*(b*b-a*a)/azimuthSteps;
   for(let k=0;k<azimuthSteps;k++){
    const phi=(k+.5)*2*PI/azimuthSteps,x=r*Math.cos(phi),z=r*Math.sin(phi),along=-(x*d[0]+z*d[2]);
    // A ring patch inside Saturn's solar shadow emits no direct sunlight.
    if(along>0&&x*x+z*z-along*along<1)continue;
    patches.push({x,z,tau,rgb,area});
   }
  }
 }
 return function irradiance(point,normal){
  const out=[0,0,0],reflected=point[1]*s[1]>0;
  if(Math.abs(point[1])<1e-10||mu0<1e-8)return out;
  for(const p of patches){
   const dx=p.x-point[0],dy=-point[1],dz=p.z-point[2],distance2=dx*dx+dy*dy+dz*dz,distance=Math.sqrt(distance2);
   const cosine=(dx*normal[0]+dy*normal[1]+dz*normal[2])/distance;
   if(cosine<=0)continue;
   const mu=Math.abs(dy)/distance,phase=.86+.28*Math.max(0,(-dx*s[0]-dy*s[1]-dz*s[2])/distance)**6;
   const solidAngle=mu*p.area/distance2;
   const weight=ringScattering(p.tau,mu,mu0,reflected)*phase*cosine*solidAngle/PI;
   for(let c=0;c<3;c++)out[c]+=p.rgb[c]*weight;
  }
  return out;
 };
}
export function ringIrradianceMap(profile,sun,{width=64,height=33,flatten=.902,...options}={}){
 const irradiance=createRingIntegrator(profile,sun,{flatten,...options}),data=new Float32Array(width*height*4);
 for(let y=0;y<height;y++){
  const lat=(y/(height-1)-.5)*PI,cy=Math.cos(lat),sy=Math.sin(lat);
  for(let x=0;x<width;x++){
   const lon=((x+.5)/width-.5)*2*PI,cx=Math.cos(lon),sx=Math.sin(lon),point=[cy*cx,flatten*sy,cy*sx],normal=[cy*cx,sy/flatten,cy*sx];
   const n=Math.hypot(...normal);for(let i=0;i<3;i++)normal[i]/=n;
   const light=irradiance(point,normal),i=(y*width+x)*4;data.set([...light,1],i);
  }
 }
 return {data,width,height};
}
