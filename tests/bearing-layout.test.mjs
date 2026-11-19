import test from 'node:test';import assert from 'node:assert/strict';import {bearingLayout} from '../src/ui/bearing-layout.js';
const scene={x:500,y:350,radius:180,width:1000,height:700,labelWidth:150,labelHeight:38};
test('a resolved-world label and leader leave the physical disc clear',()=>{const p=bearingLayout(scene);assert.equal(p.side,'right');assert.ok(p.left>scene.x+scene.radius);assert.ok(p.leader.x1>scene.x+scene.radius);assert.ok(p.right<=960);});
test('a bearing avoids contextual text and keeps a stable side while it remains available',()=>{const p=bearingLayout({...scene,avoid:[{left:680,top:200,right:960,bottom:500}]});assert.equal(p.side,'left');const continued=bearingLayout({...scene,x:510,preferred:p.side});assert.equal(continued.side,'left');});
test('a body filling the screen keeps a readable margin bearing',()=>{const p=bearingLayout({...scene,radius:1000});assert.equal(p.side,'docked');assert.equal(p.leader,null);assert.ok(p.left>=0&&p.left+scene.labelWidth<=scene.width);assert.ok(p.top>100&&p.top+scene.labelHeight<scene.height);});
test('a diagonal partial world retains a visible leader beside its actual limb',()=>{
 const scene={x:1150,y:850,radius:650,ellipse:{major:650,minor:400,angle:.7},width:1000,height:700,labelWidth:150,labelHeight:38};
 const p=bearingLayout(scene);assert.notEqual(p.side,'docked');assert.ok(p.leader);
 assert.ok(p.left>=40&&p.right<=960&&p.top>=118&&p.bottom<=585);
 assert.ok(p.rim.x>=0&&p.rim.x<=1000&&p.rim.y>=0&&p.rim.y<=700);
 for(let i=0;i<=20;i++)for(const [x,y]of [[p.left+(p.right-p.left)*i/20,p.top],[p.left+(p.right-p.left)*i/20,p.bottom],[p.left,p.top+(p.bottom-p.top)*i/20],[p.right,p.top+(p.bottom-p.top)*i/20]]){
  const dx=x-scene.x,dy=y-scene.y,c=Math.cos(.7),s=Math.sin(.7);
  assert.ok(((c*dx+s*dy)/650)**2+((-s*dx+c*dy)/400)**2>1);
 }
 assert.equal(bearingLayout({...scene,x:1151,preferred:p.side}).side,p.side);
});
test('a lower-edge bearing enters the viewport and clears a nearby reading block',()=>{
 const obstacle={left:41,top:397,right:461,bottom:502};
 const p=bearingLayout({x:180,y:800,radius:240,width:1024,height:640,labelWidth:85,labelHeight:38,avoid:[obstacle]});
 assert.ok(p.leader);assert.ok(p.left>obstacle.right+8);assert.ok(p.bottom<=525);
 for(let i=0;i<=200;i++){
  const t=i/200,x=p.leader.x1+(p.leader.x2-p.leader.x1)*t,y=p.leader.y1+(p.leader.y2-p.leader.y1)*t;
  assert.ok(x<obstacle.left||x>obstacle.right||y<obstacle.top||y>obstacle.bottom);
 }
});
test('a narrow visible-limb gap retains a clear leader beside compact-screen text',()=>{
 const avoid=[{left:32,right:298.84375,top:22,bottom:121.1875},{left:528.015625,right:768,top:22,bottom:68},{left:32,right:392,top:350.5,bottom:460}];
 const scene={x:-173.15430820434888,y:1126.7198414179956,radius:602.8800753368465,ellipse:{major:685.7875294491623,minor:375.7398612995861,angle:2.1770028538475743},width:800,height:600,labelWidth:84.609375,labelHeight:37,avoid};
 const p=bearingLayout(scene);assert.ok(p.leader);assert.ok(p.left>=32&&p.right<=768&&p.top>=118&&p.bottom<=485);
 for(const a of avoid){
  assert.ok(p.left>=a.right||p.right<=a.left||p.top>=a.bottom||p.bottom<=a.top);
  for(let i=0;i<=200;i++){
   const t=i/200,x=p.leader.x1+(p.leader.x2-p.leader.x1)*t,y=p.leader.y1+(p.leader.y2-p.leader.y1)*t;
   assert.ok(x<a.left||x>a.right||y<a.top||y>a.bottom);
  }
 }
 assert.equal(bearingLayout({...scene,preferred:p.side}).side,p.side);
});
test('a compact corner view routes one bend around telemetry without losing the visible limb',()=>{
 const avoid=[{left:32,right:298.84375,top:22,bottom:121.1875},{left:528.015625,right:768,top:22,bottom:68},{left:32,right:392,top:350.5,bottom:460},{left:32,right:304.53125,top:504,bottom:575},{left:519.640625,right:768,top:531,bottom:575}];
 const scene={x:-173.15430820434888,y:1126.7198414179956,radius:602.8800753368465,ellipse:{major:685.7875294491623,minor:375.7398612995861,angle:2.1770028538475743},width:800,height:600,labelWidth:71.375,labelHeight:49,avoid};
 const p=bearingLayout(scene),l=p.leader;assert.ok(l?.elbow);assert.notEqual(p.side,'docked');
 const points=[[l.x1,l.y1],[l.elbow.x,l.elbow.y],[l.x2,l.y2]];
 for(let segment=0;segment<points.length-1;segment++)for(let i=0;i<=1000;i++){
  const t=i/1000,x=points[segment][0]*(1-t)+points[segment+1][0]*t,y=points[segment][1]*(1-t)+points[segment+1][1]*t;
  assert.ok(x>=0&&x<=scene.width&&y>=0&&y<=scene.height);
  const dx=x-scene.x,dy=y-scene.y,c=Math.cos(scene.ellipse.angle),s=Math.sin(scene.ellipse.angle);
  assert.ok(((c*dx+s*dy)/scene.ellipse.major)**2+((-s*dx+c*dy)/scene.ellipse.minor)**2>1);
  for(const a of avoid)assert.ok(x<a.left-3.9||x>a.right+3.9||y<a.top-3.9||y>a.bottom+3.9);
 }
 assert.equal(bearingLayout({...scene,preferred:p.side}).side,p.side);
 assert.equal(bearingLayout({...scene,avoid:avoid.slice(0,3)}).leader.elbow,undefined,'Use a straight leader when space is available');
});
