import * as THREE from 'three';

// The 64K surface and 32K cloud sources stay on disk. One camera-local patch and eight decoded
// tiles per layer bound residency. The same loader serves clouds and surface colour.
const EDGE=2048, PAD=8, COLS=16, FIRST=1, LAST=6;
export class CloudDetail {
 constructor(world,{surface=false}={}){
  this.world=world;this.body=world.bodies.earth;this.uniforms=this.body.uniforms;
  this.surface=surface;this.cols=surface?32:COLS;this.rows=this.cols/2;this.wrap=x=>((x%this.cols)+this.cols)%this.cols;this.first=surface?0:FIRST;this.last=surface?15:LAST;this.prefix=surface?'surfacePatch':'cloudPatch';this.grid=2;this.enabled=world.renderer.capabilities.maxTextureSize>=4096;
  this.cache=new Map();this.active=null;this.pending=null;this.wanted=null;
  this.failedUntil=0;this.loads=0;this.origin=new THREE.Vector3();this.direction=new THREE.Vector3();this.hit=new THREE.Vector3();
 }
 target(){
  const w=this.world,b=this.body,c=w.camera;
  if(!this.enabled||!b.group.visible)return null;
  this.origin.copy(b.uniforms.localCamera.value);this.origin.y/=b.data.flatten;
  // Use the nearest visible point when the centre ray is above the limb.
  const projected=this.hit.copy(b.group.position).project(c);
  if(projected.z>1)return null;
  this.direction.set(Math.max(-.85,Math.min(.85,projected.x)),Math.max(-.85,Math.min(.85,projected.y)),-1);
  if(Math.abs(projected.x)<1&&Math.abs(projected.y)<1)this.direction.set(0,0,-1);
  this.direction.unproject(c).normalize().applyQuaternion(b.inverseOrientation);
  this.direction.y/=b.data.flatten;this.direction.normalize();
  const along=this.origin.dot(this.direction),disc=along*along-this.origin.lengthSq()+1.00143**2;
  if(disc<=0||along>=0)return null;
  const distance=-along-Math.sqrt(disc),baseWidth=Math.min(w.textures[this.surface?this.body.data.map:'earth-clouds.avif'].image.width,w.renderer.capabilities.maxTextureSize);
  const span=distance*2*Math.tan(c.fov*Math.PI/360);
  const footprint=span/w.frameTarget.height*baseWidth/(2*Math.PI);
  // Refine the visible centre even when a wide view extends past the patch.
  // The shader blends its boundary back into the overview; requiring the
  // entire screen to fit delayed real detail until the camera was too close.
  if(distance<0||footprint>1.3)return null;
  this.hit.copy(this.origin).addScaledVector(this.direction,distance).normalize();
  const u=((Math.atan2(this.hit.z,-this.hit.x)/(2*Math.PI)+b.uniforms.rotation.value)%1+1)%1;
  const v=Math.asin(Math.max(-1,Math.min(1,this.hit.y)))/Math.PI+.5;
  if(!this.surface&&Math.abs(v-.5)>1/3)return null;
  const tx=u*this.cols,ty=(1-v)*this.rows;
  // Keep a half-tile margin around the gaze before changing patch origins.
  if(this.active){const x=this.wrap(tx-this.active.x),y=ty-this.active.y,margin=.4;
   if(x>margin&&x<this.grid-margin&&y>margin&&y<this.grid-margin)return this.active;
  }
  const x=this.wrap(Math.floor(tx-(this.grid-1)*.5)),y=Math.max(this.first,Math.min(this.last-this.grid+1,Math.floor(ty-(this.grid-1)*.5)));
  return {x,y,key:`${x}-${y}`};
 }
 async tile(x,y){
  const key=`${x}-${y}`;
  if(this.cache.has(key)){const image=this.cache.get(key);this.cache.delete(key);this.cache.set(key,image);return image;}
  // Reserve the decode slot before awaiting another image. This also bounds
  // residency while a new patch is being assembled, not only after it loads.
  if(this.cache.size>=8){const oldest=this.cache.keys().next().value;this.cache.get(oldest).close();this.cache.delete(oldest);}
  const response=await fetch(`assets/textures/${this.surface?'earth-detail':'cloud-detail'}/${String(x).padStart(2,'0')}-${String(y).padStart(2,'0')}.avif`);
  if(!response.ok)throw Error('Regional tile unavailable');
  const image=await createImageBitmap(await response.blob(),{colorSpaceConversion:this.surface?'default':'none'});
  const pad=this.surface?0:PAD;
  if(image.width!==EDGE+2*pad||image.height!==EDGE+2*pad){image.close();throw Error('Invalid regional tile');}
  this.cache.set(key,image);return image;
 }
 async load(target){
  this.pending=target.key;
  try{
   const tiles=[];
   for(let y=0;y<this.grid;y++)for(let x=0;x<this.grid;x++)tiles.push({x,y,image:await this.tile(this.wrap(target.x+x),target.y+y)});
   // A camera move can supersede an in-flight request. Keep useful decoded
   // tiles, but never replace the current patch with that obsolete result.
   if(this.wanted?.key!==target.key)return;
   const previous=this.active;
   const canvas=previous?.texture.image||document.createElement('canvas');
   if(!previous)canvas.width=canvas.height=EDGE*this.grid;
   const context=canvas.getContext('2d');
   for(const {x,y,image}of tiles)context.drawImage(image,this.surface?0:PAD,this.surface?0:PAD,EDGE,EDGE,x*EDGE,y*EDGE,EDGE,EDGE);
   // Keep one canvas, texture and GPU allocation across patch changes. All
   // interiors are opaque and cover the canvas; the next draw updates its mips.
   const texture=previous?.texture||new THREE.CanvasTexture(canvas);
   texture.format=this.surface?THREE.RGBAFormat:THREE.RedFormat;texture.colorSpace=this.surface?THREE.SRGBColorSpace:THREE.NoColorSpace;texture.anisotropy=this.surface?Math.min(16,this.world.renderer.capabilities.getMaxAnisotropy()):1;texture.needsUpdate=true;
   this.uniforms[this.prefix+'Map'].value=texture;
   this.uniforms[this.prefix+'Region'].value.set(target.x/this.cols,1-(target.y+this.grid)/this.rows,this.grid/this.cols,this.grid/this.rows);
   const overlap=previous&&Math.min(this.wrap(target.x-previous.x),this.wrap(previous.x-target.x))<this.grid&&Math.abs(target.y-previous.y)<this.grid;
   this.readyAt=performance.now()-(overlap?300:0);this.active={...target,texture};this.loads++;
   this.world.needsRender=true;
  }catch{this.failedUntil=performance.now()+5000;}
  finally{
   this.pending=null;this.world.needsRender=true;
  }
 }
 update(){
  this.wanted=this.target();
  if(this.wanted&&this.wanted.key!==this.active?.key&&!this.pending&&performance.now()>=this.failedUntil)this.load(this.wanted);
  if(this.active){
   const weight=Math.min(1,(performance.now()-this.readyAt)/300);
   this.uniforms[this.prefix+'Weight'].value=this.wanted?weight*weight*(3-2*weight):0;
   if(weight<1)this.world.needsRender=true;
  }
 }
}
