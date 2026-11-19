// km, kg, seconds. One 0.889 N equivalent jet, not all 16 firing together.
// NASA FAQ wet mass; NASA Backgrounder fuel load. Isp is a declared generic
// 220 s hydrazine approximation, not reconstructed Voyager telemetry.
export const PROPULSION=Object.freeze({thrustN:.889,wetMassKg:815,fuelKg:104,ispSeconds:220,g0:9.80665});
export const DRY_MASS=PROPULSION.wetMassKg-PROPULSION.fuelKg;
export const INITIAL_ACCELERATION=PROPULSION.thrustN/PROPULSION.wetMassKg/1000;
export const GM=Object.freeze({sun:132712440041.9394,earth:398600.4355,moon:4902.8001,jupiter:126686531.9,io:5959.9155,saturn:37931206.2,titan:8978.1371});
export function burn(fuel,throttle,seconds){
 const demand=Math.min(1,Math.max(0,throttle)),available=Math.max(0,Math.min(PROPULSION.fuelKg,fuel));
 const used=Math.min(available,PROPULSION.thrustN*demand*Math.max(0,seconds)/(PROPULSION.ispSeconds*PROPULSION.g0));
 const deltaV=used?PROPULSION.ispSeconds*PROPULSION.g0/1000*Math.log((DRY_MASS+available)/(DRY_MASS+available-used)):0;
 return {fuel:available-used,deltaV,acceleration:available?PROPULSION.thrustN*demand/(DRY_MASS+available)/1000:0};
}
// Fixed historical centres in the local body's frame; external gravity is
// differential. Velocity Verlet preserves inertial coasting and orbital energy.
export function gravity(position,centres,anchor){
 const result=[0,0,0],origin=centres[anchor];
 for(const [id,mu] of Object.entries(GM)){
  const c=centres[id];if(!c)continue;
  const d=c.map((v,i)=>v-position[i]),r=Math.hypot(...d);
  if(r>1)for(let i=0;i<3;i++)result[i]+=mu*d[i]/r**3;
  if(origin&&id!==anchor){const q=c.map((v,i)=>v-origin[i]),s=Math.hypot(...q);if(s>1)for(let i=0;i<3;i++)result[i]-=mu*q[i]/s**3;}
 }
 return result;
}
export function integratePhysicalFlight(position,velocity,direction,fuel,seconds,centres,anchor){
 const magnitude=Math.hypot(...direction),throttle=Math.min(1,magnitude),unit=direction.map(v=>v/Math.max(1e-20,magnitude));
 const engine=burn(fuel,throttle,seconds),a0=gravity(position,centres,anchor),thrust=seconds>0?engine.deltaV/seconds:0;
 const next=position.map((v,i)=>v+velocity[i]*seconds+.5*(a0[i]+unit[i]*thrust)*seconds*seconds);
 const a1=gravity(next,centres,anchor);
 return {position:next,velocity:velocity.map((v,i)=>v+.5*(a0[i]+a1[i])*seconds+unit[i]*engine.deltaV),...engine};
}
