import {encounterContext,encounterDate} from './encounter-context.js';
import {BODY_DATA} from './mission.js';
import {unobstructed} from './exploration.js';
import {encounterMeasurement} from './observations.js';
const MIN_ARC=12;
// Both positions are in km relative to the same body's centre, in one fixed
// encounter. Camera turns and lens changes cannot earn a second exposure.
export function baseline(a,b){
 const [x,y,z]=a,[u,v,w]=b;
 return {km:Math.hypot(x-u,y-v,z-w),angle:Math.atan2(Math.hypot(y*w-z*v,z*u-x*w,x*v-y*u),x*u+y*v+z*w)*180/Math.PI};
}
export function createFlyby({game,world,ui,archive,capture,save,toast,follow,openPanel}){
 const button=ui('flyby-button'),label=ui('flyby-label'),meter=ui('flyby-progress');const proof=ui('flyby-proof');let next=0,last='',proofId=null;
 function update(force=false){
  const active=game.stage==='encounter'&&game.chapter<3&&!!game.flyby?.first;if(button.hidden===active)button.hidden=!active;if(!active)return;
  const now=performance.now();if(!force&&now<next)return;next=now+160;
  const key=encounterContext(game).body,first=game.flyby?.first,pair=game.flyby?.pair;
  if((first?.id||null)!==proofId){proofId=first?.id||null;proof.hidden=true;proof.removeAttribute('src');
   if(proofId){const id=proofId;archive.get(id).then(frame=>{if(id===proofId&&frame?.photo){proof.src=frame.photo;proof.hidden=false;}});}
  }
  const arc=first?baseline(first.position,relative(key)).angle:0;
  const text=first?(arc>=MIN_ARC?'Take exposure II':'Circle for exposure II'):pair?.body===key?'Compare your flyby':'Make a flyby pair';
  const value=first?` · ${Math.min(MIN_ARC,Math.floor(arc))}° / ${MIN_ARC}°`:'';
  if(last!==text+value){label.textContent=text;meter.textContent=value;last=text+value;}
 }
 function relative(body){return game.player.position.clone().sub(world.bodyPositions[body]).toArray();}
 async function act(){
  if(game.stage!=='encounter'||game.chapter>=3)return;
  const ctx=encounterContext(game),body=ctx.body,state=game.flyby??={},first=state.first;
  if(!first&&state.pair?.body===body){compare(state.pair);return;}
  const at=relative(body),measure=first?baseline(first.position,at):null;
  if(measure&&measure.angle<MIN_ARC){toast('Keep the world in view. Hold Shift + A or D to open the angle.');return;}
  const frame=world.observationFraming(body,game.player),centres=Object.fromEntries(Object.entries(world.bodyPositions).map(([id,p])=>[id,p.toArray()]));
  if(!frame.visible||frame.angularRadius<.007||!unobstructed(game.player.position.toArray(),centres[body],body,centres)){toast('Frame the encounter world before taking an exposure.');return;}
  const entry={body,id:'flyby-'+crypto.randomUUID(),position:at},title=BODY_DATA[body].name;
  const photo=await capture(image=>({id:entry.id,title:`${title} · ${first?'II':'I'}`,chapter:ctx.title,date:encounterDate(game,world.ephemeris.epochs),kind:'field',photo:image,...encounterMeasurement(body,frame.range,BODY_DATA[body].radius,world.camera.fov)}),()=>{
   if(first){state.pair={body,ids:[first.id,entry.id],...measure};delete state.first;}
   else{state.first=entry;follow(body);}
   save();update(true);
  },{receipt:false});
  if(!photo||game.mode!=='play'||game.stage!=='encounter'||ctx!==encounterContext(game)||state!==game.flyby)return;
  if(first)compare(state.pair);else toast('Exposure I recorded. Hold Shift + A or D to circle; press Shift + P at 12°.');
 }
 function compare(pair){openPanel('flyby','Two places, one world',`<p class="eyebrow">FLYBY CONTACT SHEET</p><div id="flyby-print"></div><div class="panel-actions"><button class="primary" data-action="resume">Return to flight</button></div>`);mountPair(ui('flyby-print'),pair,archive);}
 return {update,act};
}
export async function mountPair(host,pair,archive){
 if(!pair||!host)return;
 const [a,b]=await Promise.all(pair.ids.map(id=>archive.get(id)));if(!host.isConnected||!a?.photo||!b?.photo)return;
 host.innerHTML=`<figure class="flyby-sheet"><div class="flyby-print"><img alt="First exposure"><img alt="Second exposure"><i aria-hidden="true"></i><span aria-hidden="true">I</span><span aria-hidden="true">II</span></div><figcaption><strong></strong><small></small></figcaption><label><span>Compare exposures</span><input type="range" min="0" max="100" value="50" aria-label="Compare exposures"></label></figure>`;
 const [first,second]=host.querySelectorAll('img');first.src=a.photo;second.src=b.photo;
 host.querySelector('strong').textContent=BODY_DATA[pair.body].name;host.querySelector('small').textContent=`${Math.round(pair.km).toLocaleString('en-US')} km · ${pair.angle.toFixed(1)}°`;
 const slider=host.querySelector('input');slider.oninput=()=>host.style.setProperty('--split',slider.value+'%');
}
