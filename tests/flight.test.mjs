import {test} from 'node:test';
import assert from 'node:assert/strict';
import {angularDiameter,signalTime,AU} from '../src/flight.js';
test('physical angular sizes survive scaled-space rendering',()=>{
 for(const distance of [30000,1e6,5e6,1e9,20e9]){
  const display=distance<=5e6?distance/1000:5000+Math.log1p((distance-5e6)/5e6)*800;
  assert.ok(Math.abs(angularDiameter(6371,distance)-angularDiameter(6371*display/distance,display))<1e-12);
 }
});
test('an AU carries a meaningful light-time',()=>assert.equal(signalTime(AU),'8.3 min'));

test('behind-camera guidance keeps the correct turn direction at the screen edge',async()=>{
 const {navigationAnchor}=await import('../src/flight.js');
 assert.deepEqual(navigationAnchor({x:.1,y:0,front:false}),{x:.84,y:0,inView:false});
 assert.deepEqual(navigationAnchor({x:-.1,y:0,front:false}),{x:-.84,y:0,inView:false});
 assert.deepEqual(navigationAnchor({x:0,y:0,front:false}),{x:.84,y:0,inView:false});
 assert.deepEqual(navigationAnchor({x:.1,y:.2,front:true}),{x:.1,y:.2,inView:true});
});

test('coasting predictor distinguishes a hit, a miss and travel away',async()=>{
 const {predictCoast}=await import('../src/flight.js');
 const hit=predictCoast([0,0,0],[10,0,0],[100,0,0],10);
 assert.equal(hit.intersects,true);assert.equal(hit.entryTime,9);
 const miss=predictCoast([0,0,0],[10,0,0],[100,20,0],10);
 assert.equal(miss.intersects,false);assert.equal(miss.miss,20);
 const away=predictCoast([0,0,0],[-10,0,0],[100,0,0],10);
 assert.equal(away.approaching,false);assert.equal(away.entryTime,null);
 assert.equal(predictCoast([99,0,0],[0,0,0],[100,0,0],10).entryTime,0);
 assert.equal(predictCoast([0,0,0],[0,0,0],[100,0,0],10).intersects,false);
});
