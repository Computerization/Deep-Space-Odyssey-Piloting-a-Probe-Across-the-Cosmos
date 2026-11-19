import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1024,height:640}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('cosmos-settings-v1',JSON.stringify({muted:true,volume:.6})));
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');
 const muted=await page.evaluate(()=>{const a=window.__cosmos.audio;return {muted:a.muted,master:a.master.gain.value,recordings:a.recordingBus.gain.value};});
 assert.deepEqual(muted,{muted:true,master:0,recordings:0});
 await page.keyboard.press('b');await page.waitForTimeout(1200);
 assert.ok(await page.evaluate(()=>window.__cosmos.audio.master.gain.value>.59));
 // Deliberate interruptions must settle to one playing track with bounded channels.
 const transitions=await page.evaluate(async()=>{
  const a=window.__cosmos.audio;const sequence=['encounter','rings','distance','departure','rings'];
  for(const name of sequence){await a.select(name);await new Promise(r=>setTimeout(r,100));}
  return {count:a.channels.size,current:a.current,finite:[...a.channels.values()].every(c=>Number.isFinite(c.gain.gain.value)&&c.gain.gain.value>=0)};
 });
 assert.ok(transitions.finite);assert.equal(transitions.count,4);
 await page.waitForTimeout(8000);
 const settled=await page.evaluate(()=>window.__cosmos.audio.status());assert.deepEqual(settled.playing,['rings']);
 // Verify actual media time wraps rather than leaving the score silent at its end.
 await page.evaluate(async()=>{const el=window.__cosmos.audio.channels.get('rings').el;const seek=new Promise(r=>el.addEventListener('seeked',r,{once:true}));el.currentTime=el.duration-.45;await seek;if(el.currentTime<el.duration-1)throw Error('Loop test seek did not reach the track end');});await page.waitForTimeout(1200);
 const loop=await page.evaluate(()=>{const el=window.__cosmos.audio.channels.get('rings').el;return {time:el.currentTime,paused:el.paused,ended:el.ended};});
 assert.ok(loop.time<3);assert.equal(loop.paused,false);assert.equal(loop.ended,false);
 const hidden=await page.evaluate(async()=>{const a=window.__cosmos.audio;a.setHidden(true);await new Promise(r=>setTimeout(r,350));return {master:a.master.gain.value,recordings:a.recordingBus.gain.value};});assert.ok(hidden.master<.001);assert.ok(hidden.recordings<.001);
 await page.evaluate(()=>window.__cosmos.audio.setHidden(false));
 await page.waitForTimeout(1200);assert.ok(await page.evaluate(()=>window.__cosmos.audio.master.gain.value>.59));
 assert.deepEqual(errors,[]);
 const report={version:'0.21.0',savedMuteAppliedBeforePlayback:muted,rapidTransitionState:transitions,settledPlaying:settled.playing,loopWrap:loop,hiddenAudioFade:hidden,listeningQualityAuditioned:false,errors};
 await fs.writeFile('tests/audio-lifecycle-v21-results.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}
