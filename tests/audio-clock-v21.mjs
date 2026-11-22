import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:800,height:500}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  console.log({name,stage:'load'});await page.addInitScript(()=>localStorage.setItem('cosmos-settings-v1',JSON.stringify({scoreMode:'suites'})));await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
  const result=await page.evaluate(async()=>{
   const a=window.__cosmos.audio;window.__cosmos.game.mode='panel';
   const wait=ms=>new Promise(r=>setTimeout(r,ms));
   while(!a.channels.get('departure'))await wait(20);
   await wait(8000);await a.select('encounter');await wait(250);await a.context.suspend();
   const read=()=>({time:a.context.currentTime,state:a.context.state,channels:[...a.channels].map(([id,c])=>({id,gain:c.gain.gain.value,paused:c.el.paused,retireAt:c.retireAt??null}))});
   const before=read();await wait(8100);const suspended=read();
   await a.context.resume();await wait(100);const resumed=read();await wait(7600);const settled=read();
   // Re-select an outgoing track while suspended. The stale deadline must
   // never pause the new selection when the audio clock resumes.
   await a.select('rings');await wait(200);await a.context.suspend();
   const pending=a.select('encounter');await a.context.resume();await pending;
   await wait(7800);const reselected=read();
   const analyser=a.context.createAnalyser(),samples=new Float32Array(2048);a.master.connect(analyser);let rms=0;
   for(let i=0;i<10;i++){await wait(80);analyser.getFloatTimeDomainData(samples);rms=Math.max(rms,Math.sqrt(samples.reduce((s,x)=>s+x*x,0)/samples.length));}
   a.master.disconnect(analyser);
   return {before,suspended,resumed,settled,reselected,rms,current:a.current,channelCount:a.channels.size,nativeHold:typeof a.master.gain.cancelAndHoldAtTime==='function'};
  });
  assert.equal(result.suspended.time,result.before.time);
  for(const state of [result.before,result.suspended,result.resumed]){
   const old=state.channels.find(c=>c.id==='departure');assert.equal(old.paused,false);assert.ok(old.gain>.9);
  }
  const activePower=result.resumed.channels.reduce((s,c)=>s+(c.paused?0:c.gain**2),0);assert.ok(activePower>.97);
  for(const state of [result.settled,result.reselected])assert.deepEqual(state.channels.filter(c=>!c.paused).map(c=>c.id),['encounter']);
  assert.equal(result.current,'encounter');assert.equal(result.channelCount,4);assert.ok(result.rms>1e-5);assert.deepEqual(errors,[]);
  outcomes.push({name,engineVersion:browser.version(),...result,activePowerAfterResume:activePower,errors,passed:true});console.log({name,passed:true,activePower});
 }finally{await browser.close();}
 await fs.writeFile('tests/audio-clock-v21-results.json',JSON.stringify({version:'0.21.0',simulatedDeviceSuspension:true,subjectiveListeningReviewed:false,outcomes},null,2));
}
