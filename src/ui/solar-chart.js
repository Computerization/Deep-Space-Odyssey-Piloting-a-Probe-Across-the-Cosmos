import {formatDistance,signalTime} from '../flight.js';
import {CHART_NAMES as NAMES,CHART_EXTENTS,eclipticPoint,solarChartState} from '../solar-chart-state.js';
import {timeFlowLabel} from '../trajectory.js';
export {eclipticPoint} from '../solar-chart-state.js';

function chartModel(world,game,extent,selected,active){
 const state=solarChartState(world,game,active),{positions,route}=state;
 const points=Object.fromEntries(Object.entries(positions).map(([id,p])=>[id,eclipticPoint(p)]));
 const scale=235/extent,project=p=>[300+p[0]*scale,265-p[1]*scale];
 const path=points=>points.map((p,i)=>`${i?'L':'M'}${project(eclipticPoint(p)).map(v=>v.toFixed(2)).join(' ')}`).join(' ');
 const ticks=extent<=2?[.5,1,1.5]:extent<=12?[2,5,10]:extent<=35?[10,20,30]:extent<=100?[20,50,80]:[40,80,120];
 const objects=Object.entries(points).map(([id,p])=>{
  const [x,y]=project(p);return {id,x,y,name:NAMES[id],visible:Math.hypot(p[0],p[1])<=extent*1.02};
 });
 // The arrival marker is a future Voyager position, separate from the planets
 // at the displayed date. It shares the atlas's label collision handling.
 const arrival=route?eclipticPoint(route.remaining.at(-1)):null;
 const endpoint=arrival&&Math.hypot(arrival[0],arrival[1])<=extent*1.02?{id:'arrival',name:'Arrival',x:project(arrival)[0],y:project(arrival)[1]}:null;
 const p=positions[selected]||positions.voyager,point=eclipticPoint(p),range=Math.hypot(...p);
 const fromVoyager=Math.hypot(...p.map((v,i)=>v-positions[selected==='voyager'?'earth':'voyager'][i]));
 const values=[formatDistance(range),formatDistance(fromVoyager),signalTime(fromVoyager),`${point[2].toFixed(3)} AU`];
 return {state,positions,route,scale,path,ticks,objects,endpoint,values};
}

export function solarChart(world,game,extent=12,selected='voyager',active=game.mode!=='landing'){
 const {state,positions,route,scale,path,ticks,objects,endpoint,values}=chartModel(world,game,extent,selected,active);
 const arrivalMarker=endpoint?`
  <g class="chart-arrival" data-value="arrival" aria-label="${endpoint.name}" transform="translate(${endpoint.x.toFixed(2)} ${endpoint.y.toFixed(2)})">
   <title>${route.name} · ${route.date}${route.predicted?' · projected':''}</title><circle r="4"/>
   <text x="0" y="0" style="display:none">${endpoint.name}</text>
  </g>`:'';
 const routePlot=route?`
  <defs><clipPath id="voyage-trail-clip"><rect x="65" y="30" width="470" height="470"/></clipPath></defs>
  <g clip-path="url(#voyage-trail-clip)">
   <path class="chart-voyage-trail" d="${path(route.travelled)}"/>
   <path class="chart-voyage-remaining" d="${path(route.remaining)}"/>
  </g>${arrivalMarker}`:'';
 const routeInfo=route?`
  <div class="chart-route">
   <p>Towards ${route.name}<span>${route.date}${route.predicted?' · projected':''}</span></p>
   <p id="chart-remaining">${formatDistance(route.distance)} remaining along the track</p>
   <p class="chart-route-key"><span>Travelled</span><span>Remaining</span><span>Arrival position</span></p>
  </div>`:'';
 const plot=objects.map(({id,x,y,name,visible})=>{
  return `<g class="chart-object ${id===selected?'selected':''}" role="button" tabindex="0" aria-label="${name}" data-action="chart-object" data-value="${id}" style="display:${visible?'':'none'}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">
   <circle class="chart-hit" r="24"/><circle r="${id==='sun'?4:id==='voyager'?3:2.5}"/>
   <text x="0" y="0" style="display:none">${name}</text>
  </g>`;
 }).join('');
 return `<div class="solar-chart-layout">
  <div class="solar-plot">
   <div class="chart-toolbar" aria-label="Chart scale">${CHART_EXTENTS.map(x=>`<button data-action="chart-scale" data-value="${x}" aria-pressed="${x===extent}">${x} AU</button>`).join('')}</div>
   <div class="atlas-plot"><svg class="solar-chart" viewBox="0 0 600 540" role="group" aria-label="Linear heliocentric chart. ${extent} astronomical units from centre to edge.">
    <path class="chart-grid" d="M65 265H535M300 30V500"/>
    ${ticks.map(t=>`<circle class="chart-grid" cx="300" cy="265" r="${t*scale}"/><text class="chart-scale-label chart-tick" x="${305+t*scale}" y="280">${t}</text>`).join('')}
    ${routePlot}${plot}
    <path class="chart-scale-bar" d="M65 516h${scale*ticks[0]}m0 -4v8m${-scale*ticks[0]} -8v8"/>
    <text class="chart-scale-label" x="65" y="537">${ticks[0]} AU · linear scale</text>
   </svg></div>
  </div>
  <aside class="chart-inspector">
   <p class="eyebrow">${state.date}</p><h3>${NAMES[selected]||'Voyager 1'}</h3>
   <dl><dt>From the Sun</dt><dd>${values[0]}</dd>
    <dt>From ${selected==='voyager'?'Earth':'Voyager 1'}</dt><dd>${values[1]}</dd>
    <dt>One-way light time</dt><dd>${values[2]}</dd>
    <dt>Above ecliptic plane</dt><dd>${values[3]}</dd></dl>
   <p class="chart-disclosure">Linear scale; enlarged symbols. Positions project onto the ecliptic. ${state.transit?'Worlds are shown at the current date; the open marker is Voyager’s arrival position.':state.exploration?'Encounter epoch; probe at your flown position.':'Historical departure snapshot.'}</p>
   ${routeInfo}
   <div class="chart-object-list">${Object.keys(positions).map(id=>`<button data-action="chart-object" data-value="${id}" aria-pressed="${id===selected}">${NAMES[id]}</button>`).join('')}</div>
  </aside>
 </div>`;
}

