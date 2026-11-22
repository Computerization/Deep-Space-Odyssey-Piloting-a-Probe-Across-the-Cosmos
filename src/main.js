import {createPilotSchool,noteControl,storedPilot,maneuverEcho} from './pilot-school.js';
import {createFlyby,mountPair} from './flyby.js';
import {bindScore} from './ui/score.js';
import {openCoda} from './ui/coda.js';
import {createSpacecraftPlate} from './rendering/spacecraft-plate.js';
import * as THREE from 'three';
import {CosmosWorld,icrf} from './world.js';
import {CHAPTERS,BODY_DATA,SOURCES,VOYAGE_STOPS} from './mission.js';
import {AU,clamp,formatDistance,formatFieldOfView,signalTime,safeReadStorage,safeWriteStorage} from './flight.js';
import {FlightHistory} from './flight-history.js';
import {createFlightReview} from './ui/flight-review.js';
import {encounterContext,encounterDate} from './encounter-context.js';
import {OPPORTUNITIES,opportunityPoint} from './opportunities.js';
import {advanceExposure} from './exposure.js';
import {stepManualFlight,initialiseEncounter,localGravity} from './flight-controller.js';
import {epochLabel} from './trajectory.js';
import {createJourney,nextStop,arrivalPosition,arrivalTarget} from './journey.js';
import {createTransitController} from './transit-controller.js';
import {Soundtrack} from './audio.js';
import {FlightInput} from './input.js';
import {ObservationCamera} from './observation-camera.js';
import {openCameraView} from './ui/camera.js';
import {solarChart} from './ui/solar-chart.js';
import {solarChartState,extentForSelection,distanceToEarth} from './solar-chart-state.js';
import {fitAtlasLabels} from './ui/atlas-layout.js';
import {createOuterStation} from './ui/outer-station.js';
import {installLanguage,chooseLanguage} from './ui/language.js';
import {openArchivePlate,openSignalDesk,bindPlasmaComparison} from './ui/deep-space.js';
import {createPhotoViewer} from './ui/photo-viewer.js';
import {createPhotoReceipt} from './ui/photo-receipt.js';
import {createFlightHud} from './ui/flight-hud.js';
import {openControlsView} from './ui/controls.js';
import {journalContent,journalNotes,navigatePhotographs} from './ui/journal.js';
import {openSettingsView,navigateSettingsTabs} from './ui/settings.js';
import {openInstrumentsView} from './ui/instruments.js';
import {restoreExperience} from './experience-guide.js';
import {createExperienceGuide} from './ui/experience-guide.js';
import {FramePolicy} from './rendering/frame-policy.js';
import {ObservationArchive,encounterMeasurement} from './observations.js';
import {ExplorationController} from './exploration-controller.js';
import {nextObservation, FIELD_FACTS,unobstructed} from './exploration.js';
const archive=new ObservationArchive();
const framePolicy=new FramePolicy();
const flightHistory = new FlightHistory(480, () => flightReview?.cameraState() ?? world?.cameraState(game.view));
let flightReview,observationCamera;
const $=id=>document.getElementById(id),V=THREE.Vector3,Q=THREE.Quaternion;
const saved=safeReadStorage('cosmos-voyager-save-v2');
const settings={muted:false,feedback:.7,volume:.6,quality:'high',passageMotion:'system',exposure:1,sensitivity:1,...safeReadStorage('cosmos-settings-v1',{})};
settings.language=chooseLanguage(settings.language,navigator.language);
const language=installLanguage(document,settings.language);
const outerStation=createOuterStation($);
function changeLanguage(value){settings.language=value;language.set(value);persistSettings();}
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let steadyPassages=false;
function applyPassageMotion(){
 steadyPassages=settings.passageMotion==='steady'||(settings.passageMotion!=='cinematic'&&motionPreference.matches);
 document.documentElement.classList.toggle('steady-passages',steadyPassages);
 if(game.stage==='transit')transitController?.refreshChart();
 if(world)world.needsRender=true;
}
const audio=new Soundtrack();audio.scoreMode=settings.scoreMode==='suites'?'suites':'concert';audio.volume=settings.volume;audio.feedbackVolume=settings.feedback;audio.muted=!!settings.muted;
const game={pilot:storedPilot(saved?.pilot),experience:restoreExperience(saved?.experience),mode:'loading',chapter:0,task:0,stage:'encounter',player:{position:new V(),quaternion:new Q(),velocity:new V()},view:'chase',look:new Q(),freeLook:false,tracking:null,rateIndex:2,actualRate:1,observing:0,angular:new V(),thrust:0,braking:false,stable:0,discovered:saved?.discovered||[],maxChapter:saved?.maxChapter||0,elapsed:0,chapterTime:0,uiTime:0,completed:false,guidance:true,destination:null,precision:false,explored:saved?.explored||[],showHud:true,idle:0,frameCount:0,fps:0,lastInput:0};
let school,flyby,updateHud,experienceGuide,transitController,journey,spacecraftPlate;
let journalTab='photos',journalRemoved=null,journalBusy=false,settingsTab='sound',instrumentsFromSettings=false;
let panelRevision=0,journalScroll=0,journalPhoto=null,mapTab='local',chartExtent=12,chartSelected='voyager',chartManualScale=false;
const photoViewer=createPhotoViewer({ui:$,openPanel,returnToJournal:id=>{if(id)journalPhoto=id;return openJournal(true)},removePhoto:removePhotograph});
const photoReceipt=createPhotoReceipt({ui:$,open:openRecentPhotograph});
let photoPending=false,releaseAtlas=()=>{};
let world,input,exploration,toastTimer,lastFrame=performance.now(),fpsTimer=0,fpsFrames=0,wasMode='play',panelType='',previousFocus=null,saveClock=0;
const panelParents=[];
applyPassageMotion();motionPreference.addEventListener('change',applyPassageMotion);
const zeroInput={lateral:0,vertical:0,thrust:0,yaw:0,pitch:0,roll:0,brake:false,observe:false};
const lookAt=(position,target,up=new V(0,1,0))=>new Q().setFromRotationMatrix(new THREE.Matrix4().lookAt(position,target,up));
function clearToast(){clearTimeout(toastTimer);const notice=$('toast');notice.classList.remove('visible');notice.hidden=true;notice.textContent='';}
function toast(text){const notice=$('toast');notice.textContent=text;notice.hidden=false;notice.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>notice.classList.remove('visible'),3600);}
function setHudVisibility(visible){
 game.showHud=visible;if(visible)journey?.glance();
 $('hud').style.opacity=visible?'1':'0';$('hud').inert=!visible;
 document.body.classList.toggle('clean-view',!visible);
 if(!visible){clearToast();}
}
function panelControls(scope){
 return [...scope.querySelectorAll('button,a,input,select,summary,[tabindex="0"]')].filter(e=>{
  if(e.disabled||!e.getClientRects().length)return false;
  // Closed details keep layout rectangles in Chrome, but their contents cannot
  // be seen or focused. Only their summary belongs in controller navigation.
  const closed=e.closest('details:not([open])');
  return !closed||closed.querySelector(':scope > summary')?.contains(e);
 });
}
function save(){
 if(game.mode==='loading'||!$('landing').hidden)return;
 const p=game.player;
 safeWriteStorage('cosmos-voyager-save-v2',{physicsVersion:3,pilot:game.pilot,flyby:game.flyby,journeyStep:game.journeyStep,launchProgress:game.launchProgress,study:game.study,history:game.stage==='encounter'?flightHistory.serialize(game):null,timePaused:game.timePaused,fuel:game.fuel,localSeconds:game.localSeconds,boundaryPaused:game.boundaryPaused,proximityLimited:game.proximityLimited,chapter:game.chapter,task:game.task,discovered:game.discovered,maxChapter:game.maxChapter,elapsed:game.elapsed,completed:game.completed,view:game.view,stage:game.stage,experience:game.experience,guidance:game.guidance,destination:game.destination,precision:game.precision,freeLook:game.freeLook,tracking:game.tracking,look:game.look.toArray(),showHud:game.showHud,explored:game.explored,position:p.position.toArray(),attitude:p.quaternion.toArray(),velocity:p.velocity.toArray(),rateIndex:game.rateIndex,fov:flightReview?.cameraState().fov??world.camera.fov,transit:game.stage==='transit'?transitController.checkpoint():null});
}
function restoreFlight(s){
 game.pilot=storedPilot(s.pilot);game.flyby=s.flyby||{};game.experience=restoreExperience(s.experience);
 game.timePaused=!!s.timePaused;
 // Earlier composition choices selected a subject without changing the pass.
 // Restore that subject through the single current bearing state.
 const destination=OPPORTUNITIES.find(o=>o.id===s.opportunity&&o.chapter===game.chapter)?.body||s.destination;
 game.tracking=observationCamera.subjects().includes(s.tracking)?s.tracking:null;
 game.guidance=s.guidance!==false;game.destination=encounterContext(game).region?.worlds.includes(destination)?destination:null;game.explored=Array.isArray(s.explored)?s.explored:[];
 if(!Array.isArray(s.position)||s.position.length!==3||!s.position.every(Number.isFinite))return;

 
 game.player.position.fromArray(s.position);if(s.attitude?.length===4)game.player.quaternion.fromArray(s.attitude).normalize();if(s.physicsVersion===3&&s.velocity?.length===3&&s.velocity.every(Number.isFinite))game.player.velocity.fromArray(s.velocity);else initialiseEncounter(game,world);
 game.fuel=Number.isFinite(s.fuel)?clamp(s.fuel,0,104):104;game.localSeconds=Math.max(0,Number(s.localSeconds)||0);game.boundaryPaused=false;game.proximityLimited=game.boundaryPaused&&!!s.proximityLimited;
 game.precision=!!s.precision;game.freeLook=!!s.freeLook;
 if(s.look?.length===4&&s.look.every(Number.isFinite))game.look.fromArray(s.look).normalize();
 setHudVisibility(s.showHud!==false);
 game.rateIndex=0;journey.reset(s.journeyStep||0);world.setFov(clamp(s.fov||58,4,70));world.followReady=false;
 if(s.stage==='transit'&&s.transit&&game.chapter<CHAPTERS.length-1){
  const t=s.transit,target=Number.isInteger(t.next)&&CHAPTERS[t.next]?{chapter:t.next,study:t.targetStudy,name:t.name}:nextStop(game);
  beginTransit(Number.isFinite(t.progress)?t.progress:0,target,{...t,held:s.timePaused});
 }
 if(s.stage==='launch'){journey.beginLaunch(s.launchProgress||0);}
 if(game.stage==='encounter'&&s.physicsVersion===3){
  if(flightHistory.hydrate(s.history,game))world.restoreCameraState({fov:world.camera.fov,follow:flightHistory.samples.at(-1).follow});
 }else flightHistory.reset(game);
 save();
}

