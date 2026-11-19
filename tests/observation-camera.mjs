import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
const lensOnly=process.env.COSMOS_CAMERA_FOCUS==='lens';
const previous=process.env.COSMOS_CAMERA_PREVIOUS;
const sourceFiles=['src/observation-camera.js','src/flight.js','src/observations.js','src/ui/flight-review.js','src/ui/camera.js','src/main.js'];
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async p=>[p,createHash('sha256').update(await fs.readFile(p)).digest('hex')])));

async function checkLensPrecision(page){
 const precision=await page.evaluate(async previous=>{
  const a=window.__cosmos,w=a.world,g=a.game,t=await import('three');g.mode='loading';
  const controls=[['candidate',a.observationCamera]];
  if(previous){const {ObservationCamera}=await import('/comparison/observation-camera.js');controls.unshift(['previous',new ObservationCamera(g,w)]);}
  const physical=()=>JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.look.toArray(),g.fuel,g.localSeconds]),before=physical(),rows=[];
  for(const [mode,c] of controls)for(const start of [4.8,8,58])for(const hz of [30,60,120]){
   w.setFov(start);c.stopLens();const target=c.zoom(1),wide=Math.tan(start*Math.PI/360),narrow=Math.tan(target*Math.PI/360);
   // An off-axis feature is 540 CSS pixels from the centre. Compare its
   // actual camera projection with a continuous, closed-form optical path.
   const feature=new t.Vector3(.75*wide*w.camera.aspect,0,-1),samples=[];
   let error=0,stutters=0,prior=start;
   for(let i=1;i<=hz;i++){
    c.updateLens(1/hz);
    const ideal=Math.exp(Math.log(narrow)+(Math.log(wide)-Math.log(narrow))*Math.exp(-15*i/hz));
    const actual=feature.clone().applyMatrix4(w.camera.projectionMatrix).x*innerWidth/2,reference=540*wide/ideal;
    error=Math.max(error,Math.abs(actual-reference));
    if(w.camera.fov===prior&&Math.abs(540*wide/narrow-reference)>.05)stutters++;
    prior=w.camera.fov;if(start===4.8&&hz===60)samples.push({seconds:i/hz,fov:w.camera.fov,pixel:actual,reference});
   }
   rows.push({mode,start,hz,target,end:w.camera.fov,maxProjectionErrorPixels:error,stutters,samples,settled:c.lens===null});
  }
  const c=a.observationCamera;w.setFov(8);c.stopLens();c.zoom(1);for(let i=0;i<5;i++)c.updateLens(1/60);
  const reversalStart=w.camera.fov,out=c.zoom(-1),reversal=[];
  for(let i=0;i<60;i++){c.updateLens(1/60);reversal.push(w.camera.fov);}
  w.setFov(4);c.stopLens();const lower=c.zoom(1);c.updateLens(1/60);
  w.setFov(70);c.stopLens();const upper=c.zoom(-1);c.updateLens(1/60);
  c.zoom(1);w.setFov(34.123456789);c.updateLens(1/60);
  const external=w.camera.fov;g.mode='play';return{rows,reversalStart,out,reversal,lower,upper,external,physicalStatePreserved:before===physical()};
 },!!previous);
 for(const r of precision.rows.filter(r=>r.mode==='candidate')){
  assert.ok(r.maxProjectionErrorPixels<.01,JSON.stringify(r));assert.equal(r.stutters,0);assert.equal(r.end,r.target);assert.ok(r.settled);
  assert.ok(Math.abs(Math.tan(r.start*Math.PI/360)/Math.tan(r.target*Math.PI/360)-1.2)<1e-12);
 }
 if(previous)assert.ok(precision.rows.some(r=>r.mode==='previous'&&r.maxProjectionErrorPixels>3&&r.stutters>0),'The old visible zoom jumps must reproduce');
 assert.ok(precision.physicalStatePreserved);assert.equal(precision.lower,4);assert.equal(precision.upper,70);assert.equal(precision.external,34.123456789);
 let last=precision.reversalStart;for(const fov of precision.reversal){assert.ok(fov>=last);last=fov;}assert.equal(last,precision.out);

 await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(0,0,'moon');a.game.timePaused=true;a.world.setFov(8);a.observationCamera.stopLens();});
 const initial=await page.evaluate(()=>{const g=window.__cosmos.game;return JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.fuel,g.localSeconds]);});
 await page.mouse.move(700,350);await page.mouse.wheel(0,-100);
 await page.waitForFunction(()=>window.__cosmos.world.camera.fov<7&&window.__cosmos.observationCamera.lens===null);
 const wheel=await page.evaluate(()=>{const a=window.__cosmos,g=a.game;return{fov:a.world.camera.fov,state:JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.fuel,g.localSeconds]),toast:document.getElementById('toast').textContent,renderCount:a.world.renderCount};});
 assert.equal(wheel.state,initial);assert.ok(Math.abs(wheel.fov*10-Math.round(wheel.fov*10))>.01);assert.ok(!wheel.toast.startsWith('Lens'));
 await page.waitForTimeout(400);const idle=await page.evaluate(()=>window.__cosmos.world.renderCount);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.__cosmos.world.renderCount),idle,'A settled held lens reuses its frame');
 await page.keyboard.press('p');await page.waitForFunction(()=>!document.getElementById('photo-receipt').hidden);
 const photograph=await page.evaluate(async()=>{const frames=await window.__cosmos.archive.all();return frames.filter(f=>f.kind==='field').sort((a,b)=>b.createdAt-a.createdAt)[0];});
 assert.equal(photograph.fieldOfView,`${Math.round(wheel.fov*10)/10}°`);
 await page.keyboard.press('i');assert.ok((await page.locator('#panel-content').textContent()).includes(photograph.fieldOfView));await page.keyboard.press('Escape');
 await page.click('#view-button');const readouts=[];
 for(const [width,height] of [[1440,900],[1024,640],[800,600]]){
  await page.setViewportSize({width,height});await page.locator('#camera-lens').fill('83');
  const row=await page.evaluate(()=>{const a=window.__cosmos,e=document.getElementById('camera-lens-value'),r=e.getBoundingClientRect();return{fov:a.world.camera.fov,text:e.textContent,accessible:document.getElementById('camera-lens').getAttribute('aria-valuetext'),left:r.left,right:r.right,viewport:innerWidth};});
  assert.match(row.text,/^\d+(?:\.\d)?° field of view$/);assert.equal(row.accessible,row.text);assert.ok(row.left>=0&&row.right<=row.viewport);readouts.push(row);
 }
 await page.setViewportSize({width:1440,height:900});await page.click('[data-action=resume]');
 const exact=await page.evaluate(()=>{const a=window.__cosmos;a.game.timePaused=true;return a.world.camera.fov;});
 await page.click('#review-button');assert.match(await page.locator('#review-speed').textContent(),/ · \d+(?:\.\d)?° field of view$/);await page.click('[data-action=resume]');
 assert.equal(await page.evaluate(()=>window.__cosmos.world.camera.fov),exact);
 await page.click('#pause-button');const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cosmos-voyager-save-v2')));assert.equal(saved.fov,exact);
 await page.reload();await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#continue');assert.equal(await page.evaluate(()=>window.__cosmos.world.camera.fov),exact);
 return{...precision,wheel:{fov:wheel.fov,physicalStatePreserved:wheel.state===initial,centralLensNotice:false,settledFrameReused:true},photographFieldOfView:photograph.fieldOfView,readouts,exactSavedLens:exact};
}
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&process.env.COSMOS_TEST_ENGINE!==name)continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  if(previous){const body=(await fs.readFile(path.join(previous,'src/observation-camera.js'),'utf8')).replace("from './encounter-context.js'","from '/src/encounter-context.js'");await page.route('**/comparison/observation-camera.js',r=>r.fulfill({body,contentType:'text/javascript'}));}
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');
  const lensPrecision=await checkLensPrecision(page);
  if(lensOnly){assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),lensPrecision,errors,passed:true});console.log({name,lensPrecision:true,passed:true});}
  else{
  const composition=[];
  for(const [width,height] of [[1440,900],[1024,640],[800,600]]){
   await page.setViewportSize({width,height});
   for(const chapter of [0,2])for(const passage of [false,true])for(const fov of [70,58,35,20,4])for(const lag of [0,.18]){
    await page.evaluate(({chapter,passage,fov})=>{const a=window.__cosmos;a.startChapter(chapter);a.game.timePaused=true;a.game.view='chase';a.game.look.identity();if(passage)a.beginTransit(.15);a.world.setFov(fov);a.world.followReady=false;},{chapter,passage,fov});
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const result=await page.evaluate(async lag=>{
     const a=window.__cosmos,g=a.game,w=a.world,t=await import('three');g.mode='loading';
     w.follow.copy(g.player.quaternion);w.followReady=true;
     const aimScale=Math.min(1,Math.tan(w.camera.fov*Math.PI/360)/Math.tan(58*Math.PI/360));
     if(lag)g.player.quaternion.multiply(new t.Quaternion().setFromEuler(new t.Euler(lag*.5*aimScale,lag*aimScale,lag*.5)));
     const physical=()=>JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.fuel,g.localSeconds]);const before=physical();
     w.update(g.player,0,{view:'chase',look:g.look,transit:g.stage==='transit',time:g.localSeconds});
     const boxes=['.chapter-heading','.flight-nav','.telemetry','.log-shortcut','.objective','#cruise-scale','#flight-hint','#safety'].flatMap(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return r.width&&r.height?[{selector,left:r.left,right:r.right,top:r.top,bottom:r.bottom}]:[];});
     const point=new t.Vector3(),bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity},overlaps=new Set();
     // Test actual projected triangles, not an empty bounding-box corner.
     const intersects=(a,b,c,r)=>{
      if(Math.max(a[0],b[0],c[0])<=r.left||Math.min(a[0],b[0],c[0])>=r.right||Math.max(a[1],b[1],c[1])<=r.top||Math.min(a[1],b[1],c[1])>=r.bottom)return false;
      const corners=[[r.left,r.top],[r.right,r.top],[r.right,r.bottom],[r.left,r.bottom]];
      for(const [p,q] of [[a,b],[b,c],[c,a]]){const nx=p[1]-q[1],ny=q[0]-p[0],tri=[a,b,c].map(v=>v[0]*nx+v[1]*ny),box=corners.map(v=>v[0]*nx+v[1]*ny);if(Math.max(...tri)<Math.min(...box)||Math.min(...tri)>Math.max(...box))return false;}
      return true;
     };
     w.shipRoot.traverse(o=>{if(!o.isMesh)return;const attr=o.geometry.attributes.position,index=o.geometry.index,vertices=[];
      for(let i=0;i<attr.count;i++){point.fromBufferAttribute(attr,i).applyMatrix4(o.matrixWorld).project(w.shipCamera);const x=(point.x+1)*innerWidth/2,y=(1-point.y)*innerHeight/2;vertices.push([x,y]);bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);bounds.top=Math.min(bounds.top,y);bounds.bottom=Math.max(bounds.bottom,y);}
      for(let i=0;i<(index?.count??attr.count);i+=3){const tri=[0,1,2].map(k=>vertices[index?index.getX(i+k):i+k]);for(const r of boxes)if(!overlaps.has(r.selector)&&intersects(...tri,r))overlaps.add(r.selector);}
     });
     return{bounds,overlaps:[...overlaps],physicalStatePreserved:physical()===before,fov:w.camera.fov,shipFov:w.shipCamera.fov};
    },lag);
    const row={width,height,chapter,passage,fov,lag,...result};composition.push(row);
    assert.deepEqual(result.overlaps,[],JSON.stringify(row));assert.ok(result.physicalStatePreserved);assert.equal(result.shipFov,fov);
    if(!lag&&fov>=58)assert.ok(result.bounds.left>=0&&result.bounds.right<=width&&result.bounds.top>=0&&result.bounds.bottom<=height,JSON.stringify(row));
    if(name==='Chrome'&&width===800&&fov===58&&!lag)await page.screenshot({path:`tests/screenshots/chase-composition-${chapter}-${passage?'passage':'encounter'}.png`});
   }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(2);a.game.timePaused=true;a.game.chapterTime=30;});
  const initial=await page.evaluate(()=>{const a=window.__cosmos,g=a.game;return{position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),attitude:g.player.quaternion.toArray(),fuel:g.fuel,localSeconds:g.localSeconds};});
  await page.click('#view-button');assert.equal(await page.locator('#panel').getAttribute('data-view'),'camera');
  const layouts=[];
  for(const [width,height] of [[1440,900],[1024,640],[800,600]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const layout=await page.evaluate(()=>({buttons:[...document.querySelectorAll('#panel button')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return{text:e.textContent.trim(),x:r.x,y:r.y,width:r.width,height:r.height};}),scroll:document.querySelector('.camera-content').scrollHeight,client:document.querySelector('.camera-content').clientHeight}));
   for(const b of layout.buttons){assert.ok(b.height>=44&&b.x>=0&&b.x+b.width<=width&&b.y>=0&&b.y+b.height<=height,JSON.stringify({name,width,b}));}
   await page.screenshot({path:`tests/screenshots/v39-camera-${name}-${width}.png`});layouts.push({width,height,...layout});
  }
  await page.setViewportSize({width:1440,height:900});await page.locator('#camera-lens').fill('80');
  const fov=await page.evaluate(()=>window.__cosmos.world.camera.fov);assert.ok(fov>4&&fov<10);
  await page.locator('[data-follow=saturn]').click();await page.waitForTimeout(1800);
  const acquired=await page.evaluate(()=>{const a=window.__cosmos,g=a.game;return{tracking:g.tracking,freeLook:g.freeLook,project:a.world.project(a.world.bodyPositions.saturn,g.player),position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),attitude:g.player.quaternion.toArray(),fuel:g.fuel,localSeconds:g.localSeconds};});
  assert.equal(acquired.tracking,'saturn');assert.equal(acquired.freeLook,true);assert.ok(Math.hypot(acquired.project.x,acquired.project.y)<.002);
  for(const k of Object.keys(initial))assert.deepEqual(acquired[k],initial[k]);
  await page.waitForTimeout(500);const held=await page.evaluate(()=>window.__cosmos.world.renderCount);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>window.__cosmos.world.renderCount),held);
  // Changing camera position is independent of a chosen subject or control
  // mode. Record at dispatch so normal chase easing before a key event is
  // not mistaken for a discontinuity caused by that event.
  await page.evaluate(()=>{
   const {game:g,world:w,observationCamera:c}=window.__cosmos;
   const snapshot=()=>({view:g.view,tracking:g.tracking,freeLook:g.freeLook,fov:w.camera.fov,camera:w.camera.quaternion.toArray(),physical:{p:g.player.position.toArray(),v:g.player.velocity.toArray(),q:g.player.quaternion.toArray(),fuel:g.fuel,seconds:g.localSeconds,angular:g.angular.toArray()}});
   window.cameraSwitches=[];window.cameraSetView=c.setView;
   c.setView=function(view){const before=snapshot();window.cameraSetView.call(this,view);window.cameraSwitches.push({before,after:snapshot()});};
  });
  const switching=[];
  async function checkSwitch(label,action,view,turning=false){
   const count=await page.evaluate(()=>window.cameraSwitches.length);await action();
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const result=await page.evaluate(()=>({count:window.cameraSwitches.length,...window.cameraSwitches.at(-1),rendered:window.__cosmos.world.camera.quaternion.toArray()}));
   assert.equal(result.count,count+1,label);assert.equal(result.after.view,view,label);
   assert.equal(result.after.tracking,result.before.tracking,label);assert.equal(result.after.freeLook,result.before.freeLook,label);
   assert.equal(result.after.fov,result.before.fov,label);assert.deepEqual(result.after.physical,result.before.physical,label);
   const dot=result.before.camera.reduce((s,v,i)=>s+v*result.rendered[i],0),angle=2*Math.acos(Math.min(1,Math.abs(dot)));
   assert.ok(angle<(turning?.1:1e-5),`${label}: camera jumped ${angle} radians`);
   switching.push({label,view,angleRadians:angle,turning,tracking:result.after.tracking,freeLook:result.after.freeLook,physicalStatePreserved:true});
  }
  await page.click('#view-button');
  for(const [label,view]of [['current-probe','probe'],['menu-chase','chase'],['current-chase','chase'],['menu-probe','probe']]){
   await checkSwitch(label,()=>page.click('#camera-'+view),view);
   assert.equal(await page.locator('[data-follow=saturn]').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('[data-follow=saturn] span').last().textContent(),'Release');
  }
  await page.click('#panel-close');
  for(const view of ['chase','probe'])await checkSwitch('keyboard-following-'+view,()=>page.keyboard.press('c'),view);
  await page.evaluate(()=>{window.testPad={id:'Synthetic Xbox',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({value:0,pressed:false}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.testPad]});});
  await page.waitForTimeout(100);
  for(const view of ['chase','probe'])await checkSwitch('xbox-following-'+view,async()=>{
   await page.evaluate(()=>window.testPad.buttons[3]={value:1,pressed:true});await page.waitForTimeout(100);
   await page.evaluate(()=>window.testPad.buttons[3]={value:0,pressed:false});await page.waitForTimeout(100);
  },view);
  await page.keyboard.press('l');await page.keyboard.down('ArrowRight');await page.keyboard.down('q');await page.waitForTimeout(150);await page.keyboard.up('q');await page.keyboard.up('ArrowRight');
  await page.waitForFunction(()=>window.__cosmos.game.angular.lengthSq()===0,null,{timeout:5000});
  for(const view of ['chase','probe'])await checkSwitch('independent-look-'+view,()=>page.keyboard.press('c'),view);
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>window.__cosmos.game.angular.lengthSq()>0));
  await checkSwitch('continuous-look-turn',()=>page.keyboard.press('c'),'chase',true);
  await page.keyboard.up('ArrowLeft');await page.waitForFunction(()=>window.__cosmos.game.angular.lengthSq()===0,null,{timeout:5000});
  await checkSwitch('turn-finished-probe',()=>page.keyboard.press('c'),'probe');
  // A following chase camera can lag behind a freshly turned spacecraft.
  // Preserve that visible orientation when returning to the probe camera.
  await page.keyboard.press('c');await page.keyboard.press('v');await page.keyboard.down('ArrowRight');await page.waitForTimeout(180);await page.keyboard.up('ArrowRight');await page.keyboard.press('v');
  const lag=await page.evaluate(()=>{const a=window.__cosmos;return a.world.follow.angleTo(a.game.player.quaternion);});assert.ok(lag>.0001);
  await checkSwitch('lagged-chase-to-probe',()=>page.keyboard.press('c'),'probe');
  await page.evaluate(attitude=>{const a=window.__cosmos;a.observationCamera.setView=window.cameraSetView;delete window.cameraSetView;delete window.cameraSwitches;a.game.player.quaternion.fromArray(attitude);a.game.angular.set(0,0,0);a.game.look.identity();a.world.followReady=false;a.observationCamera.follow('saturn');},initial.attitude);
  await page.waitForFunction(()=>window.__cosmos.observationCamera.acquired,null,{timeout:10000});
  // The existing bearing is also an optional camera control, including an
  // off-screen subject. It changes no physical state and has a real hit area.
  await page.keyboard.press('l'); // release the menu-acquired follow
  await page.keyboard.press('v'); // return to physical steering
  await page.evaluate(async()=>{const a=window.__cosmos,t=await import('three');a.game.player.quaternion.multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),Math.PI));});
  await page.waitForFunction(()=>document.getElementById('waypoint').classList.contains('offscreen'));
  const lost=await page.evaluate(()=>{const g=window.__cosmos.game;return {position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),attitude:g.player.quaternion.toArray(),fuel:g.fuel,localSeconds:g.localSeconds};});
  assert.equal(await page.locator('#waypoint').getAttribute('aria-hidden'),null);
  assert.match(await page.locator('#waypoint').getAttribute('aria-label'),/^Follow Saturn/);
  assert.equal(await page.locator('#waypoint-name').textContent(),'Follow Saturn');
  const bearingBox=await page.locator('#waypoint').boundingBox();assert.ok(bearingBox.height>=44&&bearingBox.width>=44);
  await page.click('#waypoint');assert.equal(await page.evaluate(()=>document.activeElement.id),'universe');
  await page.waitForFunction(()=>window.__cosmos.observationCamera.acquired,null,{timeout:10000});
  assert.equal(await page.locator('#waypoint').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#waypoint-name').textContent(),'Saturn · following');
  const found=await page.evaluate(()=>{const a=window.__cosmos,g=a.game;return {position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),attitude:g.player.quaternion.toArray(),fuel:g.fuel,localSeconds:g.localSeconds};});assert.deepEqual(found,lost);
  await page.focus('#waypoint');await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>window.__cosmos.game.tracking),null);assert.equal(await page.evaluate(()=>window.__cosmos.game.timePaused),true);
  await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.__cosmos.game.tracking),'saturn');
  // Selecting a different bearing while following another world switches the
  // camera target; the generic L shortcut still releases the current subject.
  await page.evaluate(()=>{const a=window.__cosmos;a.observationCamera.follow('titan');});await page.click('#waypoint');assert.equal(await page.evaluate(()=>window.__cosmos.game.tracking),'saturn');
  await page.evaluate(attitude=>{const a=window.__cosmos;a.game.player.quaternion.fromArray(attitude);a.game.look.identity();a.observationCamera.follow('saturn');},initial.attitude);
  await page.waitForFunction(()=>window.__cosmos.observationCamera.acquired,null,{timeout:10000});
  await page.screenshot({path:`tests/screenshots/camera-bearing-${name}.png`});
  // Advance the actual flight solver while recording camera error and physical
  // results against an otherwise identical untracked run.
  const motion=await page.evaluate(async()=>{
   const t=await import('three');
   const a=window.__cosmos,g=a.game,p=g.player,c=a.observationCamera;
   g.mode='panel';g.timePaused=false;g.rateIndex=4;c.acquired=true;
   const original={position:p.position.clone(),velocity:p.velocity.clone(),q:p.quaternion.clone(),look:g.look.clone(),fuel:g.fuel,seconds:g.localSeconds,rate:g.actualRate};
   function run(tracking){p.position.copy(original.position);p.velocity.copy(original.velocity);p.quaternion.copy(original.q);g.look.copy(original.look);g.fuel=original.fuel;g.localSeconds=original.seconds;g.actualRate=original.rate;g.tracking=tracking;let maxError=0;
    for(let i=0;i<240;i++){a.updateFlight(1/60,a.zeroInput);const facing=new t.Vector3(0,0,-1).applyQuaternion(p.quaternion.clone().multiply(g.look)),direction=a.world.bodyPositions.saturn.clone().sub(p.position).normalize();maxError=Math.max(maxError,facing.angleTo(direction));}
    return{position:p.position.toArray(),velocity:p.velocity.toArray(),q:p.quaternion.toArray(),fuel:g.fuel,seconds:g.localSeconds,maxError};}
   const tracked=run('saturn'),manual=run(null);g.timePaused=true;g.mode='play';return{tracked,manual};
  });
  for(const k of ['position','velocity','q','fuel','seconds'])assert.deepEqual(motion.tracked[k],motion.manual[k]);assert.ok(motion.tracked.maxError<.002);assert.ok(motion.manual.maxError>.02);
  await page.keyboard.press('l');await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>window.__cosmos.game.tracking),'saturn');
  await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>window.__cosmos.game.tracking===null,{timeout:5000});await page.keyboard.up('ArrowRight');assert.deepEqual(await page.evaluate(()=>window.__cosmos.game.player.quaternion.toArray()),initial.attitude);
  // Each wheel/controller command changes focal length by the same ratio,
  // approaches continuously, and leaves direct review/chapter lenses alone.
  const lens=await page.evaluate(async()=>{
   const a=window.__cosmos,c=a.observationCamera,w=a.world; a.game.mode='panel';w.setFov(58);c.stopLens();
   const target=c.zoom(1),values=[];for(let i=0;i<60;i++){c.updateLens(1/60);values.push(w.camera.fov);}
   w.setFov(8);const detail=c.zoom(1),detailValues=[];for(let i=0;i<60;i++){c.updateLens(1/60);detailValues.push(w.camera.fov);}
   c.zoom(1);w.setFov(34);c.updateLens(1/60);const external=w.camera.fov;
   a.game.mode='play';return{target,values,detail,detailValues,external};
  });
  assert.ok(lens.target<58&&lens.values[0]>lens.target&&lens.values[0]<58);assert.equal(lens.values.at(-1),lens.target);assert.equal(lens.detailValues.at(-1),lens.detail);assert.ok(lens.detail>6);assert.equal(lens.external,34);
  for(const [start,values] of [[58,lens.values],[8,lens.detailValues]]){let previous=start;for(const v of values){assert.ok(v<=previous);previous=v;}}
  await page.click('#view-button');await page.click('#camera-chase');assert.equal(await page.evaluate(()=>window.__cosmos.game.view),'chase');await page.click('[data-follow=saturn]');await page.waitForTimeout(1400);
  assert.equal(await page.evaluate(()=>window.__cosmos.game.tracking),'saturn');await page.keyboard.press('p');await page.waitForTimeout(600);assert.ok(await page.locator('#photo-receipt').isVisible());
  await page.keyboard.press('Escape');await page.click('[data-action=camera]');await page.locator('[data-follow=saturn]').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.__cosmos.game.tracking),null);
  await page.keyboard.press('l');await page.waitForTimeout(1200);
  await page.keyboard.press('Escape');const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('cosmos-voyager-save-v2')));assert.equal(stored.tracking,'saturn');
  await page.reload();await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#continue');
  const resumed=await page.evaluate(()=>{const g=window.__cosmos.game;return{tracking:g.tracking,position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),attitude:g.player.quaternion.toArray()};});assert.equal(resumed.tracking,'saturn');assert.deepEqual(resumed.position,stored.position);assert.deepEqual(resumed.velocity,stored.velocity);assert.deepEqual(resumed.attitude,stored.attitude);
  await page.evaluate(()=>{window.testPad={id:'Synthetic Xbox',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({value:0,pressed:false}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.testPad]});});
  const pad=async n=>{
   await page.evaluate(n=>window.testPad.buttons[n]={value:1,pressed:true},n);await page.waitForFunction(n=>window.__cosmos.input.previous[n]===true,n);
   await page.evaluate(n=>window.testPad.buttons[n]={value:0,pressed:false},n);await page.waitForFunction(n=>window.__cosmos.input.previous[n]===false,n);
  };
  await pad(9);await page.focus('[data-action=camera]');await pad(0);assert.equal(await page.locator('#panel').getAttribute('data-view'),'camera');
  await page.focus('#camera-lens');const oldLens=await page.locator('#camera-lens').inputValue();await pad(15);assert.ok(Number(await page.locator('#camera-lens').inputValue())>Number(oldLens));
  await page.focus('[data-follow=saturn]');await pad(0);assert.equal(await page.evaluate(()=>window.__cosmos.game.tracking),null);
  await page.keyboard.press('l');await page.waitForTimeout(500);await page.evaluate(()=>window.testPad.axes[2]=.5);await page.waitForFunction(()=>window.__cosmos.game.tracking===null);await page.evaluate(()=>window.testPad.axes[2]=0);
  await page.keyboard.press('l');await page.evaluate(()=>window.__cosmos.beginTransit());assert.equal(await page.evaluate(()=>window.__cosmos.game.tracking),null);
  await page.click('#view-button');assert.equal(await page.locator('[data-follow]').count(),0);await page.keyboard.press('Escape');assert.equal(await page.locator('#waypoint').isDisabled(),true);
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),lensPrecision,composition,layouts,acquired,motion,lens,switching,chaseLagRadians:lag,bearingPointerAndKeyboard:true,bearingPhysicalStatePreserved:true,bearingCanSwitchSubject:true,transitBearingIsReadOnly:true,keyboardRelease:true,heldFollowingReusesFrame:true,persistedFollowing:true,syntheticXboxCameraAndManualRelease:true,pauseCamera:true,chasePhoto:true,transitClearsTracking:true,errors,passed:true});console.log({name,passed:true});
  }
 }finally{await browser.close();}
 await fs.writeFile(process.env.COSMOS_CAMERA_REPORT||`tests/observation-camera${process.env.COSMOS_TEST_ENGINE?'-'+name:''}-results.json`,JSON.stringify({version:JSON.parse(await fs.readFile('package.json','utf8')).version,scope:lensOnly?'lens precision and lifecycle':'complete camera',sourceHashes,previous,outcomes},null,2)+'\n');
}
