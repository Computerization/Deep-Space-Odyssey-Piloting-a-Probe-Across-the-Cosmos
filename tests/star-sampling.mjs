// Inspect the actual HDR sky pass before the display tone curve. A star must
// move across a pixel without losing flux, even at a one-pixel display ratio.
export async function measureStarSampling(page){
 return page.evaluate(async()=>{
  const T=await import('three'),w=__cosmos.world,r=w.renderer,width=640,height=400;
  const target=new T.WebGLRenderTarget(width,height,{type:T.HalfFloatType,depthBuffer:false}),cam=new T.PerspectiveCamera(58,width/height,.01,40000);
  const point=w.sky.children[0],pos=point.geometry.attributes.position;
  const brightest=w.starData.stars.reduce((a,b,i,s)=>b[2]<s[a][2]?i:a,0);
  cam.lookAt(new T.Vector3().fromBufferAttribute(pos,brightest));const base=cam.quaternion.clone();
  const u=w.starMaterial.uniforms,ratio=u.pixelRatio.value,visibility=u.visibility.value,prior=r.getRenderTarget(),out=[];
  try{
   u.pixelRatio.value=1;u.visibility.value=1;r.setRenderTarget(target);
   for(const shift of [-.45,-.17,0,.22,.45]){
    cam.quaternion.copy(base);cam.rotateY(Math.atan(shift*2*Math.tan(cam.fov*Math.PI/360)/height));
    r.clear();r.render(w.sky,cam);const pixels=new Uint16Array(16*16*4);r.readRenderTargetPixels(target,width/2-8,height/2-8,16,16,pixels);
    let flux=0,moment=0;for(let i=0;i<16*16;i++){const value=T.DataUtils.fromHalfFloat(pixels[i*4+1]);flux+=value;moment+=(i%16)*value;}
    out.push({shift,flux,centroid:moment/flux});
   }
  }finally{u.pixelRatio.value=ratio;u.visibility.value=visibility;r.setRenderTarget(prior);target.dispose();w.needsRender=true;}
  return out;
 });
}
