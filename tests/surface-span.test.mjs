import assert from 'node:assert/strict';
import test from 'node:test';
import {Vector3,Quaternion} from '../vendor/three/three.core.js';
import {surfaceMeasurement} from '../src/surface-span.js';
import {cornerBeyondLimb} from '../src/view-framing.js';
const surfaceSpan=(...args)=>surfaceMeasurement(...args)?.km??null;
const center=new Vector3(),q=new Quaternion(),camera={aspect:1.6,fov:58,quaternion:q};
test('reference-surface bracket matches the near intersections and reads sky as empty',()=>{
 const radius=6000,player={position:new Vector3(0,0,2*radius)},body={data:{radius},inverseOrientation:q},x=.08*camera.aspect*Math.tan(29*Math.PI/180);
 const d=(2-Math.sqrt(1-3*x*x))/(1+x*x);
 assert.ok(Math.abs(surfaceSpan(player,center,body,camera,.08,0)-2*radius*x*d)<1e-8);
 assert.equal(surfaceSpan(player,center,body,camera,1,1),null);
 const polar=surfaceSpan(player,center,{...body,data:{radius,flatten:.9}},camera,.08,.2);assert.ok(polar>surfaceSpan(player,center,body,camera,.08,.2));
});
test('algebraic corner test agrees with explicit corner rays',()=>{
 for(const x of [-1,-.4,.3,1])for(const y of [-1,-.15,.2,.85])for(const z of [-1,1])for(const limb of [.1,.6,1.1]){
  const dir=new Vector3(x,y,z).normalize(),tx=1.2,ty=.52;
  const expected=[-1,1].some(a=>[-1,1].some(b=>new Vector3(a*tx,b*ty,-1).angleTo(dir)>limb+.003));
  assert.equal(cornerBeyondLimb(dir.x,dir.y,dir.z,tx,ty,limb),expected);
 }
});

test('ring-plane span chooses the nearer surface and rejects a mixed bracket',()=>{
 const body={data:{radius:1,flatten:1},inverseOrientation:q,ring:{geometry:{parameters:{innerRadius:1.235,outerRadius:2.323}}}};
 const camera={fov:58,aspect:1,quaternion:new Quaternion().setFromAxisAngle(new Vector3(1,0,0),-Math.PI/2)};
 const measure=x=>surfaceMeasurement({position:new Vector3(x,2,0)},center,body,camera,.08,0);
 assert.equal(measure(1.8).kind,'rings');assert.equal(measure(0).kind,'globe');assert.equal(measure(1.235),null);
});

test('the closing verse follows a real recent discovery and has a no-collection path',async()=>{
 const {voyageEcho}=await import('../src/ui/coda.js');
 assert.match(voyageEcho(['trail-earth-horizon','5:0','unknown']),/brought it home/);
 assert.match(voyageEcho(['trail-moon-earthrise']),/Earth rose/);assert.match(voyageEcho([]),/little ship/);
});

import {baseline} from '../src/flyby.js';
test('flyby baseline measures translation around a body, not direction of gaze or radial travel',()=>{
 assert.deepEqual(baseline([0,0,100],[0,0,100]),{km:0,angle:0});assert.equal(baseline([0,0,100],[0,0,150]).angle,0);
 assert.deepEqual(baseline([3,0,0],[0,4,0]),{km:5,angle:90});
});