function persistSettings(){safeWriteStorage('cosmos-settings-v1',settings);}
function syncSoundButtons(){
 $('landing-sound').textContent=audio.muted?'Sound off':'Sound on';
 const button=$('settings-sound');
 if(button){button.textContent=audio.muted?'Off':'On';button.setAttribute('aria-pressed',String(!audio.muted));}
}
function taskPoint(){const t=CHAPTERS[game.chapter].tasks[game.task];if(!t?.point)return null;return t.frameBody?world.fromFrame(world.getFrame(t.frameBody),t.point,BODY_DATA[t.frameBody].radius):world.fromFrame(game.frame,t.point,game.radius);}
function observationRadius(){const t=CHAPTERS[game.chapter].tasks[game.task];return t?t.zone*(t.frameBody?BODY_DATA[t.frameBody].radius:game.radius):0;}
function targetPosition(){const t=CHAPTERS[game.chapter].tasks[game.task];return t?(t.aim?world.fromFrame(world.getFrame(t.target),t.aim,BODY_DATA[t.target].radius):world.bodyPositions[t.target]):null;}
function refreshLanding(){
 const state=safeReadStorage('cosmos-voyager-save-v2'),hasSave=!!state?.position;
 $('continue').hidden=!hasSave;$('resume-context').hidden=!hasSave;
 $('continue').className=hasSave?'primary':'text-button';$('begin').className=hasSave?'text-button':'primary';
 $('begin').textContent=hasSave?'New voyage':'Begin voyage';
 if(hasSave){
  $('begin').before($('continue'));
  const chapter=state.stage==='launch'?'Launch · Earth':state.stage==='transit'&&state.transit?.name?`En route to ${state.transit.name}`:CHAPTERS[state.chapter]?encounterContext(state).title:'Your voyage';
  $('resume-context').textContent=chapter;
 }
}
function menuScene(){game.look.identity();world.setEpoch(0);const f=world.getFrame('earth');game.player.position.copy(world.fromFrame(f,[.3,.25,2.65],BODY_DATA.earth.radius));game.player.quaternion.copy(lookAt(game.player.position,f.center,f.y));game.player.quaternion.multiply(new Q().setFromAxisAngle(new V(0,1,0),.53));game.view='probe';world.setFov(58);}

