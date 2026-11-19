import {chartLabels} from './chart-labels.js';
import {eclipticPoint} from '../solar-chart-state.js';
import {trajectoryState} from '../trajectory.js';
// One projection for the whole passage: the ship moves on the sampled JPL
// trajectory while the scale stays fixed. Dots are map symbols, not visible worlds.
export function createPassageChart(node,world,transit){
 const records=world.cruise.objects.voyager;
 const route=Array.from({length:81},(_,i)=>eclipticPoint(trajectoryState(records,transit.start+(transit.end-transit.start)*i/80).position));
 const extent=Math.max(2,...route.map(p=>Math.hypot(p[0],p[1])))*1.15;
 const scale=155/extent,point=p=>[400+p[0]*scale,185-p[1]*scale];
 const path=route.map((p,i)=>{const [x,y]=point(p);return `${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`}).join(' ');
 const bodies=['earth','jupiter','saturn'].filter(id=>world.chartEphemeris.metadata.objects[id]);
 node.innerHTML=`<svg viewBox="0 0 800 380" role="img" aria-label="Voyager's historical route, projected onto the plane of the solar system"><g class="passage-orbits">${bodies.map(id=>{
  const radius=Math.hypot(...eclipticPoint(world.chartEphemeris.state(id,transit.start).position).slice(0,2))*scale;
  return radius<175?`<circle cx="400" cy="185" r="${radius}"/>`:'';
 }).join('')}</g><path class="passage-route" d="${path}"/><g data-sun transform="translate(400,185)"><circle class="passage-sun" r="3"/><text>Sun</text></g>${bodies.map(id=>`<g data-world="${id}"><circle r="2.5"/><text x="9" y="5">${id[0].toUpperCase()+id.slice(1)}</text></g>`).join('')}<g data-probe><circle r="5"/><text x="12" y="-10">Voyager 1</text></g><path class="passage-scale" d="M35 335h${scale*Math.max(1,Math.floor(extent/3))}"/><text x="35" y="359">${Math.max(1,Math.floor(extent/3))} AU · projected distance</text></svg>`;
 const symbol=(id,group)=>({id,group,text:group.querySelector('text'),name:group.querySelector('text').textContent,x:400,y:185,visible:true});
 const probe=symbol('voyager',node.querySelector('[data-probe]')),sun=symbol('sun',node.querySelector('[data-sun]'));
 const worlds=bodies.map(id=>symbol(id,node.querySelector(`[data-world="${id}"]`))),symbols=[probe,sun,...worlds];
 const bounds={left:8,top:5,right:792,bottom:325};
 let lastJD;
 function place(s,p){
  [s.x,s.y]=point(p);s.group.setAttribute('transform',`translate(${s.x},${s.y})`);
 }
 return jd=>{
  if(jd===lastJD)return;lastJD=jd;
  place(probe,eclipticPoint(trajectoryState(records,jd).position));
  for(const s of worlds){
   const p=eclipticPoint(world.chartEphemeris.state(s.id,jd).position);place(s,p);
   s.visible=Math.hypot(p[0],p[1])<extent;
   if((s.group.style.display!=='none')!==s.visible)s.group.style.display=s.visible?'':'none';
  }
  // Labels travel with their symbols. Reconsider offsets only after the map
  // geometry meaningfully changes, without measuring live DOM rectangles.
  if(!symbols.some(s=>s.wasVisible!==s.visible||s.visible&&(Math.abs(s.x-s.lastX)>2||Math.abs(s.y-s.lastY)>2)))return;
  const labels=chartLabels(symbols.filter(s=>s.visible),'voyager',bounds,1.45);
  for(const s of symbols){
   s.lastX=s.x;s.lastY=s.y;s.wasVisible=s.visible;const label=labels.get(s.id);
   if((s.text.style.display!=='none')!==!!label)s.text.style.display=label?'':'none';
   if(label&&(s.dx!==label.dx||s.dy!==label.dy)){
    s.dx=label.dx;s.dy=label.dy;s.text.setAttribute('x',s.dx);s.text.setAttribute('y',s.dy);
   }
  }
 };
}

// Orthographic projection of the assisted flight, not a historical trajectory.
// Fit the four Bézier control points once; the marker uses the simulated pose.
export function createLocalPassageChart(node,t){
 const axis=t.arrival.clone().sub(t.origin).normalize();if(!axis.lengthSq())axis.set(1,0,0);
 const offsets=[t.controlA,t.controlB].map(p=>p.clone().sub(t.origin));
 const normals=offsets.map(p=>p.clone().addScaledVector(axis,-p.dot(axis)));
 const up=(normals[0].lengthSq()>normals[1].lengthSq()?normals[0]:normals[1]).normalize();
 const project=p=>[p.dot(axis),p.dot(up)];
 const points=[[0,0],...offsets.map(project),[t.length,0]];
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const left=Math.min(...xs),bottom=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-bottom;
 const scale=Math.min(590/Math.max(1,width),205/Math.max(1,height));
 const xy=([x,y])=>[(400+(x-left-width/2)*scale).toFixed(2),(185-(y-bottom-height/2)*scale).toFixed(2)];
 const [a,b,c,d]=points.map(xy),span=110/scale,unit=10**Math.floor(Math.log10(span));
 const tick=unit*(span/unit>=5?5:span/unit>=2?2:1);
 node.innerHTML=`<svg viewBox="0 0 800 380" role="img" aria-label="Assisted local transfer, projected flight path"><path class="passage-route" d="M${a} C${b} ${c} ${d}"/><g class="transfer-ends">${[a,d].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="4"/><text x="${x}" y="${+y+(i&&Math.abs(d[0]-a[0])<120?-18:28)}" text-anchor="middle">${i?'Arrival':'Departure'}</text>`).join('')}</g><g data-probe><circle r="5"/></g><path class="passage-scale" d="M35 335h${(tick*scale).toFixed(2)}"/><text x="35" y="359">${tick.toLocaleString('en-US')} km · projected distance</text></svg>`;
 const marker=node.querySelector('[data-probe]'),offset=t.origin.clone();
 return position=>marker.setAttribute('transform',`translate(${xy(project(offset.copy(position).sub(t.origin)))})`);
}
