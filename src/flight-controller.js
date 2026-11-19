import * as THREE from '../vendor/three/three.core.js';
import {BODY_DATA} from './mission.js';
import {encounterContext} from './encounter-context.js';
import {GM} from './propulsion.js';

// This is a flyby experience. Keep close passes above the reference surface
// and within useful image coverage; these are exploration limits, not terrain.
export const CLOSE_PASS={earth:1.15,moon:1.22,io:1.22,jupiter:1.45,saturn:1.6,titan:1.26};

// Synchronous integration scratch; no temporary vector escapes a substep.
const inputVector=new THREE.Vector3(),turnVector=new THREE.Vector3(),relativeVector=new THREE.Vector3(),oldRadial=new THREE.Vector3();
const rotation=new THREE.Quaternion(),gravityVector=new THREE.Vector3();
// Acceleration in the fixed encounter frame. Other bodies contribute their
// differential pull at the frame origin, avoiding a fictitious bulk fall of
// a planet that the historical scene deliberately holds fixed. km/s².
export function localGravity(position,centres,region,out){
 out.set(0,0,0);
 const origin=centres[region.body];
 for(let i=0;i<=region.worlds.length;i++){
  const id=i===region.worlds.length?'sun':region.worlds[i];
  const c=centres[id],mu=GM[id];if(!c||!mu)continue;
  let x=c.x-position.x,y=c.y-position.y,z=c.z-position.z,r2=x*x+y*y+z*z;
  if(r2>1){const k=mu/(r2*Math.sqrt(r2));out.x+=x*k;out.y+=y*k;out.z+=z*k;}
  if(origin&&id!==region.body){
   x=c.x-origin.x;y=c.y-origin.y;z=c.z-origin.z;r2=x*x+y*y+z*z;
   if(r2>1){const k=mu/(r2*Math.sqrt(r2));out.x-=x*k;out.y-=y*k;out.z-=z*k;}
  }
 }
 return out;
}
export function stepAttitude(game,sample,dt){
 game.elapsed+=dt;game.chapterTime+=dt;game.idle+=dt;
 const demand=inputVector.set(sample.pitch/Math.max(dt,.001),sample.yaw/Math.max(dt,.001),sample.roll).multiplyScalar(game.precision?.35:1);
 // Integrate the response over the whole interval, rather than applying its
 // final angular speed for the whole frame. Mouse travel then retains its angle.
 const response=26,blend=1-Math.exp(-dt*response);
 const turn=turnVector.copy(demand).multiplyScalar(dt).addScaledVector(relativeVector.copy(game.angular).sub(demand),blend/response);
 game.angular.lerp(demand,blend);
 if(demand.lengthSq()===0&&game.angular.lengthSq()<1e-24)game.angular.set(0,0,0);
 game.stable=game.angular.length()<.13?game.stable+dt:0;
 const angle=turn.length();
 if(angle>1e-14){
  rotation.setFromAxisAngle(turn.multiplyScalar(1/angle),angle);
  if(game.freeLook)game.look.multiply(rotation).normalize();else game.player.quaternion.multiply(rotation).normalize();
 }
}
// Assisted exploration is deliberately separate from historical spacecraft
// dynamics. Velocities here are navigation units per presentation second;
// instruments must never describe them as Voyager's measured speed.
export function initialiseEncounter(game,world){
 game.player.velocity.set(0,0,0);game.referenceVelocity=new THREE.Vector3();
 game.fuel=104;game.localSeconds=0;game.thrustAcceleration=0;game.thrustFeedback=null;
 game.drive=new THREE.Vector3();game.cruise=1;game.brakeBlend=0;
 game.boundaryPaused=false;game.proximityLimited=false;game.assisted=true;
}
export function stepManualFlight(game,world,sample,dt){
 const region=encounterContext(game).region;
 // Bounded substeps keep acceleration and near-surface handling consistent
 // when rendering is expensive. Long interruptions never teleport the player.
 const duration=Math.max(0,Math.min(dt,.1)),steps=Math.max(1,Math.ceil(duration*120));
 const controls={...sample,pitch:sample.pitch/steps,yaw:sample.yaw/steps};
 for(let i=0;i<steps;i++)advanceManualFlight(game,world,controls,duration/steps,region);
}
function advanceManualFlight(game,world,sample,dt,region){
 const p=game.player;
 stepAttitude(game,sample,dt);
 game.actualRate=game.timePaused?0:1;game.timeHeld=!game.actualRate;
 game.timeLimited=false;game.boundaryPaused=false;game.proximityLimited=false;
 game.thrust=Math.min(1,Math.hypot(sample.thrust,sample.vertical,sample.lateral));
 if(!game.actualRate)return;
 const worlds=region.worlds;let nearest=null,gap=Infinity;
 for(const id of worlds){const d=p.position.distanceTo(world.bodyPositions[id])-BODY_DATA[id].radius;if(d<gap){gap=d;nearest=id;}}
 const radius=BODY_DATA[nearest]?.radius||1000000;
 const clearance=Math.max(radius*.025,nearest?gap:1000000);
 game.cruise+=((sample.boost?3:1)-game.cruise)*(1-Math.exp(-dt*8));
 // Sublinear scaling makes a giant take longer to traverse than a moon.
 // Shift remains a deliberate faster cruise; local flight is still assisted.
 const scale=.72*Math.min(1.35,Math.sqrt(BODY_DATA.earth.radius/radius));
 const speed=scale*Math.min(80000,Math.max(radius*.025,clearance*.32))*(game.precision?.25:1)*game.cruise;
 game.boosting=!!sample.boost&&game.thrust>0;
 const camera=rotation.copy(p.quaternion).multiply(game.look);
 const demand=inputVector.set(sample.lateral,sample.vertical,-sample.thrust);
 if(demand.lengthSq()>1)demand.normalize();
 // Ease thrust changes in the control frame. Release stops propulsion at once;
 // the existing velocity remains, with no invisible damping of a coast.
 if(game.thrust&&!sample.brake)game.drive.lerp(demand,1-Math.exp(-dt*14));else game.drive.set(0,0,0);
 demand.copy(game.drive).applyQuaternion(camera);
 // Thrust changes momentum; letting go leaves a coast. The local exploration
 // speed envelope is assisted, while Space supplies an explicit braking force.
 const acceleration=speed*.55;game.braking=!!sample.brake;
 // Real gravitational acceleration per presentation second, independent of
 // the deliberately assisted engine. Braking actively counters the drift.
 p.velocity.addScaledVector(localGravity(p.position,world.bodyPositions,region,gravityVector),dt);
 game.brakeBlend=sample.brake?1-(1-game.brakeBlend)*Math.exp(-dt*18):0;
 if(sample.brake){
  const current=p.velocity.length(),deceleration=Math.min(Math.max(acceleration,current*1.6),current*8)*game.brakeBlend;
  const remaining=current<.05?0:Math.max(0,current-deceleration*dt);
  if(current)p.velocity.multiplyScalar(remaining/current);
 }else if(game.thrust){
  p.velocity.addScaledVector(demand,acceleration*dt);
  const magnitude=p.velocity.length();
  if(magnitude>speed)p.velocity.multiplyScalar((speed+(magnitude-speed)*Math.exp(-dt*1.8))/magnitude);
 }
 // Ease the inward component before the close-pass boundary. Sideways and
 // outward control remain available, with no abrupt freeze on arrival.
 for(const id of worlds){
  const relative=relativeVector.copy(p.position).sub(world.bodyPositions[id]),range=relative.length(),minimum=BODY_DATA[id].radius*(CLOSE_PASS[id]||1.025);
  relative.normalize();const inward=-p.velocity.dot(relative),gap=Math.max(0,range-minimum);
  if(inward>0&&gap<BODY_DATA[id].radius*.25){const safe=Math.sqrt(2*acceleration*gap);if(inward>safe){p.velocity.addScaledVector(relative,(inward-safe)*(1-Math.exp(-dt*12)));game.proximityLimited=true;}}
 }
 const anchor=game.tracking&&world.bodyPositions[game.tracking];
 const oldRelative=anchor?oldRadial.copy(p.position).sub(anchor):null;
 p.position.addScaledVector(p.velocity,dt);
 if(oldRelative){
  const range=oldRelative.length(),radial=p.velocity.dot(oldRelative.normalize());
  const nextRadial=relativeVector.copy(p.position).sub(anchor).normalize();
  p.position.copy(nextRadial).multiplyScalar(Math.max(1,range+radial*dt)).add(anchor);
  // Following is an explicit orbit assist: transport the tangent velocity
  // around the world. Otherwise a sideways coast gradually becomes outward
  // drift. Preserve its speed and radial component, including W/S movement.
  p.velocity.applyQuaternion(rotation.setFromUnitVectors(oldRelative,nextRadial));
 }
 // A soft surface boundary slides motion along the globe. It never freezes
 // the session or forces a rewind; the player can immediately fly away.
 for(const id of worlds){
  const body=BODY_DATA[id],center=world.bodyPositions[id],relative=relativeVector.copy(p.position).sub(center),length=relative.length();
  const minimum=body.radius*(CLOSE_PASS[id]||1.025);
  if(length<minimum){
   relative.normalize();p.position.copy(center).addScaledVector(relative,minimum);
   const inward=p.velocity.dot(relative);if(inward<0)p.velocity.addScaledVector(relative,-inward);
   game.proximityLimited=true;
  }
 }
 if(region){
  const center=world.bodyPositions[region.body],relative=relativeVector.copy(p.position).sub(center),range=relative.length();
  if(range>region.radius){relative.normalize();p.position.copy(center).addScaledVector(relative,region.radius);const outward=p.velocity.dot(relative);if(outward>0)p.velocity.addScaledVector(relative,-outward);}
  game.explorationBoundary={fraction:Math.min(1,range/region.radius),limited:range>=region.radius};
 }
 game.localSeconds+=dt;game.thrustFeedback=null;
 game.flightReadout=nearest?{id:nearest,range:p.position.distanceTo(world.bodyPositions[nearest]),risk:game.proximityLimited?1:0}:null;
}
