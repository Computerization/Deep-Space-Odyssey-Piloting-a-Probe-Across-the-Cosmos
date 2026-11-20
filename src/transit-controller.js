import * as THREE from 'three';
import {icrf} from './world.js';
import {trajectoryState,trajectoryDistance,SECONDS_PER_DAY,epochLabel,flightDuration} from './trajectory.js';
import {CHAPTERS,BODY_DATA} from './mission.js';
import {encounterContext,STUDIES} from './encounter-context.js';
import {nextStop,arrivalPosition,arrivalTarget} from './journey.js';
import {formatDistance} from './flight.js';
import {createDomWriter} from './ui/dom.js';
import {createPassageChart,createLocalPassageChart} from './ui/passage-chart.js';
const V=THREE.Vector3;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// Each caption describes the mission rather than the assisted camera path.
const PASSAGE_NOTES={
 Jupiter:'At Jupiter, gravity bent Voyager’s path and increased its speed relative to the Sun.',
 Titan:'Jupiter’s gravity assist carried Voyager onward to the Saturn system and Titan.',
 Saturn:'Titan’s encounter redirected Voyager above the plane of the planets.',
 'Pale Blue Dot':'In 1990, Voyager turned its cameras homeward for a final family portrait.',
 'Interstellar space':'In 2012, particle measurements revealed Voyager crossing the heliopause.',
 'One light-day':'At one light-day, a radio message takes about 24 hours to reach Earth.'
};
const tuple=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
const jd=stamp=>Date.parse(stamp.endsWith('Z')?stamp:stamp+'Z')/86400000+2440587.5;
export function createTransitController({game,world,ui,arrive,isSteady=()=>false}){
 const dom=createDomWriter(ui);let chart=null;
 function checkpoint(){
  const t=game.transit;
  return {next:t.next,targetStudy:t.targetStudy,name:t.name,progress:t.progress,segmentStart:t.segmentStart,
   origin:t.origin.toArray(),orientation:t.orientation.toArray(),look:t.look.toArray()};
 }
 function begin(progress=0,target=nextStop(game),resume=null){
  if(!target)return false;
  const source=encounterContext(game),epoch=target.study==='titan'?3:CHAPTERS[target.chapter].epoch;
  const start=jd(world.ephemeris.epochs[source.epoch]),end=jd(world.ephemeris.epochs[epoch]);
  game.transit={next:target.chapter,targetStudy:target.study,name:target.name||CHAPTERS[target.chapter].title,start,end,duration:(end-start)*SECONDS_PER_DAY,seconds:0,jd:start,
   progress:Math.max(0,Math.min(1,progress)),length:trajectoryDistance(world.cruise.objects.voyager,start,end),travelled:0,
   origin:game.player.position.clone(),orientation:game.player.quaternion.clone(),look:game.look.clone(),sourceCenter:world.bodyPositions[source.body].clone(),sourceEpoch:source.epoch,
   arrivalEpoch:epoch,arrivalReady:false,showWorlds:true,destination:icrf(trajectoryState(world.cruise.objects.voyager,end).position)};
  game.stage='transit';game.timePaused=!!resume?.held;game.actualRate=0;game.flightReadout=null;game.thrust=0;game.boundaryPaused=false;game.routeTarget=null;
  const t=game.transit;t.local=end===start;t.segmentStart=0;
  t.place=t.name==='Moon'?'the Moon':t.name;
  if(resume){
   if(tuple(resume.origin,3)&&tuple(resume.orientation,4)&&tuple(resume.look,4)){
    t.origin.fromArray(resume.origin);t.orientation.fromArray(resume.orientation);t.look.fromArray(resume.look);
    if(t.local&&Number.isFinite(resume.segmentStart))t.segmentStart=Math.max(0,Math.min(t.progress,resume.segmentStart));
   }else if(t.local){
    // Older saves contain the current pose, not the original transfer curve.
    // Finish from that pose without jumping or replaying the first part.
    t.segmentStart=t.progress;
   }else if(t.progress<.24){
    t.origin.sub(t.sourceCenter).multiplyScalar(Math.exp(-smooth(t.progress/.24)*3.5)).add(t.sourceCenter);
   }
  }
  if(t.local){
   t.localView=t.orientation.clone().multiply(t.look);
   t.arrival=arrivalPosition(world,target.chapter,target.study);t.body=STUDIES.find(s=>s.id===target.study)?.body||CHAPTERS[target.chapter].body;
   t.length=t.origin.distanceTo(t.arrival);const side=new V().crossVectors(t.arrival.clone().sub(t.origin),new V(0,1,0)).normalize();if(!side.lengthSq())side.set(1,0,0);
   t.controlA=t.origin.clone().sub(t.sourceCenter).normalize().multiplyScalar(BODY_DATA[source.body].radius*4).add(t.origin).addScaledVector(side,t.length*.3);
   t.controlB=t.arrival.clone().sub(world.bodyPositions[t.body]).normalize().multiplyScalar(BODY_DATA[t.body].radius*4).add(t.arrival).addScaledVector(side,t.length*.3);
  }
  ui('passage').classList.remove('launching');ui('launch-film').pause();ui('launch-film').hidden=true;
  chart=isSteady()&&!t.local?createPassageChart(ui('passage-chart'),world,t):null;ui('passage').hidden=false;
  t.caption=t.local?'A nearby transfer, reconstructed for exploration.':PASSAGE_NOTES[t.name]||'The dated trajectory is time-compressed; the external camera is a reconstruction.';
  ui('passage-caption').textContent=t.caption;
  ui('cruise-scale').hidden=true;
  update(0,{});return true;
 }
 function refreshChart(){
  const t=game.transit,steady=isSteady();
  const inset=!steady&&!t.local&&t.next>=3&&t.progress>=.28&&t.progress<=.72;
  dom.toggle('passage-chart','outer-inset',inset);
  if((steady||inset)&&!chart)chart=t.local?createLocalPassageChart(dom.node('passage-chart'),t):createPassageChart(dom.node('passage-chart'),world,t);
  dom.hidden('passage-chart',!steady&&!inset);
  // Brief dissolves hide the changes between the encounter reconstruction and
  // sampled cruise trajectory. The scene remains three-dimensional throughout.
  const dissolve=x=>smooth((x-.20)/.035)*(1-smooth((x-.245)/.035));
  const reveal=steady||inset?1:0;
  dom.style('passage-veil','opacity',String(steady||t.local?0:Math.max(dissolve(t.progress),dissolve(t.progress-.50))));
  if(chart&&(steady||inset)){
   dom.style('passage-chart','opacity',String(reveal));if(reveal>0)chart(t.local?game.player.position:t.jd);
  }
 }
 function update(dt,sample){
  const t=game.transit;if(!t)return;
  if(t.held!==game.timePaused){
   t.held=game.timePaused;const label=t.held?'Space / B · Resume':'Space / B · Hold';
   ui('passage-keys').innerHTML=label+' <span>N / D-pad ↑ · Skip</span><span>Esc · pause</span>';
  }
  if(!game.timePaused)t.progress=Math.min(1,t.progress+Math.min(dt,.1)/(t.local?7:10));
  if(t.progress===t.displayedProgress)return;
  t.displayedProgress=t.progress;
  const p=t.progress,travel=smooth((p-.24)/.50);t.seconds=t.duration*travel;t.jd=t.start+(t.end-t.start)*travel;t.travelled=t.length*travel;
  dom.style('passage-progress','width',`${p*100}%`);
  dom.text('passage-detail',`${epochLabel(t.jd,!t.local&&Math.abs(t.duration)<SECONDS_PER_DAY)}${CHAPTERS[t.next].predicted?' · predicted destination':''} · ${t.local?'assisted transfer':`${flightDuration(Math.abs(t.duration))} · time compressed`}`);
  dom.text('passage-title',`${p>.8?'Arriving at':'Towards'} ${t.place}`);
  // Depart from the actual player view, cross the historical distance under
  // the dated intertitle, and emerge into an approaching destination.
  if(t.local){
   const localProgress=t.segmentStart<1?(p-t.segmentStart)/(1-t.segmentStart):1;
   const u=smooth(localProgress),v=1-u;t.showWorlds=true;game.look.identity();
   game.player.position.copy(t.origin).multiplyScalar(v*v*v).addScaledVector(t.controlA,3*v*v*u).addScaledVector(t.controlB,3*v*u*u).addScaledVector(t.arrival,u*u*u);
   const aim=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(game.player.position,world.bodyPositions[t.body],new V(0,1,0)));
   game.player.quaternion.copy(t.localView).slerp(aim,smooth(localProgress/.6));world.followReady=false;
  }else if(p<.24){
   t.showWorlds=true;game.player.position.copy(t.origin).sub(t.sourceCenter).multiplyScalar(Math.exp(smooth(p/.24)*3.5)).add(t.sourceCenter);game.player.quaternion.copy(t.orientation);game.look.copy(t.look);
  }else if(p<.74){
   t.showWorlds=false;game.player.quaternion.copy(t.orientation).multiply(t.look);game.look.identity();const state=trajectoryState(world.cruise.objects.voyager,t.jd);game.player.position.copy(icrf(state.position));game.player.velocity.copy(icrf(state.velocity));
  }else{
   if(!t.arrivalReady){world.setEpoch(t.arrivalEpoch);t.arrivalReady=true;t.arrival=arrivalPosition(world,t.next,t.targetStudy);t.body=STUDIES.find(s=>s.id===t.targetStudy)?.body||CHAPTERS[t.next].body;}
   t.showWorlds=true;const center=world.bodyPositions[t.body],a=smooth((p-.74)/.26);
   game.player.position.copy(t.arrival).sub(center).multiplyScalar(Math.exp((1-a)*2.8)).add(center);game.look.identity();
   const target=t.body==='voyager'?world.bodyPositions.earth:arrivalTarget(world,t.body);
   game.player.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(game.player.position,target,new V(0,1,0)));world.followReady=false;
  }
  refreshChart();
  if(p===1){
   // Arrival setup changes epoch/ownership, but preserves the last drawn pose.
   const position=game.player.position.clone(),orientation=game.player.quaternion.clone();
   ui('passage').hidden=true;ui('passage-chart').hidden=true;ui('passage-veil').style.opacity='0';arrive(t.next,t.targetStudy);
   game.player.position.copy(position);game.player.quaternion.copy(orientation);game.look.identity();world.followReady=false;
  }
 }
 return {begin,update,checkpoint,refreshChart,skip(){if(game.transit){game.transit.progress=1;update(0,{});}}};
}