// A title-screen visit is read-only until the player chooses to replace an
// existing checkpoint. Journal photographs and preferences live separately.
function requestVoyage(stop=null){
 if(!$('landing').hidden&&safeReadStorage('cosmos-voyager-save-v2')?.position){
  const label=!stop?'Start a new voyage':`Start at ${stop.name}`;
  openPanel('replace-voyage','Replace the current flight?',`<p class="lead">${label} and replace your saved ${stop?'position':'position and fieldwork progress'}.</p><p>Your journal photographs and settings will stay.</p><div class="panel-actions"><button class="primary" data-action="resume">Keep current flight</button><button data-action="replace-voyage" data-value="${stop?.id??'launch'}">${label}</button></div>`);
  $('panel-content').querySelector('[data-action=resume]').focus();return;
 }
 enterVoyage(stop);
}
function enterVoyage(stop){
 if(!stop){if(game.mode==='panel')closePanel();startJourney();return;}
 const index=stop.chapter,fromTitle=!$('landing').hidden;
 // A chapter jump keeps discoveries from the existing voyage, as before.
 if(fromTitle){const s=safeReadStorage('cosmos-voyager-save-v2');game.pilot=storedPilot(s?.pilot);game.flyby={pair:s?.flyby?.pair};game.view=s?.view==='probe'?'probe':'chase';game.experience=restoreExperience(s?.experience);game.discovered=s?.discovered||[];game.explored=s?.explored||[];game.maxChapter=s?.maxChapter||0;game.completed=!!s?.completed;game.elapsed=s?.elapsed||0;}
 audio.start().then(()=>audio.select(CHAPTERS[index].music)).catch(()=>{});
 $('landing').hidden=true;$('hud').hidden=false;wasMode='play';closePanel();startChapter(index,0,stop.study);
}
async function startJourney(resume=false){
 // Request audio during the click, while restoring flight immediately. Audio
 // devices can resume asynchronously; they must not hold the landing screen.
 const audioReady=audio.start();
 $('landing').hidden=true;$('panel').hidden=true;$('hud').hidden=false;game.mode='play';game.completed=false;
 const resumeSave=safeReadStorage('cosmos-voyager-save-v2');
 if(resume&&resumeSave){game.completed=!!resumeSave.completed;game.discovered=resumeSave.discovered||[];game.maxChapter=resumeSave.maxChapter||0;game.elapsed=resumeSave.elapsed||0;game.view=resumeSave.view||'probe';startChapter(clamp(resumeSave.chapter,0,CHAPTERS.length-1),Math.max(0,resumeSave.task||0),resumeSave.study);restoreFlight(resumeSave);game.chapterTime=30;}
 else{game.pilot=storedPilot();game.flyby={};game.elapsed=0;game.discovered=[];game.explored=[];game.maxChapter=0;game.view='chase';setHudVisibility(true);game.precision=false;game.experience=restoreExperience();game.guidance=true;startChapter(0);journey.beginLaunch();save();}
 input.rearm();
 if(input.device!=='gamepad')input.capturePointer();
 try{await audioReady;await audio.select(CHAPTERS[game.chapter].music);}catch{toast('Press B to enable music when ready.');}
}
function startChapter(index,task=0,studyId=null){
 school?.reset();if(game.flyby)delete game.flyby.first;
 photoReceipt.clear();
 clearToast();input?.rearm();
 const c=CHAPTERS[index];mapTab='local';chartExtent=12;chartManualScale=false;chartSelected='voyager';game.timePaused=false;game.chapter=index;game.study=studyId;game.destination=null;game.flightReadout=null;game.actualRate=1;game.observation=null;game.stage='encounter';game.task=Math.min(task,c.tasks.length);game.observing=0;game.observationLatched=false;game.exposureGap=0;game.exposurePaused=false;game.stable=0;game.angular.set(0,0,0);game.chapterTime=0;game.idle=0;game.maxChapter=Math.max(game.maxChapter,index);game.rateIndex=2;world.setFov(58);game.look.identity();game.freeLook=false;observationCamera?.release();observationCamera?.stopLens();
 const context=encounterContext(game);game.study=context.study?context.id:null;
 world.setEpoch(context.epoch);game.radius=BODY_DATA[context.body]?.radius||1000000;game.frame=world.getFrame(context.body);
 if(context.study){
  game.player.position.copy(opportunityPoint(context.opportunity,world));
  const orientation=world.bodies[context.body].group.quaternion;
  const target=context.focusLocal?new V(...context.focusLocal).applyQuaternion(orientation).multiplyScalar(game.radius).add(game.frame.center):game.frame.center;
  const up=context.upLocal?new V(...context.upLocal).applyQuaternion(orientation):game.frame.y;
  game.player.quaternion.copy(lookAt(game.player.position,target,up));
  world.setFov(context.fov??58);game.rateIndex=1;
 }else if(c.start){
  const entry=game.task>0&&c.tasks[game.task-1]?.point?c.tasks[game.task-1].point:c.start;
  const previous=c.tasks[game.task-1];
  game.player.position.copy(previous?.frameBody?world.fromFrame(world.getFrame(previous.frameBody),entry,BODY_DATA[previous.frameBody].radius):world.fromFrame(game.frame,entry,game.radius));
  game.player.quaternion.copy(lookAt(game.player.position,arrivalTarget(world,c.body),game.frame.y));
 }else{game.player.position.copy(world.bodyPositions.voyager);
  const target=index===4?game.player.position.clone().add(icrf(world.ephemeris.objects.voyager[c.epoch].velocity)):world.bodyPositions.earth;
  game.player.quaternion.copy(lookAt(game.player.position,target));
 }
 initialiseEncounter(game,world);
 if(game.study==='titan'){game.player.position.copy(arrivalPosition(world,index,'titan'));game.player.quaternion.copy(lookAt(game.player.position,arrivalTarget(world,'titan'),game.frame.y));}
 game.tracking=null;game.freeLook=false;game.rateIndex=0;journey?.reset();flightHistory.reset(game);
 $('cruise-scale').hidden=true;$('capture-frame').hidden=true;$('depart').hidden=false;
 $('chapter-title').textContent=context.body==='voyager'?context.title:BODY_DATA[context.body].name;$('chapter-date').textContent=encounterDate(game,world.ephemeris.epochs);
 $('depart').innerHTML=index===CHAPTERS.length-1?'Complete the voyage':'Continue the voyage';
 audio.select(c.music).catch(()=>toast('Music is waiting for an interaction. Press B.'));
 save();
}
function beginTransit(progress=0,target=nextStop(game),resume=null){
 if(game.stage==='transit')return;
 if(!target){openFuture();return;}
 school?.reset();
 photoReceipt.clear();clearToast();
 mapTab='solar';chartSelected='voyager';chartManualScale=false;
 game.precision=false;game.destination=null;game.observation=null;
 $('depart').hidden=true;$('observe-action').hidden=true;
 observationCamera.release();observationCamera.stopLens();game.canObserve=false;game.observing=0;transitController.begin(typeof progress==='number'?progress:0,target,resume);
 const predicted=CHAPTERS[target.chapter].predicted;
 $('chapter-title').textContent=predicted?'Towards one light-day':'Historical passage';save();
}

function recordObservation(index=game.observation?.index??game.task){
 const c=CHAPTERS[game.chapter],t=c.tasks[index],id=`${c.id}-${index}`;
 if(!t)return;
 return savePhotograph(photo=>({id,title:t.fact,chapter:encounterContext(game).title,date:encounterDate(game,world.ephemeris.epochs),text:t.text,detail:t.detail,photo,mode:t.mode||'imaging',...encounterMeasurement(t.target,game.player.position.distanceTo(world.bodyPositions[t.target]),BODY_DATA[t.target]?.radius||1,world.camera.fov)}),()=>{
  if(!game.discovered.includes(id))game.discovered.push(id);
  game.task=nextObservation(game.chapter,game.discovered,index);game.observing=0;game.observation=null;save();
  if(t.recording)openRecording(t.recording);
  if(t.archive)openStory('pale');
 });
}
function recordExploration(observation){
 const b=BODY_DATA[observation.body];
 return savePhotograph(photo=>({id:observation.id,kind:'exploration',title:observation.title,text:observation.text||FIELD_FACTS[observation.body],chapter:encounterContext(game).title,date:encounterDate(game,world.ephemeris.epochs),photo,phase:Math.round(observation.phase),...encounterMeasurement(observation.body,observation.range,b.radius,world.camera.fov)}),()=>{
  if(!game.explored.includes(observation.id))game.explored.push(observation.id);
  game.observing=0;game.observation=null;save();
 });
}
function outerFinding(id){if(!game.experience.seen.includes(id)){game.experience.seen.push(id);save();}}
function openStory(kind){
 if(kind==='future'){openFuture();return;}
 if(kind==='pale'){openArchivePlate(openPanel,$,()=>outerFinding('3:0'));return;}
 if(kind==='signal'){openSignalDesk(openPanel,$,()=>outerFinding('5:0'));return;}
 openRecording(kind);
}
function openFuture(){
 // The panel already pauses the simulation. Keep the pilot’s camera and flight clock.
 game.completed=true;save();
 audio.updateFlight({coda:true});
 openCoda(openPanel,$,game.experience.seen,game.flyby?.pair,maneuverEcho(game.pilot));
 mountPair($('coda-print'),game.flyby?.pair,archive);
}

function openRecording(kind){
 const plasma=kind==='plasma';
 openPanel('recording',plasma?'Beyond the solar wind':'Lightning at Jupiter',`${plasma?'<div id="plasma-comparison"></div>':'<img class="signal-waveform" src="assets/archive/jupiter-waveform.svg" alt="Amplitude of the historical lightning recording"><audio id="historic-media" controls preload="metadata" src="assets/audio/jupiter-lightning.mp3" aria-label="Voyager radio recording of lightning at Jupiter"></audio>'}<p class="lead">${plasma?'Listen for the rising pitch.':'Listen for the crackle.'}</p><p>${plasma?'These plasma-wave observations were recorded in 2012–2013. Their increasing frequency revealed a denser plasma beyond the solar wind. The presentation compresses months of measurements while preserving the recorded frequencies.':'Each burst is a radio signal from lightning in Jupiter’s atmosphere, picked up by Voyager’s antennas.'}</p><p class="small-note">${plasma?'NASA/JPL-Caltech/University of Iowa · archival instrument data':'NASA · Voyager · archival radio data'}</p><button class="primary" data-action="resume">Return to the voyage</button>`);
 if(plasma)bindPlasmaComparison($,()=>outerFinding('4:0'));
 const media=$('historic-media');audio.attachRecording(media);media.play().catch(()=>{});
}

