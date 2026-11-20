import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discFraming,annulusFraming} from '../src/view-framing.js';
import {ExperienceGuide,restoreExperience,scienceTopic} from '../src/experience-guide.js';
const rad=d=>d*Math.PI/180;
function projected(x,y,z,fov=60,aspect=1.6){
 const n=Math.hypot(x,y,z);x/=n;y/=n;z/=n;
 const tan=Math.tan(rad(fov/2));
 return{x:x/(Math.max(Math.abs(z),.0001)*tan*aspect),y:y/(Math.max(Math.abs(z),.0001)*tan),angle:Math.acos(z),distance:100,front:z>0};
}
test('a visible planetary limb remains framed with its centre outside the viewport',()=>{
 const view=projected(0,Math.sin(rad(36)),Math.cos(rad(36)));
 assert.ok(view.y>1);
 assert.equal(discFraming(view,100*Math.sin(rad(10)),60,1.6).visible,true);
 assert.equal(discFraming(view,100*Math.sin(rad(5)),60,1.6).visible,false);
});
test('vertical edges and rectangular corners reject invisible subjects',()=>{
 assert.equal(discFraming(projected(0,1,1),10,60,1.6).visible,false);
 const tx=Math.tan(rad(30))*1.6,ty=Math.tan(rad(30));
 const view=projected(tx+.1,ty+.1,1);
 const frame=discFraming(view,100*Math.sin(rad(3)),60,1.6);
 assert.ok(frame.separation>rad(3));assert.equal(frame.visible,false);
 assert.equal(discFraming(projected(0,0,-1),99,60,1.6).visible,false);
});
test('framing follows lens and viewport instead of a fixed angular threshold',()=>{
 const view=projected(1,0,1,60,1.6);
 assert.equal(discFraming(view,5,60,1.6).visible,true);
 assert.equal(discFraming(projected(1,0,1,30,1.6),5,30,1.6).visible,false);
 assert.equal(discFraming(projected(1,0,1,60,.7),5,60,.7).visible,false);
});
test('partial-body bounds meet the physical tangent rays instead of drifting away from the limb',()=>{
 const angle=rad(-35),size=rad(24),fov=58;
 const frame=discFraming(projected(0,Math.sin(angle),Math.cos(angle),fov),100*Math.sin(size),fov,1.6);
 assert.ok(frame.bounds);const b=frame.bounds,tan=Math.tan(rad(fov/2));
 assert.ok(Math.abs(b.y-b.halfHeight-Math.tan(angle-size)/tan)<1e-12);
 assert.ok(Math.abs(b.y+b.halfHeight-Math.tan(angle+size)/tan)<1e-12);
 assert.equal(discFraming(projected(0,1,0),50,60,1.6).bounds,null);
});
const reading={chapter:0,subject:{id:'earth',radii:2.4},enabled:true,time:20,steady:true};
test('looking away dismisses science and preserves an interrupted note for a later visit',()=>{
 const g=new ExperienceGuide(),state=restoreExperience();
 g.update(state,reading,1);assert.ok(g.update(state,reading,1).note);
 assert.equal(state.seen.length,0);
 assert.equal(g.update(state,{...reading,subject:null},.1).note,null);
 assert.equal(g.update(state,reading,1).note,null);
 assert.ok(g.update(state,reading,1).note);
 for(let i=0;i<4;i++)g.update(state,reading,1);
 assert.deepEqual(state.seen,['0:0']);
 assert.equal(g.update(state,{...reading,subject:{id:'moon'}},.1).note,null);
});
test('hidden guidance neither accumulates dwell nor marks a note as read',()=>{
 const g=new ExperienceGuide(),state=restoreExperience();
 for(let i=0;i<20;i++)g.update(state,{...reading,enabled:false},1);
 assert.deepEqual(state.seen,[]);assert.equal(g.update(state,reading,.1).note,null);
 g.update(state,reading,2);g.update(state,reading,1);
 assert.equal(g.update(state,{...reading,enabled:false},1).note,null);
 assert.deepEqual(state.seen,[]);
});
test('revisiting an encounter keeps a hidden, unread science note available',()=>{
 const guide=new ExperienceGuide(),state=restoreExperience();
 guide.update(state,reading,2);guide.update(state,reading,1);
 assert.ok(guide.active);assert.deepEqual(state.seen,[]);
 // A same-chapter restart shows its invitation again. Hidden reading must
 // not finish in the background, and the note must return afterward.
 for(let time=0;time<12;time++)assert.equal(guide.update(state,{...reading,time},1).note,null);
 assert.deepEqual(state.seen,[]);
 assert.ok(guide.update(state,{...reading,time:12},1).note);
 for(let i=0;i<3;i++)guide.update(state,reading,1);
 assert.deepEqual(state.seen,[]);
 guide.update(state,reading,1);assert.deepEqual(state.seen,['0:0']);
 // An actually read note stays read when the encounter is revisited.
 for(let time=0;time<40;time++)guide.update(state,{...reading,time},1);
 assert.equal(guide.active,null);assert.deepEqual(state.seen,['0:0']);
});
test('the rotated silhouette ellipse lies on independent spherical tangent rays',()=>{
 const n=[.55,-.45,.7],length=Math.hypot(...n);for(let i=0;i<3;i++)n[i]/=length;
 const radius=32,fov=58,aspect=1.6,frame=discFraming(projected(...n,fov,aspect),radius,fov,aspect),e=frame.ellipse,b=frame.bounds;
 assert.ok(e.major>=e.minor&&e.minor>0);
 const ty=Math.tan(rad(fov/2));
 for(let i=0;i<32;i++){
  const a=i*Math.PI/16,u=e.major*Math.cos(a),v=e.minor*Math.sin(a);
  const px=b.x*aspect+Math.cos(e.angle)*u-Math.sin(e.angle)*v;
  const py=-b.y+Math.sin(e.angle)*u+Math.cos(e.angle)*v;
  const ray=[px*ty,-py*ty,1],d=Math.hypot(...ray),cos=ray.reduce((sum,x,j)=>sum+x*n[j],0)/d;
  assert.ok(Math.abs(cos-Math.sqrt(1-(radius/100)**2))<1e-12);
 }
});

