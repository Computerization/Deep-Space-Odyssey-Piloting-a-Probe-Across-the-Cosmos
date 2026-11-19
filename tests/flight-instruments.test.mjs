import {test} from 'node:test';
import assert from 'node:assert/strict';
import {approachReadout,compressionStep,mixIntent,thrustFeedback} from '../src/flight-instruments.js';
import {burn,PROPULSION} from '../src/propulsion.js';

test('close approach instruments distinguish a safe pass from a surface intercept',()=>{
 const pass=approachReadout([100,20,0],[-10,0,0],[0,0,0],10,1);
 assert.equal(pass.risk,false);assert.equal(pass.closestAltitude,10);assert.equal(pass.timeToClosest,10);
 const collision=approachReadout([100,0,0],[-10,0,0],[0,0,0],10,1);
 assert.equal(collision.risk,true);assert.ok(collision.impactSeconds<10);
 assert.ok(collision.stoppingDistance>4e7);
 const leaving=approachReadout([100,0,0],[10,0,0],[0,0,0],10,100);
 assert.equal(leaving.risk,false);assert.equal(leaving.approaching,false);
});
test('compression ramps upward and obeys immediate proximity reductions',()=>{
 const start=compressionStep(1,1e6,1e6,1/60);assert.ok(start>1&&start<1.1);
 assert.equal(compressionStep(1e6,1e6,40,1/60),40);
 assert.equal(compressionStep(1000,10,1e6,1/60),10);
 let rate=1;for(let i=0;i<240;i++)rate=compressionStep(rate,1e6,1e6,1/60);
 assert.equal(rate,1e6);
});
test('mix states leave headroom and give observations acoustic space',()=>{
 const close=mixIntent({altitudeRatio:2}),record=mixIntent({altitudeRatio:2,observing:true});
 assert.ok(close.gain<1&&record.gain<close.gain);assert.ok(record.cutoff<close.cutoff);
 assert.ok(mixIntent({risk:true}).gain<record.gain);
});

test('thrust feedback follows delivered impulse at every playback rate',()=>{
 for(const rate of [1,10,1000]){
  let feedback=null,fuel=PROPULSION.fuelKg;
  for(let i=0;i<100;i++){
   const engine=burn(fuel,.6,10);fuel=engine.fuel;
   feedback=thrustFeedback(feedback,{command:.6,...engine,held:false},10/rate);
  }
  assert.equal(feedback.state,'firing');
  assert.ok(Math.abs(feedback.deltaV-burn(PROPULSION.fuelKg,.6,1000).deltaV)<1e-12);
  const held=thrustFeedback(feedback,{command:.6,deltaV:0,acceleration:0,fuel,held:true},1);
  assert.equal(held.state,'held');assert.equal(held.deltaV,feedback.deltaV);assert.equal(held.acceleration,0);
  const coast=thrustFeedback(held,{command:0,deltaV:0,acceleration:0,fuel,held:false},.1);
  assert.equal(coast.state,'coasting');assert.equal(coast.deltaV,feedback.deltaV);
  assert.equal(thrustFeedback(coast,{command:0,deltaV:0,acceleration:0,fuel,held:false},3).state,'quiet');
 }
});

test('depleted fuel and a fresh burn never report an old impulse as new thrust',()=>{
 const old={command:false,deltaV:.5,remaining:2,state:'coasting'};
 const empty=thrustFeedback(old,{command:1,deltaV:0,acceleration:0,fuel:0,held:false},.1);
 assert.equal(empty.state,'empty');assert.equal(empty.deltaV,0);assert.equal(empty.acceleration,0);
 const fresh=thrustFeedback(old,{command:1,deltaV:.000002,acceleration:.000001,fuel:100,held:false},.1);
 assert.equal(fresh.deltaV,.000002);assert.equal(fresh.state,'firing');
});