function openPanel(type,title,content){
 journey?.setPaused(true);if(input)input.lookEnabled=false;
 observationCamera?.stopLens();
 releaseAtlas();releaseAtlas=()=>{};
 if(type!=='review')flightReview?.clear();
 photoReceipt.clear();
 if(game.mode==='play')save();
 clearToast();
 if(game.mode!=='panel'){wasMode=game.mode;previousFocus=document.activeElement;panelParents.length=0;}
 audio.stopRecordings();$('panel').querySelectorAll('audio,video').forEach(m=>m.pause());game.mode='panel';input.inMenu=true;panelRevision++;$('panel').dataset.view=type;game.angular.set(0,0,0);panelType=type;document.exitPointerLock?.();input?.clear();audio.setPaused(type!=='ending');
 $('panel-title').textContent=title;$('panel-content').innerHTML=content;$('panel').hidden=false;
 $('panel').scrollTop=0;$('panel-close').focus();
 bindPanelActions();if(type==='pause')$('panel-content').querySelector('[data-action=resume]')?.focus();
}
function bindPanelActions(){
 for(const element of $('panel-content').querySelectorAll('[data-action]')){
  const activate=()=>panelAction(element.dataset.action,element.dataset.value);
  element.addEventListener('click',activate);
  if(element.tagName.toLowerCase()==='g')element.addEventListener('keydown',event=>{
   if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();activate();}
  });
 }
}
function closePanel(){
 if(world.renderer.getContext().isContextLost())return;
 panelParents.length=0;
 releaseAtlas();releaseAtlas=()=>{};
 flightReview?.clear();
 audio.stopRecordings();$('panel').querySelectorAll('audio,video').forEach(m=>m.pause());audio.setDucked(false);
 $('panel').hidden=true;panelRevision++;game.mode=wasMode==='landing'?'landing':'play';input.inMenu=game.mode!=='play';input.rearm();audio.setPaused(false);if(game.mode==='play')$('universe').focus({preventScroll:true});else if(previousFocus?.isConnected&&previousFocus.getClientRects().length)previousFocus.focus();else document.activeElement?.blur?.();
 if(game.mode==='play'){journey?.setPaused(false);journey?.glance();if(input.device!=='gamepad')input.capturePointer();}
}
function panelAction(name,value){
 if(panelType==='pause'&&['review','map','camera','journal','guide','settings'].includes(name))panelParents.push({open:openPause,action:name});
 else if(panelType==='map'&&['review','recording'].includes(name))panelParents.push({open:openMap,action:name});
 if(name==='view-photo'){journalScroll=$('journal-body')?.scrollTop||0;journalPhoto=value;photoViewer.show(value);}
 else if(name==='previous-photo')photoViewer.move(-1);
 else if(name==='next-photo')photoViewer.move(1);
 else if(name==='back-to-journal')photoViewer.back();
 else if(name==='maneuver'){closePanel();school.toggle();}
 else if(name==='flyby'){closePanel();flyby.act();}
 else if(name==='resume')closePanel();
 else if(name==='back')backFromPanel();
 else if(name==='review')flightReview.open();
 else if(name==='camera')openCamera();
 else if(name==='instruments')openInstruments(true);
 else if(name==='flight-settings')returnToFlightSettings();
 else if(name==='precision'){closePanel();handleAction('precision');}
 else if(name==='destination'){game.destination=value;game.guidance=true;game.observing=0;game.observation=null;closePanel();save();}
 else if(name==='free-flight'){game.destination=null;game.guidance=false;game.observing=0;game.observation=null;closePanel();save();}
 else if(name==='map-tab'){mapTab=value;openMap();$('panel-content').querySelector(`[data-action=map-tab][data-value="${value}"]`)?.focus();}
 else if(name==='local-scale'){exploration.chartScale=value;openMap();$('panel-content').querySelector(`[data-action=local-scale][data-value="${value}"]`)?.focus();}
 else if(name==='chart-scale'){chartExtent=Number(value);chartManualScale=true;openMap();$('panel-content').querySelector(`[data-action=chart-scale][data-value="${value}"]`)?.focus();}
 else if(name==='chart-object'){chartSelected=value;chartManualScale=false;openMap();$('panel-content').querySelector(`.chart-object-list [data-value="${value}"]`)?.focus();}
 else if(name==='depart'){closePanel();beginTransit();}
 else if(name==='guidance'){school.reset();game.guidance=!game.guidance;closePanel();save();}
 else if(name==='fullscreen'){
  const promise=document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.();
  promise?.catch(()=>toast('Use your browser’s full-screen control.'));
 }
 else if(name==='restart'){closePanel();startChapter(game.chapter,0,game.study);}
 else if(name==='study'){closePanel();beginTransit(0,{chapter:game.chapter,study:value,name:value==='moon'?'Moon':value==='io'?'Io':value==='titan'?'Titan':'another viewpoint'});}
 else if(name==='main-encounter'){closePanel();beginTransit(0,{chapter:game.chapter,study:null,name:BODY_DATA[CHAPTERS[game.chapter].body].name});}
 else if(name==='home'){save();wasMode='landing';closePanel();$('landing').hidden=false;$('hud').hidden=true;menuScene();refreshLanding();$('continue').focus();}
 else if(name==='photo'){closePanel();saveFieldPhotograph();}
 else if(name==='delete-photo')removePhotograph(value);
 else if(name==='undo-photo')restorePhotograph();
 else if(name==='journal-tab'){journalTab=value;journalScroll=0;openJournal(false,true);}
 else if(name==='recording')openRecording(value);else if(name==='guide')openGuide();else if(name==='map')openMap();else if(name==='journal')openJournal();else if(name==='notes')openNotes();else if(name==='settings')openSettings();
 else if(name==='chapter')requestVoyage(VOYAGE_STOPS.find(s=>s.id===value));
 else if(name==='replace-voyage')enterVoyage(VOYAGE_STOPS.find(s=>s.id===value));
}
function openPause(){
 const recovering=world.renderer.getContext().isContextLost();
 openPanel('pause',recovering?'Restoring view · flight paused':'Paused',`<div class="pause-menu"><button data-action="resume" ${recovering?'disabled':''}>${recovering?'Waiting for picture…':'Resume flight'}</button>${game.stage==='encounter'?'<button data-action="review">Flight review</button>':''}${game.stage==='encounter'&&!game.study&&game.chapter<3?'<button data-action="maneuver">Flight maneuvers</button>':''}${game.stage==='encounter'&&game.chapter<3?'<button data-action="flyby">Flyby contact sheet</button>':''}<button data-action="map">Voyage</button><button data-action="camera">Camera</button><button data-action="journal">Journal</button>${game.stage==='encounter'?'<button data-action="photo">Take photograph</button>':''}<button data-action="guide">Controls</button><button data-action="settings">Settings</button><button data-action="home">Title screen</button></div>`);
}
function openSettings(initialTab=settingsTab){
 openSettingsView({settings,flight:game,fromPause:panelParents.at(-1)?.open===openPause,initialTab,ui:$,openPanel,onTabChange:tab=>{settingsTab=tab;},onFlightChange:(id,value)=>{
  game[id]=value;if(id==='precision')noteControl(game,id);if(id==='showHud')setHudVisibility(value);updateHud();experienceGuide.render();save();
 },onChange:id=>{
  if(id==='language')changeLanguage(settings.language);
  if(id==='muted'){audio.muted=settings.muted;audio.applyVolume();syncSoundButtons();}
  if(id==='volume')audio.setVolume(settings.volume);
  if(id==='feedback')audio.setFeedbackVolume(settings.feedback);
  if(id==='passageMotion')applyPassageMotion();
  if(id==='quality')world.setQuality(settings.quality);
  if(id==='sensitivity')input.sensitivity=.002*settings.sensitivity;
  persistSettings();
 }});
 bindScore($,audio,mode=>{settings.scoreMode=mode;persistSettings();});
}
function openCamera(){openCameraView({game,world,camera:observationCamera,ui:$,openPanel,closePanel,save,practised:id=>noteControl(game,id)});}
function openInstruments(fromSettings=false){
 instrumentsFromSettings=fromSettings;
 openInstrumentsView({fromSettings,openPanel,readings:{
  context:game.stage==='transit'?`${epochLabel(game.transit.jd)} · ${CHAPTERS[game.transit.next].predicted?'projected':'historical'} passage`:`${encounterContext(game).title} · ${encounterDate(game,world.ephemeris.epochs)}`,
  solarDistance:formatDistance(pDistance()),signalTime:signalTime(distanceToEarth(world,game)),fieldOfView:formatFieldOfView(world.camera.fov),
  gravity:game.stage==='encounter'?`${(localGravity(game.player.position,world.bodyPositions,encounterContext(game).region,new V()).length()*1000).toPrecision(3)} m/s²`:null,
  local:null
 }});
}
function returnToFlightSettings(){openSettings('flight');$('panel-content').querySelector('[data-action=instruments]')?.focus();}
function backFromPanel(){
 if(panelType==='photograph')photoViewer.back();
 else if(panelType==='instruments'&&instrumentsFromSettings)returnToFlightSettings();
 else if(panelParents.length){
  const parent=panelParents.pop();parent.open();$('panel-content').querySelector(`[data-action="${parent.action}"]`)?.focus();
 }else closePanel();
}
function fitChartSelection(){
 const active=game.mode!=='landing'&&(game.mode!=='panel'||wasMode!=='landing');
 chartExtent=extentForSelection(solarChartState(world,game,active),chartSelected,chartExtent);
}
function openMap(){
 const active=game.mode!=='landing'&&(game.mode!=='panel'||wasMode!=='landing');
 const encounter=active&&game.stage==='encounter',local=encounter?exploration.menu():'';
 if(!local&&mapTab==='local')mapTab=active&&game.stage==='transit'?'solar':'voyage';
 const tabs=`<nav class="map-tabs" aria-label="Voyage views">${[['local','Encounter'],['solar','Solar system'],['voyage','Voyage']].filter(([id])=>id!=='local'||local).map(([id,label])=>`<button data-action="map-tab" data-value="${id}" aria-pressed="${mapTab===id}">${label}</button>`).join('')}</nav>`;
 const recording=encounter&&[1,4].includes(game.chapter)?`<button class="text-button" data-action="recording" data-value="${game.chapter===1?'jupiter':'plasma'}">Instrument recording</button>`:'';
 const recovery=encounter?`<button class="text-button" data-action="review">Flight review</button><button class="text-button" data-action="${game.study?'main-encounter':'restart'}">${game.study?'Return to '+BODY_DATA[CHAPTERS[game.chapter].body].name:'Revisit encounter'}</button>${recording}`:'';
 const onward=encounter&&game.chapter<CHAPTERS.length-1?`<button class="primary" data-action="depart">Continue to ${nextStop(game)?.name||'the future'} <span aria-hidden="true">→</span></button>`:`<button class="primary" data-action="resume">${active?'Return to flight':'Return to title'} <span aria-hidden="true">→</span></button>`;
 const show=(title,content)=>{openPanel('map',title,`${tabs}<div class="atlas-body" data-map-view="${mapTab}">${content}</div><footer class="atlas-footer"><div class="atlas-secondary">${recovery}</div>${onward}</footer>`);releaseAtlas=fitAtlasLabels($('panel-content'));};
 if(mapTab==='solar'){if(!chartManualScale)fitChartSelection();show('Solar system',solarChart(world,game,chartExtent,chartSelected,active));
  return;}
 if(mapTab==='local'&&local){show(encounterContext(game).region.title,local);return;}
 show('Voyage',`<p class="voyage-note">1977–2026 · Historical encounters and the projected light-day milestone.</p><div class="voyage-chapters">${VOYAGE_STOPS.map((s,i)=>`<button class="route-row" data-action="chapter" data-value="${s.id}" ${active&&s.chapter===game.chapter&&(game.study==='titan')===(s.study==='titan')?'aria-current="true"':''}><span class="route-number">${String(i+1).padStart(2,'0')}</span><span><strong>${s.name}</strong><span class="milestone-kind">${s.label}</span></span><small>${s.date}<br>${s.time}</small></button>`).join('')}</div>`);
}

