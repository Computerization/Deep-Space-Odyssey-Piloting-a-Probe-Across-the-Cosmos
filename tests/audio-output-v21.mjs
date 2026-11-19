import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),page=await browser.newPage({viewport:{width:800,height:500}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 const result=await page.evaluate(async()=>{
  const a=window.__cosmos.audio;window.__cosmos.game.mode='panel';while(!a.channels.get('departure'))await new Promise(r=>setTimeout(r,20));await new Promise(r=>setTimeout(r,8000));
  const code=`class Capture extends AudioWorkletProcessor{constructor(){super();this.at=0;this.data=new Float32Array(8192);}process(inputs){const x=inputs[0];if(!x?.length)return true;for(let i=0;i<x[0].length;i++){this.data[this.at++]=x[0][i];this.data[this.at++]=(x[1]||x[0])[i];if(this.at===this.data.length){this.port.postMessage(this.data,[this.data.buffer]);this.at=0;this.data=new Float32Array(8192);}}return true;}}registerProcessor('capture',Capture);`;
  const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));await a.context.audioWorklet.addModule(url);URL.revokeObjectURL(url);
  const chunks=[],tap=new AudioWorkletNode(a.context,'capture',{outputChannelCount:[2]}),silent=a.context.createGain();silent.gain.value=0;
  tap.port.onmessage=e=>chunks.push(e.data);a.limiter.connect(tap);tap.connect(silent);silent.connect(a.context.destination);
  await a.select('rings');await new Promise(r=>setTimeout(r,10000));a.limiter.disconnect(tap);tap.disconnect();silent.disconnect();
  const samples=chunks.flatMap(c=>Array.from(c)),data=new ArrayBuffer(44+samples.length*2),v=new DataView(data),str=(p,s)=>{for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i));};
  str(0,'RIFF');v.setUint32(4,data.byteLength-8,true);str(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,a.context.sampleRate,true);v.setUint32(28,a.context.sampleRate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,samples.length*2,true);
  let peak=0,sum=0,nonFinite=0;for(let i=0;i<samples.length;i++){const s=samples[i];if(!Number.isFinite(s))nonFinite++;peak=Math.max(peak,Math.abs(s));sum+=s*s;v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,s))*32767),true);}
  const u=new Uint8Array(data);let binary='';for(let i=0;i<u.length;i+=4096)binary+=String.fromCharCode(...u.subarray(i,i+4096));
  return {sampleRate:a.context.sampleRate,seconds:samples.length/2/a.context.sampleRate,peak,rms:Math.sqrt(sum/samples.length),nonFinite,playing:a.status().playing,wav:btoa(binary)};
 });
 assert.equal(result.nonFinite,0);assert.ok(result.seconds>9.8);assert.ok(result.peak<.98);assert.ok(result.rms>1e-4);assert.deepEqual(result.playing,['rings']);assert.deepEqual(errors,[]);
 await fs.writeFile('/private/tmp/cosmos-transition-v21.wav',Buffer.from(result.wav,'base64'));delete result.wav;
 const report={version:'0.21.0',actualBrowserMixCaptured:true,source:'Audio graph output after limiter',transition:'departure → rings',...result,subjectiveListeningReviewed:false,errors};
 await fs.writeFile('tests/audio-output-v21-results.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}
