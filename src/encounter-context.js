import {CHAPTERS, MILESTONES} from './mission.js';
import {REGIONS} from './exploration.js';

// Optional starting states, explicitly separate from the recorded mission path.
// Titan has its own measured encounter epoch, earlier than Saturn closest approach.
export const STUDIES = [
  {id:'moon', chapter:0, body:'moon', epoch:0, radius:200000,
    title:'Earth beyond the Moon',
    opportunity:'earthrise', invitation:'Watch the lunar limb move against distant Earth.'},
  {id:'earth-shadow', chapter:0, body:'earth', epoch:0, radius:2500000,
    title:'The edge of Earth’s shadow',
    opportunity:'shadow', invitation:'Coast through the edge of Earth’s shadow.'},
  {id:'io', chapter:1, body:'io', epoch:1, radius:300000,
    title:'Io against the giant',
    opportunity:'io-pair', invitation:'Explore Io’s volcanic landscape with Jupiter beyond.'},
  {id:'titan', chapter:2, body:'titan', epoch:3, radius:500000,
    title:'Light through Titan’s haze',
    opportunity:'titan-light', invitation:'Follow sunlight through the edge of Titan’s atmosphere.'},
  {id:'ring-plane', chapter:2, body:'saturn', epoch:2, radius:6000000,
    title:'Along the ring plane',
    opportunity:'ring-edge', invitation:'Watch the rings change width as your viewpoint moves.'},
  {id:'north-pole', chapter:2, body:'saturn', epoch:2, radius:6000000,
    title:'Saturn’s polar clouds',
    opportunity:'north-pole', focusLocal:[0,.7,0], upLocal:[0,0,1], fov:40,
    invitation:'Trace the six-sided cloud boundary and the smaller storms within.'}
];

// Contexts describe fixed encounters; per-flight state belongs to the player.
const chapters=CHAPTERS.map((c,i)=>Object.freeze({body:c.body,epoch:c.epoch,title:c.title,study:false,region:REGIONS[i]}));
const studies=new Map(STUDIES.map(s=>[s.id,Object.freeze({...s,study:true,region:Object.freeze({
  body:s.body,radius:s.radius,worlds:REGIONS[s.chapter].worlds,title:s.title
})})]));
export function encounterContext(game) {
  const study=game.study&&studies.get(game.study);
  return study&&study.chapter===game.chapter?study:chapters[game.chapter];
}

const calendar=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});

// Exploration retains its historical milestone. An explicit offset is available for archival calculations.
export function encounterDate(game,epochs,seconds=0) {
  const context=encounterContext(game),anchor=epochs[context.epoch];
  const date=new Date(Date.parse(anchor.endsWith('Z')?anchor:anchor+'Z')+Math.floor(seconds)*1000);
  const precision=context.study?'second':MILESTONES[game.chapter].precision;
  const time=precision==='day'?'UTC':date.toISOString().slice(11,precision==='minute'?16:19)+' UTC';
  const note=context.study?'observation study':game.chapter===0?'departure study':CHAPTERS[game.chapter].predicted?'predicted':'';
  return `${calendar.format(date)} · ${time}${note?' · '+note:''}`;
}
