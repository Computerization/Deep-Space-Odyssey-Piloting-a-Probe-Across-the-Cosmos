import * as THREE from 'three';
import {outline} from './spacecraft-outline.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

// The source reflector has 48 azimuth sectors. Split each triangle once,
// bending only edges between vertices on the rotational bowl/rim. Preserve
// the source meridian, separate UV islands, support hardware and flight mesh.
function inspectionReflector(source){
 const {position:p,normal:n,uv}=source.attributes,index=source.index.array;
 const coordinates=Array.from(p.array),normals=Array.from(n.array),texels=Array.from(uv.array),faces=[],shared=new Map();
 const angle=i=>Math.atan2(p.getZ(i),p.getX(i));
 const sector=Math.PI/24;
 const onBowl=i=>p.getY(i)<.13&&Math.hypot(p.getX(i),p.getZ(i))>.30&&Math.abs(angle(i)/sector-Math.round(angle(i)/sector))<.002;
 const middle=(a,b)=>{
  const key=Math.min(a,b)*p.count+Math.max(a,b);if(shared.has(key))return shared.get(key);
  let x=(p.getX(a)+p.getX(b))*.5,z=(p.getZ(a)+p.getZ(b))*.5;
  const y=(p.getY(a)+p.getY(b))*.5,delta=angle(b)-angle(a);
  if(onBowl(a)&&onBowl(b)&&Math.cos(delta)>=Math.cos(sector+.0001)){
   const radius=(Math.hypot(p.getX(a),p.getZ(a))+Math.hypot(p.getX(b),p.getZ(b)))*.5;
   const phi=angle(a)+.5*Math.atan2(Math.sin(delta),Math.cos(delta));x=radius*Math.cos(phi);z=radius*Math.sin(phi);
  }
  const i=coordinates.length/3;shared.set(key,i);coordinates.push(x,y,z);
  const nx=n.getX(a)+n.getX(b),ny=n.getY(a)+n.getY(b),nz=n.getZ(a)+n.getZ(b),len=Math.hypot(nx,ny,nz)||1;
  normals.push(nx/len,ny/len,nz/len);texels.push((uv.getX(a)+uv.getX(b))*.5,(uv.getY(a)+uv.getY(b))*.5);return i;
 };
 for(let i=0;i<index.length;i+=3){const a=index[i],b=index[i+1],c=index[i+2],ab=middle(a,b),bc=middle(b,c),ca=middle(c,a);faces.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);}
 const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(coordinates,3));result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));result.setAttribute('uv',new THREE.Float32BufferAttribute(texels,2));result.setIndex(faces);return result;
}

