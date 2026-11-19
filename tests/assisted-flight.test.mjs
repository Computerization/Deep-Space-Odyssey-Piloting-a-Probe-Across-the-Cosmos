import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Quaternion} from '../vendor/three/three.core.js';
import {stepManualFlight,initialiseEncounter,stepAttitude,CLOSE_PASS,localGravity} from '../src/flight-controller.js';
import {BODY_DATA} from '../src/mission.js';
import {GM} from '../src/propulsion.js';
import {encounterContext} from '../src/encounter-context.js';
const idle={thrust:0,lateral:0,vertical:0,yaw:0,pitch:0,roll:0,brake:false,boost:false};
function setup(){
 const world={bodyPositions:{earth:new Vector3(),moon:new Vector3(400000,0,0)}};
 const game={chapter:0,player:{position:new Vector3(0,0,BODY_DATA.earth.radius*5),velocity:new Vector3(),quaternion:new Quaternion()},look:new Quaternion(),angular:new Vector3(),elapsed:0,chapterTime:0,idle:0,stable:0};
 initialiseEncounter(game,world);return {game,world};
}
const advance=(state,sample,seconds,fps=60)=>{for(let i=0;i<Math.round(seconds*fps);i++)stepManualFlight(state.game,state.world,{...idle,...sample},1/fps);};
const coastImpulse=(s,seconds)=>{const impulse=new Vector3(),g=new Vector3();for(let i=0;i<seconds*120;i++){impulse.addScaledVector(localGravity(s.game.player.position,s.world.bodyPositions,encounterContext(s.game).region,g),1/120);advance(s,{},1/120,120);}return impulse;};
test('thrust builds momentum gradually and release keeps a genuine coast',()=>{
 const s=setup();advance(s,{thrust:1},.2);const first=s.game.player.velocity.length();advance(s,{thrust:1},.8);assert.ok(s.game.player.velocity.length()>first*3);
 const velocity=s.game.player.velocity.clone(),position=s.game.player.position.clone();
 const expected=coastImpulse(s,1);
 assert.ok(s.game.player.velocity.clone().sub(velocity).distanceTo(expected)<1e-8);assert.ok(s.game.player.position.distanceTo(position.clone().add(velocity))<.001);
});
test('Space brakes opposite momentum even when the camera faces another direction',()=>{
 const s=setup();s.game.player.velocity.set(2000,600,0);s.game.player.quaternion.setFromAxisAngle(new Vector3(0,1,0),Math.PI*.5);
 const direction=s.game.player.velocity.clone().normalize();advance(s,{brake:true},.2);assert.ok(s.game.player.velocity.length()<Math.hypot(2000,600));assert.ok(s.game.player.velocity.clone().normalize().distanceTo(direction)<1e-6);
 advance(s,{brake:true},3);assert.ok(s.game.player.velocity.length()<1);assert.ok(s.game.localSeconds>3,'braking does not freeze the simulation');
});
test('Shift builds extra thrust progressively while diagonals share the acceleration budget',()=>{
 const a=setup(),b=setup(),c=setup();advance(a,{thrust:1},.2);advance(b,{thrust:1,boost:true},.2);advance(c,{thrust:1,lateral:1,vertical:1},.2);
 assert.ok(b.game.player.velocity.length()>a.game.player.velocity.length()*1.5);assert.ok(b.game.player.velocity.length()<a.game.player.velocity.length()*2.5);assert.ok(Math.abs(c.game.player.velocity.length()/a.game.player.velocity.length()-1)<.01);
});
test('new thrust redirects a coast rather than snapping momentum to the camera',()=>{
 const s=setup();s.game.player.velocity.set(0,0,-1000);advance(s,{lateral:1},.1);assert.ok(s.game.player.velocity.x>0);assert.ok(s.game.player.velocity.z < -1000 && s.game.player.velocity.z > -1000.001);
});
test('inertial flight is stable across 30 and 120 fps and pause holds its state',()=>{
 const a=setup(),b=setup();advance(a,{thrust:1},1,30);advance(b,{thrust:1},1,120);assert.ok(a.game.player.velocity.distanceTo(b.game.player.velocity)/b.game.player.velocity.length()<.015);
 a.game.timePaused=true;const p=a.game.player.position.clone(),v=a.game.player.velocity.clone();advance(a,{thrust:1,boost:true},1);assert.deepEqual(a.game.player.position,p);assert.deepEqual(a.game.player.velocity,v);
});

