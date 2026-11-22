import * as THREE from 'three';
import {cornerBeyondLimb} from './view-framing.js';
import {BODY_DATA,CHAPTERS,MILESTONES,milestoneTime} from './mission.js';
import {opportunityPoint} from './opportunities.js';
import {encounterContext,STUDIES} from './encounter-context.js';
import {createDomWriter} from './ui/dom.js';
import {ENCOUNTER_TRAILS,ObservationHold,isDiscoveryView,nextDiscovery,pairedLimbGap,departureCue} from './encounter-trails.js';
const V=THREE.Vector3;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function nextStop(game){
 if(game.chapter===2&&game.study==='titan')return {chapter:2,study:null,name:'Saturn'};
 if(game.chapter===1)return {chapter:2,study:'titan',name:'Titan'};
 const chapter=game.chapter+1;return chapter<CHAPTERS.length?{chapter,study:null,name:MILESTONES[chapter].name}:null;
}
export function arrivalPosition(world,index,study){
 if(study==='titan')return world.fromFrame(world.getFrame('titan'),[.55,.17,2.3],BODY_DATA.titan.radius);
 const optional=STUDIES.find(s=>s.id===study&&s.chapter===index);if(optional)return opportunityPoint(optional.opportunity,world);
 const c=CHAPTERS[index];return c.start?world.fromFrame(world.getFrame(c.body),c.start,BODY_DATA[c.body].radius):world.bodyPositions.voyager.clone();
}
// Frame a horizon on arrival; camera angles never alter physical dimensions.
export function arrivalTarget(world,body){
 const center=world.bodyPositions[body];
 if(!['earth','jupiter','saturn','titan'].includes(body))return center.clone();
 return center.clone().addScaledVector(world.getFrame(body).y,BODY_DATA[body].radius*.51);
}
// A close waypoint behind a globe needs a safe arc, not a line through it.
// The bearing suggests that arc. It never changes the pilot's position.
export function approachLeg(position,goal,center,radius){
 const from=position.clone().sub(center),to=goal.clone().sub(center),angle=from.angleTo(to);
 if(angle<.3)return goal.clone();
 const rotation=new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(),to.clone().normalize()),.26/angle);
 return from.normalize().applyQuaternion(rotation).multiplyScalar(Math.max(radius*1.5,position.distanceTo(center),to.length())).add(center);
}
export function createJourney({game,world,ui,input,depart,transfer,finishLaunch,openStory,recordView,save,onDiscovery=()=>{}}){
 let step=0,visit='',launch=null,goal=null,ready=false,completed=false,recording=false,completedAge=0,storyHeard=false,heading=0,remaining=0,orbitKey=null,orbitAngle=0,rangeKey='W';
 const hold=new ObservationHold(),holdSeconds=2.4,driveForward=new V(),cameraInverse=new THREE.Quaternion();let reading='',departure=null,freshDeparture=false;
 const dom=createDomWriter(ui),film=ui('launch-film');
 let lastKeys;
 dom.node('journey-action').onclick=interact;
 const lookAt=(p,target,up=new V(0,1,0))=>new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(p,target,up));
 const trail=()=>ENCOUNTER_TRAILS[encounterContext(game).body]||[];
 const hint=()=>trail()[step];
 function landmark(stop){
  const b=world.bodies[stop.body],lat=(stop.landmark[1]-.5)*Math.PI;
  const beta=Math.atan(b.data.flatten*Math.tan(lat)),lon=(stop.landmark[0]-b.uniforms.rotation.value)*2*Math.PI;
  return new V(-Math.cos(beta)*Math.cos(lon),Math.sin(beta)*b.data.flatten,Math.cos(beta)*Math.sin(lon)).applyQuaternion(b.group.quaternion);
 }
 function seesLandmark(stop){
  if(!stop.landmark)return false;
  const c=world.bodyPositions[stop.body],n=landmark(stop),point=n.clone().multiplyScalar(BODY_DATA[stop.body].radius).add(c);
  const projection=world.project(point,game.player);
  return n.dot(c.clone().negate().normalize())>.1&&n.dot(game.player.position.clone().sub(point).normalize())>.4&&projection.front&&Math.abs(projection.x)<.7&&Math.abs(projection.y)<.7;
 }
 // A phase angle alone cannot tell whether a magnified camera is looking at
 // crater shadows. Sample the near-facing arc of the actual day/night boundary.
 function seesTerminator(center,radius,from){
  const sun=center.clone().negate().normalize(),normal=from.clone().addScaledVector(sun,-from.dot(sun)).normalize();
  const tangent=new V().crossVectors(sun,normal),n=new V(),offset=new V();
  for(const angle of [0,.3,-.3,.6,-.6,.9,-.9,1.2,-1.2]){
   n.copy(normal).multiplyScalar(Math.cos(angle)).addScaledVector(tangent,Math.sin(angle));
   if(n.dot(from)<=radius)continue;
   const p=world.project(offset.copy(center).addScaledVector(n,radius),game.player);
   if(p.front&&Math.abs(p.x)<.85&&Math.abs(p.y)<.85)return true;
  }
  return false;
 }
 function makeGoal(stop){
  if(!stop||stop.study)return null;
  if(stop.paired)return opportunityPoint(stop.paired,world);
  if(stop.landmark)return landmark(stop).normalize().multiplyScalar(BODY_DATA[stop.body].radius*stop.radius).add(world.bodyPositions[stop.body]);
  const c=world.bodyPositions[stop.body],sun=c.clone().negate().normalize();
  const up=new V(0,1,0).applyQuaternion(world.bodies[stop.body].group.quaternion);
  const side=new V().crossVectors(up,sun).normalize();
  // Choose the nearer side of the illuminated world; keep this choice for the visit.
  if(side.dot(game.player.position.clone().sub(c))<0)side.negate();
  const elevation=(stop.elevation||0)*Math.PI/180,phase=stop.phase*Math.PI/180;
  const equator=stop.elevation===undefined?sun:sun.addScaledVector(up,-sun.dot(up)).normalize();
  return c.clone().addScaledVector(equator,Math.cos(phase)*Math.cos(elevation)*BODY_DATA[stop.body].radius*stop.radius)
   .addScaledVector(side,Math.sin(phase)*Math.cos(elevation)*BODY_DATA[stop.body].radius*stop.radius)
   .addScaledVector(up,Math.sin(elevation)*BODY_DATA[stop.body].radius*stop.radius);
 }
 function select(index,keepHold=false){if(!keepHold)hold.reset();departure=null;reading='';step=Math.min(trail().length,Math.max(0,index));game.journeyStep=step;goal=makeGoal(hint());completed=!!hint()&&game.experience.seen.includes('trail-'+hint().id);ready=false;completedAge=0;storyHeard=false;heading=0;remaining=0;orbitKey=null;game.journeyNear=false;game.journeyReady=false;game.routeTarget=null;}
 function reset(savedStep=0){
  if(launch){launch=null;film.pause();film.hidden=true;ui('passage').classList.remove('launching');}
  freshDeparture=false;visit=`${game.chapter}:${game.study||''}`;select(savedStep);}
 function beginLaunch(progress=0){
  reset();ui('passage').classList.add('launching');game.stage='launch';game.timePaused=false;game.view='chase';game.look.identity();game.freeLook=false;game.tracking=null;
  const center=world.bodyPositions.earth,radial=world.fromFrame(world.getFrame('earth'),[.35,.2,2.35],1).sub(center).normalize();
  const position=center.clone().addScaledVector(radial,BODY_DATA.earth.radius*1.8);
  launch={elapsed:Math.max(0,Math.min(1,progress))*18,radial,preview:{position,quaternion:lookAt(position,arrivalTarget(world,'earth'),world.getFrame('earth').y)}};game.launchProgress=progress;
  ui('passage').hidden=false;ui('passage-chart').hidden=true;
  const opening=launch;film.hidden=launch.elapsed>=12.5;film.currentTime=Math.min(11.9,launch.elapsed);
  if(!film.hidden)film.play().catch(error=>{if(launch===opening&&error.name!=='AbortError')launch.elapsed=Math.max(launch.elapsed,12.5);});
  updateLaunch(0);
 }
 function setPaused(paused){if(!launch||film.hidden)return;if(paused)film.pause();else film.play().catch(()=>{});}
 function updateLaunch(dt){
  if(!launch)return;launch.elapsed+=dt;const seconds=launch.elapsed,t=Math.min(1,seconds/18);game.launchProgress=t;
  const earth=world.bodyPositions.earth,r=BODY_DATA.earth.radius,a=smooth((seconds-11)/7);
  game.player.position.copy(earth).addScaledVector(launch.radial,r*(1.15+.65*a));
  game.player.quaternion.copy(lookAt(game.player.position,earth.clone().lerp(arrivalTarget(world,'earth'),a),world.getFrame('earth').y));
  const opacity=String(smooth(seconds/.6)*(1-smooth((seconds-11)/1.5)));
  dom.toggle('passage','film-matte',seconds<1);
  const style=dom.node('passage').style;if(style.getPropertyValue('--film-opacity')!==opacity)style.setProperty('--film-opacity',opacity);
  dom.hidden('launch-film',seconds>=12.5);if(film.hidden&&!film.paused)film.pause();
  dom.style('passage-veil','opacity','0');
  dom.text('passage-title',seconds<11?'Cape Canaveral':'Earth departure');
  dom.text('passage-caption','Voyager 1 · 5 September 1977');
  const pad=input.device==='gamepad';
  const keys=`${pad?'D-pad ↑':'N'} · ${seconds<11?'Skip film':'Take control'} <span>${pad?'Menu':'Esc'} · Pause</span>`;
  if(launch.keys!==keys){dom.node('passage-keys').innerHTML=keys;launch.keys=keys;}
  dom.text('passage-detail',seconds<11?'NASA / JPL launch film':'NASA / JPL launch film · Simulated departure · time compressed');
  if(t===1){ui('passage').classList.remove('launching');launch=null;film.pause();film.hidden=true;game.stage='encounter';game.player.velocity.set(0,0,0);game.localSeconds=0;game.chapterTime=0;game.view='chase';world.followReady=false;game.look.identity();game.freeLook=false;game.tracking=null;ui('passage').hidden=true;reset();freshDeparture=true;departure='thrust';finishLaunch();}
 }
 function update(dt,thrust=0){
  if(game.stage==='launch'){updateLaunch(dt);return;}
  if(game.stage!=='encounter')return;
  if(visit!==`${game.chapter}:${game.study||''}`)reset();
  let stop=hint();const stops=trail();game.journeyFieldwork=!!stop;
  if(completed){
   completedAge+=dt;game.routeTarget=null;
   const next=nextDiscovery(stops,game.experience.seen,step);
   if(completedAge>(stop?.story?15:10)&&next!==step&&next<stops.length)select(next);
   return;
  }
  const body=encounterContext(game).body;
  if(!stops.length){game.routeTarget=null;return;}
  const radius=BODY_DATA[body].radius,center=world.bodyPositions[body],from=game.player.position.clone().sub(center);
  const framing=world.observationFraming(body,game.player),visible=framing.penetration>Math.min(.015,framing.angularRadius*.2);
  const phase=from.angleTo(center.clone().negate())*180/Math.PI;
  const up=new V(0,1,0).applyQuaternion(world.bodies[body].group.quaternion);
  const elevation=Math.asin(Math.max(-1,Math.min(1,from.clone().normalize().dot(up))))*180/Math.PI;
  const other=body==='moon'?'earth':'jupiter';
  let pairedVisible=false,gap=null;
  if(stops.some(s=>s.paired)){
   const far=world.observationFraming(other,game.player),bounds=far.bounds;
   const otherRay=world.bodyPositions[other].clone().sub(game.player.position);
   gap=pairedLimbGap(from.clone().negate().angleTo(otherRay),framing.angularRadius,far.angularRadius);
   pairedVisible=far.range>framing.range&&bounds&&Math.abs(bounds.x)+bounds.halfWidth<=1&&Math.abs(bounds.y)+bounds.halfHeight<=1&&gap>=0&&gap<.09;
  }
  const tan=Math.tan(world.camera.fov*Math.PI/360),towards=from.clone().negate().normalize();
  const limb=Math.asin(Math.min(1,world.observationRadius(body)/from.length()));
  towards.applyQuaternion(cameraInverse.copy(world.camera.quaternion).invert());
  const limbVisible=cornerBeyondLimb(towards.x,towards.y,towards.z,tan*world.camera.aspect,tan,limb);
  // A freely chosen view can reveal any unseen phenomenon at this world.
  // Specific later views (the polar jet, for example) take precedence over
  // the broad introductory view when both are visible.
  const found=stops.findLastIndex(s=>!game.experience.seen.includes('trail-'+s.id)&&isDiscoveryView(s,{range:from.length()/radius,phase,elevation,visible,pairedVisible,limbVisible,terminatorVisible:s.terminator&&visible&&Math.abs(phase-s.phase)<=25&&seesTerminator(center,radius,from),landmarkVisible:seesLandmark(s)}));
  hold.update(found,game.angular.lengthSq()<.09,dt);
  if(hold.steady&&found!==step&&hold.seconds>.6){select(found,true);stop=hint();}
  reading=stop?.study||!visible?'':stop?.paired?(pairedVisible?`Limb separation · ${(gap*180/Math.PI).toFixed(1)}°`:''):body==='saturn'&&stop?.elevation!==undefined?`Ring opening · ${Math.abs(elevation).toFixed(0)}° ${elevation<0?'south':'north'}`:stop?.phase>=100?`Sun–world–probe angle · ${Math.round(phase)}°`:'';
  ready=found===step&&hold.steady&&hold.seconds>.6;game.journeyReady=ready;
  departure=null;
  // Once a pilot chooses a bearing, follows a world or discovers another
  // viewpoint, normal circling guidance owns the HUD for the rest of the pass.
  if(freshDeparture&&(game.tracking||game.destination||stop?.id!=='earth-horizon'||Math.abs(phase-stop.phase)>25))freshDeparture=false;
  if(freshDeparture&&stop?.id==='earth-horizon'&&!game.destination&&!game.timePaused&&visible&&(found<0||found===step)){
   const range=from.length(),closing=-game.player.velocity.dot(from)/(range*radius);
   // Only suggest forward thrust while the probe's drive actually points
   // inward. Independent camera look and an off-axis limb are not enough.
   const forward=driveForward.set(0,0,-1).applyQuaternion(game.look).applyQuaternion(game.player.quaternion);
   if(found===step||forward.dot(from)/range<-.75)departure=departureCue(range/radius,closing,thrust,game.braking,found===step);
  }
  if(!stop||!goal){game.routeTarget=null;return;}
  const near=game.player.position.distanceTo(goal)<radius*(stop.paired?.65:.45),to=goal.clone().sub(center);
  orbitAngle=from.angleTo(to);rangeKey=from.length()>to.length()?'W':'S';
  game.journeyNear=found===step||(near&&!visible);
  // When following a world, suggest a camera-relative orbit direction instead
  // of asking the pilot to look away from the spectacle towards empty space.
  const tangent=to.clone().addScaledVector(from,-to.dot(from)/from.lengthSq());
  tangent.applyQuaternion(world.camera.quaternion.clone().invert());
  orbitKey=Math.abs(tangent.x)>Math.abs(tangent.y)?(tangent.x>0?'D':'A'):(tangent.y>0?'R':'F');
  const point=approachLeg(game.player.position,goal,center,radius);
  remaining=from.angleTo(to)*Math.max(from.length(),to.length())+Math.abs(from.length()-to.length());
  const direction=point.clone().sub(game.player.position).normalize();
  heading=direction.angleTo(world.camera.getWorldDirection(new V()));
  game.routeTarget={id:stop.body,point,goal:goal.clone(),remaining,title:game.journeyNear?`Look towards ${BODY_DATA[stop.body].name}`:stop.title,marker:!game.journeyNear};
  if(game.journeyNear)game.routeTarget.point=center;
  if(ready&&hold.seconds>=holdSeconds&&!recording){
   completed=true;completedAge=0;game.routeTarget=null;
   const id='trail-'+stop.id;if(!game.experience.seen.includes(id))game.experience.seen.push(id);
   onDiscovery(stop);save();
  }
 }
 async function interact(){
  if(game.stage!=='encounter'||recording)return;
  const stop=hint();
  if(!stop){if(game.chapter>=3)openStory(['pale','plasma','signal'][game.chapter-3]);else if(game.study)transfer({chapter:game.chapter,study:null,name:BODY_DATA[CHAPTERS[game.chapter].body].name});return;}
  if(completed&&!stop.story&&game.study&&nextDiscovery(trail(),game.experience.seen,step)===trail().length){transfer({chapter:game.chapter,study:null,name:BODY_DATA[CHAPTERS[game.chapter].body].name});return;}
  if(completed){if(stop.story&&!storyHeard){storyHeard=true;openStory(stop.story);return;}select(nextDiscovery(trail(),game.experience.seen,step));save();return;}
  if(stop.study){transfer({chapter:game.chapter,study:stop.study,name:BODY_DATA[stop.study].name});return;}
  if(!ready)return;
  const id='trail-'+stop.id;recording=true;
  try{
   const frame=await recordView({id,body:stop.body,title:stop.title,text:stop.finding,range:game.player.position.distanceTo(world.bodyPositions[stop.body]),phase:game.player.position.clone().sub(world.bodyPositions[stop.body]).angleTo(world.bodyPositions[stop.body].clone().negate())*180/Math.PI});
   if(!frame||hint()!==stop)return;
   if(!game.experience.seen.includes(id))game.experience.seen.push(id);
   completed=true;completedAge=0;game.routeTarget=null;save();
  }finally{recording=false;}
 }
 function render(){
  const active=game.stage==='encounter';dom.hidden('journey-direction',!active||!game.guidance);
  dom.toggle('hud','cinematic-flight',!active);dom.toggle('hud','story-flight',true);
  if(!active)return;
  const stop=hint(),next=nextStop(game),pad=input.device==='gamepad';
  const opening=(!freshDeparture||departure==='thrust')&&!game.tracking&&!game.destination&&game.chapter===0&&!game.study&&step===0&&!completed&&game.chapterTime<7&&!game.experience.seen.some(id=>id.startsWith('trail-earth-'));
  dom.toggle('hud','arrival-flight',opening);
  let title=stop?.title||['','','','Look back at Earth','Interstellar space','One light-day'][game.chapter];
  const framing=!!stop&&!completed&&hold.subject===step&&(hold.seconds>0||game.journeyNear);
  let copy=stop?(completed?stop.finding:framing?'':game.journeyNear?'L · Face the world.':stop.instruction):game.chapter===3?'Earth filled less than a pixel. Open Voyager’s original photograph.':game.chapter===4?'Listen to the pitch of the plasma waves.':game.chapter===5?'Send a command from Earth. How long until its reply arrives?':'';
  if(!stop&&game.chapter>=3&&game.experience.seen.includes(`${game.chapter}:0`))copy=['You found Earth in the beam of sunlight.','You heard the pitch rise in denser plasma.','Two days passed on Earth before the reply came home.'][game.chapter-3];
  if(stop&&!stop.study&&!completed&&!framing&&!game.journeyNear){
   const following=game.tracking===stop.body;
   const move=following?(orbitAngle>.25?`${orbitKey} · Circle towards the marker.`:`${rangeKey} · ${rangeKey==='W'?'Approach':'Move away'}.`):heading>.4?(pad?'Turn towards the diamond.':'L · Follow the world, then circle.'):'W · Approach the marker.';
   copy=game.destination&&!following?stop.instruction:move+' '+stop.instruction;
  }
  if(opening){title='The blue horizon';copy='Hold W to approach Earth.';}
  if(!completed&&departure){
   const drive=pad?'RT':'W',brake=pad?'B':'Space';
   if(departure==='thrust')copy=`Hold ${drive} to approach Earth.`;
   else if(departure==='release')copy=`Release ${drive}. Coast towards the blue rim.`;
   else if(departure==='coast')copy='Coasting towards Earth. Keep the blue rim in sight.';
   else if(departure==='brake')copy=`Hold ${brake} to slow your approach. Keep the blue rim in sight.`;
   else if(departure==='braking')copy='Approach slowing. Look along the blue rim.';
   else copy='Hold the thin blue rim in view.';
  }
  if(pad)copy=copy.replaceAll('Mouse · Steer','Right stick · Steer').replaceAll('Hold W','Hold RT').replaceAll('W ·','RT ·').replaceAll('S ·','LT ·').replaceAll('D ·','Left stick → ·').replaceAll('A ·','Left stick ← ·').replaceAll('R ·','Left stick ↑ ·').replaceAll('F ·','Left stick ↓ ·').replaceAll('L · Face the world.','Turn towards the world.').replaceAll('A / D','the left stick').replaceAll('Use F','Move the left stick down');
  dom.text('journey-marker',title);dom.hidden('journey-marker',!title);dom.text('journey-caption',copy);dom.hidden('journey-caption',!copy);
  dom.text('journey-reading',reading);dom.hidden('journey-reading',opening||completed||!reading);
  const observing=!!stop&&!completed&&hold.subject===step&&hold.seconds>.15;
  dom.hidden('field-feedback',opening||(!observing&&!completed));dom.text('field-status',completed?'In your journal':hold.steady?'Observing':'Reframing');
  dom.childStyle('field-feedback-meter','transform',`scaleX(${completed?1:Math.min(1,hold.seconds/holdSeconds).toFixed(2)})`);
  const exhausted=completed&&nextDiscovery(trail(),game.experience.seen,step)>=trail().length;
  const actionLabel=recording?'Saving…':stop?completed?(stop.story&&!storyHeard?'X · Listen':exhausted&&game.study?'X · Return':'X · Next'):stop.study?`X · ${BODY_DATA[stop.study].name} →`:'X · Photograph':game.chapter>=3?`X · ${['Open photograph','Listen','Send a signal'][game.chapter-3]}`:game.study?'X · Return':'';
  dom.text('journey-action',actionLabel);
  dom.hidden('journey-action',!actionLabel||opening||(exhausted&&!game.study&&!(stop.story&&!storyHeard))||!!stop&&!completed&&!ready&&!stop.study);
  dom.hidden('depart',false);dom.text('depart',`${pad?'D-pad ↑':'N'} · ${next?next.name:'Future outlook'}`);
  dom.text('chapter-date',game.study==='titan'?'12 November 1980 · 05:41 UTC':`${CHAPTERS[game.chapter].date}${MILESTONES[game.chapter].precision==='day'?'':` · ${milestoneTime(game.chapter)}`}${CHAPTERS[game.chapter].predicted?' · predicted':''}`);
  dom.hidden('chapter-date',game.chapterTime>15);
  const flightKeys=game.tracking?'W / S · Range <span>A / D · Circle</span><span>R / F · Rise / descend</span><span>Space · Brake</span><span>L · Release</span><span>P · Photo</span><span>C · View</span>':`Mouse · Steer <span>WASD · Fly</span><span>Space · Brake</span><span>L · Follow</span><span>P · Photo</span><span>G · ${game.guidance?'Hide':'Show'} guide</span><span>C · View</span>`;
  const keys=opening?(pad?'Right stick · Steer <span>RT / LT · Fly</span><span>B · Brake</span><span>Y · View</span>':'Mouse · Steer <span>W / S · Fly</span><span>Space · Brake</span><span>C · View</span>'):pad?'Right stick · Steer <span>RT / LT · Fly</span><span>Left stick · Move</span><span>LB / RB · Roll</span><span>B · Brake</span><span>Y · View</span>':flightKeys;
  // This strip has one writer. Keep the same controls and text nodes in flight.
  if(keys!==lastKeys){dom.node('flight-keys').innerHTML=keys;lastKeys=keys;}
 }
 function advance(){if(game.stage==='launch'){launch.elapsed=18;updateLaunch(0);return;}if(game.stage==='encounter')depart();}
 return {reset,beginLaunch,update,render,advance,interact,setPaused,get departureView(){return launch?.preview;}};
}
