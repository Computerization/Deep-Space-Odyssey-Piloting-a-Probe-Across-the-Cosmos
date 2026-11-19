export const AU = 149597870.7;
export const LIGHT_SPEED = 299792.458;
export const clamp = (x,a,b) => Math.min(b,Math.max(a,x));
export const length = a => Math.hypot(...a);
export const distance = (a,b) => Math.hypot(...a.map((x,i)=>x-b[i]));
export const angularDiameter = (radius,range) => 2*Math.asin(clamp(radius/range,0,1));
export function navigationAnchor(projection,maxX=.84,maxY=.67) {
  let {x,y}=projection;
  if(!projection.front){
    const edge=Math.max(Math.abs(x)/maxX,Math.abs(y)/maxY);
    if(edge<.001){x=maxX;y=0;}else{x/=edge;y/=edge;}
  }
  const overflow=Math.max(Math.abs(x)/maxX,Math.abs(y)/maxY,1);
  return {x:x/overflow,y:y/overflow,inView:projection.front&&overflow===1};
}
export const formatDistance = km => km >= AU*.08 ? `${(km/AU).toFixed(km>=AU*10?1:2)} AU` : `${Math.round(Math.max(0,km)).toLocaleString('en-US')} km`;
export const formatFieldOfView = degrees => `${Math.round(degrees*10)/10}°`;
export const signalTime = km => {
  const seconds = km/LIGHT_SPEED;
  return seconds < 60 ? `${seconds.toFixed(1)} s` : seconds >= 3600 ? `${(seconds/3600).toFixed(1)} h` : `${(seconds/60).toFixed(1)} min`;
};
// Local tangent prediction for the audio approach cue, not the curved flight
// path. The chart's coast forecast uses the physical gravity integrator.
export function predictCoast(position,velocity,target,radius=0) {
  const delta=target.map((x,i)=>x-position[i]),range=length(delta),speed=length(velocity);
  const dot=delta.reduce((sum,x,i)=>sum+x*velocity[i],0);
  const closestTime=speed>.001?Math.max(0,dot/(speed*speed)):0;
  const miss=length(delta.map((x,i)=>x-velocity[i]*closestTime));
  const approaching=dot>0&&speed>.001,inside=range<=radius;
  const intersects=inside||(approaching&&miss<=radius);
  const entryTime=inside?0:intersects?Math.max(0,closestTime-Math.sqrt(Math.max(0,radius*radius-miss*miss))/speed):null;
  return {range,speed,approaching,miss,inside,intersects,entryTime,closestTime};
}
export function safeReadStorage(key,fallback=null) {
  try {const v=localStorage.getItem(key);return v?JSON.parse(v):fallback;} catch{return fallback;}
}
export function safeWriteStorage(key,value) {try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
