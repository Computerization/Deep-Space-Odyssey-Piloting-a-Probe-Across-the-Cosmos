import test from 'node:test';
import assert from 'node:assert/strict';
import {ENCOUNTER_TRAILS,ObservationHold,departureCue,isDiscoveryView,nextDiscovery} from '../src/encounter-trails.js';
const view={range:1.8,phase:55,elevation:25,visible:true,pairedVisible:true,near:false};
test('Earth atmosphere rewards an area of useful views, not just the exact marker',()=>{
 const stop=ENCOUNTER_TRAILS.earth[0];
 for(const phase of [35,55,75])assert.ok(isDiscoveryView(stop,{...view,range:1.5,phase}));
 assert.equal(isDiscoveryView(stop,{...view,range:1.8}),false,'opening needs an actual approach');
 assert.equal(isDiscoveryView(stop,{...view,visible:false}),false);
 assert.equal(isDiscoveryView(stop,{...view,limbVisible:false}),false,'a screen full of ground does not reveal the horizon');
});
test('the rings must actually be edge-on and their dark-side discovery must be dark',()=>{
 const edge=ENCOUNTER_TRAILS.saturn[1],shadow=ENCOUNTER_TRAILS.saturn[2];
 assert.ok(isDiscoveryView(edge,{...view,range:3.2,elevation:1}));
 assert.equal(isDiscoveryView(edge,{...view,range:3.2,elevation:15}),false);
 assert.equal(isDiscoveryView(shadow,{...view,range:3.2,phase:50}),false);
 assert.ok(isDiscoveryView(shadow,{...view,range:3.2,phase:135}));
});
test('paired-world discoveries require both worlds and optional travel never completes itself',()=>{
 const pair=ENCOUNTER_TRAILS.moon[0];
 assert.ok(isDiscoveryView(pair,{...view,near:true}));
 assert.equal(isDiscoveryView(pair,{...view,near:true,pairedVisible:false}),false);
 assert.equal(isDiscoveryView(ENCOUNTER_TRAILS.earth[2],view),false);
});

test('a nearby observer must still see sunlit surface at the crescent discovery',()=>{
 const stop=ENCOUNTER_TRAILS.earth[1];
 assert.ok(isDiscoveryView(stop,{...view,range:1.85,phase:130}));
 assert.equal(isDiscoveryView(stop,{...view,range:1.85,phase:155}),false);
});

test('free exploration suggests unseen views before a detour, including discoveries in reverse order',()=>{
 const stops=ENCOUNTER_TRAILS.earth;
 assert.equal(nextDiscovery(stops,['trail-earth-night'],1),0);
 assert.equal(nextDiscovery(stops,['trail-earth-horizon'],0),1);
 assert.equal(nextDiscovery(stops,['trail-earth-horizon','trail-earth-night'],1),2);
 assert.equal(nextDiscovery(ENCOUNTER_TRAILS.moon,['trail-moon-earthrise'],0),1);
 assert.equal(nextDiscovery([],[]),0);
});

test('named landmarks must be visible, and a polar discovery requires a polar view',()=>{
 const storm=ENCOUNTER_TRAILS.jupiter[0],pole=ENCOUNTER_TRAILS.saturn[3];
 assert.equal(isDiscoveryView(storm,view),false);
 assert.equal(isDiscoveryView(storm,{...view,landmarkVisible:true}),true);
 assert.equal(isDiscoveryView(storm,{...view,range:3,landmarkVisible:true}),false);
 assert.equal(isDiscoveryView(pole,{...view,range:2.5,phase:75,elevation:20}),false);
 assert.equal(isDiscoveryView(pole,{...view,range:2.5,phase:75,elevation:70}),true);
});

test('paired views can be found well away from the suggested four-radius pose',()=>{
 const s=ENCOUNTER_TRAILS.io[0];
 assert.ok(isDiscoveryView(s,{...view,range:7,pairedVisible:true}));
 assert.equal(isDiscoveryView(s,{...view,range:7,pairedVisible:false}),false);
 assert.equal(isDiscoveryView(s,{...view,range:15,pairedVisible:true}),false);
});

test('lunar crater shadows require a framed terminator, not just a quarter-phase camera position',()=>{
 const stop=ENCOUNTER_TRAILS.moon.find(s=>s.terminator);
 assert.equal(isDiscoveryView(stop,{...view,phase:90}),false);
 assert.ok(isDiscoveryView(stop,{...view,phase:90,terminatorVisible:true}));
 assert.equal(isDiscoveryView(stop,{...view,phase:30,terminatorVisible:true}),false);
});

test('Earth departure coaches actual inward momentum and the visible limb, not elapsed time',()=>{
 assert.equal(departureCue(1.8,0,0,false,false),'thrust');
 assert.equal(departureCue(1.7,-.1,1,false,false),'thrust');
 assert.equal(departureCue(1.7,.08,1,false,false),'release');
 assert.equal(departureCue(1.7,.08,0,false,false),'coast');
 assert.equal(departureCue(1.55,.08,0,false,true),'brake');
 assert.equal(departureCue(1.54,.04,0,true,true),'braking');
 assert.equal(departureCue(1.53,0,0,false,true),'observe');
 assert.equal(departureCue(1.5,.1,1,false,false),null,'a missed rim gives control back to ordinary guidance');
});

test('brief reframing keeps earned time without counting unstable or lost frames',()=>{
 const h=new ObservationHold();h.update(1,true,2.3);
 for(const [index,steady] of [[1,false],[-1,false],[1,false]]){
  h.update(index,steady,.2);assert.equal(h.seconds,2.3);assert.equal(h.steady,false);
  h.update(1,true,0);assert.equal(h.steady,true);
 }
 h.update(1,true,.2);assert.equal(h.seconds,2.5);
});
test('time never carries between subjects, prolonged losses or encounters',()=>{
 const h=new ObservationHold();h.update(1,true,2);h.update(-1,true,.2);h.update(2,false,.05);
 assert.equal(h.subject,2);assert.equal(h.seconds,0);h.update(2,true,.4);
 h.update(2,false,.2);h.update(-1,false,.16);assert.equal(h.subject,-1);
 h.update(2,true,.1);assert.equal(h.seconds,.1);h.reset();assert.equal(h.seconds,0);
});
