import test from 'node:test';
import assert from 'node:assert/strict';
import {ExperienceGuide,scienceTopic} from '../src/experience-guide.js';
import {journalNotes} from '../src/ui/journal.js';

test('polar science belongs to a visible northern cap and remains optional',()=>{
 const subject={id:'saturn',phase:70,ringElevation:70,poleInView:true};
 assert.equal(scienceTopic(2,subject),'saturn-hexagon');
 assert.notEqual(scienceTopic(2,{...subject,poleInView:false}),'saturn-hexagon');
 assert.notEqual(scienceTopic(2,{...subject,ringElevation:-70}),'saturn-hexagon');
 const guide=new ExperienceGuide(),state={seen:[]},reading={chapter:2,subject,enabled:true,time:20,steady:true};
 for(let i=0;i<90;i++)guide.update(state,reading,1/60);
 assert.equal(guide.active,null);
 for(let i=0;i<60;i++)guide.update(state,reading,1/60);
 assert.equal(guide.active.id,'saturn-hexagon');
 guide.update(state,{...reading,subject:{...subject,poleInView:false}},1/60);
 assert.equal(guide.active,null);assert.deepEqual(state.seen,[]);
 for(let i=0;i<420;i++)guide.update(state,reading,1/60);
 assert.deepEqual(state.seen,['saturn-hexagon']);
 assert.match(journalNotes(state,[])[0].detail,/25 June 2013/);
 const quiet=new ExperienceGuide(),unseen={seen:[]};
 for(let i=0;i<600;i++)quiet.update(unseen,{...reading,enabled:false},1/60);
 assert.equal(quiet.active,null);assert.deepEqual(unseen.seen,[]);
});
