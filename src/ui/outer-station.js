import {AU,LIGHT_SPEED} from '../flight.js';

// Flight instruments, not objects placed in the sky. All distances use the
// current physical probe position; the two plates are identified as archives.
const stations={
 3:{channel:'ISS / 01',title:'The last portrait',kind:'Camera archive · 1990',image:'assets/archive/pale-blue-dot-display.jpg',alt:'Pale Blue Dot archive plate',caption:'NASA / JPL-Caltech · reprocessed plate'},
 4:{channel:'PWS / 02',title:'The pitch of space',kind:'Plasma-wave archive · 2012–13',image:'assets/archive/plasma-spectrum.jpg',alt:'Plasma frequencies recorded in 2012 and 2013',caption:'NASA / JPL-Caltech / University of Iowa'},
 5:{channel:'DSN / 03',title:'A day each way',kind:'Radio link · projected milestone',caption:'Signal clock · fixed-distance model'}
};
const radio=`<svg viewBox="0 0 240 94" role="img" aria-label="Schematic of the outbound command and returning reply"><g fill="none" stroke="currentColor"><path d="M18 69Q118 -31 222 69"/><path stroke-dasharray="3 4" d="M18 69Q119 25 222 69"/><circle cx="17" cy="69" r="7"/><circle cx="222" cy="69" r="3"/></g><text x="8" y="89">Earth</text><text x="178" y="89">Voyager 1</text></svg>`;
export function createOuterStation(ui){
 const el=ui('outer-station');let current=null,number,line,lastValue,lastLabel;
 return function render(game,world){
  const id=game.stage==='encounter'&&game.showHud&&game.guidance&&!game.quietHud?game.chapter:null,s=stations[id];
  if(!s){if(!el.hidden)el.hidden=true;current=null;return;}
  if(current!==id){current=id;el.dataset.station=id;el.hidden=false;
   el.innerHTML=`<header><span>${s.channel}</span><span>${s.kind}</span></header><h3>${s.title}</h3><figure>${s.image?`<img src="${s.image}" alt="${s.alt}">`:radio}<figcaption>${s.caption}</figcaption></figure><div class="station-read"><strong id="outer-value"></strong><span id="outer-readout"></span></div>`;
   number=el.querySelector('strong');line=el.querySelector('.station-read span');lastValue=lastLabel=null;
  }
  const p=game.player,home=world.bodyPositions.earth;
  const angle=id===3?world.project(home,p).angle*180/Math.PI:0;
  // A tenth of a degree is sufficient for a bearing indicator; keep held views quiet.
  const value=id===3?`${angle.toFixed(1)}°`:id===4?`${(p.position.length()/AU).toFixed(1)} AU`:`${(p.position.distanceTo(home)/LIGHT_SPEED/3600).toFixed(2)} h`;
  const label=id===3?(angle<5?'Earth bearing acquired':'Turn towards the Earth bearing'):id===4?'Distance from the Sun':'One-way light time to Earth';
  if(lastValue!==value){lastValue=value;number.textContent=value;}
  if(lastLabel!==label){lastLabel=label;line.textContent=label;}
 };
}
