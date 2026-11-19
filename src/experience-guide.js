import {CHAPTERS} from './mission.js';
import {TRAIL_NOTES} from './encounter-trails.js';

const fromTask=(chapter,index)=>{
 const task=CHAPTERS[chapter].tasks[index];
 return {id:`${chapter}:${index}`,chapter,title:task.fact,text:task.text,detail:task.detail};
};
export const SCIENCE_NOTES=[
 ...TRAIL_NOTES,
 ...CHAPTERS.flatMap((chapter,i)=>chapter.tasks.map((_,j)=>fromTask(i,j))),
 {id:'saturn-hexagon',chapter:2,title:'A six-sided jet stream',text:'A jet stream traces a hexagon around Saturn’s north pole. Smaller storms turn inside it.',detail:'The pattern lies near 78° north planetographic latitude. This polar texture uses Cassini’s natural-colour view from 25 June 2013, registered to the observed jet latitude. It shows later weather and seasonal colour, rather than reconstructed conditions during Voyager’s 1980 flyby.'},
 {id:'saturn-ringshine',chapter:2,title:'Reflected light',text:'The rings reflect sunlight onto Saturn’s night side. This faint illumination changes with the Sun’s angle above the ring plane.',detail:'Cassini observed the night-side hemisphere facing the rings’ illuminated face receiving more reflected light. The scene integrates light from ring patches visible above each point’s horizon, including Saturn’s shadow on those patches. This is a single-bounce approximation using the existing ring optical model, not a reconstruction of atmospheric multiple scattering.'},
 {id:'moon',chapter:0,title:'A sharp lunar horizon',text:'The Moon has no substantial atmosphere to soften its limb. Oblique sunlight brings the cratered relief into view.',detail:'The lunar scene combines LRO camera imagery with measured LOLA terrain at its physical vertical scale.'}
];
export const ENCOUNTER_INVITATIONS=[
 ['Earth','Follow the blue horizon towards night. Clouds cast long shadows as the sunlight falls away.'],
 ['Jupiter','Trace the cloud bands towards the edge of daylight. Io waits elsewhere in this encounter.'],
 ['Saturn','Coast beside the rings and watch their shape change. Explore can point you towards Titan.'],
 ['A distant home','Earth is smaller than a pixel. Its bearing comes from the instruments.'],
 ['Between the stars','A boundary revealed by particles and plasma, invisible to the camera.'],
 ['One light-day','Twenty-four hours for a signal to reach Earth. Nearly fifty years to travel here.']
];

export function scienceTopic(chapter,subject){
 if(chapter===3)return '3:0';
 if(chapter>=4)return `${chapter}:0`;
 if(!subject)return null;
 const {id,radii,phase,ringElevation}=subject;
 if(id==='earth')return radii>=4?'0:2':radii<1.9?'0:1':'0:0';
 if(id==='moon')return 'moon';
 if(id==='jupiter')return phase>70&&phase<130?'1:1':'1:0';
 if(id==='io')return '1:3';
 if(id==='saturn'&&subject.feature==='rings')return Math.abs(ringElevation)<10?'2:1':'2:0';
 if(id==='saturn')return ringElevation>55&&subject.poleInView?'saturn-hexagon':phase>110&&Math.abs(ringElevation)>3?'saturn-ringshine':Math.abs(ringElevation)<10?'2:1':'2:0';
 if(id==='titan')return '2:2';
 return null;
}
export function restoreExperience(value){
 return {seen:Array.isArray(value?.seen)?value.seen.filter(id=>SCIENCE_NOTES.some(n=>n.id===id)):[]};
}
// The guide reads exploration. It never gates observations or chapter changes.
export class ExperienceGuide{
 constructor(){this.reset();}
 reset(){this.chapter=-1;this.candidate=null;this.dwell=0;this.active=null;this.remaining=0;this.reading=0;this.quiet=0;}
 update(state,reading,dt){
  if(this.chapter!==reading.chapter){this.reset();this.chapter=reading.chapter;}
  this.quiet=Math.max(0,this.quiet-dt);
  const topic=reading.enabled?scienceTopic(reading.chapter,reading.subject):null;
  // Read only while the caption can be shown. Revisiting an encounter brings
  // back its invitation; an interrupted note stays available afterward.
  if(this.active&&(this.active.id!==topic||reading.time<12)){this.active=null;this.remaining=0;this.reading=0;}
  if(this.active){
   this.remaining=Math.max(0,this.remaining-dt);this.reading+=dt;
   if(this.reading>=4&&!state.seen.includes(this.active.id)){
    state.seen.push(this.active.id);this.quiet=23;
   }
   if(this.remaining===0)this.active=null;
  }
  if(topic!==this.candidate){this.candidate=topic;this.dwell=0;}
  if(topic&&reading.steady)this.dwell+=dt;else this.dwell=0;
  if(topic&&reading.enabled&&reading.time>=12&&this.dwell>=2&&!state.seen.includes(topic)&&!this.active&&this.quiet===0){
   this.active=SCIENCE_NOTES.find(n=>n.id===topic);this.remaining=11;this.reading=0;
  }
  return {note:this.active};
 }
}
