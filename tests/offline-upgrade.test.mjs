import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('an offline request cannot fall through to a recreated legacy-version cache',async()=>{
 const source=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const version=/const VERSION='([^']+)'/.exec(source)[1];
 const events={},opened=[];let crossVersionReads=0,result;
 vm.runInNewContext(source,{
  self:{location:{origin:'https://cosmos.test'},addEventListener:(name,handler)=>events[name]=handler},
  URL,Request,Response,Headers,fetch:async()=>{throw Error('offline');},
  caches:{open:async name=>{opened.push(name);return {match:async()=>undefined};},match:async()=>{crossVersionReads++;return new Response('obsolete script');}}
 });
 events.fetch({request:new Request('https://cosmos.test/legacy-only.js'),respondWith:promise=>result=promise});
 const response=await result;
 assert.equal(response.type,'error');assert.equal(crossVersionReads,0);assert.deepEqual(opened,[version]);
});
