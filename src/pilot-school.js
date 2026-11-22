import {Quaternion,Vector3} from '../vendor/three/three.core.js';
import {encounterContext} from './encounter-context.js';
import {BODY_DATA} from './mission.js';
import {createDomWriter} from './ui/dom.js';
const RAD=180/Math.PI;
const names={earth:'Bank the blue horizon',jupiter:'Catch the drift window',saturn:'Fly the rings edge-on'};
const endings={earth:'Your hands banked the blue horizon, then set it level again.',jupiter:'You cut the thrust. A world kept turning beneath you.',saturn:'For a moment, all those rings fitted inside a line.'};
export const maneuverEcho=pilot=>endings[pilot?.finished?.at(-1)];
export const bankDegrees=(z,w)=>Math.abs(((2*Math.atan2(z,w)*RAD+540)%360)-180);
export function storedPilot(value){return {skills:{...value?.skills},finished:(Array.isArray(value?.finished)?value.finished:[]).filter(id=>Object.hasOwn(names,id))};}
export const controlCues={
 roll:['Q / E · Roll the horizon','LB / RB · Roll the horizon'],rise:['R / F · Rise or descend','Left stick vertically · Rise or descend'],circle:['A / D · Circle the world','Left stick sideways · Circle the world'],
 track:['L · Follow a world while you fly','Menu → Camera · Follow a world'],boost:['Shift while moving · Faster flight','LB + RB while moving · Faster flight'],
 brake:['Space · Brake against your drift','B · Brake against your drift'],zoom:['Scroll · Change the lens','D-pad ← / → · Change the lens'],
 view:['C · Change camera without moving the probe','Y · Change camera without moving the probe'],look:['V · Look without turning the probe','Press right stick · Look without turning the probe'],
 precision:['Z · Fine control for close approaches','Menu → Settings · Fine control'],interact:['X · Work the science station','X · Work the science station']
};
export function noteControl(game,id){if(!game.pilot)return;if(!game.pilot.skills[id])game.pilot.skills[id]=true;if(game.practice===id){game.practice=null;game.practiceCompleteUntil=performance.now()+1600;}}
// Choose by the actual situation; time alone never rotates these labels.
export function flightTip(game,pad){
 const s=game.pilot?.skills||{},outer=game.chapter>=3,help=pad?'Menu · Flight controls':'? · Flight controls',cue=id=>controlCues[id][pad?1:0];
 if(game.practice)return cue(game.practice);
 if(game.practiceCompleteUntil>performance.now())return 'Control practised';
 if(!game.guidance)return help;
 if(outer&&!s.interact)return cue('interact');
 if(game.tracking&&!s.circle)return cue('circle');
 if(!s.brake&&!game.thrust&&game.player.velocity.lengthSq()>40000)return cue('brake');
 if(!s.roll)return cue('roll');
 if(!s.rise&&!outer)return cue('rise');
 if(!s.track&&!outer)return cue('track');
 if(!s.boost&&!outer)return cue('boost');
 for(const id of ['zoom','view','precision','look'])if(!s[id]&&!(id==='precision'&&outer))return cue(id);
 return help;
}
export function createPilotSchool({game,world,ui,input,follow,release,save,cue}){
 const dom=createDomWriter(ui),radial=new Vector3(),start=new Vector3(),normal=new Vector3(),tangent=new Vector3(),orientation=new Quaternion(),reference=new Quaternion(),inv=new Quaternion();
 let run=null,lastDraw=-Infinity,readout=0,progress=0,target=0,span=0,msg='',control='',readyTime=0,phase=0,cleared=false;
 const available=()=>game.stage==='encounter'&&!game.study&&names[encounterContext(game).body];
 function reset(){game.practice=null;run=null;lastDraw=-Infinity;dom.toggle('hud','flying-call',false);dom.hidden('pilot-window',true);}
 function toggle(){
  if(run){reset();return;}const title=available();if(!title)return;
  const id=encounterContext(game).body;run=id;phase=0;readyTime=0;cleared=false;msg='';lastDraw=-Infinity;
  start.copy(game.player.position).sub(world.bodyPositions[id]).normalize();reference.copy(game.player.quaternion).invert();
  if(id!=='earth')follow(id);else if(game.tracking)release();
  dom.text('pilot-call-title',title);dom.toggle('hud','flying-call',true);
 }
 function moveKey(dir){tangent.copy(dir).applyQuaternion(inv.copy(world.camera.quaternion).invert());return Math.abs(tangent.x)>Math.abs(tangent.y)?(tangent.x>0?'D':'A'):(tangent.y>0?'R':'F');}
 function tick(dt,sample){
  if(sample.brake)noteControl(game,'brake');if(sample.roll)noteControl(game,'roll');if(sample.vertical)noteControl(game,'rise');if(sample.lateral&&game.tracking)noteControl(game,'circle');if(sample.boost&&(sample.lateral||sample.vertical||sample.thrust))noteControl(game,'boost');
  if(!run||game.timePaused||cleared)return;if(!available()||run!==encounterContext(game).body){reset();return;}
  control='';const center=world.bodyPositions[run];radial.copy(game.player.position).sub(center);const range=radial.length();radial.normalize();
  const rate=game.player.velocity.length()/range*RAD;let inside=false;
  if(run==='earth'){
   orientation.copy(reference).multiply(game.player.quaternion);
   readout=bankDegrees(orientation.z,orientation.w);target=phase?0:30;span=phase?4:5;progress=60;
   // Reject a yaw/pitch reversal masquerading as roll from the back hemisphere.
   inside=orientation.x*orientation.x+orientation.y*orientation.y<.08&&Math.abs(readout-target)<=span&&game.angular.length()<.19;
   msg=phase?'Roll back to level, then let go.':'Bank to 30° either way, then let go.';control='Q / E';if(game.freeLook){inside=false;msg='Return to flight control to bank the probe.';control='V';}else if(orientation.x*orientation.x+orientation.y*orientation.y>=.08){msg='Turn back to your entry heading before levelling.';control='Mouse';}
  }else if(run==='jupiter'){
   readout=radial.angleTo(start)*RAD;target=26;span=5;progress=52;inside=Math.abs(readout-target)<=span&&rate<1.4;
   if(readout<target-span){msg='Build sideways speed. Release to coast into the band.';control=readout<1?'A / D':moveKey(normal.copy(start).addScaledVector(radial,-start.dot(radial)).negate());}
   else if(readout>target+span){msg='Past the window. Reverse the arc and try again.';control=moveKey(normal.copy(start).addScaledVector(radial,-start.dot(radial)));}
   else{msg='Brake inside the band; hold the view steady.';control='Space';}
  }else{
   normal.set(0,1,0).applyQuaternion(world.bodies.saturn.group.quaternion);readout=Math.asin(Math.max(-1,Math.min(1,radial.dot(normal))))*RAD;target=0;span=3;progress=45;
   if(Math.abs(readout)>6)phase=1;
   const clear=range/BODY_DATA.saturn.radius>=2.45;
   inside=phase&&clear&&Math.abs(readout)<=span&&rate<1.4;
   if(!clear){msg='Back away beyond the outer rings first.';control='S';}
   else if(!phase||Math.abs(readout)>span){msg=phase?'Move towards the ring plane until the ellipse becomes a line.':'Climb to open the rings, then approach their edge.';control=moveKey(tangent.copy(normal).addScaledVector(radial,-normal.dot(radial)).multiplyScalar((readout>=0?1:-1)*(phase?-1:1)));}
   else{msg='Brake with the rings edge-on.';control='Space';}
  }
  if(run!=='earth'&&game.tracking!==run){control='L';msg='Follow the world to recover the flight bearing.';inside=false;}
  readyTime=inside?readyTime+dt:0;
  if(readyTime>.6){readyTime=0;if(run==='earth'&&!phase){phase=1;cue('mode');}else{cleared=true;const done=game.pilot.finished;game.pilot.finished=[...done.filter(x=>x!==run),run];cue('complete');save();}}
 }
 function draw(){
  const supported=available(),visible=!!supported&&(!!run||game.guidance&&!game.quietHud&&game.chapterTime>3&&!game.pilot.finished.includes(encounterContext(game).body));
  dom.hidden('pilot-offer',!visible||!!run);dom.hidden('pilot-window',!visible||!run);if(!visible)return;
  const pad=input.device==='gamepad',key=pad?'Menu':'Y';dom.text('pilot-offer-key',key);dom.text('pilot-offer-label',supported);
  if(!run)return;const now=performance.now();if(now-lastDraw<90)return;lastDraw=now;
  const left=run==='saturn'?-progress:0,right=progress,pct=v=>100*Math.min(1,Math.max(0,(v-left)/(right-left)));
  dom.style('pilot-band','left',pct(target-span)+'%');dom.style('pilot-band','width',(pct(target+span)-pct(target-span))+'%');dom.style('pilot-needle','left',pct(readout).toFixed(1)+'%');dom.text('pilot-value',`${Math.round(readout)}°`);dom.text('pilot-target',run==='earth'?(phase?'Level · 0°':'Bank · 30°'):run==='jupiter'?'Coast window · 21–31°':'Ring opening · ±3°');
  const map={V:'Press right stick',Mouse:'Right stick','Q / E':'LB / RB','A / D':'Left stick ← / →',A:'Left stick ←',D:'Left stick →',R:'Left stick ↑',F:'Left stick ↓',Space:'B',S:'LT',L:'Menu → Camera'};
  const command=pad?(map[control]||control):control;
  if(cleared){dom.text('pilot-instruction',endings[run]);dom.text('pilot-command','Pass complete');}else{dom.text('pilot-instruction',msg);dom.text('pilot-command',command);}
  dom.text('pilot-close-key',key);dom.text('pilot-close-label',cleared?'Back to exploring':'Leave maneuver');
 }
 return {reset,toggle,tick,draw,get active(){return !!run;}};
}
