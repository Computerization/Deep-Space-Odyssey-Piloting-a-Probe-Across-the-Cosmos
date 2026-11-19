import {AU} from './flight.js';
import {CHAPTERS,nextEncounterName,BODY_DATA} from './mission.js';
import {encounterContext,encounterDate} from './encounter-context.js';
import {epochLabel,trajectoryState,trajectoryDistance} from './trajectory.js';
export const CHART_NAMES={sun:'Sun',mercury:'Mercury',venus:'Venus',earth:'Earth',mars:'Mars',jupiter:'Jupiter',saturn:'Saturn',uranus:'Uranus',neptune:'Neptune',voyager:'Voyager 1'};
export const CHART_EXTENTS=[2,12,35,100,200];
const TILT=23.43928*Math.PI/180;
export function eclipticPoint(position){return [position[0]/AU,(position[1]*Math.cos(TILT)+position[2]*Math.sin(TILT))/AU,(-position[1]*Math.sin(TILT)+position[2]*Math.cos(TILT))/AU];}

export function solarChartState(world,game,active=true){
 const transit=active&&game.stage==='transit'&&game.transit;
 if(transit&&!transit.local){
  const jd=transit.jd,positions={sun:[0,0,0]};
  for(const id of Object.keys(world.chartEphemeris.metadata.objects))positions[id]=world.chartEphemeris.state(id,jd).position;
  positions.voyager=trajectoryState(world.cruise.objects.voyager,jd).position;
  const records=world.cruise.objects.voyager,end=transit.end??world.cruise.ends[transit.next],next=CHAPTERS[transit.next];
  const route={name:transit.targetStudy?BODY_DATA[encounterContext({chapter:transit.next,study:transit.targetStudy}).body].name:nextEncounterName(transit.next-1),date:next.date,predicted:!!next.predicted,
   travelled:voyagePath(records,records[0][0],jd),remaining:voyagePath(records,jd,end),distance:trajectoryDistance(records,jd,end)};
  return {positions,jd,date:epochLabel(jd)+(next.predicted?' · projected passage':' · historical passage'),transit:true,route};
 }
 const local=active?game:{chapter:0},context=encounterContext(local),records=world.ephemeris.objects;
 const positions={sun:[0,0,0],...Object.fromEntries(Object.keys(CHART_NAMES).filter(id=>records[id]).map(id=>[id,records[id][context.epoch].position]))};
 if(active)positions.voyager=[game.player.position.x,-game.player.position.z,game.player.position.y];
 return {positions,jd:records.voyager[context.epoch].jd,date:encounterDate(local,world.ephemeris.epochs,0)+(transit?.local?' · local transfer':' · reference epoch'),transit:false,exploration:active};
}

// A body-list selection locates its subject. Explicit scale choices stay manual.
export function extentForSelection(state,selected,current){
 const point=eclipticPoint(state.positions[selected]||state.positions.voyager);
 let required=Math.hypot(point[0],point[1])/.95;
 // Keep room around the selected object. The route can reach the chart edge;
 // padding its whole span would needlessly jump a 34 AU passage to 100 AU.
 if(selected==='voyager'&&state.route)for(const p of state.route.remaining){const q=eclipticPoint(p);required=Math.max(required,Math.hypot(q[0],q[1]));}
 return required<=current?current:CHART_EXTENTS.find(extent=>extent>=required)||CHART_EXTENTS.at(-1);
}

export function voyagePath(records,start,end){
 const trail=[trajectoryState(records,start).position];
 for(let i=0;i<records.length-1&&records[i][0]<end;i++){
  const a=Math.max(start,records[i][0]),b=Math.min(end,records[i+1][0]);
  if(b<=a)continue;
  trail.push(trajectoryState(records,(a+b)/2).position,trajectoryState(records,b).position);
 }
 return trail;
}

export function distanceToEarth(world,game){
 const p=game.player.position;
 if(game.stage==='transit'&&game.transit){
  const earth=world.chartEphemeris.state('earth',game.transit.jd).position;
  return Math.hypot(p.x-earth[0],-p.z-earth[1],p.y-earth[2]);
 }
 return p.distanceTo(world.bodyPositions.earth);
}
