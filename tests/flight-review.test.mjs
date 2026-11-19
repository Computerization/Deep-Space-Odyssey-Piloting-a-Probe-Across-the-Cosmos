import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Quaternion} from '../vendor/three/three.core.js';
import {FlightHistory} from '../src/flight-history.js';
import {coastForecast} from '../src/coast-forecast.js';
import {GM} from '../src/propulsion.js';
const state=()=>({player:{position:new Vector3(10000,0,0),velocity:new Vector3(0,7,0),quaternion:new Quaternion()},look:new Quaternion(),angular:new Vector3(),fuel:104,localSeconds:0,view:'probe'});
test('review restores physical state and creates a branch without erasing discoveries',()=>{
 const g=state(),history=new FlightHistory();g.discovered=['earth-0'];history.reset(g);
 g.player.position.x=20000;g.player.velocity.y=9;g.fuel=99;g.localSeconds=200;history.record(g,1);
 g.player.position.x=30000;g.fuel=98;g.localSeconds=300;history.record(g,1);
 assert.equal(history.restore(g,1),true);assert.equal(g.player.position.x,20000);assert.equal(g.player.velocity.y,9);assert.equal(g.fuel,99);assert.equal(g.localSeconds,200);assert.equal(g.timePaused,true);assert.equal(history.samples.length,2);assert.deepEqual(g.discovered,['earth-0']);
 g.localSeconds=250;history.record(g,1);assert.deepEqual(history.samples.map(s=>s.seconds),[0,200,250]);
});
test('long visits keep bounded history, arrival and newest state; holding time adds no duplicates',()=>{
 const g=state(),history=new FlightHistory(32);history.reset(g);
 for(let i=1;i<10000;i++){g.localSeconds=i;history.record(g,1);}
 assert.ok(history.samples.length<=32);assert.equal(history.samples[0].seconds,0);assert.equal(history.samples.at(-1).seconds,9999);
 const n=history.samples.length;for(let i=0;i<1000;i++)history.record(g,1);assert.equal(history.samples.length,n);
});
test('coast forecast follows gravitational curvature without changing flight or inventing thrust',()=>{
 const r=10000,speed=Math.sqrt(GM.earth/r),position=[r,0,0],velocity=[0,speed,0];
 const points=coastForecast({position,velocity,centres:{earth:[0,0,0]},anchor:'earth',radius:{earth:6371},seconds:1800});
 assert.ok(points.length>20);const last=points.at(-1);
 assert.ok(Math.abs(Math.hypot(...last.position)-r)<10);assert.ok(last.position[0]<r*.8);assert.deepEqual(position,[r,0,0]);assert.deepEqual(velocity,[0,speed,0]);
});
import {chartLabels} from '../src/ui/chart-labels.js';
test('crowded chart labels keep selected object identifiable without overlapping labels',()=>{
 const objects=[{id:'voyager',name:'Voyager 1',x:300,y:265},{id:'earth',name:'Earth',x:303,y:267},{id:'sun',name:'Sun',x:298,y:264},{id:'mars',name:'Mars',x:315,y:259},{id:'saturn',name:'Saturn',x:420,y:150}];
 const labels=chartLabels(objects,'voyager');assert.ok(labels.has('voyager'));
 const boxes=[...labels.values()].map(l=>l.box);
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
  const a=boxes[i],b=boxes[j];assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top);
 }
});

test('compact persisted history retains arrival, latest state and restores a previous physical state',()=>{
 const g=state();g.chapter=2;g.study='titan';const h=new FlightHistory();h.reset(g);
 for(let i=1;i<=400;i++){g.localSeconds=i;g.player.position.x+=i;g.fuel-=.001;h.record(g,1);}
 const encoded=JSON.parse(JSON.stringify(h.serialize(g))),loaded=new FlightHistory();
 assert.equal(encoded.samples.length,120);assert.equal(encoded.samples[0].seconds,0);assert.equal(encoded.samples.at(-1).seconds,400);
 assert.ok(JSON.stringify(encoded).length<70000);
 assert.equal(loaded.hydrate(encoded,g),true);assert.equal(loaded.restore(g,0),true);
 assert.equal(g.player.position.x,10000);assert.equal(g.fuel,104);assert.equal(g.localSeconds,0);
});
test('corrupt, cross-study and out-of-order review saves fall back to the current flight',()=>{
 const g=state();g.chapter=1;g.study='io';const h=new FlightHistory();h.reset(g);g.localSeconds=10;h.record(g,1);
 const valid=h.serialize(g);
 for(const change of [v=>v.study='moon',v=>v.samples[0].seconds=20,v=>v.samples[0].position[0]=null,v=>v.samples.at(-1).velocity[1]=99,v=>v.samples[0].look=[0,0,0,0]]){
  const value=JSON.parse(JSON.stringify(valid));change(value);
  assert.equal(h.hydrate(value,g),false);assert.equal(h.samples.length,1);assert.equal(h.samples[0].seconds,10);
 }
});