// Refresh the existing nodes so pointer, keyboard and controller focus survive
// playback. Both the static chart and live view read the same presentation model.
function refreshChart(scope,world,game,extent,selected,layout){
 const m=chartModel(world,game,extent,selected,true);
 for(const object of m.objects){
  const node=scope.querySelector(`.chart-object[data-value="${object.id}"]`);
  node.style.display=object.visible?'':'none';
  node.setAttribute('transform',`translate(${object.x.toFixed(2)} ${object.y.toFixed(2)})`);
  if(!object.visible&&node.contains(document.activeElement))scope.querySelector(`.chart-object-list [data-value="${object.id}"]`)?.focus({preventScroll:true});
 }
 scope.querySelector('.chart-voyage-trail').setAttribute('d',m.path(m.route.travelled));
 scope.querySelector('.chart-voyage-remaining').setAttribute('d',m.path(m.route.remaining));
 scope.querySelector('.chart-inspector .eyebrow').textContent=m.state.date;
 scope.querySelectorAll('.chart-inspector dd').forEach((node,i)=>node.textContent=m.values[i]);
 scope.querySelector('#chart-remaining').textContent=`${formatDistance(m.route.distance)} remaining along the track`;
 layout();
}

export const chartPlaybackControls=`<div class="chart-playback"><button id="chart-slower" aria-label="Slower passage time">−</button><button id="chart-play">Play passage</button><button id="chart-faster" aria-label="Faster passage time">+</button><output id="chart-rate" aria-label="Selected time flow"></output></div>`;

// This permission is local to the open panel; simulation still has one clock.
// Opening the chart holds it until Play. Explicit Pause also holds flight time.
export function createChartPlayback({scope,world,game,extent,selected,layout,rates,changeRate,setHeld,playing=false}){
 let clock=0;
 const button=scope.querySelector('#chart-play'),slower=scope.querySelector('#chart-slower'),faster=scope.querySelector('#chart-faster'),rate=scope.querySelector('#chart-rate');
 const readout=()=>{
  button.textContent=controller.playing?'Pause passage':'Play passage';
  rate.textContent=timeFlowLabel(rates[game.rateIndex]);
  slower.disabled=game.rateIndex===0;faster.disabled=game.rateIndex===rates.length-1;
 };
 const controller={playing,hold(){
  if(!this.playing)return;this.playing=false;setHeld(true);readout();refreshChart(scope,world,game,extent,selected,layout);
 },update(dt){
  if(!this.playing)return;clock+=dt;
  if(clock>=.05){clock=0;refreshChart(scope,world,game,extent,selected,layout);}
 }};
 button.onclick=()=>{if(controller.playing)controller.hold();else{controller.playing=true;setHeld(false);readout();}};
 slower.onclick=()=>{changeRate(-1);readout();};faster.onclick=()=>{changeRate(1);readout();};
 readout();return controller;
}
