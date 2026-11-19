export const SECONDS_PER_DAY=86400;
export const TIME_RATES=[1,10,100,1000,10000,100000,1000000,3000000,10000000,30000000,50000000];
export function timeFlowLabel(rate) {
 if(rate===0)return 'Time held';
 if(rate===1)return '1 second / second';
 if(rate<60)return `${rate<10?rate.toFixed(0):Math.round(rate)} seconds / second`;
 if(rate<3600)return `${(rate/60).toFixed(1)} minutes / second`;
 if(rate<86400)return `${(rate/3600).toFixed(1)} hours / second`;
 return `${(rate/86400).toFixed(1)} days / second`;
}
// Mission durations are physical seconds, independent of playback rate.
export function flightDuration(seconds){
 const n=Math.max(0,Math.ceil(seconds-1e-6)),days=Math.floor(n/86400),hours=Math.floor(n%86400/3600),minutes=Math.floor(n%3600/60);
 if(days)return `${days} ${days===1?'day':'days'} ${hours} h`;
 if(hours)return `${hours} h ${minutes} min`;
 if(minutes)return `${minutes} min ${n%60} s`;
 return `${n} s`;
}
// Position and displayed velocity use the same Hermite curve through JPL data.
export function trajectoryState(records,jd){
 const first=records[0],last=records.at(-1);
 if(jd<=first[0])return {position:first.slice(1,4),velocity:first.slice(4,7)};
 if(jd>=last[0])return {position:last.slice(1,4),velocity:last.slice(4,7)};
 let lo=0,hi=records.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(records[m][0]<=jd)lo=m;else hi=m;}
 const a=records[lo],b=records[hi],h=(b[0]-a[0])*SECONDS_PER_DAY,t=(jd-a[0])/(b[0]-a[0]),t2=t*t,t3=t2*t;
 const position=[],velocity=[];
 for(let i=0;i<3;i++){
  position[i]=(2*t3-3*t2+1)*a[i+1]+(t3-2*t2+t)*h*a[i+4]+(-2*t3+3*t2)*b[i+1]+(t3-t2)*h*b[i+4];
  velocity[i]=((6*t2-6*t)*a[i+1]+(3*t2-4*t+1)*h*a[i+4]+(-6*t2+6*t)*b[i+1]+(3*t2-2*t)*h*b[i+4])/h;
 }
 return {position,velocity};
}
export function trajectoryDistance(records,a,b){
 const points=[trajectoryState(records,a).position,...records.filter(r=>r[0]>a&&r[0]<b).map(r=>r.slice(1,4)),trajectoryState(records,b).position];
 return points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(...p.map((v,k)=>v-points[i][k])),0);
}
const utcDay=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
let lastDay,dayText;
export function epochLabel(jd,withTime=true){
 const ms=Math.round((jd-2440587.5)*86400000),day=Math.floor(ms/86400000);
 if(day!==lastDay){dayText=utcDay.format(ms);lastDay=day;}
 return withTime?dayText+' · '+new Date(ms).toISOString().slice(11,19)+' UTC':dayText;
}
