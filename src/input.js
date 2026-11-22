// A circular dead zone preserves direction while giving the centre room for
// fine framing. Full diagonal deflection has the same turn rate as an axis.
export function stickVector(x,y,dead=.13){
 const length=Math.hypot(x,y);
 if(length<=dead)return [0,0];
 const gain=((Math.min(1,length)-dead)/(1-dead))**2/length;
 return [x*gain,y*gain];
}
export class FlightInput {
 constructor(canvas,action){
  this.keys=new Set();this.mouse={x:0,y:0};this.drag=false;this.device='keyboard';this.action=action;this.canvas=canvas;this.previous=[];this.pad=null;this.sensitivity=.002;this.aimScale=1;this.pointerObserve=false;this.awaitNeutral=false;this.blockedAxes=new Set();this.blockedButtons=new Set();this.wheelDistance=0;this.wheelTime=0;this.pointerLocked=false;
  // Input modality must update even when a panel consumes the key event.
  addEventListener('keydown',e=>{if(!e.metaKey&&!e.ctrlKey&&!e.altKey)this.setDevice('keyboard');},{capture:true});
  addEventListener('keydown',e=>{
   if(e.metaKey||e.ctrlKey||e.altKey)return;
   this.setDevice('keyboard');
   if(e.code==='Tab'&&!this.inMenu){e.preventDefault();action('pause');return;}
   if(e.target.matches('input,select,textarea')){if(e.code==='Escape')action('pause');return;}
   if(e.repeat&&!this.keys.has(e.code))return;
   if(e.code==='Space'&&e.target.matches('button,a,summary,[role="button"]'))return;
   if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
   this.keys.add(e.code);if(e.repeat)return;
   const map={Escape:'pause',Space:'holdPressed',KeyX:'interact',KeyY:'maneuver',KeyC:'view',KeyK:'camera',KeyU:'review',KeyO:'recentPhoto',KeyI:'instruments',KeyM:'map',KeyJ:'journal',KeyH:'hud',KeyG:'guidance',KeyZ:'precision',KeyP:e.shiftKey?'flyby':'photo',KeyT:'timeUp',BracketRight:'timeUp',BracketLeft:'timeDown',Equal:'exposureUp',Minus:'exposureDown',KeyN:'next',KeyB:'music',KeyV:'look',KeyL:'track',Enter:'confirm',Slash:'guide'};
   if(e.code==='Enter'&&e.target.matches('summary,a,[role="button"]'))return;
   if(map[e.code]){if(e.code==='Enter')e.preventDefault();action(map[e.code]);}
  });
  addEventListener('keyup',e=>this.keys.delete(e.code));
  addEventListener('pointerdown',()=>this.setDevice('keyboard'),{capture:true});
  addEventListener('blur',()=>{this.clear();action('blur');});
  canvas.addEventListener('pointerdown',e=>{if(e.button===0){canvas.focus({preventScroll:true});action('capturePointer');}});
  addEventListener('pointerup',()=>{this.drag=false;this.pointerObserve=false;});
  addEventListener('pointercancel',()=>{this.drag=false;this.pointerObserve=false;});
  addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas||(this.lookEnabled&&e.target===canvas)){this.mouse.x+=e.movementX;this.mouse.y+=e.movementY;this.setDevice('keyboard');}});
  canvas.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey)return;e.preventDefault();const now=performance.now(),delta=e.deltaY*(e.deltaMode===1?32:e.deltaMode===2?innerHeight:1);if(now-this.wheelTime>180||Math.sign(delta)!==Math.sign(this.wheelDistance))this.wheelDistance=0;this.wheelTime=now;this.wheelDistance+=delta;const steps=Math.min(3,Math.floor(Math.abs(this.wheelDistance)/100));for(let i=0;i<steps;i++)this.action(delta<0?'zoomIn':'zoomOut');if(steps)this.wheelDistance%=100;},{passive:false});
  document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===canvas;const released=(this.pointerLocked||this.capturePending)&&!locked;this.capturePending=false;this.pointerLocked=locked;document.body.classList.toggle('mouse-flight',locked);this.clear();if(released){this.lastPointerRelease=performance.now();this.action('pointerReleased');}});
  addEventListener('gamepadconnected',()=>action('controllerConnected'));
  addEventListener('gamepaddisconnected',()=>{this.pad=null;this.previous=[];action('controllerDisconnected');});
 }
 setDevice(device){
  if(this.device===device)return;
  this.device=device;this.action('inputDevice');
 }
 capturePointer(){
  this.canvas.focus?.({preventScroll:true});
  if(document.pointerLockElement||this.capturePending)return;
  if(!this.canvas.requestPointerLock){this.action('pointerUnavailable');return;}
  this.capturePending=true;
  const failed=()=>{this.capturePending=false;this.action('pointerUnavailable');};
  try{this.canvas.requestPointerLock()?.catch(failed);}catch{failed();}
 }
 clear(){this.keys.clear();this.mouse.x=this.mouse.y=0;this.drag=false;this.pointerObserve=false;this.wheelDistance=0;}
 rearm(){
  this.clear();this.blockedAxes.clear();this.blockedButtons.clear();
  const pad=[...(navigator.getGamepads?.()||[])].find(p=>p?.connected);
  if(pad){
   pad.axes.forEach((v,i)=>{if(i<4&&Math.abs(v)>.13)this.blockedAxes.add(i);});
   for(const i of [0,1,4,5,6,7])if((pad.buttons[i]?.value||0)>.01)this.blockedButtons.add(i);
  }
  this.awaitNeutral=this.blockedAxes.size+this.blockedButtons.size>0;
 }
 bindObserve(button){
  button.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();this.pointerObserve=true;this.setDevice('keyboard');button.setPointerCapture(e.pointerId);});
  button.addEventListener('lostpointercapture',()=>this.pointerObserve=false);
  button.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();e.stopPropagation();this.pointerObserve=true;}});
  button.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();e.stopPropagation();this.pointerObserve=false;}});
  button.addEventListener('blur',()=>this.pointerObserve=false);
 }
 sample(dt=1/60){
  const pad=[...(navigator.getGamepads?.()||[])].find(p=>p?.connected);
  if(pad){
   this.pad=pad;const b=i=>pad.buttons[i]?.value||0;
   if(pad.axes.some(v=>Math.abs(v)>.16)||pad.buttons.some(v=>v.pressed))this.setDevice('gamepad');
   // Menu actions can rearm flight during this sample. Resolve them before
   // reading flight controls, so the selection press never becomes thrust,
   // a photograph or a time hold in the newly entered scene.
   const previous=this.previous;this.previous=pad.buttons.map(v=>v.value>.5);
   const commands={1:'back',2:this.inMenu?'timeUp':'interact',3:'view',8:'map',9:'pause',10:'photo',11:'look',12:this.inMenu?'timeUp':'next',13:'timeDown',14:'zoomOut',15:'zoomIn'};
   for(const [i,name]of Object.entries(commands))if(b(+i)>.5&&!previous[i])this.action(name);
   if(b(0)>.5&&!previous[0])this.action('confirm');
  }else{this.pad=null;this.previous=[];this.blockedAxes.clear();this.blockedButtons.clear();}
  const k=this.keys;let lateral=Number(k.has('KeyD'))-Number(k.has('KeyA')),vertical=Number(k.has('KeyR'))-Number(k.has('KeyF')),thrust=Number(k.has('KeyW'))-Number(k.has('KeyS'));
  const mouseX=this.mouse.x,mouseY=this.mouse.y;
  let yaw=-mouseX*this.sensitivity,pitch=-mouseY*this.sensitivity,roll=(Number(k.has('KeyQ'))-Number(k.has('KeyE')))*.8;
  this.mouse.x=this.mouse.y=0;
  const turnScale=this.sensitivity/.002;
  yaw+=(Number(k.has('ArrowLeft'))-Number(k.has('ArrowRight')))*1.32*dt*turnScale;
  pitch+=(Number(k.has('ArrowUp'))-Number(k.has('ArrowDown')))*1.32*dt*turnScale;
  let brake=k.has('Space'),observe=this.pointerObserve,boost=k.has('ShiftLeft')||k.has('ShiftRight');
  if(pad){
   const a=i=>{
    const v=pad.axes[i]||0;
    if(this.blockedAxes.has(i)){if(Math.abs(v)<=.13)this.blockedAxes.delete(i);return 0;}
    return v;
   };
   const b=i=>{
    const v=pad.buttons[i]?.value||0;
    if(this.blockedButtons.has(i)){if(v<=.01)this.blockedButtons.delete(i);return 0;}
    return v;
   };
   const [moveX,moveY]=stickVector(a(0),a(1)),[lookX,lookY]=stickVector(a(2),a(3));
   lateral+=moveX;vertical-=moveY;yaw-=lookX*1.92*dt*turnScale;pitch-=lookY*1.92*dt*turnScale;thrust+=b(7)-b(6);roll+=(b(4)-b(5))*.8;boost||=b(4)>.5&&b(5)>.5;
   const hold=b(1),record=b(0);brake||=hold>.5;observe||=record>.5;
  }
  this.awaitNeutral=this.blockedAxes.size+this.blockedButtons.size>0;
  const mouseOnly=(mouseX!==0||mouseY!==0)&&yaw===-mouseX*this.sensitivity&&pitch===-mouseY*this.sensitivity&&!roll;
  yaw*=this.aimScale;pitch*=this.aimScale;
  return {lateral,vertical,thrust,yaw,pitch,roll,brake,observe,boost,mouseOnly,mouseX,mouseY};
 }
}
