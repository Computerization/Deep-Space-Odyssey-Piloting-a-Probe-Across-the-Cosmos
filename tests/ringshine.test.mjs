import test from 'node:test';import assert from 'node:assert/strict';import {createRingIntegrator,ringIrradianceMap,ringTransmissionProfile,RING_SHADOW_RANGE} from '../src/rendering/ringshine.js';
const profile=new Uint8Array(1024*4).fill(180),f=.902;
test('shadow filtering retains clear space and averages light after optical extinction',()=>{
 const transparent=new Uint8Array(8192*4),opaque=new Uint8Array(8192*4).fill(255);
 const clear=ringTransmissionProfile(transparent,.2),light=ringTransmissionProfile(opaque,.2),grazing=ringTransmissionProfile(opaque,.04);
 const at=r=>Math.floor((r-RING_SHADOW_RANGE.start)/RING_SHADOW_RANGE.span*light.length);
 for(const r of [1.19,2.36])assert.equal(light[at(r)],1);
 assert.ok(clear[at(2.3205)]<1,'The outer half of the F ring also casts a shadow');
 assert.equal(clear[at(1.7)],1);assert.ok(Math.abs(light[at(1.7)]-Math.exp(-2.5/.2))<1e-10);
 assert.ok(grazing[at(1.4)]<light[at(1.4)]);assert.deepEqual(ringTransmissionProfile(opaque,-.2),light);
 assert.ok(light.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 // Equal clear/opaque texels transmit about half the incoming light; taking
 // an exponential after averaging their optical depths would nearly erase it.
 const average=(clear[at(1.7)]+light[at(1.7)])/2;
 assert.ok(average>.5&&average<.501);assert.ok(average>Math.exp(-1.25/.2)*100);
});
function surface(lat,lon=Math.PI){const a=lat*Math.PI/180,p=[Math.cos(a)*Math.cos(lon),f*Math.sin(a),Math.cos(a)*Math.sin(lon)],n=[p[0],p[1]/(f*f),p[2]],l=Math.hypot(...n);return [p,n.map(v=>v/l)];}
test('sunlit rings illuminate the night hemisphere more strongly on their reflecting side',()=>{
 const light=createRingIntegrator(profile,[.98,.2,0]),north=light(...surface(25)),south=light(...surface(-25));assert.ok(north[0]>0);assert.ok(north[0]>south[0]*3);assert.ok(north.every(v=>v>=0&&v<1));
 const mirrored=createRingIntegrator(profile,[.98,-.2,0])(...surface(-25));assert.ok(Math.abs(mirrored[0]-north[0])<1e-10);
});
test('ring light respects the planetary horizon and equatorial plane',()=>{
 const light=createRingIntegrator(profile,[.98,.2,0]);assert.deepEqual(light(...surface(90)),[0,0,0]);assert.deepEqual(light(...surface(-90)),[0,0,0]);assert.deepEqual(light(...surface(0)),[0,0,0]);
 assert.deepEqual(createRingIntegrator(profile,[1,0,0])(...surface(25)),[0,0,0]);
});
test('neutral ring material adds neutral reflected and transmitted light',()=>{
 const grey=new Uint8Array(1024*4).fill(100),dark=new Uint8Array(1024*4);
 const light=createRingIntegrator(grey,[.98,.2,0]),constantF=createRingIntegrator(dark,[.98,.2,0]);
 for(const latitude of [-25,25]){
  const args=surface(latitude),a=light(...args),b=constantF(...args),rgb=a.map((v,i)=>v-b[i]);
  assert.ok(rgb[0]>0);assert.ok(Math.abs(rgb[0]-rgb[1])<1e-12&&Math.abs(rgb[1]-rgb[2])<1e-12);
 }
});
test('surface integration converges against denser ring-area quadrature',()=>{
 const ordinary=createRingIntegrator(profile,[.98,.2,0]),dense=createRingIntegrator(profile,[.98,.2,0],{radialSteps:192,azimuthSteps:256});
 for(const lat of [-35,-15,15,35])for(const lon of [0,Math.PI/2,Math.PI]){
  const args=surface(lat,lon),a=ordinary(...args)[0],b=dense(...args)[0];assert.ok(Math.abs(a-b)<.002,`${lat}, ${lon}: ${a} / ${b}`);
 }
});
test('irradiance lookup has no negative values and preserves a dark equator',()=>{
 const m=ringIrradianceMap(profile,[.98,.2,0],{width:16,height:9});assert.ok(m.data.every(Number.isFinite));assert.ok(m.data.every(v=>v>=0));
 for(let x=0;x<16;x++)assert.equal(m.data[(4*16+x)*4],0);
});

test('the ringshine note appears for a night-side view above the ring plane',async()=>{
 const {scienceTopic}=await import('../src/experience-guide.js');
 assert.equal(scienceTopic(2,{id:'saturn',phase:150,ringElevation:15}),'saturn-ringshine');
 assert.equal(scienceTopic(2,{id:'saturn',phase:150,ringElevation:1}),'2:1');
 assert.equal(scienceTopic(2,{id:'saturn',phase:30,ringElevation:15}),'2:0');
});
