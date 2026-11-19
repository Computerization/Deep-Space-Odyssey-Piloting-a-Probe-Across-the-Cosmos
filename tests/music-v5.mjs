import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1024,height:768}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${BASE_URL}/?test=1`);await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');
 const result=await page.evaluate(async()=>{
  const a=window.__cosmos.audio;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const decoded=[];
  for(const name of ['departure','encounter','rings','distance']){
   const bytes=await(await fetch(`assets/audio/${name}.ogg`)).arrayBuffer();const byteCount=bytes.byteLength;const b=await a.context.decodeAudioData(bytes);
   let peak=0,seam=0,energy=0;
   for(let c=0;c<b.numberOfChannels;c++){const data=b.getChannelData(c);seam=Math.max(seam,Math.abs(data[0]-data.at(-1)));for(const x of data){peak=Math.max(peak,Math.abs(x));energy+=x*x;}}
   decoded.push({name,bytes:byteCount,seconds:b.duration,channels:b.numberOfChannels,peak,seam,rms:Math.sqrt(energy/(b.length*b.numberOfChannels))});
  }
  await a.select('departure');await sleep(7800);
  const analyser=a.context.createAnalyser();analyser.fftSize=2048;a.master.connect(analyser);const samples=new Float32Array(2048),levels=[],power=[];
  await a.select('encounter');
  for(let i=0;i<76;i++){
   await sleep(100);analyser.getFloatTimeDomainData(samples);
   levels.push(Math.sqrt(samples.reduce((s,x)=>s+x*x,0)/samples.length));
   power.push([...a.channels.values()].reduce((s,ch)=>s+ch.gain.gain.value**2,0));
  }
  a.master.disconnect(analyser);
  await Promise.all([a.select('rings'),a.select('distance'),a.select('rings')]);await sleep(7900);
  const active=a.status();
  const el=a.channels.get('rings').el;el.currentTime=el.duration-.3;el.playbackRate=4;await sleep(650);
  const loop={time:el.currentTime,paused:el.paused,ended:el.ended};el.playbackRate=1;
  a.setDucked(true);await sleep(1600);const ducked=a.master.gain.value;
  a.setDucked(false);a.setPaused(true);await sleep(1600);const paused=a.master.gain.value;
  a.toggle();await sleep(2000);const muted=a.master.gain.value;
  a.toggle();a.setPaused(false);await sleep(1600);const restored=a.master.gain.value;
  return {decoded,transition:{minimumRms:Math.min(...levels),maximumRms:Math.max(...levels),minimumPower:Math.min(...power),maximumPower:Math.max(...power)},rapidSwitch:active,loop,ducked,paused,muted,restored};
 });
 assert.ok(result.decoded.every(t=>Math.abs(t.seconds-240)<.1&&t.channels===2&&t.peak<.8&&t.rms>.02&&t.seam<.005));
 assert.ok(result.transition.minimumRms>.0001);assert.ok(result.transition.maximumPower<1.01&&result.transition.minimumPower>.97);
 assert.deepEqual(result.rapidSwitch.playing,['rings']);assert.equal(result.rapidSwitch.track,'rings');
 assert.ok(result.loop.time<5&&!result.loop.ended&&!result.loop.paused);
 assert.ok(result.ducked<.06&&result.paused>.19&&result.paused<.23&&result.muted<.001&&result.restored>.59);
 assert.deepEqual(errors,[]);result.errors=errors;await fs.writeFile('tests/music-review-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