test('annulus framing distinguishes ring material, its central hole and its outer edge',()=>{
 const u=[1,0,0],v=[0,1,0],frame=(center,fov)=>annulusFraming(center,u,v,1,2,fov,1);
 assert.equal(frame([0,0,10],6).visible,false,'viewport fits inside the hole');
 assert.equal(frame([0,0,10],10).visible,true,'only viewport corners meet the ring');
 assert.equal(frame([-1.5,0,10],6).visible,true,'ring-only close view');
 assert.equal(frame([-3,0,10],6).visible,false,'past the outer edge');
 assert.equal(frame([0,0,-10],60).visible,false,'behind the camera');
});
test('a ring plane does not behave like its enclosing sphere',()=>{
 const frame=annulusFraming([0,1.5,10],[1,0,0],[0,0,1],1,2,6,1);
 assert.equal(frame.visible,false,'camera cone passes below the ring plane');
 assert.equal(annulusFraming([0,0,10],[1,0,0],[0,0,1],1,2,60,1).visible,false,'exactly edge-on has zero projected area');
 assert.equal(annulusFraming([0,.3,.4],[1,0,0],[0,0,1],1,2,120,1).visible,true,'visible portion crosses the camera plane');
});
test('annulus clipping retains independently sampled rays under tilt, roll and scaling',()=>{
 const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 let sampledVisible=0,empty=0;
 for(let i=0;i<96;i++){
  const theta=i%9*Math.PI/18,roll=i%7*Math.PI/7,c=Math.cos(roll),s=Math.sin(roll),rotate=p=>[p[0]*c-p[1]*s,p[0]*s+p[1]*c,p[2]];
  const u=rotate([Math.cos(theta),0,-Math.sin(theta)]),v=rotate([0,1,0]),center=[i%7-3,i%5-2,i%4===0?-3:2+i%8],fov=8+i%6*8,aspect=1.6;
  const frame=annulusFraming(center,u,v,1,2,fov,aspect),normal=cross(u,v),offset=dot(normal,center),ty=Math.tan(rad(fov/2));
  let hits=0;
  for(let y=0;y<=32;y++)for(let x=0;x<=48;x++){
   const ray=[(2*x/48-1)*ty*aspect,(2*y/32-1)*ty,1],denominator=dot(normal,ray);
   if(Math.abs(denominator)<1e-10)continue;
   const distance=offset/denominator;if(distance<=0)continue;
   const point=ray.map((r,j)=>r*distance-center[j]),radius=Math.hypot(dot(point,u),dot(point,v));
   if(radius>1.0001&&radius<1.9999)hits++;
  }
  if(hits){sampledVisible++;assert.ok(frame.visible,JSON.stringify({i,center,hits,frame}));}
  if(!frame.visible){empty++;assert.equal(hits,0);}
  for(const scale of [.01,100])assert.equal(annulusFraming(center.map(x=>x*scale),u.map(x=>x*scale),v.map(x=>x*scale),1,2,fov,aspect).visible,frame.visible);
 }
 assert.ok(sampledVisible>20&&empty>20,{sampledVisible,empty});
});

test('ring-only science describes the rings instead of an unseen planetary hemisphere',()=>{
 const saturn={id:'saturn',phase:140,ringElevation:25};
 assert.equal(scienceTopic(2,saturn),'saturn-ringshine');
 assert.equal(scienceTopic(2,{...saturn,feature:'rings'}),'2:0');
 assert.equal(scienceTopic(2,{...saturn,feature:'rings',ringElevation:5}),'2:1');
});

test('camera cone keeps its nearest edge and corner in every quadrant, including behind the camera',()=>{
 const fov=46,aspect=1.8,ty=Math.tan(rad(fov/2)),tx=ty*aspect;
 // Construct directions with known nearest rays: slide outward from the
 // right edge along its plane normal, or look past a corner from behind.
 const edge=[tx,ty*.4,1],edgeLen=Math.hypot(...edge),normalLen=Math.hypot(1,tx);
 const ray=edge.map((v,i)=>v/edgeLen*Math.cos(.23)+[1,0,-tx][i]/normalLen*Math.sin(.23));
 for(const sx of [-1,1])for(const sy of [-1,1]){
  const frame=(x,y,z)=>discFraming(projected(sx*x,sy*y,z,fov,aspect),10,fov,aspect);
  assert.ok(Math.abs(frame(...ray).separation-.23)<1e-12);
  const corner=Math.acos((2*tx+2*ty-1)/(3*Math.hypot(tx,ty,1)));
  assert.ok(Math.abs(frame(2,2,-1).separation-corner)<1e-12);
  assert.equal(frame(tx*.99,ty*.99,1).separation,0);
 }
});
