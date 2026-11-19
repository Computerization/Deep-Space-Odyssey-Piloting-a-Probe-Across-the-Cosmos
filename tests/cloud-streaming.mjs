// Camera-local cloud detail: actual rendering, bounded residency, asynchronous
// replacement, longitude wrapping and physical-state isolation.
import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const shots=process.env.COSMOS_CLOUD_STREAM_SHOTS||'tests/screenshots/cloud-streaming';await fs.mkdir(shots,{recursive:true});
const previous=process.env.COSMOS_CLOUD_STREAM_PREVIOUS;
const previousSource=previous?await fs.readFile(previous+'/src/rendering/cloud-detail.js','utf8'):null;
const modes=previous?['previous','candidate']:['candidate'];
const digest=b=>createHash('sha256').update(b).digest('hex');
const sourceHashes={candidate:digest(await fs.readFile('src/rendering/cloud-detail.js')),...(previous?{previous:digest(previousSource)}:{})};
const runnerSha256=digest(await fs.readFile(new URL(import.meta.url)));
const limit=Number(process.env.COSMOS_DETAIL_TEXTURE_LIMIT||0),results=[];
for(const [name,engine,options]of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 for(const mode of modes){
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:800,height:500},deviceScaleFactor:2}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(r.url().includes('/cloud-detail/'))requests.push(r.url());});
 try{
  if(mode==='previous')await page.route('**/src/rendering/cloud-detail.js',r=>r.fulfill({body:previousSource,contentType:'text/javascript'}));
  await page.addInitScript(()=>{
   const gl=WebGL2RenderingContext.prototype,storage=gl.texStorage2D;window.cloudPatchAllocations=0;
   gl.texStorage2D=function(...args){if(args[2]===this.R8&&args[3]===4096&&args[4]===4096)cloudPatchAllocations++;return storage.apply(this,args);};
  });
  if(limit)await page.addInitScript(limit=>{const p=WebGL2RenderingContext.prototype,get=p.getParameter;p.getParameter=function(n){return n===this.MAX_TEXTURE_SIZE?Math.min(limit,get.call(this,n)):get.call(this,n);};},limit);
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:120000});await page.click('#begin');
  await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,g=a.game,T=await import('three');a.startChapter(0);g.mode='loading';g.timePaused=true;g.look.identity();w.setQuality('ultra');document.querySelectorAll('body>*:not(canvas)').forEach(e=>e.style.display='none');
   const cache=w.cloudDetail.cache,set=cache.set;window.cloudCachePeak=0;
   cache.set=function(key,value){const result=set.call(this,key,value);window.cloudCachePeak=Math.max(window.cloudCachePeak,this.size);return result;};
   window.streamQA={
    state:()=>JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.localSeconds,g.fuel]),
    draw:()=>w.update(g.player,0,{view:'probe',look:g.look}),
    pose(label,u=0,lat=0){const b=w.bodies.earth,c=w.bodyPositions.earth;w.setFov(label==='transition'?35:58);
     let p;const radius=label==='day'?2.35:1.08;
     if(label==='close'||label==='day'){const sun=c.clone().negate().normalize(),side=new T.Vector3().crossVectors(sun,new T.Vector3(0,1,0)).normalize();p=sun.multiplyScalar(Math.cos(35*Math.PI/180)).addScaledVector(side,Math.sin(35*Math.PI/180));}
     else{const angle=(u-.12)*Math.PI*2,l=lat*Math.PI/180;p=new T.Vector3(-Math.cos(angle)*Math.cos(l),Math.sin(l),Math.sin(angle)*Math.cos(l)).applyQuaternion(b.group.quaternion);}
     g.player.position.copy(p.multiplyScalar(b.data.radius*radius).add(c));g.player.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(g.player.position,c,new T.Vector3(0,1,0)));w.followReady=false;this.draw();},
    async ready(){for(let i=0;i<100;i++){this.draw();const d=w.cloudDetail;if(!d.pending&&(!d.wanted||d.active?.key===d.wanted.key)&&(!d.wanted||d.uniforms.cloudPatchWeight.value===1))return;await new Promise(r=>setTimeout(r,40));}throw Error('Cloud patch did not settle');},
    image(){w.renderer.getContext().finish();return w.canvas.toDataURL();},
    async pixelDigest(){
     w.renderer.getContext().finish();const c=this.pixelCanvas??=document.createElement('canvas');
     if(c.width!==w.canvas.width||c.height!==w.canvas.height){c.width=w.canvas.width;c.height=w.canvas.height;}
     const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(w.canvas,0,0);
     const bytes=ctx.getImageData(0,0,c.width,c.height).data;
     return[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
    },
    status(){const d=w.cloudDetail;return{textureIdentity:d.active?.texture.uuid,patchAllocations:window.cloudPatchAllocations,key:d.active?.key,wanted:d.wanted?.key,weight:d.uniforms.cloudPatchWeight.value,cache:d.cache.size,cachePeak:window.cloudCachePeak,loads:d.loads,patch:d.active?.texture.image.width,base:w.textures['earth-clouds.avif'].image.width,resources:{...w.renderer.info.memory},graphicsError:w.renderer.getContext().getError()};},
    error(a,b,crop=false){const x=document.createElement('canvas');x.width=w.canvas.width;x.height=w.canvas.height;const ctx=x.getContext('2d',{willReadFrequently:true});return Promise.all([a,b].map(async src=>{const im=new Image();im.src=src;await im.decode();ctx.drawImage(im,0,0);return ctx.getImageData(0,0,x.width,x.height).data;})).then(([A,B])=>{let n=0,sq=0,max=0;for(let y=0;y<x.height;y++)for(let xx=0;xx<x.width;xx++){if(crop&&(xx<x.width*.3||xx>x.width*.7||y<x.height*.3||y>x.height*.7))continue;for(let c=0;c<3;c++){const i=(y*x.width+xx)*4+c,e=Math.abs(A[i]-B[i]);sq+=e*e;max=Math.max(max,e);n++;}}return{rmse:Math.sqrt(sq/n),max};});}
   };
  });
  const views=[];
  for(const [label,u,lat]of [['day',0,0],['close',0,0],['transition',0,55],['pole',0,85],['seam',.999,10]]){
   const r=await page.evaluate(async([label,u,lat])=>{const q=streamQA;q.pose(label,u,lat);const before=q.state();await q.ready();const image=q.image();return{label,pixelSha256:await q.pixelDigest(),preserved:before===q.state(),...q.status(),image};},[label,u,lat]);
   assert.ok(r.preserved);assert.equal(r.graphicsError,0);if(['close','transition','seam'].includes(label))assert.equal(r.weight,limit&&limit<4096?0:1);if(['pole','day'].includes(label))assert.equal(r.weight,0);
   r.imageSha256=digest(Buffer.from(r.image.split(',')[1],'base64'));
   await fs.writeFile(`${shots}/${name}-${label}${previous?'-'+mode:''}.png`,Buffer.from(r.image.split(',')[1],'base64'));delete r.image;views.push(r);
  }
  if(limit&&limit<4096){
   assert.ok(views.every(v=>!v.key&&v.cache===0&&v.weight===0));assert.deepEqual(errors,[]);
   results.push({name,mode,browser:browser.version(),limit,views,fallbackOnly:true,requests:requests.length,errors});continue;
  }
  const motion=await page.evaluate(async()=>{const q=streamQA,a=window.__cosmos,d=a.world.cloudDetail,records=[];
   for(const u of [.91,.94,.97,0,.03,.06,.09,.12,.16,.19]){q.pose('motion',u,10);const before=q.state();await q.ready();const pixelSha256=await q.pixelDigest();records.push({u,pixelSha256,preserved:before===q.state(),...q.status()});}
   // A superseded request may fill the CPU cache, but cannot change the view.
   const previous=d.active,key=previous.key;d.wanted={x:8,y:3,key:'8-3'};const pending=d.load(d.wanted);d.wanted=null;await pending;
   const stalePreserved=d.active===previous;
   q.pose('overlap',.18,10);await q.ready();const before=q.image(),physical=q.state();
   const target={x:(d.active.x+15)%16,y:d.active.y,key:`${(d.active.x+15)%16}-${d.active.y}`};d.wanted=target;await d.load(target);d.readyAt=performance.now()-1000;
   // Hold this exact replacement while comparing the overlap at one pose.
   const update=d.update;d.update=()=>{d.uniforms.cloudPatchWeight.value=1;};q.draw();const after=q.image();d.update=update;
   return{records,stalePreserved,key,overlap:await q.error(before,after,true),preserved:physical===q.state(),final:q.status()};
  });
  assert.ok(motion.stalePreserved&&motion.preserved);for(const r of motion.records){assert.ok(r.preserved);assert.ok(r.cache<=8&&r.cachePeak<=8);assert.equal(r.graphicsError,0);assert.equal(r.weight,1);}
  assert.ok(motion.overlap.rmse<.2,JSON.stringify(motion.overlap));assert.equal(motion.final.graphicsError,0);assert.deepEqual(errors,[]);
  if(mode==='candidate'){assert.equal(new Set(motion.records.map(r=>r.textureIdentity)).size,1);assert.equal(motion.final.patchAllocations,1);}
  const recovery=await page.evaluate(async()=>{
   const q=streamQA,w=window.__cosmos.world;q.pose('close');await q.ready();const before=q.state(),image=q.image();
   const photo=w.capture(),size=await new Promise(resolve=>{const im=new Image();im.onload=()=>resolve([im.width,im.height]);im.src=photo;});
   const canvas=w.canvas,extension=w.renderer.getContext().getExtension('WEBGL_lose_context');
   if(!extension)throw Error('Context-loss extension missing');
   const lost=new Promise(resolve=>canvas.addEventListener('webglcontextlost',resolve,{once:true}));extension.loseContext();await lost;
   await new Promise(r=>setTimeout(r,150));
   const restored=new Promise(resolve=>canvas.addEventListener('webglcontextrestored',resolve,{once:true}));extension.restoreContext();await restored;
   await q.ready();return{preserved:before===q.state(),imageError:await q.error(image,q.image()),photo:size,...q.status()};
  });
  assert.ok(recovery.preserved);assert.equal(recovery.graphicsError,0);assert.equal(recovery.weight,1);assert.deepEqual(recovery.photo,[1600,1000]);assert.ok(recovery.imageError.rmse<.1);if(mode==='candidate'){assert.equal(recovery.patchAllocations,2);assert.equal(recovery.textureIdentity,motion.final.textureIdentity);}
  results.push({name,mode,browser:browser.version(),limit,views,motion,recovery,requests:requests.length,uniqueRequests:new Set(requests).size,errors});console.log(name,mode,JSON.stringify({views:views.length,loads:motion.final.loads,patchAllocations:motion.final.patchAllocations,cache:motion.final.cache,overlap:motion.overlap,errors}));
 }finally{await browser.close();}
 }
 if(previous){const [before,after]=results.filter(r=>r.name===name);for(let i=0;i<before.views.length;i++)assert.equal(after.views[i].pixelSha256,before.views[i].pixelSha256,`${name}: ${before.views[i].label}`);if(before.motion)for(let i=0;i<before.motion.records.length;i++)assert.equal(after.motion.records[i].pixelSha256,before.motion.records[i].pixelSha256,`${name}: moving pose ${i}`);}
}
await fs.writeFile(process.env.COSMOS_CLOUD_STREAM_REPORT||'tests/cloud-streaming-results.json',JSON.stringify({origin:BASE_URL,sourceHashes,runnerSha256,results},null,2)+'\n');
