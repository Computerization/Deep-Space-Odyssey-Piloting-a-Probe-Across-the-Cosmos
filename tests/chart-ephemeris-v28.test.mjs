import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {decodeChartEphemeris} from '../src/chart-ephemeris.js';
import {solarChartState,extentForSelection,voyagePath,eclipticPoint} from '../src/solar-chart-state.js';
import {trajectoryState} from '../src/trajectory.js';
const file=fs.readFileSync(new URL('../assets/chart-ephemeris.bin',import.meta.url));
const ephemeris=JSON.parse(fs.readFileSync(new URL('../assets/ephemeris.json',import.meta.url))),cruise=JSON.parse(fs.readFileSync(new URL('../assets/cruise.json',import.meta.url))),checks=JSON.parse(fs.readFileSync(new URL('./fixtures/chart-ephemeris-v28-checks.json',import.meta.url)));
const chartEphemeris=decodeChartEphemeris(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength)),world={ephemeris,cruise,chartEphemeris};
const error=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
test('compact chart agrees with independent JPL epochs throughout 1977–2026',()=>{
 const bodies=[];
 for(const [id,records]of Object.entries(checks)){
  const errors=records.map(row=>({jd:row[0],positionKm:error(chartEphemeris.state(id,row[0]).position,row.slice(1,4))}));
  const max=Math.max(...errors.map(e=>e.positionKm));assert.ok(max<1000,`${id}: ${max} km`);
  bodies.push({id,samples:records.length,maxPositionErrorKm:max,rmsPositionErrorKm:Math.sqrt(errors.reduce((s,e)=>s+e.positionKm**2,0)/errors.length),errors});
 }
 fs.writeFileSync(new URL('./chart-ephemeris-v28-results.json',import.meta.url),JSON.stringify({version:'0.28.0',bytes:file.length,independentSourceSamples:true,units:'Position comparison in km; compact interpolation for the atlas, not navigation-grade ephemeris.',bodies},null,2)+'\n');
});
test('passage chart follows the same date and Voyager curve as historical playback',()=>{
 for(let chapter=0;chapter<5;chapter++)for(const fraction of [.01,.5,.99]){
  const jd=cruise.ends[chapter]+fraction*(cruise.ends[chapter+1]-cruise.ends[chapter]);
  const state=solarChartState(world,{chapter,stage:'transit',transit:{jd,next:chapter+1}});
  assert.deepEqual(state.positions.voyager,trajectoryState(cruise.objects.voyager,jd).position);
  assert.equal(state.jd,jd);assert.ok(state.transit);
  assert.ok(error(state.positions.earth,ephemeris.objects.earth[chapter===3?4:chapter===4?5:chapter].position)>100000);
  const trail=voyagePath(cruise.objects.voyager,cruise.objects.voyager[0][0],jd);assert.deepEqual(trail.at(-1),state.positions.voyager);assert.deepEqual(trail[0],cruise.objects.voyager[0].slice(1,4));
  assert.deepEqual(state.route.remaining[0],state.positions.voyager);
  assert.deepEqual(state.route.remaining.at(-1),trajectoryState(cruise.objects.voyager,cruise.ends[chapter+1]).position);
  const extent=extentForSelection(state,'voyager',2);
  assert.ok(state.route.remaining.every(p=>{const q=eclipticPoint(p);return Math.hypot(q[0],q[1])<=extent;}));
  assert.equal(state.route.predicted,chapter===4);
 }
});
test('a remaining track stops at its requested encounter and an arrived track has one point',()=>{
 const records=cruise.objects.voyager,start=cruise.ends[1],end=cruise.ends[2];
 const partial=voyagePath(records,start,end);
 assert.deepEqual(partial[0],trajectoryState(records,start).position);
 assert.deepEqual(partial.at(-1),trajectoryState(records,end).position);
 assert.deepEqual(voyagePath(records,end,end),[trajectoryState(records,end).position]);
 assert.ok(partial.length<voyagePath(records,records[0][0],end).length);
});
test('encounter and title charts retain their own reference snapshots and do not use the landing-camera position',()=>{
 const player={position:{x:123,y:456,z:789}},game={chapter:2,study:'titan',stage:'encounter',localSeconds:7200,player};
 const local=solarChartState(world,game);assert.deepEqual(local.positions.titan,undefined);assert.deepEqual(local.positions.saturn,ephemeris.objects.saturn[3].position);assert.deepEqual(local.positions.voyager,[123,-789,456]);assert.equal(local.date,'12 November 1980 · 05:41:00 UTC · observation study · reference epoch');
 const title=solarChartState(world,{...game,stage:'transit',transit:{jd:2452050.6,next:4}},false);assert.equal(title.transit,false);assert.deepEqual(title.positions.voyager,ephemeris.objects.voyager[0].position);assert.deepEqual(title.positions.earth,ephemeris.objects.earth[0].position);
});
test('selecting an offscreen body increases extent without modifying its position or shrinking a manual wide view',()=>{
 const jd=cruise.ends.at(-1),state=solarChartState(world,{chapter:4,stage:'transit',transit:{jd,next:5}});
 assert.equal(extentForSelection(state,'voyager',12),200);assert.equal(extentForSelection(state,'neptune',2),35);assert.equal(extentForSelection(state,'earth',200),200);
 const extent=extentForSelection(state,'voyager',12),p=eclipticPoint(state.positions.voyager);assert.ok(Math.hypot(p[0],p[1])<=extent*.95);
});

test('the Jupiter–Titan track ends at Titan, not the later Saturn closest approach',()=>{
 const end=ephemeris.objects.voyager[3].jd,jd=end-.5;
 const state=solarChartState(world,{chapter:1,stage:'transit',transit:{jd,end,next:2,targetStudy:'titan'}});
 assert.equal(state.route.name,'Titan');assert.deepEqual(state.route.remaining.at(-1),trajectoryState(cruise.objects.voyager,end).position);
});
test('a same-epoch transfer plots the flown probe, not an invented historical route',()=>{
 const player={position:{x:123,y:456,z:789}},state=solarChartState(world,{chapter:0,stage:'transit',player,transit:{local:true,jd:cruise.ends[0],next:0}});
 assert.deepEqual(state.positions.voyager,[123,-789,456]);assert.equal(state.route,undefined);assert.match(state.date,/local transfer/);
});