// Targets are in the unscaled NASA GLB's local coordinates, not flight space.
const plates=[
 {name:'The spacecraft',text:'The dish points towards Earth. The long, thin boom holds magnetic sensors away from the spacecraft’s electronics.',at:[0,0,0],angle:-.40,tilt:.50,span:10},
 {name:'High-gain antenna',text:'The 3.7-metre dish sends science data home and receives commands from Earth.',at:[0,1.28,0],angle:-.92,tilt:.88,span:4.9},
 {name:'Imaging platform',text:'The wide-angle camera took in the planetary scene; the narrow-angle camera resolved finer detail. Both rode on a steerable platform.',at:[0,.45,-3.55],angle:-2.22,tilt:.27,span:2.9},
 {name:'Electrical power',text:'Three radioisotope generators turn heat from decaying plutonium into electricity, far beyond reliable sunlight.',at:[0,-.1,3.44],angle:-1.02,tilt:.24,span:3.5},
 {name:'Magnetometer boom',text:'Two sensors along this 13-metre boom help distinguish the surrounding magnetic field from the spacecraft’s own.',at:[0,8.4,11.95],angle:-1.08,tilt:.25,span:2.9}
];
export function createSpacecraftPlate(world,ui){
 const stage=ui('craft-stage'),buttons=[...ui('craft-views').querySelectorAll('button')],camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,120);
 let selection=0,yaw,pitch,zoom,drag=null,dirty=true,scene=null,environment=null,refined=null,key=null;
 const target=new THREE.Vector3(),direction=new THREE.Vector3();
 function select(i){selection=i;const p=plates[i];yaw=p.angle;pitch=p.tilt;zoom=1;target.fromArray(p.at);dirty=true;
  buttons.forEach((b,j)=>b.setAttribute('aria-pressed',String(j===i)));ui('craft-number').textContent=`FIG. 0${i+1} / 0${plates.length}`;ui('craft-title').textContent=p.name;ui('craft-caption').textContent=p.text;
 }
 buttons.forEach((b,i)=>b.addEventListener('click',()=>select(i)));select(0);
 const turn=(dx,dy)=>{yaw+=dx;pitch=THREE.MathUtils.clamp(pitch+dy,-1.45,1.45);dirty=true;};
 const magnify=f=>{zoom=THREE.MathUtils.clamp(zoom*f,.65,3);dirty=true;};
 stage.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;stage.focus();stage.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY};});
 stage.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;turn((drag.x-e.clientX)*.009,(e.clientY-drag.y)*.007);drag.x=e.clientX;drag.y=e.clientY;});
 stage.addEventListener('lostpointercapture',()=>{drag=null;});
 stage.addEventListener('wheel',e=>{e.preventDefault();magnify(Math.exp(-Math.sign(e.deltaY)*.12));},{passive:false});
 stage.addEventListener('keydown',e=>{switch(e.key){case 'ArrowLeft':turn(-.13,0);break;case 'ArrowRight':turn(.13,0);break;case 'ArrowUp':turn(0,.13);break;case 'ArrowDown':turn(0,-.13);break;case '+':case '=':magnify(1.15);break;case '-':magnify(1/1.15);break;case 'Home':select(selection);break;case 'Escape':ui('landing').querySelector('.launch-actions .primary').focus();break;default:return;}e.preventDefault();e.stopPropagation();});
 new ResizeObserver(()=>{dirty=true;}).observe(stage);ui('landing').addEventListener('scroll',()=>{dirty=true;},{passive:true});
 function release(){if(!scene)return;refined?.dispose();environment?.dispose();key.shadow.dispose();key=refined=environment=scene=null;drag=null;dirty=true;world.needsRender=true;}
 world.canvas.addEventListener('webglcontextrestored',release);
 function prepare(){
  scene=new THREE.Scene();const model=world.ship.children[0].clone(true);model.position.set(0,0,0);model.scale.setScalar(1);
  model.traverse(mesh=>{if(!mesh.isMesh)return;mesh.castShadow=mesh.receiveShadow=mesh.material.name!=='clear';if(mesh.material.name==='tex_02_AO'){refined=inspectionReflector(mesh.geometry);mesh.geometry=refined;}});scene.add(model);
  const room=new RoomEnvironment();environment=world.pmrem.fromScene(room,0,.1,100,{size:64});room.dispose();scene.environment=environment.texture;scene.environmentIntensity=.65;
  key=new THREE.DirectionalLight(0xfff4e1,2.4);key.position.set(-12,20,10);key.target.position.set(0,2,2);
  // The craft and studio light stay still while the camera orbits. Render the
  // fine support shadows once per visit and release their map on departure.
  key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:50});key.shadow.camera.updateProjectionMatrix();key.shadow.normalBias=.008;key.shadow.autoUpdate=false;key.shadow.needsUpdate=true;scene.add(key,key.target);
  const edge=new THREE.DirectionalLight(0xc0d9ff,1.3);edge.position.set(4,3,-4);scene.add(edge);
 }
 function render(){
  if(!dirty&&!world.needsRender)return;
  const box=stage.getBoundingClientRect();if(box.width<1||box.height<1)return;
  if(!scene)prepare();
  const aspect=box.width/box.height,span=plates[selection].span;
  let half=span*.5/Math.min(aspect,1.65);
  if(selection===0){
   const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);let l=Infinity,r=-Infinity,b=Infinity,t=-Infinity;
   for(let i=0;i<outline.length;i+=3){const x=outline[i],y=outline[i+1],z=outline[i+2],u=cy*x-sy*z,v=cp*y-sp*(sy*x+cy*z);l=Math.min(l,u);r=Math.max(r,u);b=Math.min(b,v);t=Math.max(t,v);}
   const u=(l+r)*.5,v=(b+t)*.5;target.set(cy*u-sy*sp*v,cp*v,-sy*u-cy*sp*v);half=.56*Math.max((r-l)/aspect,t-b);
  }
  half/=zoom;
  camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
  direction.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));camera.position.copy(target).addScaledVector(direction,42);camera.lookAt(target);
  const r=world.renderer,t=world.frameTarget,rx=t.width/innerWidth,ry=t.height/innerHeight;
  t.viewport.set(Math.round(box.left*rx),Math.round((innerHeight-box.bottom)*ry),Math.round(box.width*rx),Math.round(box.height*ry));
  try{r.setRenderTarget(t);r.clear();r.render(scene,camera);}finally{t.viewport.set(0,0,t.width,t.height);r.setRenderTarget(null);}
  const exposure=r.toneMappingExposure;r.toneMappingExposure=1;r.clear();r.render(world.resolveScene,world.resolveCamera);r.toneMappingExposure=exposure;
  dirty=false;world.needsRender=false;
 }
 return {render,release};
}
