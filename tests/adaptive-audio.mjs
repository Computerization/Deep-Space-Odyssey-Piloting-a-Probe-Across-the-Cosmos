import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');await page.keyboard.press('Escape');
 const result=await page.evaluate(async()=>{
  const {Soundtrack}=await import('./src/audio.js'),a=new Soundtrack();await a.start();await a.sampleReady;
  const analyser=a.context.createAnalyser();analyser.fftSize=2048;a.master.connect(analyser);const silence=a.context.createConstantSource();silence.offset.value=0;silence.connect(a.master);silence.start();const data=new Float32Array(2048),sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const levels=async(n=20)=>{let peak=0,rms=0;for(let i=0;i<n;i++){await sleep(50);analyser.getFloatTimeDomainData(data);peak=Math.max(peak,...data.map(Math.abs));rms=Math.max(rms,Math.sqrt(data.reduce((sum,x)=>sum+x*x,0)/data.length));}return {peak,rms};};
  a.cue('complete');const acoustic=await levels();await sleep(2400);const voicesAfter=a.voices.size;
  a.setFeedbackVolume(0);await sleep(1800);a.cue('complete');const quiet=await levels();
  a.setFeedbackVolume(.7);await a.select('encounter');await sleep(8000);
  a.updateFlight({altitudeRatio:2,observing:false},1/60);await sleep(4000);const cruise=a.musicBus.gain.value;
  a.updateFlight({altitudeRatio:2,observing:true,progress:.1},1/60);await sleep(4000);const observing=a.musicBus.gain.value;
  a.updateFlight({altitudeRatio:2,risk:true},1/60);const warning=a.lastWarning;a.updateFlight({altitudeRatio:2,risk:true},1/60);const warningAgain=a.lastWarning;
  a.setDucked(true);await sleep(1600);const ducked=a.master.gain.value;
  a.setDucked(false);a.toggle();await sleep(2000);const muted=a.master.gain.value;
  silence.stop();silence.disconnect();a.master.disconnect(analyser);for(const ch of a.channels.values())ch.el.pause();await a.context.close();
  return {acousticSample:!!a.piano,sampleSeconds:a.piano?.duration,acoustic,quiet,voicesAfter,cruise,observing,warningDebounced:warning===warningAgain,ducked,muted};
 });
 assert.ok(result.acousticSample&&result.sampleSeconds>3);assert.ok(result.acoustic.rms>.00001&&result.acoustic.peak<.3);assert.ok(result.quiet.rms<.000001);assert.equal(result.voicesAfter,0);assert.ok(result.observing<result.cruise*.85);assert.ok(result.warningDebounced);assert.ok(result.ducked<.06&&result.muted<.001);assert.deepEqual(errors,[]);
 await fs.writeFile('tests/adaptive-audio-results.json',JSON.stringify({...result,errors},null,2)+'\n');console.log(result);
}finally{await browser.close();}