// One shutter/storage path for free photographs and optional observations.
// Capture and observation bookkeeping are synchronous; storage and its receipt
// finish later without changing whichever encounter the player has since opened.
async function savePhotograph(makeFrame,onCaptured=()=>{},{receipt=true}={}){
 if(photoPending)return;
 photoPending=true;
 photoReceipt.clear();
 $('photo-button').disabled=true;
 $('photo-label').textContent='Saving…';
 const {chapter,study,stage}=game;
 try{
  if(world.renderer.getContext().isContextLost()){
   toast('The view is recovering. Try the photograph again in a moment.');
   return;
  }
  const photo=world.capture(game.player,{view:game.view,exposure:settings.exposure,look:game.look,transit:stage==='transit',time:stage==='transit'?0:game.localSeconds});
  const frame={...makeFrame(photo),createdAt:Date.now()};
  const pending=archive.put(frame);
  onCaptured(frame);
  const persisted=await pending;
  if(!persisted){
   const link=document.createElement('a');
   link.href=frame.photo;
   link.download=`Cosmos-${frame.id}.jpg`;
   link.click();
   toast('Photograph downloaded. Browser storage is unavailable; journal copy lasts this session.');
  }
  if(game.mode==='play'&&chapter===game.chapter&&study===game.study&&stage===game.stage){
   if(receipt)photoReceipt.show(frame,persisted);
   audio.cue('observe');
  }
  return frame;
 }catch{
  toast('The photograph could not be captured. Please try again.');
 }finally{
  photoPending=false;
  $('photo-button').disabled=false;
  $('photo-label').textContent='Photograph';
 }
}
function saveFieldPhotograph(){
 if(game.stage==='launch'||game.stage==='transit')return;
 return savePhotograph(photo=>{
  const p=game.player;
  const centers=Object.fromEntries(Object.entries(world.bodyPositions).map(([id,v])=>[id,v.toArray()]));
  const candidates=(game.stage==='transit'?[]:Object.entries(BODY_DATA)).filter(([id,b])=>id!=='sun'&&world.bodyPositions[id]).map(([id,b])=>{
   const center=world.bodyPositions[id],framing=world.observationFraming(id,p);
   return {id,body:b,center,range:framing.range,framing};
  }).filter(x=>x.framing.visible&&x.framing.angularRadius*2/(world.camera.fov*Math.PI/180)*innerHeight>.75&&unobstructed(p.position.toArray(),x.center.toArray(),x.id,centers)).sort((a,b)=>b.framing.prominence-a.framing.prominence);
  const subject=candidates[0];let title='Deep space',measurement={range:`${formatDistance(p.position.length())} from Sun`,fieldOfView:formatFieldOfView(world.camera.fov)},phase=null;
  if(subject){
   const {id,body,center,range}=subject;
   phase=Math.acos(clamp(center.clone().negate().normalize().dot(p.position.clone().sub(center).normalize()),-1,1))*180/Math.PI;
   const aspect=subject.framing.feature==='rings'?'Rings':phase>105?'Crescent':phase>60?'Terminator':'Sunlit hemisphere';title=`${body.name} · ${aspect}`;
   measurement=encounterMeasurement(id,range,body.radius,world.camera.fov);
  }
  const date=game.stage==='transit'?epochLabel(game.transit.jd)+(CHAPTERS[game.transit.next].predicted?' · projected passage':' · historical passage'):encounterDate(game,world.ephemeris.epochs);
  return {id:'field-'+crypto.randomUUID(),kind:'field',title,chapter:encounterContext(game).title,date,photo,phase:phase===null?null:Math.round(phase),...measurement};
 });
}
async function openRecentPhotograph(id){
 journalTab='photos';
 const revision=panelRevision,frames=(await archive.all()).filter(f=>f.photo).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 if(game.mode!=='play'||revision!==panelRevision)return;
 journalPhoto=id;journalScroll=0;photoViewer.setFrames(frames);photoViewer.show(id);
}
async function openJournal(restore=false,focusTab=false){
 openPanel('journal','Journal','<p>Opening your journal…</p>');
 const revision=panelRevision;
 const frames=(await archive.all()).filter(f=>f.photo).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 if(panelType!=='journal'||game.mode!=='panel'||revision!==panelRevision)return;
 const notes=journalNotes(game.experience,game.discovered,frames);
 if(restore)journalTab='photos';else if(!focusTab&&!frames.length&&notes.length)journalTab='notes';
 $('panel-content').innerHTML=journalContent({frames,notes,tab:journalTab,removed:journalRemoved});
 photoViewer.setFrames(frames);bindPanelActions();
 if(restore){$('journal-body').scrollTop=journalScroll;const selected=[...$('panel-content').querySelectorAll('[data-action=view-photo]')].find(el=>el.dataset.value===journalPhoto);selected?.focus({preventScroll:true});if(selected){const box=selected.getBoundingClientRect(),body=$('journal-body').getBoundingClientRect();if(box.top<body.top||box.bottom>body.bottom)selected.scrollIntoView({block:'nearest'});}}
 if(focusTab)$('panel-content').querySelector('[data-action=journal-tab][aria-pressed=true]')?.focus();
}
async function removePhotograph(id){
 if(journalBusy)return;const revision=panelRevision;journalBusy=true;
 try{
  const frame=photoViewer.frame(id);if(!frame||!['field','exploration'].includes(frame.kind))return;
  if(!await archive.remove(id)){await archive.put(frame);toast('The photograph could not be removed. It remains in your journal.');return;}
  if(game.flyby?.first?.id===id)delete game.flyby.first;
  if(game.flyby?.pair?.ids.includes(id))delete game.flyby.pair;save();
  journalRemoved=frame;
  if(game.mode==='panel'&&panelRevision===revision){journalTab='photos';await openJournal(true);$('panel-content').querySelector('[data-action=undo-photo]')?.focus();}
 }finally{journalBusy=false;}
}
async function restorePhotograph(){
 if(journalBusy||!journalRemoved)return;journalBusy=true;const revision=panelRevision,frame=journalRemoved;
 try{
  const persisted=await archive.put(frame);journalRemoved=null;
  if(game.mode==='panel'&&panelRevision===revision){journalPhoto=frame.id;await openJournal(true);}
  if(!persisted)toast('Photograph restored for this session. Save a copy to keep it outside the browser.');
 }finally{journalBusy=false;}
}
function openGuide(){openControlsView({device:input.device,ui:$,openPanel,skills:game.pilot.skills,onPractice:game.stage==='encounter'&&$('landing').hidden?id=>{closePanel();school.reset();game.practice=id;}:null});}

