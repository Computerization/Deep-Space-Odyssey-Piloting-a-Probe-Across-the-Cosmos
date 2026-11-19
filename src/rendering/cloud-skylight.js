// Irradiance above a diffuse Earth cloud deck, in solar irradiance / pi units.
// Table axes: sqrt(solar zenith cosine), altitude in km. The last column
// holds the first diffuse Rayleigh return, independent of solar elevation.
export const SKY_MU=128, SKY_HEIGHT=64, SKY_TOP=24;
const rayleigh=[.0058,.0135,.0331];
export function cloudSkyTable(){
 const width=SKY_MU+1,data=new Float32Array(width*SKY_HEIGHT*4),samples=64;
 for(let y=0;y<SKY_HEIGHT;y++){
  const h=y/(SKY_HEIGHT-1)*SKY_TOP;
  for(let c=0;c<3;c++){
   const ray=rayleigh[c]*8*Math.exp(-h/8),tau=ray+.0033*1.2*Math.exp(-h/1.2),fraction=ray/tau;
   data[(y*width+SKY_MU)*4+c]=-.5*Math.expm1(-2*tau)*fraction;
   const trans=Array.from({length:samples},(_,i)=>Math.exp(-tau*samples/(i+.5)));
   for(let x=1;x<SKY_MU;x++){
    const s=(x/(SKY_MU-1))**2,direct=Math.exp(-tau/s);let sum=0;
    for(let i=0;i<samples;i++){
     const m=(i+.5)/samples,d=s-m;
     const path=Math.abs(d)<1e-8?tau/m*trans[i]:s/d*(direct-trans[i]);
     sum+=path*.375*(1+m*m*s*s+.5*(1-m*m)*(1-s*s))*m;
    }
    data[(y*width+x)*4+c]=fraction*sum/samples;
   }
  }
 }
 return {width,height:SKY_HEIGHT,data};
}
