import * as THREE from 'three';
import {BODY_DATA} from './mission.js';
import {angularDiameter} from './flight.js';
import {solarVisibility} from './rendering/lighting.js';
import {phaseAngle,unobstructed} from './exploration.js';

const V=THREE.Vector3;
export const OPPORTUNITIES=[
  {id:'earthrise',chapter:0,body:'moon',title:'Earth beyond the Moon',
    text:'Earth emerges from behind the lunar limb as your own viewpoint moves. The change reveals depth and the distance between two worlds.'},
  {id:'shadow',chapter:0,body:'earth',title:'The edge of Earth’s shadow',
    text:'As Earth covers the solar disc, direct sunlight on the probe falls through a partial eclipse. The transition has a width because the Sun has an apparent size.'},
  {id:'io-pair',chapter:1,body:'io',title:'Io against the giant',
    text:'Nearby Io and distant Jupiter share one view. Their apparent sizes combine their different radii with their distances from the spacecraft.'},
  {id:'ring-edge',chapter:2,body:'saturn',title:'Rings become a line',
    text:'Near Saturn’s equatorial plane, the broad rings narrow to a thin line. This is perspective acting on their thin geometry.'},
  {id:'titan-light',chapter:2,body:'titan',title:'Light through Titan’s haze',
    text:'At a large phase angle, sunlight scattered through Titan’s haze outlines the limb. The atmosphere is part of the silhouette, not a solid surface.'}
];

function pairedView(world, near, far) {
  const center=world.bodyPositions[near],toward=world.bodyPositions[far].clone().sub(center).normalize();
  const sun=center.clone().negate().normalize(),side=sun.clone().addScaledVector(toward,-sun.dot(toward));
  if(side.lengthSq()<1e-8)side.crossVectors(toward,new V(0,1,0));side.normalize();
  const r=BODY_DATA[near].radius*4;
  const gap=angularDiameter(BODY_DATA[far].radius,center.distanceTo(world.bodyPositions[far]))*.55+.022;
  const angle=Math.asin(.25)+gap;
  return center.clone().addScaledVector(toward,-Math.cos(angle)*r).addScaledVector(side,Math.sin(angle)*r);
}

export function opportunityPoint(id, world) {
  if(id==='earthrise')return pairedView(world,'moon','earth');
  if(id==='io-pair')return pairedView(world,'io','jupiter');
  if(id==='shadow'){
    const center=world.bodyPositions.earth,away=center.clone().normalize();
    const side=new V().crossVectors(away,new V(0,1,0)).normalize();
    return center.clone().addScaledVector(away,BODY_DATA.earth.radius*8).addScaledVector(side,BODY_DATA.earth.radius);
  }
  if(id==='north-pole'){
    const center=world.bodyPositions.saturn,up=new V(0,1,0).applyQuaternion(world.bodies.saturn.group.quaternion);
    const sun=center.clone().negate().normalize(),equator=sun.addScaledVector(up,-sun.dot(up)).normalize();
    return center.clone().addScaledVector(up,60268*2.3).addScaledVector(equator,60268*.85);
  }
  if(id==='ring-edge'){
    const body=world.bodies.saturn,center=world.bodyPositions.saturn;
    return new V(3.6,.12,3.2).applyQuaternion(body.group.quaternion).multiplyScalar(60268).add(center);
  }
  const center=world.bodyPositions.titan,sun=center.clone().negate().normalize(),side=new V().crossVectors(sun,new V(0,1,0)).normalize();
  return center.clone().addScaledVector(sun,Math.cos(155*Math.PI/180)*2574.7*4).addScaledVector(side,Math.sin(155*Math.PI/180)*2574.7*4);
}

// A camera sample belongs to one physics tick. The ephemeris centers live
// until setEpoch replaces bodyPositions; bearings and visibility never do.
const epochCenters=new WeakMap();
export function sightlines(game,world){
  const p=game.player,positions=world.bodyPositions,observer=p.position.toArray();
  let centers=epochCenters.get(positions);if(!centers){centers=Object.fromEntries(Object.entries(positions).map(([id,v])=>[id,v.toArray()]));epochCenters.set(positions,centers);}
  const forward=new V(0,0,-1).applyQuaternion((game.view==='chase'&&world.followReady?world.follow:p.quaternion).clone().multiply(game.look));
  const delta=new V(),cache=Object.create(null),angleTo=aim=>forward.angleTo(delta.copy(aim).sub(p.position));
  const frame=id=>{
    if(cache[id])return cache[id];
    const range=p.position.distanceTo(positions[id]);
    return cache[id]={range,angle:angleTo(positions[id]),diameter:angularDiameter(BODY_DATA[id].radius,range),
      visible:unobstructed(observer,centers[id],id,centers),phase:phaseAngle(observer,centers[id])};
  };
  return {frame,angleTo};
}
export function opportunityCandidate(game,world,{frame}=sightlines(game,world)) {
  const p=game.player;
  for(const entry of OPPORTUNITIES.filter(o=>o.chapter===game.chapter&&!game.explored.includes('event-'+o.id))){
    const near=frame(entry.body),fov=world.camera.fov*Math.PI/180;
    if(!near.visible||near.angle>fov*.27||near.diameter<.025)continue;
    let valid=false;
    if(entry.id==='earthrise'||entry.id==='io-pair'){
      const farId=entry.id==='earthrise'?'earth':'jupiter',far=frame(farId);
      const a=world.bodyPositions[entry.body].clone().sub(p.position),b=world.bodyPositions[farId].clone().sub(p.position);
      const gap=a.angleTo(b)-(near.diameter+far.diameter)*.5;
      valid=far.visible&&far.diameter>.0035&&far.angle+far.diameter*.5<fov*.48&&gap>0&&gap<.09&&near.range<BODY_DATA[entry.body].radius*12;
    }else if(entry.id==='shadow'){
      const light=solarVisibility(p.position,world.bodyPositions,BODY_DATA);
      valid=light>.015&&light<.985&&near.range<BODY_DATA.earth.radius*40;
    }else if(entry.id==='ring-edge'){
      const local=p.position.clone().sub(world.bodyPositions.saturn).applyQuaternion(world.bodies.saturn.group.quaternion.clone().invert());
      valid=Math.abs(local.y)/local.length()<Math.sin(4*Math.PI/180)&&near.range>60268*2.5&&near.range<60268*12;
    }else valid=near.phase>140&&near.range<2574.7*12;
    if(valid)return {kind:'opportunity',id:'event-'+entry.id,body:entry.body,title:entry.title,text:entry.text,duration:3.2,range:near.range,
      phase:near.phase};
  }
  return null;
}
