import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextObservation, regionStatus, phaseAngle, perspective, observationAvailable, unobstructed} from '../src/exploration.js';
import {discVisibility} from '../src/rendering/lighting.js';

test('out-of-order discoveries leave every unrecorded observation available',()=>{
  assert.equal(nextObservation(0,['earth-2'],2),0);
  assert.equal(nextObservation(0,['earth-2','earth-0'],0),1);
  assert.equal(nextObservation(0,['earth-2','earth-0','earth-1'],1),3);
});
test('a suggested point is not an observation gate',()=>{
  assert.equal(observationAvailable(0,2,6371*12,40),true);
  assert.equal(observationAvailable(0,2,6371*2,40),false);
  assert.equal(observationAvailable(0,1,6371*2.4,40),true);
  assert.equal(observationAvailable(1,1,71492*4,80),true);
  assert.equal(observationAvailable(1,1,71492*4,0),false);
});
test('mapped-region advisory preserves its input position',()=>{
  const position=[3000000,3,5],before=[...position];
  assert.equal(regionStatus(0,position,[0,0,0]).outside,true);
  assert.deepEqual(position,before);assert.equal(regionStatus(4,position,[0,0,0]).radius,5000000);
});
test('phase and perspectives follow observer–world–Sun geometry',()=>{
  const center=[1e8,0,0];
  assert.equal(phaseAngle([1e8-1e4,0,0],center),0);
  assert.equal(phaseAngle([1e8,1e4,0],center),90);
  assert.equal(phaseAngle([1e8+1e4,0,0],center),180);
  assert.deepEqual([0,80,135].map(perspective),[0,1,2]);
});
test('a foreground globe blocks a field-study target',()=>{
  assert.equal(unobstructed([0,0,0],[20000,0,0],'moon',{earth:[10000,0,0]}),false);
  assert.equal(unobstructed([0,0,0],[20000,0,0],'moon',{earth:[10000,10000,0]}),true);
  assert.equal(unobstructed([0,0,0],[20000,0,0],'moon',{earth:[30000,0,0]}),true);
});
test('solar penumbra varies continuously between daylight and eclipse',()=>{
  assert.equal(discVisibility(.005,.01,0),0);
  assert.equal(discVisibility(.005,.01,.02),1);
  assert.ok(Math.abs(discVisibility(.01,.005,0)-.75)<1e-12);
  const values=Array.from({length:101},(_,i)=>discVisibility(.005,.01,.004+i*.00012));
  for(let i=1;i<values.length;i++){assert.ok(values[i]>=values[i-1]);assert.ok(values[i]-values[i-1]<.025);}
});
