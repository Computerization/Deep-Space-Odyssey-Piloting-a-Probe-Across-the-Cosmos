const overlaps=(a,b,gap=8)=>a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
function crosses(leader,rect){
 let enter=0,leave=1;
 for(const [origin,delta,low,high]of [[leader.x1,leader.x2-leader.x1,rect.left-4,rect.right+4],[leader.y1,leader.y2-leader.y1,rect.top-4,rect.bottom+4]]){
  if(Math.abs(delta)<1e-8){if(origin<low||origin>high)return false;continue;}
  const a=(low-origin)/delta,b=(high-origin)/delta;
  enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));if(enter>leave)return false;
 }
 return enter<=leave;
}
const directions=[['right',0],['left',Math.PI],['above',-Math.PI/2],['below',Math.PI/2]];
for(let i=0;i<24;i++)if(i%6)directions.push([`rim-${i}`,i*Math.PI/12]);
const normals=directions.map(([side,a])=>({side,nx:Math.cos(a),ny:Math.sin(a)}));
// A narrow gap between a clipped limb and text can be less than a degree
// wide. Search these only after the coarse directions fail, then reuse the
// selected direction on subsequent frames.
const fineNormals=Array.from({length:360},(_,i)=>({side:`fine-${i}`,nx:Math.cos(i*Math.PI/180),ny:Math.sin(i*Math.PI/180)})).filter((_,i)=>i%15);
const bySide=new Map([...normals,...fineNormals].map(n=>[n.side,n]));

// When the visible limb lies behind a control, one corner can keep its leader
// clear. Stay outside the body's supporting tangent and inside the viewport.
function clearElbow(leader,avoid,rim,nx,ny,width,height){
 let best=null,length=Infinity;
 const corners=[{x:leader.x1,y:leader.y2},{x:leader.x2,y:leader.y1}];
 for(const r of avoid)for(const x of [r.left-8,r.right+8])for(const y of [r.top-8,r.bottom+8])corners.push({x,y});
 for(const {x,y} of corners){
  if(x<0||x>width||y<0||y>height||(x-rim.x)*nx+(y-rim.y)*ny<7)continue;
  const first={...leader,x2:x,y2:y},last={...leader,x1:x,y1:y};
  if(avoid.some(a=>crosses(first,a)||crosses(last,a)))continue;
  const distance=Math.hypot(x-leader.x1,y-leader.y1)+Math.hypot(leader.x2-x,leader.y2-y);
  if(distance<length){best={x,y};length=distance;}
 }
 return best;
}

// Keep the label outside the perspective silhouette and its leader attached
// to the visible limb. Extra clearance makes room for nearby flight controls.
export function bearingLayout({x,y,radius,ellipse,width,height,labelWidth,labelHeight,avoid=[],preferred=null}){
 const gutter=Math.max(24,width*.04),bounds={left:gutter,right:width-gutter,top:118,bottom:height-115},gap=25;
 const {major=radius,minor=radius,angle=0}=ellipse||{},c=Math.cos(angle),s=Math.sin(angle);
 const dock=()=>({side:'docked',left:bounds.right-labelWidth,top:bounds.top+20,leader:null});
 // If every corner is inside the ellipse there is no on-screen limb. The
 // same dock is the only possible result, including extreme close views.
 const inside=(u,v)=>((u*c+v*s)/major)**2+((v*c-u*s)/minor)**2<1;
 if(inside(-x,-y)&&inside(width-x,-y)&&inside(-x,height-y)&&inside(width-x,height-y))return dock();
 function place({side,nx,ny},allowElbow=false){
  const u=c*nx+s*ny,v=-s*nx+c*ny,support=Math.hypot(major*u,minor*v);
  const px=major*major*u/Math.max(support,1e-8),py=minor*minor*v/Math.max(support,1e-8);
  const rim={x:x+c*px-s*py,y:y+s*px+c*py};
  if(rim.x<0||rim.x>width||rim.y<0||rim.y>height)return null;
  // Every point in the label lies beyond this supporting tangent.
  let offset=gap+Math.abs(nx)*labelWidth/2+Math.abs(ny)*labelHeight/2;
  let maximum=Infinity;
  for(const [origin,direction,low,high] of [[rim.x,nx,bounds.left+labelWidth/2,bounds.right-labelWidth/2],[rim.y,ny,bounds.top+labelHeight/2,bounds.bottom-labelHeight/2]]){
   if(Math.abs(direction)<1e-8){if(origin<low||origin>high)return null;continue;}
   const a=(low-origin)/direction,b=(high-origin)/direction;
   offset=Math.max(offset,Math.min(a,b)+1e-6);maximum=Math.min(maximum,Math.max(a,b));
  }
  // Move to the exit of each obstructing rectangle rather than guessing a
  // fixed clearance. Progress is monotonic along the supporting normal, so
  // each interface rectangle can be left at most once.
  for(let step=0;step<=avoid.length;step++){
   if(offset>maximum)return null;
   const left=rim.x+nx*offset-labelWidth/2,top=rim.y+ny*offset-labelHeight/2;
   const candidate={side,left,top,right:left+labelWidth,bottom:top+labelHeight,rim};
   if(left<bounds.left||candidate.right>bounds.right||top<bounds.top||candidate.bottom>bounds.bottom)return null;
   let next=offset;
   for(const a of avoid)if(overlaps(candidate,a)){
    const tx=Math.abs(nx)<1e-8?Infinity:((nx>0?a.right+8+labelWidth/2:a.left-8-labelWidth/2)-rim.x)/nx;
    const ty=Math.abs(ny)<1e-8?Infinity:((ny>0?a.bottom+8+labelHeight/2:a.top-8-labelHeight/2)-rim.y)/ny;
    next=Math.max(next,Math.min(tx,ty)+1);
   }
   if(next===offset){
    const edge=Math.min(labelWidth/(2*Math.max(Math.abs(nx),1e-8)),labelHeight/(2*Math.max(Math.abs(ny),1e-8))),end=offset-edge-8;
    const leader={x1:rim.x+nx*7,y1:rim.y+ny*7,x2:rim.x+nx*end,y2:rim.y+ny*end};
    if(avoid.some(a=>crosses(leader,a))){
     if(!allowElbow)return null;
     leader.elbow=clearElbow(leader,avoid,rim,nx,ny,width,height);
     if(!leader.elbow)return null;
    }
    return {...candidate,leader};
   }
   offset=next;
  }
  return null;
 }
 // Check the previous direction first, then stop at the first available
 // placement. Ordinary full-disc views need only one candidate evaluation.
 const current=bySide.get(preferred);
 if(current){const p=place(current,true);if(p)return p;}
 for(const normal of normals){if(normal===current)continue;const p=place(normal);if(p)return p;}
 for(const normal of fineNormals){if(normal===current)continue;const p=place(normal);if(p)return p;}
 // Prefer every available straight leader before routing around a control.
 for(const normal of [...normals,...fineNormals]){const p=place(normal,true);if(p)return p;}
 return dock();
}
