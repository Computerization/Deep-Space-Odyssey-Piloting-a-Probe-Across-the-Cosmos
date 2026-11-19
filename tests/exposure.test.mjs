import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceExposure} from '../src/exposure.js';
const earth={id:'earth',duration:2.8},moon={id:'moon',duration:2.8};
const state=()=>({observation:earth,observing:1,observationLatched:false});
test('brief reframing preserves exposure without counting invalid frames',()=>{
 const s=state();for(let i=0;i<4;i++)assert.equal(advanceExposure(s,null,true,false,.1),null);
 assert.equal(s.observing,1);assert.equal(s.observation.id,'earth');assert.equal(s.canObserve,false);
 advanceExposure(s,earth,true,true,.1);assert.equal(s.observing,1.1);assert.equal(s.exposurePaused,false);
});
test('an extended loss releases the subject and its accumulated exposure',()=>{
 const s=state();for(let i=0;i<7;i++)advanceExposure(s,null,true,false,.1);
 assert.equal(s.observing,0);assert.equal(s.observation,null);
});
test('progress cannot transfer to a different subject',()=>{
 const s=state();for(let i=0;i<7;i++)advanceExposure(s,moon,true,true,.1);
 assert.equal(s.observation.id,'moon');assert.ok(s.observing<.3);
});
test('a nearly completed exposure never finishes while invalid or shaking',()=>{
 const s=state();s.observing=2.79;
 for(let i=0;i<20;i++)assert.equal(advanceExposure(s,earth,true,false,.1),null);
 assert.equal(s.observing,0);
});
test('completion needs a valid final frame and release before another photograph',()=>{
 const s=state();s.observing=2.79;
 assert.equal(advanceExposure(s,null,true,false,.2),null);
 assert.equal(advanceExposure(s,earth,true,true,.02),earth);
 s.observing=0;s.observation=null;
 for(let i=0;i<60;i++)assert.equal(advanceExposure(s,moon,true,true,.1),null);
 advanceExposure(s,moon,false,true,.1);
 let result;for(let i=0;i<29;i++)result=advanceExposure(s,moon,true,true,.1)||result;
 assert.equal(result,moon);
});
test('the exposure duration is consistent across 30, 60 and 120 fps',()=>{
 for(const fps of [30,60,120]){const s=state();s.observing=0;let seconds=0,result;while(!result&&seconds<4){result=advanceExposure(s,earth,true,true,1/fps);seconds+=1/fps;}assert.ok(Math.abs(seconds-2.8)<=1/fps+.00001);}
});
