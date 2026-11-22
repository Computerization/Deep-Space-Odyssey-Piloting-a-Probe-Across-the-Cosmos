import {clamp,formatDistance,formatFieldOfView,signalTime} from './flight.js';

export function encounterMeasurement(id,range,radius,fov){const angle=2*Math.asin(clamp(radius/range,0,1))*180/Math.PI;return {range:formatDistance(range),angularDiameter:angle.toFixed(angle<.1?4:2)+'°',fieldOfView:formatFieldOfView(fov),signal:signalTime(range),target:id};}

export class ObservationArchive {
 constructor(){
  this.memory=new Map();
  this.ready=new Promise(resolve=>{
   try{
    const request=indexedDB.open('cosmos-photographs',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('frames',{keyPath:'id'});
    request.onsuccess=()=>{this.db=request.result;resolve();};
    request.onerror=()=>resolve();
   }catch{resolve();}
  });
 }
 async put(frame){
  // Keep the captured image even when storage is full or no longer available.
  this.memory.set(frame.id,frame);await this.ready;
  if(!this.db)return false;
  try{
   return await new Promise(resolve=>{
    const transaction=this.db.transaction('frames','readwrite');
    transaction.objectStore('frames').put(frame);
    transaction.oncomplete=()=>resolve(true);
    transaction.onerror=transaction.onabort=()=>resolve(false);
   });
  }catch{return false;}
 }
 async get(id){
  if(this.memory.has(id))return this.memory.get(id);
  await this.ready;if(!this.db)return null;
  try{return await new Promise(resolve=>{const req=this.db.transaction('frames').objectStore('frames').get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>resolve(null);});}catch{return null;}
 }
 async all(){
  await this.ready;
  if(!this.db)return [...this.memory.values()];
  try{
   return await new Promise(resolve=>{
    const request=this.db.transaction('frames').objectStore('frames').getAll();
    request.onsuccess=()=>resolve([...new Map([...request.result.map(frame=>[frame.id,frame]),...this.memory]).values()]);
    request.onerror=()=>resolve([...this.memory.values()]);
   });
  }catch{return [...this.memory.values()];}
 }
 async remove(id){
  await this.ready;
  if(!this.db){this.memory.delete(id);return true;}
  try{
   const removed=await new Promise(resolve=>{
    const transaction=this.db.transaction('frames','readwrite');
    transaction.objectStore('frames').delete(id);
    transaction.oncomplete=()=>resolve(true);
    transaction.onerror=transaction.onabort=()=>resolve(false);
   });
   if(removed)this.memory.delete(id);
   return removed;
  }catch{return false;}
 }

}
