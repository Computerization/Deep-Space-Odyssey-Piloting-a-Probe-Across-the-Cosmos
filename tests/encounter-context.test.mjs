import test from 'node:test';
import assert from 'node:assert/strict';
import {encounterContext,encounterDate} from '../src/encounter-context.js';
import fs from 'node:fs';
const epochs=JSON.parse(fs.readFileSync(new URL('../assets/ephemeris.json',import.meta.url))).epochs;
import {CHAPTERS} from '../src/mission.js';
import {REGIONS,regionStatus} from '../src/exploration.js';

test('Titan study selects its earlier historical snapshot without changing Saturn mission time',()=>{
 const study=encounterContext({chapter:2,study:'titan'});
 assert.equal(study.epoch,3);assert.equal(study.body,'titan');
 assert.match(encounterDate({chapter:2,study:'titan'},epochs),/05:41:00 UTC · observation study/);
 assert.equal(CHAPTERS[2].epoch,2);
 assert.match(encounterDate({chapter:2},epochs),/23:46:30 UTC/);
});
test('invalid or cross-chapter study identity falls back to the main encounter',()=>{
 for(const study of ['titan','missing',{},null]){
  const context=encounterContext({chapter:0,study});
  assert.equal(context.study,false);assert.equal(context.body,'earth');assert.equal(context.region,REGIONS[0]);
 }
});
test('moon study boundary is measured about the moon rather than the parent planet',()=>{
 const region=encounterContext({chapter:0,study:'moon'}).region;
 const center=[380000,0,0],inside=regionStatus(0,[579999,0,0],center,region),outside=regionStatus(0,[580001,0,0],center,region);
 assert.equal(inside.body,'moon');assert.equal(inside.outside,false);assert.equal(outside.outside,true);
 assert.deepEqual(center,[380000,0,0]);
});

test('exploration preserves historical milestone dates rather than advancing an invented calendar',()=>{
 assert.equal(encounterDate({chapter:0,localSeconds:7200},epochs),'5 September 1977 · 18:00:00 UTC · departure study');
 assert.equal(encounterDate({chapter:2,study:'titan',localSeconds:7200},epochs),'12 November 1980 · 05:41:00 UTC · observation study');
 assert.equal(encounterDate({chapter:2,localSeconds:3600},epochs),'12 November 1980 · 23:46:30 UTC');
 assert.equal(encounterDate({chapter:1,localSeconds:3690.9},epochs),'5 March 1979 · 12:05:26 UTC');
 assert.equal(encounterDate({chapter:3,localSeconds:90},epochs),'14 February 1990 · 04:48 UTC');
 assert.equal(encounterDate({chapter:4,localSeconds:90},epochs),'25 August 2012 · UTC');
 assert.equal(encounterDate({chapter:5,localSeconds:3600},epochs),'18 November 2026 · 10:16:07 UTC · predicted');
});