function openNotes(){
 openPanel('notes','About the voyage',`<p class="lead">Deep Space Odyssey: Piloting a Probe Across the Cosmos</p><p>Information Technology Club × Astronomy Club</p><h3>The route</h3><p>The film shows the launch on 5 September 1977. The orbital departure is a reconstruction. Between encounters, the chart follows Voyager’s path in compressed time. The one-light-day endpoint uses NASA’s prediction for 18 November 2026.</p><h3>The view from the probe</h3><p>Planet sizes, separations and sunlight keep their physical scale. Local thrust and braking are exploration aids. You can leave any encounter when you choose.</p><p>Surface maps combine imagery from several missions; clouds and haze are reconstructed. External views and camera views after 1990 are simulated. The lightning and plasma recordings come from Voyager’s instruments.</p><p>The Milky Way is a star-catalogue reconstruction, not a Voyager photograph. The external view lifts the shadowed spacecraft for visibility.</p><h3>Sources and credits</h3><ul class="source-list">${SOURCES.map(([name,credit,url])=>`<li>${url?`<a href="${url}" target="_blank" rel="noopener">${name}</a>`:name}<br>${credit}</li>`).join('')}</ul><p class="small-note">All game assets are local. Source links are optional online reading.</p>`);
}

function pDistance(){return game.player.position.length();}
function resumeHeldTime(){
 if(game.mode==='play'&&game.timePaused&&!game.boundaryPaused){game.timePaused=false;save();}
}
function handleAction(name){
 if(name==='inputDevice'){document.documentElement.classList.toggle('gamepad-nav',input.device==='gamepad');return;}
 if(name==='controllerConnected'){toast('Xbox-compatible controller connected');return;}
 if(name==='controllerDisconnected'){if(game.mode==='play')openPause();toast('Controller disconnected. Reconnect or use the keyboard.');return;}
 if(name==='pointerReleased'){if(game.mode==='play')openPause();return;}
 if(name==='capturePointer'){if(game.mode==='play')input.capturePointer();return;}
 if(name==='pointerUnavailable'){toast('Move the mouse to look. Click the view once for continuous mouse control.');return;}
 if(name==='blur'){if(game.mode==='play')openPause();return;}
 if(name==='confirm'){
  if(game.mode==='landing'&&!$('begin').disabled){const el=document.activeElement;if(el?.matches('button')&&!el.disabled&&$('landing').contains(el)&&el.getClientRects().length)el.click();else startJourney(!$('continue').hidden);}
  else if(game.mode==='panel'){const active=document.activeElement;if(active?.matches('button,a,summary,[role="button"]'))active.click();}
  else if(game.mode==='play'&&input.device!=='gamepad'){const active=document.activeElement;if(active?.matches('#hud button')&&active.getClientRects().length)active.click();}
  // During flight, Xbox A observes; completed-flight choices require a new press.
  return;
 }
 if(name==='back'){if(game.mode==='panel')backFromPanel();else resumeHeldTime();return;}
 if(name==='music'){
  if(!audio.started){audio.muted=false;audio.start().then(()=>audio.select(CHAPTERS[game.chapter].music)).catch(()=>{});}else audio.toggle();
  settings.muted=audio.muted;persistSettings();syncSoundButtons();
  if(!(game.mode==='panel'&&panelType==='settings'))toast(audio.muted?'Sound muted':'Sound enabled');return;
 }
 if(name==='pause'){if(game.mode==='play')openPause();else if(game.mode==='panel'&&(panelType!=='pause'||performance.now()-(input.lastPointerRelease||-Infinity)>180)){backFromPanel();}return;}
 if(game.mode==='panel'||game.mode==='landing'){
  if(game.mode==='panel'&&panelType==='review'&&document.activeElement===$('review-range')&&['zoomIn','zoomOut','exposureUp','exposureDown'].includes(name)){flightReview.nudge(name==='zoomIn'||name==='exposureUp'?1:-1);return;}
  if(game.mode==='panel'&&panelType==='photograph'&&(name==='zoomIn'||name==='zoomOut')){photoViewer.move(name==='zoomIn'?1:-1);return;}
  const scope=game.mode==='panel'?$('panel'):$('landing');
  if(game.mode==='panel'&&panelType==='settings'&&['zoomIn','zoomOut'].includes(name)&&navigateSettingsTabs(name==='zoomIn'?'right':'left',scope))return;
  if(game.mode==='panel'&&panelType==='journal'){const directions={timeUp:'up',timeDown:'down',zoomOut:'left',zoomIn:'right'};if(directions[name]&&navigatePhotographs(directions[name],scope))return;}
  if(name==='timeUp'||name==='timeDown'){const buttons=panelControls(scope);const current=buttons.indexOf(document.activeElement);buttons[(current+(name==='timeUp'?-1:1)+buttons.length)%buttons.length]?.focus();return;}
  if(game.mode==='panel'&&(['exposureUp','exposureDown','zoomIn','zoomOut'].includes(name))){const el=document.activeElement;if(el?.matches('input[type=range]')){(name==='exposureUp'||name==='zoomIn')?el.stepUp():el.stepDown();el.dispatchEvent(new Event('input'));}else if(el?.matches('select')){el.selectedIndex=clamp(el.selectedIndex+((name==='exposureUp'||name==='zoomIn')?1:-1),0,el.options.length-1);el.dispatchEvent(new Event('input'));}return;}
  if(game.mode==='panel')return;
 }
 if(game.mode!=='play')return;
 if(game.stage==='launch'||game.stage==='transit'){if(name==='next'){if(game.stage==='launch')journey.advance();else transitController.skip();}
  if(name==='view'&&game.stage==='launch')journey.filmFrame();
  if(name==='holdPressed'&&game.stage==='transit')resumeHeldTime();return;}
 if(['look','view','precision','track'].includes(name)||name==='interact'&&game.chapter>=3)noteControl(game,name);
 if(name==='zoomIn'||name==='zoomOut')noteControl(game,'zoom');
 if(name==='maneuver')school.toggle();
 else if(name==='flyby')flyby.act();
 else if(name==='interact')journey.interact();
 else if(name==='instruments')openInstruments();
 else if(name==='camera')openCamera();
 else if(name==='review')flightReview.open();
 else if(name==='recentPhoto')photoReceipt.open();
 else if(name==='view'){observationCamera.setView(game.view==='probe'?'chase':'probe');toast(game.view==='probe'?'First-person view':'Third-person view');}
 else if(name==='look'){observationCamera.toggleFreeLook();toast(game.freeLook?'Free look · the spacecraft keeps its heading':'Flight control');}
 else if(name==='holdTime'){if(game.boundaryPaused){flightReview.open();return;}game.timePaused=!game.timePaused;save();}
 else if(name==='holdPressed')resumeHeldTime();
 else if(name==='timeUp'||name==='timeDown')return;
 else if(name==='zoomIn'||name==='zoomOut')observationCamera.zoom(name==='zoomIn'?1:-1);
 else if(name==='track'){
  clearToast();const body=encounterContext(game).body;
  observationCamera.toggleFollowing(game.tracking||exploration.destination()?.id||(body==='voyager'?'earth':body));save();
 }
 else if(name==='exposureUp'||name==='exposureDown'){settings.exposure=clamp(settings.exposure+(name==='exposureUp'?.15:-.15),.35,2.5);persistSettings();toast(`Exposure ${settings.exposure.toFixed(2)}`);}
 else if(name==='precision'){game.precision=!game.precision;save();audio.cue('mode');toast(game.precision?'Fine exploration control':'Standard exploration control');}
 else if(name==='guidance'){school.reset();game.guidance=!game.guidance;save();toast(game.guidance?'Route suggestions visible':'Free exploration · G to show suggestions');}
 else if(name==='hud'){setHudVisibility(!game.showHud);save();}
 else if(name==='guide')openGuide();else if(name==='map')openMap();else if(name==='journal')openJournal();else if(name==='next')journey.advance();
 else if(name==='photo')saveFieldPhotograph();
}
function updateFlight(dt,sample,clockDt=dt){
 if(!sample.observe)game.observationLatched=false;
 if(game.stage==='launch'){journey.update(Math.min(clockDt,.2));return;}
 if(game.stage==='transit'){transitController.update(dt,sample);return;}
 observationCamera.beforeInput(sample);
 stepManualFlight(game,world,sample,dt);
 observationCamera.updateTracking(dt);
 {
  const completed=advanceExposure(game,exploration.sample(),sample.observe,game.stable>.35,dt);
  if(completed){
   if(completed.kind==='mission')recordObservation(completed.index);
   else recordExploration(completed);
  }
 }

 journey.update(dt,sample.thrust);school?.tick(dt,sample);experienceGuide.update(dt);
}
function frame(now){
 requestAnimationFrame(frame);const rawDt=(now-lastFrame)/1000;const dt=Math.max(0,Math.min(rawDt,.1));lastFrame=now;
 if(!world||game.mode==='loading'||document.hidden)return;
 // An unavailable picture must never advance an unseen flight or count as a
 // cheap rendered frame in the adaptive quality budget.
 if(world.renderer.getContext().isContextLost()){framePolicy.didSkip();return;}
 if(game.mode==='play')observationCamera.updateLens(dt);
 input.aimScale=Math.min(1,Math.tan(world.camera.fov*Math.PI/360)/Math.tan(58*Math.PI/360));
 input.lookEnabled=game.mode==='play'&&game.stage==='encounter';input.inMenu=game.mode!=='play';
 const sample=input.sample(dt);
 if(game.mode==='play')updateFlight(dt,sample,rawDt);
 if(!$('landing').hidden){
  // About and encounter menus may overlay the same held studio view.
  spacecraftPlate.render();framePolicy.didSkip();if(!$('passage').hidden)$('passage').hidden=true;return;
 }
 spacecraftPlate.release();
 const departure=steadyPassages&&game.stage==='launch'&&journey.departureView;
 const rendered=departure||game.reviewPreview||game.player;
 const view=departure?'chase':game.stage==='transit'&&!steadyPassages?'chase':game.reviewPreview?.view||game.view,look=game.reviewPreview?.look||game.look,transit=game.stage==='transit'&&!game.transit?.showWorlds;
 const time=transit?0:(game.reviewPreview?.seconds??game.localSeconds??0);
 const renderDt=game.mode==='play'?dt:0;
 // The steady transfer chart is opaque. Keep simulating the passage, but
 // leave the last 3D frame alone until a world is visible again.
 const covered=(steadyPassages&&game.stage==='transit')||journey.filmCoversWorld;
 const viewChanged=!covered&&(framePolicy.viewChanged(rendered,look,view,transit,time)||world.viewSettling(rendered,renderDt,view,time));
 // Full-resolution clouds do not depend on a stopped simulation clock.
 const settled=!viewChanged&&!world.needsRender;
 if(!covered&&framePolicy.needsFrame(game.mode,settings.exposure,world.needsRender,document.hidden,viewChanged)){
  world.update(rendered,renderDt,{view,exposure:settings.exposure,look,transit,time,settled});
  framePolicy.didRender(game.mode,settings.exposure,rendered,look,view,transit,time);
 }else framePolicy.didSkip();
 // Record after drawing: the chase base can still be easing toward attitude.
 // Saves use that same displayed camera, including while reviewing the past.
 if(game.mode==='play'){
  if(game.stage==='encounter')flightHistory.record(game,dt);
  saveClock+=dt;if(saveClock>8){save();saveClock=0;}
 }
 const passage=$('passage'),hidePassage=game.mode==='landing'||(game.stage!=='launch'&&game.stage!=='transit');
 if(passage.hidden!==hidePassage)passage.hidden=hidePassage;
 if(game.mode==='play'){updateHud();experienceGuide.render();journey.render();school.draw();flyby.update();outerStation(game,world);}
 if(game.mode==='play'){audio.updateFlight({passage:game.stage==='launch'?'opening':game.chapter>=3?'outer':'encounter',altitudeRatio:game.flightReadout?game.flightReadout.range/BODY_DATA[game.flightReadout.id].radius:100,observing:game.observing>0,progress:game.observing/(game.observation?.duration||2.8),transit:game.stage==='transit',risk:game.flightReadout?.risk,sunlight:world.sunlightFraction},dt);}
 fpsFrames++;fpsTimer+=rawDt;if(fpsTimer>1){game.fps=fpsFrames/fpsTimer;fpsFrames=0;fpsTimer=0;}
 game.frameCount++;
}
function wire(){
 // Use the existing pause lifecycle; preserve any panel already being read.
 const pauseForGraphicsRecovery=()=>{
  input.rearm();
  if(game.mode==='play'||(game.mode==='panel'&&panelType==='pause'))openPause();
 };
 $('universe').addEventListener('webglcontextlost',pauseForGraphicsRecovery);
 $('universe').addEventListener('webglcontextrestored',pauseForGraphicsRecovery);
 $('pilot-offer').onclick=$('pilot-close').onclick=()=>school.toggle();
 $('flyby-button').onclick=()=>flyby.act();
 $('landing-score').onclick=()=>openSettings('sound');
 $('landing-language').onclick=()=>changeLanguage(settings.language==='en'?'zh-CN':'en');
 $('begin').onclick=()=>requestVoyage();$('continue').onclick=()=>startJourney(true);
 $('chapter-select').onclick=()=>{mapTab='voyage';openMap();};$('landing-notes').onclick=openNotes;$('landing-sound').onclick=()=>handleAction('music');
 $('slower-time').onclick=()=>handleAction('timeDown');$('faster-time').onclick=()=>handleAction('timeUp');$('time-toggle').onclick=()=>handleAction('holdTime');
 $('review-button').onclick=()=>flightReview.open();$('controls-button').onclick=openGuide;$('log-button').onclick=()=>openJournal();$('pause-button').onclick=openPause;$('map-button').onclick=openMap;$('view-button').onclick=openCamera;$('depart').onclick=()=>journey.advance();
 $('photo-button').onclick=()=>handleAction('photo');
 $('waypoint').onclick=()=>handleAction('track');
 // A pointer action returns to flight keys. Keyboard activation keeps focus
 // for another button action, so Space can retain its native meaning there.
 $('hud').addEventListener('click',e=>{if(e.detail>0&&e.target.closest('button')&&game.mode==='play')$('universe').focus({preventScroll:true});});
 $('panel-close').onclick=()=>handleAction('back');
 addEventListener('resize',()=>world.resize());
 document.addEventListener('fullscreenchange',()=>{
  for(const button of $('panel').querySelectorAll('[data-action=fullscreen]')){
   button.textContent=document.fullscreenElement?'Exit full screen':'Full screen';
   button.setAttribute('aria-pressed',String(!!document.fullscreenElement));
  }
 });
 document.addEventListener('visibilitychange',()=>{audio.setHidden(document.hidden);if(document.hidden){if(game.mode==='play')openPause();}if(document.hidden)$('panel').querySelectorAll('audio,video').forEach(m=>m.pause());});
 addEventListener('beforeunload',save);
 addEventListener('keydown',e=>{
  if(e.key!=='Tab'||e.metaKey||e.ctrlKey||e.altKey||!['panel','landing'].includes(game.mode))return;
  const controls=panelControls(game.mode==='panel'?$('panel'):$('landing'));if(!controls.length)return;
  // Use the visible control order on every platform, including browsers whose
  // default Tab preference omits buttons. This also handles entry from the page.
  e.preventDefault();const current=controls.indexOf(document.activeElement);
  const next=current<0?(e.shiftKey?controls.length-1:0):(current+(e.shiftKey?-1:1)+controls.length)%controls.length;
  controls[next].focus();
 });
 for(const scope of [$('panel'),$('landing')])scope.addEventListener('keydown',e=>{
  if(scope===$('panel')&&panelType==='settings'&&['ArrowLeft','ArrowRight'].includes(e.key)&&navigateSettingsTabs(e.key==='ArrowRight'?'right':'left',scope)){e.preventDefault();e.stopPropagation();return;}
  if(scope===$('panel')&&panelType==='journal'){const directions={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};if(directions[e.key]&&navigatePhotographs(directions[e.key],scope)){e.preventDefault();e.stopPropagation();return;}}
  if(e.target.matches('input,select,textarea')||!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
  const controls=panelControls(scope);if(!controls.length)return;
  e.preventDefault();e.stopPropagation();const current=controls.indexOf(document.activeElement);
  const index=e.key==='Home'?0:e.key==='End'?controls.length-1:(current+(e.key==='ArrowUp'?-1:1)+controls.length)%controls.length;
  controls[index]?.focus();
 });
 $('panel').addEventListener('keydown',e=>{if(panelType==='photograph'&&['ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();e.stopPropagation();photoViewer.move(e.code==='ArrowRight'?1:-1);return;}});
}
async function init(){
 let previewFrame;
 try{
  world=new CosmosWorld($('universe'),p=>{$('load-percent').textContent=`${Math.round(p*100)}%`;$('loading-bar').firstElementChild.style.width=`${p*100}%`;});
  exploration=new ExplorationController(game,world);
  input=new FlightInput($('universe'),handleAction);input.inMenu=true;input.sensitivity=settings.sensitivity*.002;
  school=createPilotSchool({game,world,ui:$,input,follow:id=>observationCamera.follow(id),release:()=>observationCamera.release(),save,cue:type=>audio.cue(type)});
  flyby=createFlyby({game,world,ui:$,archive,capture:savePhotograph,save,toast,follow:id=>observationCamera.follow(id),openPanel});
  ({updateHud}=createFlightHud({game,world,input,exploration,ui:$}));
  flightReview=createFlightReview({game,world,history:flightHistory,ui:$,openPanel,closePanel,save});
  transitController=createTransitController({game,world,ui:$,isSteady:()=>steadyPassages,arrive:(index,study)=>{startChapter(index,0,study);}});
  experienceGuide=createExperienceGuide({game,world,ui:$});
  journey=createJourney({game,world,ui:$,input,depart:()=>beginTransit(),transfer:target=>beginTransit(0,target),finishLaunch:()=>{flightHistory.reset(game);world.followReady=false;input.rearm();save();},openStory,recordView:recordExploration,save,onDiscovery:()=>audio.cue('observe')});
  wire();input.bindObserve($('observe-action'));
  world.setQuality(settings.quality);spacecraftPlate=createSpacecraftPlate(world,$);
  const previewModel=()=>{
   if(!document.hidden&&!world.renderer.getContext().isContextLost())spacecraftPlate.render();
   previewFrame=requestAnimationFrame(previewModel);
  };
  await world.load({onModel:()=>{$('craft-plate').hidden=false;previewModel();},onWarmup:()=>{
   cancelAnimationFrame(previewFrame);$('begin').textContent='Preparing flight…';
  }});
  observationCamera=new ObservationCamera(game,world);menuScene();game.mode='landing';
  $('chapter-select').disabled=false;$('landing-notes').disabled=false;
  $('begin').disabled=false;$('loading-bar').hidden=true;syncSoundButtons();refreshLanding();
  if(new URLSearchParams(location.search).has('test'))window.__cosmos={journey,game,world,input,audio,archive,exploration,experienceGuide,observationCamera,startJourney,startChapter:(i,t=0,study=null)=>{game.mode='play';$('landing').hidden=true;$('panel').hidden=true;$('hud').hidden=false;startChapter(i,t,study);},taskPoint,observationRadius,targetPosition,updateFlight,beginTransit,recordObservation,closePanel,flightHistory,flightReview,inspect:()=>({mode:game.mode,chapter:game.chapter,task:game.task,stage:game.stage,experience:game.experience,guidance:game.guidance,destination:game.destination,precision:game.precision,freeLook:game.freeLook,tracking:game.tracking,look:game.look.toArray(),showHud:game.showHud,explored:game.explored,position:game.player.position.toArray(),speed:game.player.velocity.length(),discovered:[...game.discovered],rate:game.actualRate,canObserve:game.canObserve,fps:game.fps,audio:audio.status(),render:world.renderer.info.render}),zeroInput};
  if('serviceWorker'in navigator&&!new URLSearchParams(location.search).has('test'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
  requestAnimationFrame(frame);
 }catch(error){cancelAnimationFrame(previewFrame);console.error(error);$('fatal-message').textContent=`${error.message}. Use the local launch script and a browser with WebGL 2 enabled.`;$('fatal').hidden=false;}
}
init();
