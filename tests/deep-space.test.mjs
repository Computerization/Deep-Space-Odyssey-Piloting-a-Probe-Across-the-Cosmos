import test from 'node:test';
import assert from 'node:assert/strict';
import {signalAt} from '../src/ui/deep-space.js';
import {pairedLimbGap} from '../src/encounter-trails.js';

test('signal covers each half of its round trip in one day',()=>{
 assert.deepEqual([0,6,12,24,36,48].map(h=>signalAt(h).fraction),[0,.25,.5,1,.5,0]);
 assert.match(signalAt(23).caption,/on its way to Voyager/);assert.match(signalAt(24).caption,/receives the command/);
 assert.match(signalAt(47).caption,/way back/);assert.match(signalAt(48).caption,/Earth receives/);
});
test('the limb gap distinguishes an occultation from a pair in open sky',()=>{
 assert.ok(pairedLimbGap(.2,.24,.025)<0);assert.ok(pairedLimbGap(.3,.24,.025)>0);
});
