import * as THREE from 'three';
import {ExperienceGuide} from '../experience-guide.js';
import {encounterContext} from '../encounter-context.js';
import {phaseAngle,unobstructed} from '../exploration.js';
import {BODY_DATA} from '../mission.js';
import {createDomWriter} from './dom.js';

export function createExperienceGuide({game,world,ui}){
 const guide=new ExperienceGuide(),dom=createDomWriter(ui);
 let display={note:null};
 function measureSubject(){
  const region=encounterContext(game).region,p=game.player;
  const positions=Object.fromEntries(Object.entries(world.bodyPositions).map(([id,v])=>[id,v.toArray()]));
  let best=null;
  for(const id of region?.worlds||[]){
   const body=BODY_DATA[id],center=world.bodyPositions[id],framing=world.observationFraming(id,p);
   const range=framing.range,angle=framing.angularRadius;
   if(angle<.004||framing.penetration<Math.min(.002,angle*.2)||!unobstructed(p.position.toArray(),center.toArray(),id,positions))continue;
   const up=new THREE.Vector3(0,1,0).applyQuaternion(world.bodies[id].group.quaternion);
   const elevation=Math.asin(up.dot(p.position.clone().sub(center).normalize()))*180/Math.PI;
   let poleInView=false;
   if(id==='saturn'&&elevation>55){
    const pole=center.clone().addScaledVector(up,body.radius*body.flatten),pr=world.project(pole,p);
    poleInView=pr.front&&Math.abs(pr.x)<.85&&Math.abs(pr.y)<.8;
   }
   if(!best||framing.prominence>best.prominence)best={id,feature:framing.feature,angle,prominence:framing.prominence,range,radii:range/body.radius,phase:phaseAngle(p.position.toArray(),center.toArray()),ringElevation:elevation,poleInView};
  }
  return best;
 }
 function update(dt){
  if(game.stage!=='encounter')return;
  const enabled=game.guidance&&game.showHud&&!game.journeyFieldwork;
  // Deep-space topics depend on the milestone, and a hidden guide has no topic.
  // Keep its timers running without projecting silhouettes that it cannot use.
  const subject=enabled&&game.chapter<3?measureSubject():null;
  display=guide.update(game.experience,{chapter:game.chapter,subject,enabled,time:game.chapterTime,
   steady:game.angular.length()<.2},dt);
 }
 function render(){
  const active=game.stage==='encounter';
  dom.toggle('hud','exploration-experience',active);
  if(!active)return;
  const context=encounterContext(game);
  {
   const note=game.guidance&&!game.journeyFieldwork&&display.note;
   const title=note?.title||'',caption=note?.text||'';
   // Navigation already identifies the subject and range. Reserve this space
   // for a brief invitation or a new science note.
   dom.hidden('objective-title',!title||title===context.title);
   dom.hidden('objective-caption',!caption);
   dom.text('objective-title',title);dom.text('objective-caption',caption);
   dom.hidden('scene-reading',!caption&&!title&&dom.node('observe-action').hidden);
  }

 }
 return {update,render,guide};
}
