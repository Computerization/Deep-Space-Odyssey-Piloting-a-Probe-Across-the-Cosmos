import assert from 'node:assert/strict';
import test from 'node:test';
import {Vector3,Quaternion} from '../vendor/three/three.core.js';
import {surfaceSpan} from '../src/surface-span.js';
import {cornerBeyondLimb} from '../src/view-framing.js';
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
