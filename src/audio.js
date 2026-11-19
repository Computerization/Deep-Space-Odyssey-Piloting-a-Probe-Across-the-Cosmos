import {mixIntent} from './flight-instruments.js';
import {holdParameter,fadeParameter} from './audio-automation.js';
export class Soundtrack {
 constructor(){this.volume=.6;this.muted=false;this.started=false;this.current=null;this.channels=new Map();this.recordings=new Map();this.paused=false;this.hidden=false;this.ducked=false;this.feedbackVolume=.7;this.voices=new Set();}
 async start(){
  if(!this.context){this.context=new (window.AudioContext||window.webkitAudioContext)();this.master=this.context.createGain();this.master.gain.value=this.muted||this.hidden?0:this.volume*(this.ducked?.08:this.paused?.35:1);this.master.gain.setValueAtTime(this.master.gain.value,this.context.currentTime);this.limiter=this.context.createDynamicsCompressor();this.limiter.threshold.value=-8;this.limiter.knee.value=6;this.limiter.ratio.value=2;this.limiter.attack.value=.008;this.limiter.release.value=.2;this.master.connect(this.limiter);this.limiter.connect(this.context.destination);
   this.recordingBus=this.context.createGain();this.recordingBus.gain.value=this.muted||this.hidden?0:this.volume;this.recordingBus.gain.setValueAtTime(this.recordingBus.gain.value,this.context.currentTime);this.recordingBus.connect(this.limiter);
   this.musicBus=this.context.createGain();this.musicBus.gain.value=.9;this.musicFilter=this.context.createBiquadFilter();this.musicFilter.type='lowpass';this.musicFilter.frequency.value=18000;this.musicFilter.Q.value=.5;this.musicBus.connect(this.musicFilter);this.musicFilter.connect(this.master);
   this.feedbackBus=this.context.createGain();this.feedbackBus.gain.value=this.feedbackVolume;this.feedbackBus.connect(this.master);
   this.room=this.context.createConvolver();const impulse=this.context.createBuffer(2,Math.floor(this.context.sampleRate*1.1),this.context.sampleRate);let seed=1977;for(let ch=0;ch<2;ch++){const data=impulse.getChannelData(ch);for(let i=0;i<data.length;i++){seed=(1664525*seed+1013904223)>>>0;data[i]=(seed/4294967296*2-1)*Math.exp(-i/(this.context.sampleRate*.18))*.08;}}this.room.buffer=impulse;this.roomGain=this.context.createGain();this.roomGain.gain.value=.05;this.room.connect(this.roomGain);this.roomGain.connect(this.master);this.feedbackBus.connect(this.room);
   this.context.addEventListener('statechange',()=>this.retireFinishedChannels());
   this.sampleReady=fetch('assets/audio/interface-piano.webm').then(r=>r.arrayBuffer()).then(b=>this.context.decodeAudioData(b)).then(b=>{this.piano=b;}).catch(()=>{});}
  // WebKit grants playback permission per media element. Prepare the score
  // channels within the user's start gesture so later encounter arrivals
  // can crossfade without needing another click. Their gains begin at zero.
  if(!this.mediaPrimed){
   this.mediaPrimed=true;
   for(const name of ['departure','encounter','rings','distance']){
    const channel=this.prepareChannel(name);
    channel.el.play().then(()=>{if(this.current!==name)channel.el.pause();}).catch(()=>{});
   }
  }
  this.applyVolume();await this.context.resume();this.started=true;
 }
 prepareChannel(name){
  if(!this.channels.has(name)){
   const el=new Audio(`assets/audio/${name}.ogg`);el.loop=true;el.preload='auto';
   const gain=this.context.createGain();gain.gain.value=0;
   this.context.createMediaElementSource(el).connect(gain);gain.connect(this.musicBus);
   this.channels.set(name,{el,gain});
  }
  return this.channels.get(name);
 }
 async select(name){
  if(!this.started||(this.current===name&&!this.channels.get(name)?.el.paused))return;
  const selection=this.selection=(this.selection||0)+1;
  this.current=name;
  const channel=this.prepareChannel(name);channel.retireAt=null;
  try{await channel.el.play();}catch(error){if(this.selection===selection)this.current=null;throw error;}
  if(this.selection!==selection){if(this.current!==name)channel.el.pause();return;}
  const now=this.context.currentTime,duration=7.5;
  for(const [key,ch]of this.channels){
   fadeParameter(ch.gain.gain,key===name?1:0,now,duration);
   ch.retireAt=key===name?null:now+duration;
  }
  this.retireFinishedChannels();
 }
 retireFinishedChannels(){
  clearTimeout(this.retirementTimer);this.retirementTimer=null;
  if(!this.context||this.context.state!=='running')return;
  const now=this.context.currentTime;let next=Infinity;
  for(const [name,channel] of this.channels){
   if(name===this.current||channel.retireAt==null)continue;
   if(now>=channel.retireAt){channel.el.pause();channel.retireAt=null;}
   else next=Math.min(next,channel.retireAt);
  }
  // Wall time only wakes the check. The audio clock decides when the fade
  // has finished, including after the device or browser suspends playback.
  if(Number.isFinite(next))this.retirementTimer=setTimeout(()=>this.retireFinishedChannels(),Math.max(20,(next-now)*1000+30));
 }
 setVolume(v){this.volume=Math.max(0,Math.min(1,v));this.applyVolume();}
 applyVolume(){
  // Let the initial value occupy one sample before an exponential target.
  // Firefox otherwise begins a same-time target at the GainNode default (1),
  // even after an explicit zero anchor, leaking sound from a muted startup.
  const time=this.context?this.context.currentTime+1/this.context.sampleRate:0;
  if(this.master)this.master.gain.setTargetAtTime((this.muted||this.hidden?0:this.volume)*(this.ducked?.08:this.paused?.35:1),time,this.hidden?.04:.25);
  if(this.recordingBus)this.recordingBus.gain.setTargetAtTime(this.muted||this.hidden?0:this.volume,time,.025);
  else for(const media of this.recordings.keys()){media.volume=this.volume*.8;media.muted=this.muted||this.hidden;}
 }
 attachRecording(media){
  const sync=()=>this.setDucked([...this.recordings.keys()].some(m=>!m.paused&&!m.ended));
  const source=this.context?.createMediaElementSource(media);source?.connect(this.recordingBus);media.volume=.8;
  this.recordings.set(media,{sync,source});for(const event of ['play','pause','ended'])media.addEventListener(event,sync);
  this.applyVolume();sync();
 }
 stopRecordings(){
  for(const [media,{sync,source}] of this.recordings){media.pause();source?.disconnect();for(const event of ['play','pause','ended'])media.removeEventListener(event,sync);}
  this.recordings.clear();this.setDucked(false);
 }
 setHidden(value){this.hidden=value;this.applyVolume();}
 setDucked(v){this.ducked=v;this.applyVolume();}
 setPaused(v){this.paused=v;this.applyVolume();}
 toggle(){this.muted=!this.muted;this.applyVolume();return !this.muted;}
 setFeedbackVolume(value){this.feedbackVolume=Math.max(0,Math.min(1,value));if(this.feedbackBus){const now=this.context.currentTime,param=this.feedbackBus.gain;holdParameter(param,now);param.linearRampToValueAtTime(this.feedbackVolume,now+.04);}}
 updateFlight(state){
  if(!this.context||this.context.state!=='running')return;
  const intent=mixIntent(state),now=this.context.currentTime;
  const last=this.lastMix;
  if(!last||Math.abs(last.gain-intent.gain)>.005||Math.abs(last.cutoff-intent.cutoff)>100||Math.abs(last.space-intent.space)>.003){
   for(const [parameter,target,seconds] of [[this.musicBus.gain,intent.gain,1.8],[this.musicFilter.frequency,intent.cutoff,1.2],[this.roomGain.gain,intent.space,1.5]]){
    holdParameter(parameter,now);
    parameter.setTargetAtTime(target,now,seconds);
   }
   this.lastMix=intent;
  }
  // The score accompanies exploration. Feedback belongs to deliberate
  // interactions, not repeated proximity warnings or exposure progress.

 }
 cue(type='observe',section=0){
  if(!this.context||this.muted||this.hidden||this.paused||this.ducked||this.feedbackVolume<=0||this.voices.size>12)return;
  const now=this.context.currentTime;
  const pitches=type==='complete'?[62,69,76]:type==='mode'?[62]:type==='focus'?[[62,69,74][section]]:type==='caution'?[57,62]:[74,81];
  for(const [i,midi]of pitches.entries()){
   const start=now+i*.19,gain=this.context.createGain(),pan=this.context.createStereoPanner();pan.pan.value=(i-(pitches.length-1)/2)*.22;
   const voice=this.piano?this.context.createBufferSource():this.context.createOscillator();
   if(this.piano){voice.buffer=this.piano;voice.playbackRate.value=2**((midi-72)/12);}else{voice.type='sine';voice.frequency.value=440*2**((midi-69)/12);}
   const level=(type==='focus'?.045:type==='caution'?.10:.12)*(this.piano?6:.1);
   gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+.018);gain.gain.exponentialRampToValueAtTime(.0001,start+(type==='focus'?.65:2.5));
   voice.connect(gain);gain.connect(pan);pan.connect(this.feedbackBus);this.voices.add(voice);
   voice.onended=()=>{voice.disconnect();gain.disconnect();pan.disconnect();this.voices.delete(voice);};
   voice.start(start);voice.stop(start+(type==='focus'?.8:2.7));
  }
 }

 status(){return {started:this.started,state:this.context?.state,track:this.current,muted:this.muted,feedbackVoices:this.voices.size,acousticFeedback:!!this.piano,adaptiveGain:this.musicBus?.gain.value,playing:[...this.channels.entries()].filter(([,x])=>!x.el.paused).map(([id])=>id)};}
}