test('the same mouse travel produces the same angle at 10 through 120 fps',()=>{
 for(const fps of [10,20,30,60,120]){
  const {game}=setup();
  for(let i=0;i<fps;i++)stepAttitude(game,{...idle,yaw:.4/fps},1/fps);
  for(let i=0;i<fps;i++)stepAttitude(game,idle,1/fps);
  const expected=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),.4);
  assert.ok(game.player.quaternion.angleTo(expected)<1e-7,`${fps} fps preserves mouse angle`);
 }
 // A long mouse-input frame followed by fast settling (and the reverse)
 // catches end-of-frame integration changing the total requested turn.
 for(const [inputHz,settleHz] of [[10,120],[120,10]]){
  const {game}=setup();stepAttitude(game,{...idle,yaw:.4},1/inputHz);
  for(let i=0;i<settleHz*2;i++)stepAttitude(game,idle,1/settleHz);
  assert.ok(game.player.quaternion.angleTo(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),.4))<1e-7);
 }

});
test('heavy rendered frames retain the same thrust and braking response',()=>{
 const a=setup(),b=setup();
 for(const [sample,seconds] of [[{thrust:1},1],[{thrust:1,boost:true},.5],[{},.5],[{brake:true},1]]){
  advance(a,sample,seconds,10);advance(b,sample,seconds,120);
 }
 assert.ok(a.game.player.velocity.distanceTo(b.game.player.velocity)<1e-7);
 assert.ok(a.game.player.position.distanceTo(b.game.player.position)<1e-7);
 assert.ok(Math.abs(a.game.localSeconds-3)<1e-8);
});
test('releasing Shift and thrust preserves a boosted coast without extra thrust',()=>{
 const s=setup();advance(s,{thrust:1,boost:true},1);const velocity=s.game.player.velocity.clone();
 const expected=coastImpulse(s,1);assert.ok(s.game.player.velocity.clone().sub(velocity).distanceTo(expected)<1e-8);
 assert.equal(s.game.drive.length(),0);
});

test('following retains a tangential coast around the world and releases to a straight coast',()=>{
 const s=setup();s.game.tracking='earth';s.game.player.velocity.set(3000,500,0);
 const range=s.game.player.position.length(),speed=s.game.player.velocity.length();
 advance(s,{},20);
 assert.ok(Math.abs(s.game.player.position.length()-range)<.1,'orbit assist holds the selected range apart from physical gravity');
 assert.ok(Math.abs(s.game.player.velocity.length()-speed)<.001,'the orbit assist preserves tangential speed');
 assert.ok(s.game.player.velocity.dot(s.game.player.position.clone().normalize())<0,'gravity adds an inward component');
 s.game.tracking=null;const p=s.game.player.position.clone(),v=s.game.player.velocity.clone();advance(s,{},2);
 assert.ok(s.game.player.position.distanceTo(p.addScaledVector(v,2))<.002);
 assert.ok(s.game.player.velocity.distanceTo(v)>0 && s.game.player.velocity.distanceTo(v)<.002);
});

test('orbit following preserves deliberate radial movement at different frame rates',()=>{
 const a=setup(),b=setup(),range=a.game.player.position.length();
 for(const [s,fps] of [[a,20],[b,120]]){s.game.tracking='earth';s.game.player.velocity.set(2000,0,-100);advance(s,{},10,fps);}
 assert.ok(Math.abs(a.game.player.position.length()-(range-1000))<.1);
 assert.ok(a.game.player.position.distanceTo(b.game.player.position)<1e-6);
});

test('close-pass assistance removes inward drift while retaining escape and sideways movement',()=>{
 const s=setup(),r=BODY_DATA.earth.radius;s.game.player.position.set(0,0,r*(CLOSE_PASS.earth+.02));s.game.player.velocity.set(500,0,-600);
 advance(s,{thrust:1},4);
 assert.ok(s.game.player.position.length()>=r*CLOSE_PASS.earth-1e-6);
 assert.ok(s.game.player.position.x>1000,'the boundary permits a sideways pass');
 const before=s.game.player.position.length();advance(s,{thrust:-1},2);
 assert.ok(s.game.player.position.length()>before,'retreat works immediately');
});

test('a giant takes longer to circle while covering a larger physical distance',()=>{
 const earth=setup(),giant=setup();
 giant.game.chapter=1;giant.world.bodyPositions.jupiter=new Vector3();giant.world.bodyPositions.io=new Vector3(1000000,0,0);
 const results=[];
 for(const [state,body] of [[earth,'earth'],[giant,'jupiter']]){
  const r=BODY_DATA[body].radius;state.game.tracking=body;state.game.player.position.set(0,0,r*2);
  advance(state,{lateral:1},8);const p=state.game.player.position;
  results.push({angle:p.angleTo(new Vector3(0,0,1)),speed:state.game.player.velocity.length()});
 }
 assert.ok(results[1].angle<results[0].angle*.45,'giants do not orbit like a scaled-up small ball');
 assert.ok(results[1].speed>results[0].speed*2,'the longer crossing still covers more kilometres');
});

test('local gravity follows inverse square, points inward and subtracts external frame acceleration',()=>{
 const earth=new Vector3(),centres={earth},region={body:'earth',worlds:['earth']};
 const g=r=>localGravity(new Vector3(r,0,0),centres,region,new Vector3());
 assert.ok(Math.abs(g(10000).x+GM.earth/1e8)<1e-14);
 assert.ok(Math.abs(g(20000).x/g(10000).x-.25)<1e-12);
 const external={earth,moon:new Vector3(400000,0,0)};
 const withMoon=localGravity(earth,external,{body:'earth',worlds:['moon']},new Vector3());
 assert.ok(withMoon.length()<1e-14,'the external pull at the frame origin cancels');
});
test('released from rest accelerates towards Earth, and braking can hold station',()=>{
 const s=setup(),start=s.game.player.position.clone();advance(s,{},2);
 assert.ok(s.game.player.velocity.z<0);assert.ok(s.game.player.position.z<start.z);
 advance(s,{brake:true},1);assert.ok(s.game.player.velocity.length()<.00001);
});
