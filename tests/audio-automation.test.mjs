import test from 'node:test';
import assert from 'node:assert/strict';
import {holdParameter,crossfadeCurve,fadeParameter} from '../src/audio-automation.js';

test('interrupted crossfades preserve the combined power of four active channels',()=>{
 const starts=[Math.sqrt(.5),Math.sqrt(.25),Math.sqrt(.15),Math.sqrt(.1)];
 const curves=starts.map((v,i)=>crossfadeCurve(v,i===2?1:0));
 for(let i=0;i<129;i++)assert.ok(Math.abs(curves.reduce((sum,c)=>sum+c[i]**2,0)-1)<2e-7);
});
test('crossfades begin at the held gain and reach the selected target monotonically',()=>{
 for(const start of [0,.25,.9,1])for(const target of [0,1]){
  const curve=crossfadeCurve(start,target);assert.ok(Math.abs(curve[0]-start)<1e-7);assert.ok(Math.abs(curve.at(-1)-target)<1e-7);
  for(let i=1;i<curve.length;i++)assert.ok((curve[i]-curve[i-1])*(target-start)>=0);
 }
});
test('silent crossfade endpoints avoid the old square-root onset and cutoff slope',()=>{
 const incoming=crossfadeCurve(0,1),outgoing=crossfadeCurve(1,0),previousStep=Math.sqrt(1/128);
 assert.ok(incoming[1]<previousStep*.15);assert.ok(outgoing[127]<previousStep*.15);
});
test('fallback holds the value sampled before cancellation changes the timeline',()=>{
 const calls=[],param={value:.4,cancelScheduledValues:t=>{param.value=1;calls.push(['cancel',t]);},setValueAtTime:(v,t)=>calls.push(['set',v,t])};
 assert.equal(holdParameter(param,3),.4);assert.deepEqual(calls,[['cancel',3],['set',.4,3]]);
});
test('native automation holding uses the requested audio time',()=>{
 const calls=[],param={value:.6,cancelAndHoldAtTime:t=>calls.push(t)};
 assert.equal(holdParameter(param,7.25),.6);assert.deepEqual(calls,[7.25]);
});
test('fallback expresses the same fade through cancellable ramp segments',()=>{
 const events=[],param={value:.4,cancelScheduledValues:t=>events.push(['cancel',t]),setValueAtTime:(v,t)=>events.push(['hold',v,t]),linearRampToValueAtTime:(v,t)=>events.push(['ramp',v,t])};
 fadeParameter(param,0,3,7.5);const curve=crossfadeCurve(.4,0);
 assert.deepEqual(events.slice(0,2),[['cancel',3],['hold',.4,3]]);
 assert.equal(events.length,130);
 for(let i=1;i<curve.length;i++)assert.deepEqual(events[i+1],['ramp',curve[i],3+7.5*i/128]);
});
