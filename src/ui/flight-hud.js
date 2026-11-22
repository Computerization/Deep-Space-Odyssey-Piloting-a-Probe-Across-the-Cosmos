import {BODY_DATA} from '../mission.js';
import {formatDistance,navigationAnchor} from '../flight.js';
import {encounterContext} from '../encounter-context.js';
import {createDomWriter} from './dom.js';
import {bearingLayout} from './bearing-layout.js';
import {surfaceMeasurement} from '../surface-span.js';
import {discFraming} from '../view-framing.js';

// Presentation reads flight state. Bearings never steer the spacecraft.
export function createFlightHud({game,world,input,exploration,ui}) {
 const dom=createDomWriter(ui),$=dom.node;
 const kilometres=new Intl.NumberFormat('en-US');let lastScaleBody=null,lastAltitude=-1,nextScaleAt=0;
 const label=$('waypoint');
 const overlays=[document.querySelector('.chapter-heading'),document.querySelector('.flight-nav'),document.querySelector('.telemetry'),document.querySelector('.log-shortcut'),$('scene-reading'),$('journey-direction'),$('flight-keys'),$('photo-receipt'),$('cruise-scale'),$('flight-hint'),$('thrust-feedback'),$('safety')];
 const compact=matchMedia('(max-width:850px) and (min-height:520px)');
 let upper=false,nextDockCheck=0;
 let labelSize={width:150,height:38},avoid=[],preferred=null,lastSubject=null;
 const measure=()=>{
  const r=label.getBoundingClientRect();if(r.width&&r.height)labelSize={width:r.width,height:r.height};
  avoid=overlays.filter(e=>!e.hidden).map(e=>{const o=e.getBoundingClientRect();return{left:o.left,top:o.top,right:o.right,bottom:o.bottom};}).filter(r=>r.right>r.left&&r.bottom>r.top);
 };
 const observer=new ResizeObserver(measure);for(const element of [label,...overlays])observer.observe(element);window.addEventListener('resize',measure);
 // Reuse the rendered outer bound already measured for reflections, including haze and rings.
 const frameBody=(id,projection)=>discFraming(projection,(BODY_DATA[id]?.radius||0)*(world.bodies[id]?.reflectionRadius||1),world.camera.fov,world.camera.aspect);
 function placeBearing(destination,projection,worlds){
  const framed=frameBody(destination.id,projection);
  const bounds=framed.bounds;
  const radius=bounds?Math.max(bounds.halfWidth*innerWidth,bounds.halfHeight*innerHeight)/2:1e7;
  const resolved=destination.visible&&projection.front&&framed.visible&&radius>14;
  dom.toggle('waypoint','resolved',resolved);dom.hidden('bearing-leader',!resolved);
  if(!resolved){placeMarker('waypoint',projection);preferred=null;return;}
  if(lastSubject!==destination.id){preferred=null;lastSubject=destination.id;}
  // Keep the composition visible: a nearby moon's label must not cover the
  // distant world beside it. Reuse the same physical silhouette calculation.
  const clear=avoid.slice();
  for(const id of ['sun',...worlds]){
   if(id===destination.id)continue;
   const other=frameBody(id,world.project(world.bodyPositions[id],game.player)),b=other.bounds;
   if(!other.visible||!b)continue;
   const rect={left:Math.max(0,(b.x-b.halfWidth+1)*innerWidth/2),right:Math.min(innerWidth,(b.x+b.halfWidth+1)*innerWidth/2),top:Math.max(0,(1-b.y-b.halfHeight)*innerHeight/2),bottom:Math.min(innerHeight,(1-b.y+b.halfHeight)*innerHeight/2)};
   if(rect.right-rect.left>2&&rect.bottom-rect.top>2)clear.push(rect);
  }
  const ellipse=framed.ellipse?{major:framed.ellipse.major*innerHeight/2,minor:framed.ellipse.minor*innerHeight/2,angle:framed.ellipse.angle}:null;
  const layout=bearingLayout({x:((bounds?.x??projection.x)*.5+.5)*innerWidth,y:(-(bounds?.y??projection.y)*.5+.5)*innerHeight,radius,ellipse,width:innerWidth,height:innerHeight,labelWidth:labelSize.width,labelHeight:labelSize.height,avoid:clear,preferred});
  preferred=layout.side;dom.toggle('waypoint','offscreen',false);dom.toggle('waypoint','align-left',false);
  dom.style('waypoint','left',`${layout.left}px`);dom.style('waypoint','top',`${layout.top}px`);dom.hidden('waypoint',false);
  dom.hidden('bearing-leader',!layout.leader);
  if(layout.leader){const l=layout.leader,d=`M${l.x1.toFixed(1)} ${l.y1.toFixed(1)}${l.elbow?`L${l.elbow.x.toFixed(1)} ${l.elbow.y.toFixed(1)}`:''}L${l.x2.toFixed(1)} ${l.y2.toFixed(1)}`;const stem=$('bearing-stem');if(stem.getAttribute('d')!==d)stem.setAttribute('d',d);}
 }
 function placeMarker(id,projection){
  const el=$(id),{x,y,inView}=navigationAnchor(projection);
  el.classList.toggle('align-left',id==='waypoint'&&x>.45);
  if(id==='waypoint'){
   el.classList.toggle('offscreen',!inView);
   el.style.setProperty('--bearing-angle',`${Math.atan2(-y,x)*180/Math.PI-45}deg`);
  }
  el.style.left=`${(x*.5+.5)*100}%`;el.style.top=`${(-y*.5+.5)*100}%`;el.hidden=false;
  return inView;
 }
 function updateHud(){
  const p=game.player,pad=input.device==='gamepad';
  dom.text('pause-button',pad?'Menu':'Esc');
  if(game.stage!=='encounter'||!game.showHud){dom.hidden('surface-ruler',true);dom.hidden('thrust-feedback',true);return;}
  dom.text('view-button',pad?'Camera':'K · Camera');
  const context=encounterContext(game);
  dom.text('map-button',pad?'Explore':'M · Explore');
  const body=world.bodies[context.body];
  dom.hidden('world-scale',!body||context.body==='voyager');
  if(!game.quietHud&&body&&context.body!=='voyager'&&(lastScaleBody!==body||performance.now()>=nextScaleAt)){
   nextScaleAt=performance.now()+100;
   const local=p.position.clone().sub(world.bodyPositions[context.body]).applyQuaternion(body.group.quaternion.clone().invert()),range=local.length(),n=local.normalize();
   const surface=body.data.radius/Math.sqrt(n.x*n.x+n.z*n.z+(n.y/(body.data.flatten||1))**2);
   const altitude=Math.max(0,Math.round(range-surface));
   if(body!==lastScaleBody||altitude!==lastAltitude){
    dom.text('world-scale',`${kilometres.format(Math.round(body.data.radius*2))} km across · ${kilometres.format(altitude)} km altitude`);lastScaleBody=body;lastAltitude=altitude;
   }
  }
  // On compact displays use the sky on the opposite side of the globe.
  // A dead band keeps the guide still when the planet crosses mid-frame.
  if(!game.quietHud&&compact.matches&&game.guidance&&game.stage==='encounter'&&body&&context.body!=='voyager'){
   const now=performance.now();if(now>=nextDockCheck){nextDockCheck=now+160;
    const aim=world.project(world.bodyPositions[context.body],p),next=aim.front&&aim.y<(upper ? .08 : -.16);
    if(next!==upper){upper=next;dom.toggle('hud','upper-field-guide',upper);requestAnimationFrame(measure);}
   }
  }else if(upper){upper=false;dom.toggle('hud','upper-field-guide',false);requestAnimationFrame(measure);}
  // The bracket measures its two actual screen rays. It disappears on sky.
  const measuring=body&&context.body!=='voyager'&&(game.precision||!game.quietHud&&game.tracking===context.body||(game.guidance&&['jupiter','saturn'].includes(context.body)&&game.chapterTime<6));
  const span=measuring?surfaceMeasurement(p,world.bodyPositions[context.body],body,world.camera,.08,-.20):null;
  dom.hidden('surface-ruler',span===null);if(span!==null){dom.text('surface-length',kilometres.format(Math.round(span.km))+' km');
   const giant=context.body==='jupiter'||context.body==='saturn';dom.hidden('span-context',!giant);
   if(giant)dom.text('span-context',span.kind==='rings'?'Ring plane':`${(span.km/(2*BODY_DATA.earth.radius)).toFixed(2)} Earth widths`);}
  const drive=game.timePaused?'':game.braking?'Braking':game.thrust>.01?(game.boosting?'Fast thrust':'Thrust'):p.velocity.length()>2?'Coasting':'';
  dom.hidden('thrust-feedback',!drive);if(drive)dom.text('thrust-state',drive);
  // The journey owns X; its action is the only discovery control on screen.
  dom.hidden('observe-action',true);
  dom.text('photo-key',pad?'LS':'P');
  dom.property('photo-button','title',pad?'Take photograph · Left-stick click':'Take photograph · P');
  dom.hidden('capture-frame',!(game.observing>0));
  const destination=game.quietHud&&!game.destination?null:exploration.destination();
  if(game.guidance&&destination){
   const projection=world.project(destination.point,p);
   const follows=!destination.marker&&game.tracking===destination.id,canFollow=!destination.marker&&(context.region?.worlds.includes(destination.id)||context.body==='voyager');
   dom.text('waypoint-name',(follows||canFollow)?BODY_DATA[destination.id].name:destination.title);dom.text('waypoint-distance',formatDistance(destination.remaining??projection.distance));dom.hidden('waypoint-distance',!destination.marker&&context.body!=='voyager');
   dom.hidden('waypoint-key',!canFollow||pad);
   const action=follows?'Stop following':'Follow';dom.property('waypoint','disabled',!canFollow);
   dom.property('waypoint','ariaPressed',String(follows));
   dom.property('waypoint','ariaLabel',canFollow?`${action} ${BODY_DATA[destination.id].name} in the camera`:destination.title);
   dom.property('waypoint','title',canFollow?`${action} ${BODY_DATA[destination.id].name} · L`:'');
   if(destination.marker){dom.hidden('bearing-leader',true);dom.toggle('waypoint','resolved',false);placeMarker('waypoint',projection);}
   else placeBearing(destination,projection,context.region?.worlds||[]);
  }else{dom.hidden('waypoint',true);dom.hidden('bearing-leader',true);}
  dom.hidden('velocity-marker',true);
  dom.hidden('review-button',false);
  dom.text('safety',game.proximityLimited?'Close limit · fly sideways':game.explorationBoundary?.limited?'Outer limit · turn back':'');
  dom.hidden('flight-hint',true);
 }
 return {updateHud};
}
