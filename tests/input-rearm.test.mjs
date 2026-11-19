import test from 'node:test';import assert from 'node:assert/strict';import {FlightInput} from '../src/input.js';
function setup(){
 const events=new Map();globalThis.addEventListener=(type,fn)=>events.set(type,fn);
 globalThis.document={addEventListener(){},pointerLockElement:null};
 const pad={connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[pad]}});
 const input=new FlightInput({addEventListener(){}},()=>{});
 const key=(code,repeat=false)=>events.get('keydown')({code,repeat,target:{matches:()=>false},preventDefault(){}});
 return {input,pad,key,release:code=>events.get('keyup')({code})};
}
test('a fresh keyboard turn works on the very first sample after resuming',()=>{
 const {input,key}=setup();input.rearm();key('ArrowRight');assert.ok(input.sample().yaw<0);
});
test('held keyboard thrust needs a release while a new direction remains usable',()=>{
 const {input,key,release}=setup();key('KeyW');input.rearm();key('KeyW',true);key('ArrowLeft');
 const held=input.sample();assert.equal(held.thrust,0);assert.ok(held.yaw>0);release('KeyW');key('KeyW');assert.equal(input.sample().thrust,1);
});
test('a held trigger is isolated without blocking a newly moved stick or keyboard',()=>{
 const {input,pad,key}=setup();pad.buttons[7]={pressed:true,value:1};input.rearm();pad.axes[2]=.8;key('KeyD');
 const held=input.sample();assert.equal(held.thrust,0);assert.ok(held.yaw<0);assert.equal(held.lateral,1);
 pad.buttons[7]={pressed:false,value:0};input.sample();pad.buttons[7]={pressed:true,value:.6};assert.equal(input.sample().thrust,.6);
});
test('held controller axes rearm independently as each returns to its dead zone',()=>{
 const {input,pad}=setup();pad.axes=[.8,0,.8,0];input.rearm();assert.equal(input.sample().lateral,0);assert.equal(input.sample().yaw,0);
 pad.axes[2]=0;input.sample();pad.axes[2]=-.8;const resumed=input.sample();assert.ok(resumed.yaw>0);assert.equal(resumed.lateral,0);
});
test('WASD thrust, QE roll, RF vertical motion and Shift cruise remain distinct',()=>{
 const {input,key,release}=setup();key('KeyQ');assert.ok(input.sample().roll>0);assert.equal(input.sample().vertical,0);release('KeyQ');key('KeyE');assert.ok(input.sample().roll<0);release('KeyE');key('KeyR');assert.equal(input.sample().vertical,1);release('KeyR');key('KeyF');assert.equal(input.sample().vertical,-1);release('KeyF');key('ShiftLeft');assert.equal(input.sample().boost,true);
});
