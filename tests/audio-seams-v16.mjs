import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),page=await browser.newPage({viewport:{width:800,height:500}}),errors=[],tracks=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');
 await page.evaluate(async()=>{const a=window.__cosmos;a.game.mode='panel';const code=`class Capture extends AudioWorkletProcessor{constructor(){super();this.offset=0;this.buffer=new Float32Array(8192);}process(inputs){const input=inputs[0];if(!input?.length)return true;for(let i=0;i<input[0].length;i++){this.buffer[this.offset++]=input[0][i];this.buffer[this.offset++]=(input[1]||input[0])[i];if(this.offset===this.buffer.length){this.port.postMessage({time:currentTime,data:this.buffer},[this.buffer.buffer]);this.buffer=new Float32Array(8192);this.offset=0;}}return true;}}registerProcessor('capture',Capture);`;const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));await a.audio.context.audioWorklet.addModule(url);URL.revokeObjectURL(url);});
 for(const name of ['departure','encounter','rings','distance']){
  const result=await page.evaluate(async name=>{
   const a=window.__cosmos.audio,c=a.context;await a.select(name);const channel=a.channels.get(name),el=channel.el;
   for(const [id,ch] of a.channels){ch.gain.gain.cancelScheduledValues(c.currentTime);ch.gain.gain.value=id===name?1:0;if(id!==name)ch.el.pause();}
   const ready=new Promise(r=>el.addEventListener('seeked',r,{once:true}));el.currentTime=117.5;await ready;if(el.currentTime<117)throw Error(name+' seek failed: '+el.currentTime);
   const tap=new AudioWorkletNode(c,'capture',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]}),silent=c.createGain();silent.gain.value=0;channel.gain.connect(tap);tap.connect(silent);silent.connect(c.destination);
   const chunks=[],timeline=[];tap.port.onmessage=e=>chunks.push(e.data);const begin=c.currentTime;
   const timer=setInterval(()=>timeline.push({context:c.currentTime-begin,media:el.currentTime}),40);
   await new Promise(r=>setTimeout(r,6000));clearInterval(timer);channel.gain.disconnect(tap);tap.disconnect();silent.disconnect();
   const length=chunks.reduce((n,v)=>n+v.data.length,0),bytes=new ArrayBuffer(44+length*2),view=new DataView(bytes),write=(offset,text)=>{for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));};
   write(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);write(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,c.sampleRate,true);view.setUint32(28,c.sampleRate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,length*2,true);let at=44;
   for(const chunk of chunks)for(const value of chunk.data){view.setInt16(at,Math.round(Math.max(-1,Math.min(1,value))*32767),true);at+=2;}
   const u8=new Uint8Array(bytes);let binary='';for(let i=0;i<u8.length;i+=4096)binary+=String.fromCharCode(...u8.subarray(i,i+4096));
   return {name,sampleRate:c.sampleRate,seconds:length/2/c.sampleRate,firstChunk:chunks[0]?.time-begin,timeline,wav:btoa(binary)};
  },name);
  await fs.mkdir('/private/tmp/cosmos-audio-v16',{recursive:true});await fs.writeFile(`/private/tmp/cosmos-audio-v16/${name}.wav`,Buffer.from(result.wav,'base64'));delete result.wav;assert.ok(result.timeline.some((v,i,arr)=>i>0&&v.media<arr[i-1].media),'Captured media time must cross the actual loop');tracks.push(result);console.log({name,seconds:result.seconds});
 }
 assert.deepEqual(errors,[]);await fs.writeFile('tests/audio-seams-v16-capture.json',JSON.stringify({tracks,errors,listeningQualityAuditioned:false},null,2));
}finally{await browser.close();}
