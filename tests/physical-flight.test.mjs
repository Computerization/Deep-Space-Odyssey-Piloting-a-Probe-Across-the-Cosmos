import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {burn,PROPULSION,INITIAL_ACCELERATION,integratePhysicalFlight,GM} from '../src/propulsion.js';
import {trajectoryState,trajectoryDistance,TIME_RATES,flightDuration,epochLabel} from '../src/trajectory.js';
import {ExperienceGuide,restoreExperience} from '../src/experience-guide.js';
import {eclipticPoint} from '../src/ui/solar-chart.js';
const data=JSON.parse(fs.readFileSync(new URL('../assets/cruise.json',import.meta.url))),ephem=JSON.parse(fs.readFileSync(new URL('../assets/ephemeris.json',import.meta.url)));
const close=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}`);
test('one jet accelerates the launch mass by roughly 1.09 mm/s²',()=>{close(INITIAL_ACCELERATION*1e6,.889/815*1000);assert.ok(INITIAL_ACCELERATION<.000002);});
test('10,000 simulated seconds deliver the same impulse at every playback rate',()=>{
 const simulate=(rate,fps)=>{let fuel=104,v=0;for(let t=0;t<10000;t+=rate/fps){const b=burn(fuel,1,Math.min(rate/fps,10000-t));fuel=b.fuel;v+=b.deltaV;}return{fuel,v};};
 const a=simulate(100,60),b=simulate(10000,30),direct=burn(104,1,10000);
 close(a.v,b.v,1e-9);close(a.v,direct.deltaV,1e-9);close(a.fuel,direct.fuel,1e-8);assert.ok(a.v<.012);
});
test('finite propellant prevents time compression from granting unlimited delta-v',()=>{
 const all=burn(104,1,1e12),empty=burn(all.fuel,1,1e12);assert.equal(all.fuel,0);assert.equal(empty.deltaV,0);assert.ok(all.deltaV<.3);
});
test('diagonal inputs share the same thrust budget and fuel use',()=>{
 const x=integratePhysicalFlight([0,0,0],[0,0,0],[1,0,0],104,1000,{},'sun');
 const y=integratePhysicalFlight([0,0,0],[0,0,0],[1,1,1],104,1000,{},'sun');close(Math.hypot(...x.velocity),Math.hypot(...y.velocity));close(x.fuel,y.fuel);
});
test('time hold changes neither position nor velocity nor propellant',()=>{
 const state=integratePhysicalFlight([10000,0,0],[0,10,0],[1,0,0],104,0,{earth:[0,0,0]},'earth');assert.deepEqual(state.position,[10000,0,0]);assert.deepEqual(state.velocity,[0,10,0]);assert.equal(state.fuel,104);
});
test('a coasting circular orbit retains energy without artificial damping',()=>{
 const r=20000,v=Math.sqrt(GM.earth/r),period=2*Math.PI*r/v;let p=[r,0,0],vel=[0,v,0];
 for(let i=0;i<4000;i++){const s=integratePhysicalFlight(p,vel,[0,0,0],104,period/4000,{earth:[0,0,0]},'earth');p=s.position;vel=s.velocity;}
 assert.ok(Math.hypot(p[0]-r,p[1],p[2])<.2);close(.5*Math.hypot(...vel)**2-GM.earth/Math.hypot(...p),-GM.earth/(2*r),1e-7);
});
test('every snapshot is mapped to its requested Julian date, including Saturn/Titan',()=>{
 for(const records of Object.values(ephem.objects))for(let i=0;i<records.length;i++)close(records[i].jd,Date.parse(ephem.epochs[i]+'Z')/86400000+2440587.5,1e-8);
 assert.ok(ephem.objects.voyager[2].jd>ephem.objects.voyager[3].jd);
});
test('historical passage agrees with all JPL samples and their velocity derivatives',()=>{
 for(const r of data.objects.voyager){const s=trajectoryState(data.objects.voyager,r[0]);for(let i=0;i<3;i++){close(s.position[i],r[i+1],1e-3);close(s.velocity[i],r[i+4],1e-7);}}
 const jd=data.ends[2]+10,h=.0001,a=trajectoryState(data.objects.voyager,jd-h),b=trajectoryState(data.objects.voyager,jd+h),v=trajectoryState(data.objects.voyager,jd).velocity;
 for(let i=0;i<3;i++)close((b.position[i]-a.position[i])/(2*h*86400),v[i],.0001);
});
test('time rate is independent of historical speed; far cruise remains about 17 km/s',()=>{
 const speed=Math.hypot(...trajectoryState(data.objects.voyager,data.ends.at(-1)).velocity);assert.ok(speed>16.8&&speed<17.2);assert.equal(TIME_RATES.at(-1),50e6);
 const path=trajectoryDistance(data.objects.voyager,data.ends[0],data.ends[1]);const a=trajectoryState(data.objects.voyager,data.ends[0]).position,b=trajectoryState(data.objects.voyager,data.ends[1]).position;assert.ok(path>Math.hypot(...a.map((v,i)=>v-b[i])));
});
test('chart projection preserves physical distance in the plane',()=>{const p=eclipticPoint([149597870.7,0,0]),q=eclipticPoint([1495978707,0,0]);close(p[0],1);close(q[0]/p[0],10);});
test('science appears through exploration without a photograph or a control sequence',()=>{
 const guide=new ExperienceGuide(),state=restoreExperience();let display;
 for(let i=0;i<18;i++)display=guide.update(state,{chapter:0,subject:{id:'earth',radii:1.65},enabled:true,time:i,steady:true},1);
 assert.ok(display.note);assert.ok(state.seen.includes('0:1'));assert.deepEqual(restoreExperience(state),state);
});

test('mission milestones use published UTC times and end at one light-day from Earth',async()=>{
 const {MILESTONES,CHAPTERS}=await import('../src/mission.js');
 assert.equal(MILESTONES[1].utc,'1979-03-05T12:05:26Z');assert.equal(MILESTONES[2].utc,'1980-11-12T23:46:30Z');assert.equal(MILESTONES[3].utc,'1990-02-14T04:48:00Z');assert.equal(MILESTONES[4].precision,'day');
 assert.equal(MILESTONES[5].utc,'2026-11-18T10:16:07Z');assert.equal(CHAPTERS[5].predicted,true);
 const earth=ephem.objects.earth[6].position,voyager=ephem.objects.voyager[6].position;
 close(Math.hypot(...earth.map((v,i)=>v-voyager[i]))/299792.458/86400,1,1e-8);
 assert.equal(data.ends.length,CHAPTERS.length);assert.match(data.units,/UTC/);
});

test('surface motion follows simulated seconds and prograde rotation around each north pole',async()=>{
 const {BODY_DATA,surfaceRotation}=await import('../src/mission.js');
 for(const id of ['earth','jupiter','saturn']){
  const body=BODY_DATA[id],period=body.rotationPeriod;
  close(surfaceRotation(body,0),body.mapPhase,1e-14);
  close(surfaceRotation(body,period/4),body.mapPhase-.25,1e-14);
  close(surfaceRotation(body,period*5),body.mapPhase,1e-12);
  // Sphere UV increases in the positive rotation direction. A feature's
  // physical longitude is its fixed texture coordinate minus the offset.
  const feature=.7,advance=(feature-surfaceRotation(body,period/8))-(feature-surfaceRotation(body,0));
  close(advance,1/8,1e-14);
 }
 assert.equal(surfaceRotation(BODY_DATA.moon,50000),0);
});

test('mission durations describe physical time without a playback-rate argument',()=>{
 assert.equal(flightDuration(0),'0 s');assert.equal(flightDuration(60),'1 min 0 s');assert.equal(flightDuration(3601),'1 h 0 min');assert.equal(flightDuration(86400+7200),'1 day 2 h');assert.equal(flightDuration(86400*548+3600),'548 days 1 h');
});

test('the passage clock exposes UTC seconds at recorded dates',()=>{
 const jd=Date.parse('1979-03-05T12:05:26Z')/86400000+2440587.5;
 assert.match(epochLabel(jd),/12:05:26 UTC$/);assert.match(epochLabel(jd+1/86400),/12:05:27 UTC$/);
});


test('day-only passage labels agree with UTC timestamps across midnight in either direction',()=>{
 const before=Date.parse('1980-11-11T23:59:59Z')/86400000+2440587.5,after=before+1/86400;
 for(const [jd,day,time] of [[before,'11 Nov 1980','23:59:59'],[after,'12 Nov 1980','00:00:00'],[before,'11 Nov 1980','23:59:59']]){
  assert.equal(epochLabel(jd,false),day);assert.equal(epochLabel(jd),`${day} · ${time} UTC`);
 }
});

test('Earth uses equatorial and polar reference axes, not mean radius as its equator',async()=>{
 const {BODY_DATA}=await import('../src/mission.js');
 const {earthOptics}=await import('../src/rendering/earth-shaders.js');
 const earth=BODY_DATA.earth;
 close(earth.radius,6378.137,1e-9);close(earth.radius*earth.flatten,6356.752,1e-9);
 const volumeRadius=Math.cbrt(earth.radius**3*earth.flatten);
 close(volumeRadius,6371,.01);
 assert.match(earthOptics,/const float earthRadius=6378\.137;/);
});