test('opening review at held time refreshes the present composition without duplicate timestamps',()=>{
 const g=state();let fov=58;const history=new FlightHistory(480,()=>({fov}));history.reset(g);
 g.localSeconds=10;history.record(g,1);const before=history.samples[0];
 g.player.quaternion.setFromAxisAngle(new Vector3(0,1,0),.4);g.look.setFromAxisAngle(new Vector3(1,0,0),.2);g.freeLook=true;g.view='chase';fov=18;
 history.record(g,0,true);
 assert.equal(history.samples.length,2);assert.equal(history.samples[0],before);
 assert.deepEqual(history.samples.at(-1).attitude,g.player.quaternion.toArray());assert.deepEqual(history.samples.at(-1).look,g.look.toArray());
 assert.equal(history.samples.at(-1).fov,18);assert.equal(history.samples.at(-1).view,'chase');assert.equal(history.samples.at(-1).freeLook,true);
 assert.equal(history.samples.at(-1).seconds,10);
});
test('saved lenses survive hydration while older records keep an explicit absent lens',()=>{
 const g=state();g.chapter=0;let fov=58;const h=new FlightHistory(480,()=>({fov}));h.reset(g);g.localSeconds=20;fov=18;h.record(g,1);
 const saved=JSON.parse(JSON.stringify(h.serialize(g))),loaded=new FlightHistory();assert.equal(loaded.hydrate(saved,g),true);assert.deepEqual(loaded.samples.map(s=>s.fov),[58,18]);
 const legacy=JSON.parse(JSON.stringify(saved));for(const s of legacy.samples)delete s.fov;
 assert.equal(loaded.hydrate(legacy,g),true);assert.ok(loaded.samples.every(s=>s.fov===undefined));
 for(const bad of [0,71,null,'18']){const corrupt=JSON.parse(JSON.stringify(saved));corrupt.samples[0].fov=bad;assert.equal(loaded.hydrate(corrupt,g),false);}
});
test('review seeks by elapsed time across uneven and coarsened sample intervals',()=>{
 const g=state(),h=new FlightHistory(32);h.reset(g);
 for(let i=1;i<1000;i++){g.localSeconds=i*i;h.record(g,1);}
 for(const time of [-1,0,1,2000,100000,500000,9999999]){
  const expected=h.samples.reduce((best,s,i)=>Math.abs(s.seconds-time)<Math.abs(h.samples[best].seconds-time)?i:best,0);
  assert.equal(h.indexAt(time),expected);
 }
 assert.equal(h.indexAt((h.samples[0].seconds+h.samples[1].seconds)/2),0);
});

test('recorded chase cameras stay independent of attitude, survive saves and reject corrupt bases',()=>{
 const g=state();g.chapter=2;g.view='chase';
 const follow=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),.3).toArray();
 const h=new FlightHistory(480,()=>({fov:18,follow}));h.reset(g);
 const original=[...follow];follow.splice(0,4,...new Quaternion().setFromAxisAngle(new Vector3(1,0,0),.4).toArray());
 g.localSeconds=10;h.record(g,1);
 assert.deepEqual(h.samples[0].follow,original);assert.deepEqual(g.player.quaternion.toArray(),[0,0,0,1]);
 const saved=JSON.parse(JSON.stringify(h.serialize(g))),loaded=new FlightHistory();
 assert.equal(loaded.hydrate(saved,g),true);assert.deepEqual(loaded.samples[0].follow,original);
 saved.samples[0].follow[0]=99;assert.deepEqual(loaded.samples[0].follow,original);
 for(const bad of [null,[0,0,0],[0,0,0,0],[0,0,0,2],[0,0,'0',1]]){
  const corrupt=h.serialize(g);corrupt.samples[0]={...corrupt.samples[0],follow:bad};
  assert.equal(loaded.hydrate(corrupt,g),false);assert.equal(loaded.samples.length,1);
 }
 const legacy=JSON.parse(JSON.stringify(h.serialize(g)));for(const s of legacy.samples)delete s.follow;
 assert.equal(loaded.hydrate(legacy,g),true);assert.ok(loaded.samples.every(s=>s.follow===undefined));
});
