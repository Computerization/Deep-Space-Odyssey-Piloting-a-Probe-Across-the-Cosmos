import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const previous=await fs.readFile('tests/fixtures/cloud-v35.glsl','utf8');
const outcomes=[];
const cases=[['day',2.35,35],['terminator',2.35,90],['crescent',2.35,150],['night',2.35,175],['close',1.05,50],['grazing',1.08,90],['horizon',1.05,35,1.2],['edge',1.05,35,1.3],['close-left',1.05,50,-.001],['close-right',1.05,50,.001],['limb-left',1.05,35,1.199],['limb-right',1.05,35,1.201],['resolved-limb',1.05,35,1.2645,4],['resolved-cloud',1.05,50,0,20],['pole',2.35,90],['seam',2.35,150],['closest-ground',1.035,50,0,4],['closest-limb',1.035,35,1.30,4]];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_CLOUD_ENGINE&&process.env.COSMOS_CLOUD_ENGINE!==name)continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:800,height:500}}),errors=[],views=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
  await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,t=await import('three');a.game.mode='panel';w.setQuality('ultra');window.candidate=w.bodies.earth.clouds.material.fragmentShader;
   const material=w.bodies.earth.clouds.material.clone();material.uniforms=w.bodies.earth.clouds.material.uniforms;material.blending=t.NoBlending;material.transparent=false;material.depthTest=false;material.depthWrite=false;
   const mesh=new t.Mesh(w.bodies.earth.clouds.geometry,material);mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;const scene=new t.Scene();scene.add(mesh);
   window.numeric={material,mesh,scene,target:new t.WebGLRenderTarget(800,500,{type:t.HalfFloatType,depthBuffer:false}),lookup:Float32Array.from({length:65536},(_,i)=>t.DataUtils.fromHalfFloat(i))};
  });
  for(const [label,radius,phase,yaw=0,fov=58] of cases.filter(c=>!process.env.COSMOS_CLOUD_CLOSE_ONLY||c[0].startsWith('closest-'))){
   await page.evaluate(async({label,radius,phase,yaw,fov})=>{
    const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0);a.game.mode='panel';a.game.timePaused=true;w.setFov(fov);
    const c=w.bodyPositions.earth;if(label==='seam')c.copy(new t.Vector3(-149600000,0,0).applyQuaternion(w.bodies.earth.group.quaternion));
    const sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize(),p=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180)).multiplyScalar(6371*radius).add(c);
    if(label==='pole')p.copy(c).add(new t.Vector3(0,6371*radius,0).applyQuaternion(w.bodies.earth.group.quaternion));
    if(label==='seam')p.copy(c).add(new t.Vector3(6371*radius,0,0).applyQuaternion(w.bodies.earth.group.quaternion));
    a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,label==='pole'?new t.Vector3(0,0,1).applyQuaternion(w.bodies.earth.group.quaternion):new t.Vector3(0,1,0))).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),yaw));w.followReady=false;window.frames={};
   },{label,radius,phase,yaw,fov});
   const draws={};
   for(const mode of ['previous','candidate']){
    const r=await page.evaluate(({mode,previous,save})=>{
     const a=window.__cosmos,w=a.world,cloud=w.bodies.earth.clouds;cloud.material.fragmentShader=mode==='previous'?previous:window.candidate;cloud.material.needsUpdate=true;
     w.update(a.game.player,0,{view:'probe',exposure:1});const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const x=c.getContext('2d');x.drawImage(w.canvas,0,0);
     const frame={display:x.getImageData(0,0,c.width,c.height).data},draws={calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles};
     const n=window.numeric;n.material.fragmentShader=cloud.material.fragmentShader.replace('vec4(radiance/alpha,alpha)','vec4(radiance,alpha)');n.material.needsUpdate=true;n.mesh.matrix.copy(cloud.matrixWorld);w.renderer.setRenderTarget(n.target);w.renderer.setClearAlpha(0);w.renderer.clear();w.renderer.render(n.scene,w.camera);const raw=new Uint16Array(800*500*4);w.renderer.readRenderTargetPixels(n.target,0,0,800,500,raw);frame.linear=Float32Array.from(raw,x=>n.lookup[x]);window.frames[mode]=frame;w.renderer.setRenderTarget(null);w.renderer.setClearAlpha(1);
     return {draws,png:save?c.toDataURL().split(',')[1]:null};
    },{mode,previous,save:name==='Chrome'&&['close','resolved-limb','day'].includes(label)});
    draws[mode]=r.draws;if(r.png)await fs.writeFile(`tests/screenshots/v36-cloud-${label}-${mode}.png`,Buffer.from(r.png,'base64'));
   }
   const metrics=await page.evaluate(()=>{
    const a=window.frames.previous,b=window.frames.candidate,out={};
    for(const kind of ['display','linear']){let sum=0,sq=0,max=0,changed=0,aboveOne=0,count=0;
     for(let i=0;i<a[kind].length;i++){if(kind==='display'&&i%4===3)continue;const d=Math.abs(a[kind][i]-b[kind][i]);if(!Number.isFinite(d))throw Error('Invalid cloud output');sum+=d;sq+=d*d;max=Math.max(max,d);changed+=d>0;aboveOne+=d>1;count++;}
     out[kind]={mean:sum/count,rmse:Math.sqrt(sq/count),max,changed,aboveOne,count};
    }return out;
   });
   // This optimization preserves sampling and lighting. Bound arithmetic
   // differences in both the displayed image and premultiplied linear output.
   if(!process.env.COSMOS_CLOUD_EXPLORE){assert.ok(metrics.display.mean<.01,JSON.stringify({name,label,metrics}));assert.ok(metrics.display.max<=2,JSON.stringify({name,label,metrics}));assert.ok(metrics.linear.mean<.00001,JSON.stringify({name,label,metrics}));assert.ok(metrics.linear.rmse<.0001,JSON.stringify({name,label,metrics}));}
   assert.deepEqual(draws.previous,draws.candidate);views.push({label,radius,phase,yaw,fov,metrics,draws});console.log({name,label,metrics});
  }
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),views,errors,passed:true});
 }finally{await browser.close()}
 await fs.writeFile(`tests/cloud-equivalence-v36${process.env.COSMOS_CLOUD_CLOSE_ONLY?'-close':''}-results.json`,JSON.stringify({version:'0.36.0',reference:'Released v35 shader, identical view samples, weather field and illumination model. Compare complete display and isolated linear premultiplied cloud output.',viewport:[800,500],outcomes},null,2));
}
