import test from 'node:test';import assert from 'node:assert/strict';
import {FramePolicy} from '../src/rendering/frame-policy.js';
const vector=(...a)=>Object.assign(Object.fromEntries(a.map((x,i)=>[['x','y','z','w'][i],x])),{toArray(target,offset){for(let i=0;i<a.length;i++)target[offset+i]=this[['x','y','z','w'][i]];}});
const setup=()=>{const policy=new FramePolicy(),player={position:vector(1,2,3),quaternion:vector(0,0,0,1)},look=vector(0,0,0,1);policy.didRender('play',1,player,look,'probe',false);return {policy,player,look};};
test('a held view stays cached while every actual pose change invalidates it',()=>{
 const {policy,player,look}=setup();assert.equal(policy.viewChanged(player,look,'probe',false),false);
 assert.equal(policy.needsFrame('play',1,false,false,false),false);
 player.position.x+=1e-12;assert.equal(policy.viewChanged(player,look,'probe',false),true);
 policy.didRender('play',1,player,look,'probe',false);player.quaternion.z=.01;assert.equal(policy.viewChanged(player,look,'probe',false),true);
 policy.didRender('play',1,player,look,'probe',false);look.y=.02;assert.equal(policy.viewChanged(player,look,'probe',false),true);
 policy.didRender('play',1,player,look,'probe',false);assert.equal(policy.viewChanged(player,look,'chase',false),true);assert.equal(policy.viewChanged(player,look,'probe',true),true);
});
test('cached views still redraw for settings, menus, and explicit invalidation',()=>{
 const {policy}=setup();assert.equal(policy.needsFrame('play',1.2,false,false,false),true);
 assert.equal(policy.needsFrame('play',1,true,false,false),true);assert.equal(policy.needsFrame('panel',1,false,false,false),true);
 assert.equal(policy.needsFrame('play',1,true,true,true),false);
});
test('idle frames never count as rendering headroom in the adaptive budget',()=>{
 const {policy}=setup();assert.equal(policy.measuresFlight('play'),true);policy.didSkip();assert.equal(policy.measuresFlight('play'),false);
 policy.didRender('play',1);assert.equal(policy.measuresFlight('play'),true);assert.equal(policy.measuresFlight('panel'),false);
});

test('advancing scene time redraws a fixed view and an unchanged held time stays cached',()=>{
 const {policy,player,look}=setup();
 assert.equal(policy.viewChanged(player,look,'probe',false,120),true);
 policy.didRender('play',1,player,look,'probe',false,120);
 assert.equal(policy.viewChanged(player,look,'probe',false,120),false);
 assert.equal(policy.viewChanged(player,look,'probe',false,0),true);
});
