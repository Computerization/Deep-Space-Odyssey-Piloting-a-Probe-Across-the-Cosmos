import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const outcomes=[],dpr=Number(process.env.COSMOS_COMPOSITE_DPR||2),cloudScale=Number(process.env.COSMOS_CLOUD_SCALE||1),tag=process.env.COSMOS_COMPOSITE_TAG||'';
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
if(process.env.COSMOS_COMPOSITE_ENGINE&&!process.env.COSMOS_COMPOSITE_ENGINE.split(',').includes(name))continue;
const browser=await engine.launch(options);
const page=await browser.newPage({viewport:{width:1000,height:625},deviceScaleFactor:dpr}),errors=[],views=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 await page.evaluate(async cloudScale=>{const a=window.__cosmos,w=a.world,{CloudLayer}=await import('/tests/fixtures/cloud-layer-v22.js');a.game.mode='panel';w.setQuality('high');w.ratio=2;w.cloudScale=cloudScale;w.resize();window.newComposite=w.cloudLayer;window.oldComposite=new CloudLayer(w.bodies.earth.clouds,w.bodies.earth.atmosphere);document.getElementById('hud').hidden=true;window.compositePixels={};},cloudScale);
 for(const [label,radius,phase,view] of [['day',2.35,35,'probe'],['terminator',2.35,90,'probe'],['crescent',2.35,150,'probe'],['night',2.35,175,'probe'],['close',1.08,90,'probe'],['chase',2.35,35,'chase'],['occlusion',2.35,35,'probe'],['capture',2.35,35,'probe']]){
  await page.evaluate(async({label,radius,phase,view})=>{
   const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0);a.game.mode='panel';a.game.timePaused=true;a.game.view=view;
   const c=w.bodyPositions.earth,sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize(),p=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180)).multiplyScalar(6371*radius).add(c);
   a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0)));w.followReady=false;w.capturing=label==='capture';if(label==='occlusion')w.bodyPositions.moon.copy(p).lerp(c,.45);
  },{label,radius,phase,view});
  const counts={};
  for(const mode of ['base','current']){
   const result=await page.evaluate(({mode,view,name})=>{const a=window.__cosmos,w=a.world;w.cloudLayer=mode==='base'?oldComposite:newComposite;
    w.update(a.game.player,0,{view,exposure:1,look:a.game.look});
    w.update(a.game.player,0,{view,exposure:1,look:a.game.look});
    const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const x=c.getContext('2d');x.drawImage(w.canvas,0,0);window.compositePixels[mode]=x.getImageData(0,0,c.width,c.height).data;
    return {png:name==='Chrome'?w.canvas.toDataURL().split(',')[1]:null,drawCalls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,frameSamples:w.frameTarget.samples};},{mode,view,name});
   counts[mode]={drawCalls:result.drawCalls,triangles:result.triangles,frameSamples:result.frameSamples};if(result.png)await fs.writeFile(`tests/screenshots/v35-composite${tag}-${label}-${mode}.png`,Buffer.from(result.png,'base64'));
  }
  const metrics=await page.evaluate(async()=>{const t=await import('three'),w=window.__cosmos.world,bod=w.bodies.earth,flatten=bod.uniforms.flatten.value,origin=bod.uniforms.localCamera.value.clone().divide(new t.Vector3(1,flatten,1)),size=w.canvas;const hit=(x,y)=>{const d=new t.Vector3((x+.5)/size.width*2-1,1-(y+.5)/size.height*2,.5).unproject(w.camera).normalize().applyQuaternion(bod.inverseOrientation).divide(new t.Vector3(1,flatten,1)).normalize();const along=origin.dot(d);return along*along-origin.lengthSq()+1.00143*1.00143;};let edgeDistancePx=0;const a=compositePixels.base,b=compositePixels.current;let sum=0,sq=0,max=0,changed=0,overOne=0;const histogram=new Uint32Array(256);let channels=0;for(let i=0;i<a.length;i++)if(i%4!==3){const e=Math.abs(a[i]-b[i]);sum+=e;sq+=e*e;max=Math.max(e,max);if(e)changed++;if(e>1){overOne++;const pixel=Math.floor(i/4),x=pixel%size.width,y=Math.floor(pixel/size.width),v=hit(x,y),gradient=Math.hypot(hit(x+1,y)-v,hit(x,y+1)-v);edgeDistancePx=Math.max(edgeDistancePx,Math.abs(v)/Math.max(gradient,1e-10));}histogram[e]++;channels++;}let total=0,p99=0;for(let i=0;i<256;i++){total+=histogram[i];if(total>=channels*.99){p99=i;break;}}return {mean:sum/channels,rmse:Math.sqrt(sq/channels),max,p99,changed,overOne,channels,edgeDistancePx};});
  // The merged pass clips to the analytic cloud sphere; the older two-pass
  // reference clips to tessellated mesh coverage. Darker air exposes this
  // existing subpixel difference. Bound its extent as well as total error.
  assert.ok(metrics.mean<.02&&metrics.p99<=1&&metrics.overOne/metrics.channels<.0001&&metrics.edgeDistancePx<.25,JSON.stringify({name,label,metrics}));if(label==='capture')assert.equal(metrics.max,0);
  if(counts.current.frameSamples>0||cloudScale<1)assert.equal(metrics.max,0);
  assert.equal(counts.current.drawCalls,counts.base.drawCalls-(label==='capture'||counts.current.frameSamples>0||cloudScale<1?0:1));
  views.push({label,radius,phase,view,counts,metrics});console.log({name,label,mean:metrics.mean,max:metrics.max,drawCalls:counts});
 }
 assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),views,errors,passed:true});
}finally{await browser.close();}

await fs.writeFile(`tests/cloud-composite-v35${tag}-results.json`,JSON.stringify({version:'0.35.0',viewport:[1000,625],dpr,cloudScale,outcomes},null,2));
}
