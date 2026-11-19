import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const files=['src/world.js','src/rendering/geometry-detail.js','src/rendering/scene-factory.js','src/rendering/shaders.js'];
const hashes=Object.fromEntries(await Promise.all(files.map(async p=>[p,createHash('sha256').update(await fs.readFile(p)).digest('hex')]))),outcomes=[];
const scenes=[['earth',0,null],['moon',0,'moon'],['earth-shadow',0,'earth-shadow'],['jupiter',1,null],['io',1,'io'],['saturn',2,null],['rings',2,'ring-plane'],['titan',2,'titan']];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1000,height:625},deviceScaleFactor:2}),errors=[],views=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:120000});await page.click('#begin');
  const fields=await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,t=await import('three'),detail=w.geometryDetail,pairs=new Map(),field=[];a.game.mode='loading';w.setQuality('ultra');
   let seed=771;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   // Independent barycentric interpolation of random interior points on both
   // triangulations, rather than repeating the runtime's vertex-error scan.
   const interpolate=(g,x,y)=>{
    const width=g.parameters.widthSegments,height=g.parameters.heightSegments,ix=Math.min(width-1,Math.floor(x)),iy=Math.min(height-1,Math.floor(y)),fx=x-ix,fy=y-iy,p=g.attributes.position;
    const corners=fx>=fy?[[ix,iy],[ix+1,iy],[ix+1,iy+1]]:[[ix,iy],[ix,iy+1],[ix+1,iy+1]],v=corners.map(([cx,cy])=>new t.Vector3(cx,cy,0)),weight=new t.Vector3();t.Triangle.getBarycoord(new t.Vector3(x,y,0),...v,weight);
    const q=new t.Vector3();for(let i=0;i<3;i++)q.addScaledVector(new t.Vector3().fromBufferAttribute(p,corners[i][1]*(width+1)+corners[i][0]),weight.getComponent(i));return q;
   };
   for(const {original,levels} of detail.entries){
    if(pairs.has(levels[0].geometry))continue;
    for(const level of levels){
     const stored=[],ratio=level.geometry.parameters.widthSegments/original.parameters.widthSegments;let measured=0;
     for(let i=0;i<4096;i++){const x=random()*original.parameters.widthSegments,y=random()*original.parameters.heightSegments,p=interpolate(original,x,y),q=interpolate(level.geometry,x*ratio,y*ratio);measured=Math.max(measured,p.distanceTo(q));if(i<96)stored.push([p,q]);}
     pairs.set(level.geometry,stored);field.push({width:level.geometry.parameters.widthSegments,originalWidth:original.parameters.widthSegments,error:level.error,measured,boundsEqual:JSON.stringify(level.geometry.boundingSphere)===JSON.stringify(original.boundingSphere)});
    }
   }
   window.geometryFrames=[];window.geometryTrace=[];
   w.scene.onBeforeRender=(renderer,scene,camera)=>{
    if(!detail.enabled)return;
    const viewport=renderer.getCurrentViewport(new t.Vector4()),chosen={};let maxProjectedError=0;
    for(const [id,b] of Object.entries(w.bodies)){
     const e=detail.entries.find(e=>e.mesh===b.mesh),g=b.mesh.geometry;chosen[id]=g.parameters.widthSegments;
     if(g===e.original)continue;
     for(const [p,q] of pairs.get(g)){
      const fp=p.clone().applyMatrix4(b.mesh.matrixWorld).project(camera),cp=q.clone().applyMatrix4(b.mesh.matrixWorld).project(camera);
      const visible=v=>v.z>=-1&&v.z<=1&&Math.abs(v.x)<=1&&Math.abs(v.y)<=1;
      if(visible(fp)||visible(cp))maxProjectedError=Math.max(maxProjectedError,Math.hypot((fp.x-cp.x)*viewport.z*.5,(fp.y-cp.y)*viewport.w*.5));
     }
    }
    geometryTrace.push({primary:camera===w.camera,viewport:viewport.toArray(),chosen,maxProjectedError});
   };
   window.geometryPhysical=()=>JSON.stringify([a.game.player.position.toArray(),a.game.player.velocity.toArray(),a.game.player.quaternion.toArray(),a.game.look.toArray(),a.game.localSeconds,a.game.fuel]);
   window.geometryDraw=mode=>{
    const before=geometryPhysical();detail.enabled=mode==='candidate';if(!detail.enabled)detail.restore();w.environmentDirty=true;geometryTrace=[];
    w.update(a.game.player,0,{view:a.game.view,look:a.game.look,exposure:1});
    const canvas=document.createElement('canvas');canvas.width=w.canvas.width;canvas.height=w.canvas.height;const ctx=canvas.getContext('2d');ctx.drawImage(w.canvas,0,0);geometryFrames.push(ctx.getImageData(0,0,canvas.width,canvas.height).data);
    return {preserved:before===geometryPhysical(),triangles:w.renderer.info.render.triangles,calls:w.renderer.info.render.calls,memory:{...w.renderer.info.memory},trace:geometryTrace};
   };
   window.geometryDifference=(p,q)=>{let sq=0,max=0,over2=0;for(let i=0;i<p.length;i++)if(i%4!==3){const d=Math.abs(p[i]-q[i]);sq+=d*d;max=Math.max(max,d);if(d>2)over2++;}return{rmse:Math.sqrt(sq/(p.length/4*3)),max,channelsOver2:over2};};
   return field;
  });
  assert.equal(fields.length,2);for(const f of fields){assert.ok(f.measured<=f.error,'Actual interior deviation stays inside the declared bound');assert.ok(f.boundsEqual);}
  for(const [label,chapter,study] of scenes)for(const view of ['probe','chase']){
   await page.evaluate(({chapter,study,view})=>{const a=window.__cosmos;a.game.view=view;a.startChapter(chapter,0,study);a.game.mode='loading';a.game.timePaused=true;a.game.look.identity();window.geometryFrames=[];},{chapter,study,view});
   const rows=[];for(const mode of ['reference','reference','candidate'])rows.push(await page.evaluate(mode=>geometryDraw(mode),mode));
   const difference=await page.evaluate(()=>({baseline:geometryDifference(geometryFrames[0],geometryFrames[1]),candidate:geometryDifference(geometryFrames[1],geometryFrames[2])}));
   for(const r of rows)assert.ok(r.preserved);for(const t of rows[2].trace)assert.ok(t.maxProjectedError<=.040001,'Independent projected error check');
   assert.deepEqual(rows[1].memory,rows[2].memory);assert.equal(rows[1].calls,rows[2].calls);assert.ok(rows[2].triangles<=rows[1].triangles);
   assert.ok(difference.candidate.rmse<Math.max(.08,difference.baseline.rmse*2),'Source image is retained within the subpixel rendering tolerance');
   const result={label,view,reference:rows[1],candidate:rows[2],difference};views.push(result);console.log({name,label,view,before:rows[1].triangles,after:rows[2].triangles,difference});
  }
  // Sweep a very small Moon through the primary-view detail boundary in both
  // directions; resolved views must return to the original geometry.
  const sweep=await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0,0,'moon');a.game.mode='loading';a.game.view='probe';a.game.timePaused=true;a.game.look.identity();w.setFov(58);
   const c=w.bodyPositions.moon,b=w.bodies.moon,side=c.clone().negate().normalize(),rows=[],radii=[.2,.5,.8,.98,1.02,1.2,2,4,12,4,2,1.2,1.02,.98,.8,.5,.2];
   for(const pixels of radii){
    const f=w.frameTarget.height*.5/Math.tan(w.camera.fov*Math.PI/360),distance=b.data.radius*(1+f/pixels);
    a.game.player.position.copy(c).addScaledVector(side,distance);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(a.game.player.position,c,new t.Vector3(0,1,0)));w.followReady=false;geometryFrames=[];
    geometryDraw('reference');const candidate=geometryDraw('candidate');rows.push({pixels,width:b.mesh.geometry.parameters.widthSegments,difference:geometryDifference(geometryFrames[0],geometryFrames[1]),candidate});
   }
   return rows;
  });
  assert.ok(sweep.some(s=>s.width<512));for(const s of sweep){assert.ok(s.candidate.preserved);assert.ok(s.difference.rmse<.08);if(s.pixels>=1.02)assert.equal(s.width,512);for(const t of s.candidate.trace)assert.ok(t.maxProjectedError<=.040001);}
  const photo=await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world;a.startChapter(1);a.game.view='chase';a.game.mode='loading';a.game.timePaused=true;w.setQuality('high');w.ratio=1.25;w.resize();geometryFrames=[];geometryDraw('candidate');
   const before=geometryPhysical(),flight=[w.canvas.width,w.canvas.height,w.frameTarget.width,w.frameTarget.height];geometryTrace=[];const data=w.capture(),bitmap=await createImageBitmap(await(await fetch(data)).blob()),size=[bitmap.width,bitmap.height];bitmap.close();
   return {preserved:before===geometryPhysical(),flight,after:[w.canvas.width,w.canvas.height,w.frameTarget.width,w.frameTarget.height],size,trace:geometryTrace,memory:{...w.renderer.info.memory}};
  });
  assert.ok(photo.preserved);assert.deepEqual(photo.flight,photo.after);assert.deepEqual(photo.size,[2000,1250]);assert.ok(photo.trace.some(t=>t.primary&&t.viewport[2]===2000));assert.ok(photo.trace.some(t=>t.primary&&t.viewport[2]===1250));for(const t of photo.trace)assert.ok(t.maxProjectedError<=.040001);
  assert.ok(views.filter(v=>v.view==='chase'&&['jupiter','saturn'].includes(v.label)).every(v=>v.candidate.triangles<v.reference.triangles*.55),'Distant geometry work is substantially reduced');
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),fields,views,sweep,photo,errors,passed:true});
 }finally{await browser.close();}
}
await fs.writeFile(process.env.COSMOS_GEOMETRY_DETAIL_REPORT||'tests/geometry-detail-results.json',JSON.stringify({version:JSON.parse(await fs.readFile('package.json')).version,hashes,reference:'Same full-detail meshes, source maps, shader and physical state. Repeated full-detail draw is the variation control. Independent triangle interpolation and camera projection verify the spatial error bound.',outcomes},null,2)+'\n');
