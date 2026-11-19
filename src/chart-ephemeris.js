import {trajectoryState} from './trajectory.js';

// The chart uses uniformly sampled JPL vectors, packed as signed 32-bit values.
// Positions are in 10 km units; velocities in 1 mm/s. Flight physics never reads
// this compact representation: encounter snapshots and Voyager's track keep their original precision.
export function decodeChartEphemeris(buffer){
 const view=new DataView(buffer),text=new TextDecoder();
 if(buffer.byteLength<12||text.decode(new Uint8Array(buffer,0,8))!=='COSMOSP1')throw Error('Invalid chart ephemeris');
 const headerSize=view.getUint32(8,true),start=12+headerSize;
 if(start>buffer.byteLength)throw Error('Incomplete chart ephemeris');
 const metadata=JSON.parse(text.decode(new Uint8Array(buffer,12,headerSize)));
 if(metadata.version!==1)throw Error('Unsupported chart ephemeris');
 for(const record of Object.values(metadata.objects)){
  if(!Number.isInteger(record.offset)||record.offset<0||!Number.isInteger(record.count)||record.count<2||!Number.isFinite(record.start)||!(record.step>0)||start+record.offset+record.count*24>buffer.byteLength)throw Error('Incomplete chart ephemeris');
 }
 function sample(id,index){
  const record=metadata.objects[id],offset=start+record.offset+index*24;
  return [record.start+index*record.step,...Array.from({length:6},(_,i)=>view.getInt32(offset+i*4,true)*(i<3?metadata.positionUnitKm:metadata.velocityUnitKmS))];
 }
 function state(id,jd){
  const record=metadata.objects[id];if(!record||!Number.isFinite(jd))throw Error('Unknown chart epoch');
  const index=Math.max(0,Math.min(record.count-2,Math.floor((jd-record.start)/record.step)));
  return trajectoryState([sample(id,index),sample(id,index+1)],jd);
 }
 return {metadata,state};
}
