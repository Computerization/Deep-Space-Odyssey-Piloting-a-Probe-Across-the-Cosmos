import {chartLabels} from './chart-labels.js';

// Keep names readable while resizing the plot, without enlarging the distances.
// One observer belongs to the currently open atlas and is released on navigation.
export function fitAtlasLabels(scope) {
 const plot=scope.querySelector('.atlas-plot'),svg=plot?.querySelector('svg');
 if(!svg)return ()=>{};
 function layout(){
  const matrix=svg.getScreenCTM(),scale=matrix&&Math.hypot(matrix.a,matrix.b);
  if(!scale||!svg.isConnected)return;
  const units=1/scale;
  for(const label of svg.querySelectorAll('text'))label.style.fontSize=`${(label.classList.contains('chart-scale-label')?11:14)*units}px`;
  if(svg.classList.contains('solar-chart')){
   const groups=[...svg.querySelectorAll('.chart-object,.chart-arrival')].filter(group=>group.style.display!=='none');
   const objects=groups.map(group=>{const m=group.transform.baseVal.consolidate().matrix;return {id:group.dataset.value,name:group.getAttribute('aria-label'),x:m.e,y:m.f}});
   const labels=chartLabels(objects,groups.find(g=>g.classList.contains('selected'))?.dataset.value,undefined,units);
   for(const group of groups){
    const label=labels.get(group.dataset.value),text=group.querySelector('text');
    text.style.display=label?'':'none';
    if(label){text.setAttribute('x',label.dx);text.setAttribute('y',label.dy);}
   }
   // A body name has priority over a nearby radial grid number.
   for(const tick of svg.querySelectorAll('.chart-tick')){
    tick.style.display='';const b=tick.getBBox(),gap=3*units;
    if([...labels.values()].some(({box})=>b.x<box.right+gap&&b.x+b.width>box.left-gap&&b.y<box.bottom+gap&&b.y+b.height>box.top-gap))tick.style.display='none';
   }
  }
 }
 const observer=new ResizeObserver(layout);observer.observe(plot);layout();
 const release=()=>observer.disconnect();release.refresh=layout;return release;
}
