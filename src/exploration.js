import {CHAPTERS, BODY_DATA} from './mission.js';
import {clamp, distance, length} from './flight.js';

// Local exploration volumes. Explicit interplanetary travel leaves these bounds.
export const REGIONS = [
  {body:'earth', radius:2500000, worlds:['earth','moon'], title:'Earth & Moon'},
  {body:'jupiter', radius:5000000, worlds:['jupiter','io'], title:'Jupiter & Io'},
  {body:'saturn', radius:6000000, worlds:['saturn','titan'], title:'Saturn & Titan'},
  {body:'voyager',radius:2500000,worlds:[],title:'The family portrait'},
  {body:'voyager',radius:5000000,worlds:[],title:'Interstellar space'},
  {body:'voyager',radius:5000000,worlds:[],title:'One light-day from Earth'}
];
export const PERSPECTIVES = ['Sunlit hemisphere', 'Along the terminator', 'Crescent'];
export const FIELD_FACTS = {
  earth:'Changing your position changes the illuminated fraction of Earth. Its blue rim follows the sunlight through the atmosphere.',
  moon:'The lunar surface is an LRO imagery mosaic over measured terrain. Oblique sunlight brings the relief into view.',
  jupiter:'Jupiter’s cloud bands wrap around an oblate globe. Your viewing angle and the Sun determine which parts are illuminated.',
  io:'Io’s mapped surface records volcanic deposits. Its appearance changes with illumination, while its physical size stays the same.',
  saturn:'The rings lie in Saturn’s equatorial plane. Moving above or below that plane changes their apparent width.',
  titan:'Voyager’s visible-light view of Titan was dominated by atmospheric haze. The bright limb changes with the Sun’s direction.'
};

export function nextObservation(chapter, discovered, after = -1) {
  const c = CHAPTERS[chapter];
  for (let offset=1; offset<=c.tasks.length; offset++) {
    const i = (after + offset) % c.tasks.length;
    if (!discovered.includes(`${c.id}-${i}`)) return i;
  }
  return c.tasks.length;
}

export function regionStatus(chapter, position, center, region = REGIONS[chapter]) {
  if (!region || !center) return null;
  const range = distance(position, center);
  return {...region, range, fraction:range / region.radius, outside:range > region.radius};
}

export function observationAvailable(chapter, index, range, phase) {
  const task = CHAPTERS[chapter].tasks[index];
  if (!task) return false;
  if (task.mode === 'signal' || !task.point) return true;
  const radius = BODY_DATA[task.target].radius, r = range / radius;
  if (r < 1.03) return false;
  if (chapter === 0 && index === 1) return r <= 2.7;
  if (chapter === 0 && index === 2) return r >= 4 && r <= 30;
  if (chapter === 1 && index === 1) return r <= 12 && phase >= 15 && phase <= 155;
  return r <= (task.frameBody ? 25 : 14);
}

export function phaseAngle(position, center) {
  const toObserver = position.map((v,i)=>v-center[i]), toSun = center.map(v=>-v);
  return Math.acos(clamp(toObserver.reduce((s,v,i)=>s+v*toSun[i],0) /
    Math.max(1e-9, length(toObserver)*length(toSun)), -1, 1))*180/Math.PI;
}

export function perspective(phase) { return phase < 45 ? 0 : phase < 110 ? 1 : 2; }

// Reject a target whose centre is hidden by a nearer globe, even if its bearing
// is on screen. Markers never turn an occluded/distant world into a visible dot.
export function unobstructed(position, target, targetId, centers) {
  const [x,y,z]=position,rx=target[0]-x,ry=target[1]-y,rz=target[2]-z;
  const range=Math.hypot(rx,ry,rz),scale=Math.max(range,1e-9),nx=rx/scale,ny=ry/scale,nz=rz/scale;
  for(const id in centers){
    if(id===targetId||!BODY_DATA[id])continue;
    const c=centers[id],dx=c[0]-x,dy=c[1]-y,dz=c[2]-z,along=dx*nx+dy*ny+dz*nz;
    if(along<=0||along>=range)continue;
    if(Math.hypot(dx-nx*along,dy-ny*along,dz-nz*along)<BODY_DATA[id].radius*.995)return false;
  }
  return true;
}
