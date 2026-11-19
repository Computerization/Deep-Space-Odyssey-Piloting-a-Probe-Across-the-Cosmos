import {clamp, predictCoast} from './flight.js';
import {INITIAL_ACCELERATION} from './propulsion.js';

// Advisory instruments for the inertial flight model, in km and real seconds.
// They never change velocity, attitude, or the chosen destination.
export function approachReadout(position, velocity, center, radius, rate) {
  const coast=predictCoast(position,velocity,center,radius*1.03);
  const radial=center.map((v,i)=>v-position[i]);
  const closing=radial.reduce((sum,v,i)=>sum+v*velocity[i],0)/Math.max(coast.range,1);
  const stoppingDistance=coast.speed*coast.speed/(2*INITIAL_ACCELERATION);
  const timeToClosest=coast.closestTime/Math.max(1,rate);
  const impactSeconds=coast.entryTime===null?Infinity:coast.entryTime/Math.max(1,rate);
  return {...coast,closing,altitude:coast.range-radius,closestAltitude:coast.miss-radius,
    timeToClosest,impactSeconds,stoppingDistance,
    risk:coast.approaching&&coast.intersects&&impactSeconds<16};
}

export function compressionStep(previous, requested, safeLimit, dt) {
  const target=Math.max(1,Math.min(requested,safeLimit));
  // Safety reductions are immediate; increases unfold across a short ramp.
  if(target<=previous||target-previous<target*1e-9)return target;
  return Math.min(target,Math.exp(Math.log(Math.max(1,previous))+
    Math.min(Math.log(target/Math.max(1,previous)),dt*4.6)));
}

export function mixIntent({altitudeRatio=100, observing=false, transit=false, risk=false, sunlight=1}) {
  const proximity=1-clamp((altitudeRatio-1)/8,0,1);
  return {
    gain:observing?.72:risk?.62:transit?.8:.86+proximity*.12,
    cutoff:observing?7800:risk?6400:transit?10500:14500+proximity*3500,
    space:.04+proximity*.05+(1-clamp(sunlight,0,1))*.035
  };
}

// Sum only impulse actually accepted by the physical integrator. Gravity and
// time compression never masquerade as thrust; a held clock delivers none.
export function thrustFeedback(previous,{command,deltaV,acceleration,fuel,held},dt) {
 const active=command>0,delivered=active?(previous?.command?previous.deltaV:0)+deltaV:(previous?.deltaV||0);
 const remaining=active?2.5:Math.max(0,(previous?.remaining||0)-dt);
 const state=active?(deltaV>0?'firing':held?'held':fuel<=0?'empty':'idle'):remaining>0&&delivered>0?'coasting':'quiet';
 return {command:active,deltaV:delivered,acceleration:state==='firing'?acceleration:0,remaining,state};
}
