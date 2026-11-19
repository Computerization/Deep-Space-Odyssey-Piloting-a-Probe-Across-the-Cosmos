import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&process.env.COSMOS_TEST_ENGINE!==name)continue;
 const browser=await engine.launch(options);
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});
 assert.equal(await page.locator('#departure').count(),0);
 assert.ok(await page.evaluate(()=>document.fonts.check('24px Barlow')));
 await page.click('#begin');await page.evaluate(()=>window.__cosmos.startChapter(0));await page.waitForTimeout(800);
 assert.ok(await page.locator('#waypoint').isVisible());
 await page.click('#time-toggle');await page.waitForTimeout(100);
 const held=await page.evaluate(()=>{const a=window.__cosmos;return {p:a.game.player.position.toArray(),v:a.game.player.velocity.toArray(),q:a.game.player.quaternion.toArray()};});
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(300);await page.keyboard.up('ArrowLeft');
 const afterHold=await page.evaluate(()=>{const a=window.__cosmos;return {p:a.game.player.position.toArray(),v:a.game.player.velocity.toArray(),q:a.game.player.quaternion.toArray(),rate:a.game.actualRate};});
 assert.deepEqual(afterHold.p,held.p);assert.deepEqual(afterHold.v,held.v);assert.notDeepEqual(afterHold.q,held.q);assert.equal(afterHold.rate,0);
 const gravityAndThrust=await page.evaluate(()=>{
  const a=window.__cosmos;a.startChapter(0);a.game.mode='panel';a.game.rateIndex=0;a.game.actualRate=1;
  const initial=a.game.player.velocity.length(),fuel=a.game.fuel;
  for(let i=0;i<600;i++)a.updateFlight(1/60,{...a.zeroInput,thrust:1,boost:true});
  return {initial,final:a.game.player.velocity.length(),fuelSpent:fuel-a.game.fuel,acceleration:a.game.thrustAcceleration,seconds:a.game.localSeconds};
 });
 assert.ok(gravityAndThrust.fuelSpent>0&&gravityAndThrust.fuelSpent<.01);assert.ok(gravityAndThrust.acceleration<2e-6);assert.ok(Math.abs(gravityAndThrust.initial-gravityAndThrust.final)<1);assert.ok(Math.abs(gravityAndThrust.seconds-10)<1e-7);
 const freedom=await page.evaluate(()=>{
  const a=window.__cosmos;a.startChapter(0);a.game.mode='panel';a.game.timePaused=true;a.game.chapterTime=13;
  for(let i=0;i<420;i++)a.updateFlight(1/60,{...a.zeroInput,observe:true});
  return {photos:a.game.discovered.length,notes:a.game.experience.seen,stage:a.game.stage,velocity:a.game.player.velocity.length()};
 });
 assert.ok(freedom.notes.length>0);assert.ok(freedom.photos>0);assert.equal(freedom.stage,'encounter');
 const boundaries=await page.evaluate(async()=>{
  const {REGIONS}=await import('/src/exploration.js');const a=window.__cosmos,results=[];
  for(let c=0;c<6;c++){
   a.startChapter(c);a.game.mode='panel';const r=REGIONS[c],center=a.world.bodyPositions[r.body];
   a.game.player.position.copy(center).add(a.game.frame.x.clone().multiplyScalar(r.radius-.01));a.game.player.velocity.copy(a.game.frame.x).multiplyScalar(17);
   const v=a.game.player.velocity.toArray();a.updateFlight(.05,a.zeroInput);
   results.push({c,held:a.game.boundaryPaused,range:a.game.player.position.distanceTo(center),radius:r.radius,speed:a.game.player.velocity.length(),preserved:v.every((x,i)=>Math.abs(x-a.game.player.velocity.toArray()[i])<1e-12)});
  }return results;
 });
 assert.ok(boundaries.every(r=>r.held&&r.range<=r.radius&&r.preserved));
 const clockConsistency=await page.evaluate(()=>{
  const a=window.__cosmos,results=[];
  for(const chapter of [0,2,4]){
   const samples=[];
   for(const [rateIndex,wallStep] of [[0,.05],[0,.1],[3,.05]]){
    a.startChapter(chapter);a.game.mode='loading';a.beginTransit(.2);a.game.rateIndex=rateIndex;
    const target=a.game.transit.seconds+60;let count=0;
    while(a.game.transit.seconds<target-1e-7){const step=Math.min(wallStep,(target-a.game.transit.seconds)/(rateIndex===3?1000:1));a.updateFlight(Math.min(step,.05),a.zeroInput,step);if(++count>1500)throw Error('Clock did not advance');}
    samples.push({rateIndex,wallStep,jd:a.game.transit.jd,seconds:a.game.transit.seconds,position:a.game.player.position.toArray(),velocity:a.game.player.velocity.toArray(),caption:document.getElementById('objective-caption').textContent});
   }
   results.push({chapter,samples});
  }
  const local=[];
  for(const wallStep of [.05,.1]){a.startChapter(0);a.game.mode='loading';a.game.rateIndex=0;a.game.actualRate=1;for(let i=0;i<10/wallStep;i++)a.updateFlight(Math.min(.05,wallStep),a.zeroInput,wallStep);local.push({seconds:a.game.localSeconds,position:a.game.player.position.toArray()});}
  const arrivals=[];
  for(const chapter of [0,2,4])for(const rateIndex of [0,3]){
   a.startChapter(chapter);a.game.mode='loading';a.beginTransit();const duration=a.game.transit.duration;a.game.stage='encounter';a.beginTransit(1-.5/duration);a.game.rateIndex=rateIndex;
   const target=a.game.transit.end;let count=0;
   while(a.game.stage==='transit'&&count++<30)a.updateFlight(.05,a.zeroInput,.05);
   arrivals.push({chapter,rateIndex,target,arrived:a.game.chapter,seconds:a.game.localSeconds,date:document.getElementById('chapter-date').textContent});
  }
  return{results,local,arrivals};
 });
 for(const row of clockConsistency.results)for(const sample of row.samples){
  const reference=row.samples[0];assert.ok(Math.abs(sample.seconds-reference.seconds)<1e-4);assert.ok(Math.abs(sample.jd-reference.jd)*86400<.0001);
  assert.ok(Math.hypot(...sample.position.map((x,i)=>x-reference.position[i]))<.005);assert.equal(sample.caption,reference.caption);assert.match(sample.caption,/of flight remaining. Arrival:/);
 }
 for(const chapter of [0,2,4]){const pair=clockConsistency.arrivals.filter(a=>a.chapter===chapter);assert.equal(pair[0].date,pair[1].date);assert.ok(pair.every(a=>a.arrived===chapter+1&&a.seconds===0));}
 for(const s of clockConsistency.local)assert.ok(Math.abs(s.seconds-10)<1e-8,'1x remains one second of flight per real second');
 assert.ok(Math.hypot(...clockConsistency.local[0].position.map((x,i)=>x-clockConsistency.local[1].position[i]))<.001);
 const passages=await page.evaluate(()=>{
  const a=window.__cosmos,out=[];
  for(let c=0;c<5;c++){
   a.startChapter(c);a.game.mode='panel';a.beginTransit();a.game.rateIndex=6;
   const start=a.game.transit.jd,speed=a.game.player.velocity.length();
   for(let i=0;i<10;i++)a.updateFlight(.05,a.zeroInput);
   const jd=a.game.transit.jd,velocity=a.game.player.velocity.clone(),position=a.game.player.position.clone();
   a.updateFlight(.05,{...a.zeroInput,brake:true,thrust:1,boost:true});
   const held=a.game.transit.jd===jd&&a.game.player.position.equals(position)&&a.game.player.velocity.equals(velocity);
   a.game.rateIndex=10;let frames=0;while(a.game.stage==='transit'&&frames++<1000)a.updateFlight(.05,a.zeroInput);
   out.push({c,speed,elapsed:(jd-start)*86400,held,arrival:a.game.chapter,frames});
  }return out;
 });
 assert.ok(passages.every((p,i)=>p.arrival===i+1&&p.held&&p.speed<45&&Math.abs(p.elapsed-500000)<.1));
 const milestone=await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(5);a.game.timePaused=true;return {title:document.getElementById('chapter-title').textContent,date:document.getElementById('chapter-date').textContent,lightHours:a.game.player.position.distanceTo(a.world.bodyPositions.earth)/299792.458/3600};});
 assert.ok(Math.abs(milestone.lightHours-24)<.00001);assert.match(milestone.date,/predicted/);await page.waitForTimeout(500);await page.screenshot({path:'tests/screenshots/v12-light-day.png'});
 // Save/reload a historical passage, including chosen time rate and hold state.
 await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(1);a.beginTransit();a.game.rateIndex=6;a.game.mode='panel';a.updateFlight(.05,a.zeroInput);a.game.timePaused=true;a.game.mode='play';});
 await page.click('#pause-button');const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('cosmos-voyager-save-v2')));
 await page.reload();await page.waitForFunction(()=>window.__cosmos);await page.click('#continue');await page.waitForTimeout(300);
 const restored=await page.evaluate(()=>({stage:window.__cosmos.game.stage,progress:window.__cosmos.game.transit.progress,rate:window.__cosmos.game.rateIndex,held:window.__cosmos.game.timePaused}));
 assert.equal(restored.stage,'transit');assert.equal(restored.progress,before.transit.progress);assert.equal(restored.rate,before.rateIndex);assert.equal(restored.held,true);
 await page.click('#map-button');await page.click('[data-action=map-tab][data-value=solar]');
 await page.click('[data-action=chart-scale][data-value="35"]');await page.locator('.chart-object-list [data-value=neptune]').click();assert.equal(await page.locator('.chart-inspector h3').textContent(),'Neptune');
 await page.screenshot({path:'tests/screenshots/v12-chart-outer.png'});
 await page.click('#panel-close');await page.evaluate(()=>{window.__cosmos.startChapter(2);window.__cosmos.game.timePaused=true;});await page.waitForTimeout(500);await page.screenshot({path:'tests/screenshots/v12-saturn.png'});
 await page.keyboard.press('Slash');assert.ok((await page.locator('#panel-content').textContent()).includes('Hold / resume time'));
 await page.click('#panel-close');await page.click('#pause-button');await page.setViewportSize({width:1024,height:640});await page.screenshot({path:'tests/screenshots/v12-pause-compact.png'});
 const menuFit=await page.locator('.pause-menu button').evaluateAll(els=>els.every(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));assert.ok(menuFit);
 // Browser-standard Xbox mapping; this does not claim a physical hardware test.
 await page.click('[data-action=resume]');await page.evaluate(()=>{
  window.__pad={id:'Xbox synthetic',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:0};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__pad]});window.__cosmos.game.timePaused=false;
 });
 await page.waitForTimeout(100);await page.evaluate(()=>{window.__pad.buttons[1]={pressed:true,value:1};});await page.waitForTimeout(100);
 const padHeld=await page.evaluate(()=>window.__cosmos.game.actualRate);assert.equal(padHeld,0);
 await page.evaluate(()=>{window.__pad.buttons[1]={pressed:false,value:0};window.__cameraBefore=window.__cosmos.game.view;window.__pad.buttons[3]={pressed:true,value:1};});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__cosmos.game.view!==window.__cameraBefore),true);
 // Isolate surface rotation at one physical viewpoint. No shader, mesh or
 // texture is replaced; phases repeat after one reference rotation period.
 await page.evaluate(()=>delete navigator.getGamepads);
 // Check physical axes through the actual vertex deformation and renderer's
 // near/far scaled-space transform. A white diagnostic material isolates the
 // silhouette; its vertex shader, uniforms and geometry are the live ones.
 const dimensions=await page.evaluate(async()=>{
  const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0);a.game.mode='loading';a.game.timePaused=true;
  const b=w.bodies.earth,axes={equatorial:b.data.radius,polar:b.data.radius*b.data.flatten},silhouettes=[];
  const material=new t.ShaderMaterial({vertexShader:b.mesh.material.vertexShader,fragmentShader:'void main(){gl_FragColor=vec4(1.);}',uniforms:b.mesh.material.uniforms});
  const scene=new t.Scene(),group=new t.Group(),mesh=new t.Mesh(b.mesh.geometry,material);group.add(mesh);scene.add(group);
  const target=new t.WebGLRenderTarget(1440,900),pixels=new Uint8Array(1440*900*4),savedTarget=w.renderer.getRenderTarget(),savedClear=w.renderer.getClearColor(new t.Color()),savedAlpha=w.renderer.getClearAlpha();
  for(const pole of [false,true])for(const distance of [30000,8000000]){
   const c=w.bodyPositions.earth,direction=new t.Vector3(pole?0:1,pole?1:0,0).applyQuaternion(b.group.quaternion),up=new t.Vector3(0,pole?0:1,pole?1:0).applyQuaternion(b.group.quaternion);
   a.game.player.position.copy(c).addScaledVector(direction,distance);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(a.game.player.position,c,up));
   const fov=distance<1e6?58:.12;w.camera.fov=fov;w.camera.updateProjectionMatrix();w.update(a.game.player,0,{view:'probe'});
   group.position.copy(b.group.position);group.quaternion.copy(b.group.quaternion);group.scale.copy(b.group.scale);
   w.renderer.setRenderTarget(target);w.renderer.setClearColor(0,1);w.renderer.clear();w.renderer.render(scene,w.camera);w.renderer.readRenderTargetPixels(target,0,0,1440,900,pixels);
   let minX=1440,maxX=-1,minY=900,maxY=-1;
   for(let y=0;y<900;y++)for(let x=0;x<1440;x++)if(pixels[(y*1440+x)*4]>127){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
   const focal=450/Math.tan(fov*Math.PI/360),depthAxis=pole?6356.752:6378.137,denominator=Math.sqrt(distance*distance-depthAxis*depthAxis);
   silhouettes.push({pole,distance,fov,measured:[(maxX-minX+1)/2,(maxY-minY+1)/2],expected:[focal*6378.137/denominator,focal*(pole?6378.137:6356.752)/denominator]});
  }
  w.renderer.setRenderTarget(savedTarget);w.renderer.setClearColor(savedClear,savedAlpha);target.dispose();material.dispose();w.setFov(58);
  // Independent high-step optical integrals in kilometres. Sample exact table
  // nodes to separate physical units from texture interpolation accuracy.
  const optical=b.uniforms.opticalDepth.value.image,columns=[];
  for(const y of [0,16,32,64,96])for(const x of [96,128,256,511]){
   const radius=6378.137,top=radius*1.018,h=(y/127)**2*(top-radius),r=radius+h,horizon=-Math.sqrt(Math.max(0,1-radius*radius/(r*r))),mu=Math.max(-.2+1.2*x/511,horizon+.000001);
   const end=-r*mu+Math.sqrt(r*r*mu*mu+top*top-r*r),step=end/8192,expected=[0,0];
   for(let i=0;i<8192;i++){const d=(i+.5)*step,altitude=Math.max(0,Math.sqrt(r*r+d*d+2*r*mu*d)-radius);expected[0]+=Math.exp(-altitude/8)*step;expected[1]+=Math.exp(-altitude/1.2)*step;}
   const offset=(y*512+x)*2,actual=[t.DataUtils.fromHalfFloat(optical.data[offset]),t.DataUtils.fromHalfFloat(optical.data[offset+1])];columns.push({x,y,expected,actual});
  }
  // Render the production transmission shader on bounded rays at stated
  // kilometre altitudes; compare actual RGB with independent quadrature.
  const u={...b.transmission.material.uniforms,localCamera:{value:new t.Vector3()},flatten:{value:1},diagnosticDirection:{value:new t.Vector3()},diagnosticLimit:{value:1e8}};
  const shader=b.transmission.material.fragmentShader.replace('varying vec3 vLocal;','varying vec3 vLocal;uniform float diagnosticLimit;').replace('sun,1e8,scatter','sun,diagnosticLimit,scatter');
  const vertex=`#include <common>
   #include <logdepthbuf_pars_vertex>
   uniform vec3 localCamera,diagnosticDirection;varying vec3 vLocal;
   void main(){vLocal=(localCamera+diagnosticDirection*.1)/1.018;gl_Position=vec4(position,1.);
   #include <logdepthbuf_vertex>
   }`;
  const opticalMaterial=new t.ShaderMaterial({uniforms:u,vertexShader:vertex,fragmentShader:shader,depthTest:false,depthWrite:false,toneMapped:false}),quad=new t.PlaneGeometry(2,2),opticalScene=new t.Scene(),camera=new t.Camera(),opticalTarget=new t.WebGLRenderTarget(2,2,{type:t.HalfFloatType,depthBuffer:false}),raw=new Uint16Array(4),rays=[];
  opticalScene.add(new t.Mesh(quad,opticalMaterial));
  const sphere=(radius,mu,shell)=>{const c=radius*mu,h=c*c-radius*radius+shell*shell;return h<0?[1e8,-1e8]:[-c-Math.sqrt(h),-c+Math.sqrt(h)];};
  for(const altitude of [.1,3,9,60,300])for(const mu of [-1,-.1,0,.1,1])for(const fraction of [.5,1]){
   const radius=1+altitude/6378.137,hit=sphere(radius,mu,1.018),ground=sphere(radius,mu,1),start=Math.max(0,hit[0]),end=Math.min(hit[1],ground[0]>0?ground[0]:1e8),limit=end>start?start+(end-start)*fraction:1e8;
   u.localCamera.value.set(0,0,radius);u.diagnosticDirection.value.set(Math.sqrt(1-mu*mu),0,mu);u.diagnosticLimit.value=limit;
   let molecular=0,aerosol=0;const step=Math.max(0,Math.min(end,limit)-start)/8192;
   for(let i=0;i<8192;i++){const d=start+(i+.5)*step,h=Math.max(0,(Math.sqrt(radius*radius+d*d+2*radius*mu*d)-1)*6378.137);molecular+=Math.exp(-h/8)*step*6378.137;aerosol+=Math.exp(-h/1.2)*step*6378.137;}
   const expected=[.0058,.0135,.0331].map(beta=>Math.exp(-beta*molecular-.0033*aerosol));
   w.renderer.setRenderTarget(opticalTarget);w.renderer.clear();w.renderer.render(opticalScene,camera);w.renderer.readRenderTargetPixels(opticalTarget,0,0,1,1,raw);
   const actual=[...raw].slice(0,3).map(t.DataUtils.fromHalfFloat);rays.push({altitude,mu,fraction,actual,expected,error:Math.max(...expected.map((v,i)=>Math.abs(v-actual[i])))});
  }
  w.renderer.setRenderTarget(savedTarget);opticalMaterial.dispose();quad.dispose();opticalTarget.dispose();
  const sharedFlatten=[b.mesh,b.clouds,b.atmosphere,b.transmission].every(m=>m.material.uniforms.flatten===b.uniforms.flatten);
  a.startChapter(0);a.game.mode='loading';a.game.timePaused=true;w.setQuality('high');w.update(a.game.player,0,{view:'probe'});
  return {axes,silhouettes,columns,rays,sharedFlatten};
 });
 assert.equal(dimensions.axes.equatorial,6378.137);assert.ok(Math.abs(dimensions.axes.polar-6356.752)<1e-9);assert.ok(dimensions.sharedFlatten);
 for(const row of dimensions.silhouettes)for(let i=0;i<2;i++)assert.ok(Math.abs(row.measured[i]-row.expected[i])<1.1,JSON.stringify(row));
 assert.ok(dimensions.rays.every(r=>r.error<.006),JSON.stringify(dimensions.rays.filter(r=>r.error>=.006)));
 for(const row of dimensions.columns)for(let i=0;i<2;i++)assert.ok(Math.abs(row.actual[i]-row.expected[i])<Math.max(.00008,row.expected[i]*.005),JSON.stringify(row));
 const rotations=[];
 for(const [chapter,id,period,phase] of [[0,'earth',23.9345*3600,.12],[1,'jupiter',9.925*3600,.82],[2,'saturn',10.656*3600,.25]]){
  const r=await page.evaluate(async({chapter,id,period,phase})=>{
   const a=window.__cosmos,w=a.world,g=a.game;a.startChapter(chapter);g.mode='loading';g.timePaused=true;g.view='probe';w.setQuality('ultra');
   const physical=()=>JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.fuel,g.localSeconds]);
   const before=physical(),frames=[];
   for(const time of [0,period/4,period]){
    w.update(g.player,0,{view:'probe',time});const data=w.canvas.toDataURL();
    frames.push({time,phase:w.bodies[id].uniforms.rotation.value,image:data,calls:w.renderer.info.render.calls,memory:{...w.renderer.info.memory}});
   }
   return {id,period,phase,phases:frames.map(f=>f.phase),changed:frames[0].image!==frames[1].image,cycleRepeats:frames[0].image===frames[2].image,physicalPreserved:before===physical(),calls:frames.map(f=>f.calls),memory:frames.map(f=>f.memory),images:frames.slice(0,2).map(f=>f.image.split(',')[1])};
  },{chapter,id,period,phase});
  assert.deepEqual(r.phases,[phase,phase-.25,phase]);assert.ok(r.changed&&r.cycleRepeats&&r.physicalPreserved);
  assert.ok(r.calls.every(n=>n===r.calls[0]));assert.deepEqual(r.memory[0],r.memory[1]);assert.deepEqual(r.memory[1],r.memory[2]);
  if(name==='Chrome')for(let i=0;i<2;i++)await fs.writeFile(`tests/screenshots/rotation-${id}-${i?'quarter':'start'}.png`,Buffer.from(r.images[i],'base64'));delete r.images;rotations.push(r);
 }
 await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(1);a.game.view='probe';a.game.rateIndex=1;});
 await page.waitForFunction(()=>window.__cosmos.game.localSeconds>1);
 const motion=await page.evaluate(()=>{const a=window.__cosmos,g=a.game;return {seconds:g.localSeconds,renderTime:a.world.lastRender.options.time,phase:a.world.bodies.jupiter.uniforms.rotation.value};});
 assert.equal(motion.renderTime,motion.seconds);assert.ok(Math.abs(motion.phase-(.82-motion.seconds/(9.925*3600)))<1e-12);
 await page.click('#time-toggle');await page.waitForTimeout(500);
 const heldSpin=await page.evaluate(()=>({time:window.__cosmos.world.lastRender.options.time,phase:window.__cosmos.world.bodies.jupiter.uniforms.rotation.value,renders:window.__cosmos.world.renderCount}));await page.waitForTimeout(300);
 assert.deepEqual(await page.evaluate(()=>({time:window.__cosmos.world.lastRender.options.time,phase:window.__cosmos.world.bodies.jupiter.uniforms.rotation.value,renders:window.__cosmos.world.renderCount})),heldSpin);
 // The displayed calendar follows the same elapsed seconds, preserving the
 // published precision and the prediction qualifier at the final milestone.
 const dates=[];
 for(const [chapter,study,seconds,expected] of [
  [0,null,7200,'5 September 1977 · 20:00:00 UTC · departure study'],
  [2,null,3600,'13 November 1980 · 00:46:30 UTC'],
  [2,'titan',7200,'12 November 1980 · 07:41:00 UTC · observation study'],
  [3,null,90,'14 February 1990 · 04:49 UTC'],
  [4,null,90,'25 August 2012 · UTC'],
  [5,null,3600,'18 November 2026 · 11:16:07 UTC · predicted']
 ]){
  await page.evaluate(({chapter,study,seconds})=>{const a=window.__cosmos;a.startChapter(chapter,0,study);a.game.timePaused=true;a.game.localSeconds=seconds;},{chapter,study,seconds});
  await page.waitForFunction(expected=>document.getElementById('chapter-date').textContent===expected,expected);
  dates.push({chapter,study,seconds,date:await page.locator('#chapter-date').textContent()});
 }
 // Recorded local time is the clock for review, photographs and reload.
 const quarter=9.925*3600/4;
 await page.evaluate(time=>{const a=window.__cosmos;a.startChapter(1);a.game.mode='loading';a.game.view='chase';a.game.timePaused=true;a.game.localSeconds=time;a.flightHistory.record(a.game,0,true);a.game.mode='play';},quarter);
 await page.waitForFunction(time=>window.__cosmos.world.lastRender.options.time===time,quarter);
 await page.click('#photo-button');await page.waitForFunction(()=>!document.getElementById('photo-receipt').hidden);
 assert.equal(await page.evaluate(()=>window.__cosmos.world.bodies.jupiter.uniforms.rotation.value),.57);
 assert.equal(await page.evaluate(()=>window.__cosmos.world.lastRender.options.time),quarter);
 assert.equal(await page.evaluate(()=>window.__cosmos.world.environmentTime),quarter);
 const captureDate='5 March 1979 · 14:34:18 UTC';
 assert.equal(await page.locator('#chapter-date').textContent(),captureDate);
 const photographDate=await page.evaluate(async()=>{const frames=await window.__cosmos.archive.all();return frames.filter(f=>f.kind==='field').sort((a,b)=>b.createdAt-a.createdAt)[0].date;});
 assert.equal(photographDate,captureDate);
 await page.click('#photo-receipt');await page.waitForFunction(()=>document.getElementById('panel').dataset.view==='photograph');
 assert.ok((await page.locator('#panel-content').textContent()).includes(captureDate));await page.click('#panel-close');await page.click('#panel-close');
 const physical=await page.evaluate(()=>{const g=window.__cosmos.game;return {position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),fuel:g.fuel,seconds:g.localSeconds};});
 await page.click('#review-button');await page.locator('#review-range').fill('0');
 await page.waitForFunction(()=>window.__cosmos.world.lastRender.options.time===0);
 assert.equal(await page.evaluate(()=>window.__cosmos.world.bodies.jupiter.uniforms.rotation.value),.82);
 assert.ok(await page.locator('#hud').isHidden());
 assert.equal(await page.locator('#review-time').textContent(),'0 s');
 await page.click('[data-action=resume]');await page.waitForFunction(time=>window.__cosmos.world.lastRender.options.time===time,quarter);
 assert.deepEqual(await page.evaluate(()=>{const g=window.__cosmos.game;return {position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),fuel:g.fuel,seconds:g.localSeconds};}),physical);
 await page.click('#pause-button');await page.reload();await page.waitForFunction(()=>window.__cosmos);await page.click('#continue');
 await page.waitForFunction(time=>window.__cosmos.world.lastRender.options.time===time,quarter);
 assert.equal(await page.evaluate(()=>window.__cosmos.world.bodies.jupiter.uniforms.rotation.value),.57);
 assert.equal(await page.locator('#chapter-date').textContent(),captureDate);
 await page.click('#review-button');await page.locator('#review-range').fill('0');await page.click('#review-apply');await page.waitForFunction(()=>window.__cosmos.world.lastRender.options.time===0);
 assert.equal(await page.evaluate(()=>window.__cosmos.game.localSeconds),0);
 await page.waitForFunction(()=>document.getElementById('chapter-date').textContent==='5 March 1979 · 12:05:26 UTC');
 const dateLifecycle={dates,photographDate,photographViewerMatches:true,reviewUsesElapsedTime:true,rewindRestoresDate:true};
 const rotationLifecycle={motion,heldSpin,photographRetainsTime:true,chaseReflectionRetainsTime:true,reviewRestoresPast:true,cancelPreservesPresent:true,saveReloadPreservesTime:true,resumeFromPast:true};
 const audio=await page.evaluate(()=>window.__cosmos.audio.status());assert.equal(audio.state,'running');
 assert.deepEqual(errors,[]);
 const report={name,engineVersion:browser.version(),rotations,rotationLifecycle,dateLifecycle,version:JSON.parse(await fs.readFile('package.json','utf8')).version,milestone,timeHoldPreservesMomentum:true,gravityAndThrust,freedom,boundaries,passages,transitSaveRestore:restored,chartSelection:true,compactMenuFits:menuFit,controller:'Synthetic Xbox standard mapping: time hold and camera switch',audio,errors};
 outcomes.push({...report,clockConsistency,dimensions});console.log({name,passed:true});
}finally{await browser.close();}

}
await fs.writeFile('tests/scientific-experience-results.json',JSON.stringify({version:JSON.parse(await fs.readFile('package.json')).version,outcomes},null,2)+'\n');
