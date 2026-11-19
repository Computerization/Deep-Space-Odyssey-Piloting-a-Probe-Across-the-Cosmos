// Stable label placement in SVG units. Physical object positions stay fixed.
export function chartLabels(objects,selected,bounds={left:12,top:15,right:585,bottom:490},units=1) {
 const occupied=[],labels=new Map();
 const priority=id=>id===selected?0:id==='sun'?1:2;
 const ordered=[...objects].sort((a,b)=>priority(a.id)-priority(b.id));
 for(const object of ordered){
  const {id,x,y,name}=object,width=(name.length*7+6)*units,height=16*units;
  const candidates=[{dx:10*units,dy:-9*units},{dx:10*units,dy:20*units},{dx:-width-10*units,dy:-9*units},{dx:-width-10*units,dy:20*units},{dx:10*units,dy:-28*units}];
  for(const {dx,dy} of candidates){
   const box={left:x+dx,top:y+dy-height,right:x+dx+width,bottom:y+dy+3*units};
   if(box.left<bounds.left||box.right>bounds.right||box.top<bounds.top||box.bottom>bounds.bottom)continue;
   if(occupied.some(b=>box.left<b.right+4*units&&box.right>b.left-4*units&&box.top<b.bottom+4*units&&box.bottom>b.top-4*units))continue;
   if(objects.some(o=>o.id!==id&&o.x>box.left-5*units&&o.x<box.right+5*units&&o.y>box.top-5*units&&o.y<box.bottom+5*units))continue;
   labels.set(id,{dx,dy,box});occupied.push(box);break;
  }
 }
 return labels;
}
