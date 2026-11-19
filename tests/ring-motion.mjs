import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const previous=process.env.COSMOS_RING_PREVIOUS;assert.ok(previous,'Set COSMOS_RING_PREVIOUS to the prior extracted source.');
const files=['shaders.js','earth-shaders.js','ringshine.js'],sources={};
for(const mode of ['previous','candidate'])sources[mode]=Object.fromEntries(await Promise.all(files.map(async name=>[name,createHash('sha256').update(await fs.readFile(path.join(mode==='previous'?previous:'.','src/rendering',name))).digest('hex')])));
const versions={previous:JSON.parse(await fs.readFile(path.join(previous,'package.json'))).version,candidate:JSON.parse(await fs.readFile('package.json')).version},outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  for(const file of files)await page.route('**/motion-prior/'+file,r=>r.fulfill({path:path.join(previous,'src/rendering',file),contentType:'text/javascript'}));
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');
  const checks=await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,t=await import('three'),prior=(await import('/motion-prior/shaders.js')).ringFragment,m=w.bodies.saturn.ring.material,current=m.fragmentShader,rows=[];
   w.setQuality('ultra');
   const physical=()=>JSON.stringify([a.game.player.position.toArray(),a.game.player.velocity.toArray(),a.game.player.quaternion.toArray(),a.game.fuel,a.game.localSeconds]);
   const pixels=()=>{const p=new Uint16Array(w.frameTarget.width*w.frameTarget.height*4);w.renderer.readRenderTargetPixels(w.frameTarget,0,0,w.frameTarget.width,w.frameTarget.height,p);return p;};
   const draw=()=>{const before=physical();w.followReady=false;w.update(a.game.player,0,{view:'probe',look:a.game.look});if(before!==physical())throw Error('Rendering changed physical flight');return pixels();};
   const flux=p=>{let s=0;for(let i=0;i<p.length;i+=4)s+=t.DataUtils.fromHalfFloat(p[i]);return s;};
   const difference=(p,q)=>{let s=0;for(let i=0;i<p.length;i+=4)s+=Math.abs(t.DataUtils.fromHalfFloat(p[i])-t.DataUtils.fromHalfFloat(q[i]));return s;};
   const select=s=>{m.fragmentShader=s;m.needsUpdate=true;};
   const isolated=s=>s.replace('r>=1.235&&r<=2.323?ringDepth(r,tex.a):0.','r>2.27&&r<=2.323?ringDepth(r,tex.a):0.');
   const dense=(s,n)=>s.replace('i<16','i<'+n).replace('(float(i)+.5)*.5-4.',`(float(i)+.5)*${8/n}-4.`).replace('*.000225*fMix',`*${.0036/n}*fMix`);
   for(const [label,fov] of [['plane',58],['plane',12],['plane',4],['lit-low',58],['unlit-low',58]]){
    a.startChapter(2,0,'ring-plane');a.game.mode='loading';a.game.timePaused=true;a.game.look.identity();w.setFov(fov);w.sky.visible=false;
    for(const body of Object.values(w.bodies)){body.mesh.visible=false;if(body.atmosphere)body.atmosphere.visible=false;}
    if(label!=='plane'){
     const body=w.bodies.saturn,c=w.bodyPositions.saturn,up=new t.Vector3(0,1,0).applyQuaternion(body.group.quaternion),sun=c.clone().negate().normalize();
     const equator=sun.clone().addScaledVector(up,-sun.dot(up)).normalize(),angle=1.427*Math.PI/180;
     a.game.player.position.copy(c).addScaledVector(equator,Math.cos(angle)*4.82*body.data.radius).addScaledVector(up,Math.sin(angle)*Math.sign(sun.dot(up))*(label==='unlit-low'?-1:1)*4.82*body.data.radius);
     a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(a.game.player.position,c,up));
    }
    const base=a.game.player.quaternion.clone(),pair={};
    for(const mode of ['previous','candidate']){
     select(isolated(mode==='previous'?prior:current));const values=[];
     for(let i=0;i<16;i++){a.game.player.quaternion.copy(base).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),i*.00003));values.push(flux(draw()));}
     const mean=values.reduce((s,x)=>s+x)/values.length;
     pair[mode]={meanFlux:mean,variation:Math.sqrt(values.reduce((s,x)=>s+(x-mean)**2,0)/values.length)/mean,flux:values};
    }
    a.game.player.quaternion.copy(base);const variants={};
    for(const n of [16,64,128]){select(isolated(n===16?current:dense(current,n)));variants[n]=draw();}
    const referenceFlux=flux(variants[128]);
    const quadrature={relativeDifference16To128:difference(variants[16],variants[128])/referenceFlux,relativeDifference64To128:difference(variants[64],variants[128])/referenceFlux};
    // Broad rings are a control: removing F optical depth and its filter must
    // leave the unchanged lighting response pixel-identical across this edit.
    const broad=s=>s.replace('return tau+.05*exp(-.5*pow((r-2.320)/.00045,2.));','return tau;').replace('smoothstep(.0009,.0018,a+b)','0.');
    select(broad(prior));const oldBroad=draw();select(broad(current));const broadError=difference(oldBroad,draw());
    rows.push({label,fov,...pair,quadrature,broadError});
   }
   select(current);return rows;
  });
  const outcome={name,engineVersion:browser.version(),checks,physicalStatePreserved:true,errors};outcomes.push(outcome);
  await fs.writeFile('tests/ring-motion-results.json',JSON.stringify({versions,sources,method:'Isolated F-ring linear HDR flux over 16 small camera rotations; 64/128-profile-sample quadrature convergence, not an independent photographic reference.',outcomes},null,2)+'\n');
  console.log(JSON.stringify(outcome));
  for(const c of checks){
   assert.ok(c.candidate.variation<c.previous.variation,`${name} ${c.label} ${c.fov}: motion variation`);
   // The old sparse sampler is the aliasing case, not a brightness oracle.
   // Check the new integral against denser quadrature and retain the old mean as evidence.
   assert.ok(Number.isFinite(c.candidate.meanFlux)&&c.candidate.meanFlux>0,'Finite positive F-ring radiance');
   assert.ok(c.quadrature.relativeDifference16To128<.01,'F-profile integration within 1% of dense quadrature');
   assert.ok(c.quadrature.relativeDifference64To128<.001,'Dense quadrature converges');
   assert.equal(c.broadError,0,'Broad-ring lighting unchanged');
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
}
