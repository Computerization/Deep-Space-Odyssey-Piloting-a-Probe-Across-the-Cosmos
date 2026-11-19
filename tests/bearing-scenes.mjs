import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const version=(await(await fetch(BASE_URL+'/package.json')).json()).version,outcomes=[];
const selected=(process.env.COSMOS_TEST_ENGINE||'Chrome,Firefox,WebKit').split(',');
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
if(!selected.includes(name))continue;
const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],samples=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');
 const engineName=name;
 for(const [chapter,study,name] of [[0,null,'earth'],[0,'moon','moon'],[1,null,'jupiter'],[2,null,'saturn'],[2,'ring-plane','ring-plane'],[2,'titan','titan'],[5,null,'light-day']]){
  await page.evaluate(({chapter,study})=>{const a=window.__cosmos;a.startChapter(chapter,0,study);a.game.timePaused=true;a.game.chapterTime=30;}, {chapter,study});await page.waitForTimeout(400);
  const result=await page.evaluate(()=>{const marker=document.getElementById('waypoint'),r=marker.getBoundingClientRect(),a=window.__cosmos;return {resolved:marker.classList.contains('resolved'),visible:!marker.hidden,left:r.left,right:r.right,top:r.top,bottom:r.bottom,leader:!document.getElementById('bearing-leader').hidden,subject:a.exploration.destination()?.id,title:document.getElementById('waypoint-name').textContent};});
  assert.ok(result.visible&&result.left>=0&&result.right<=1440&&result.top>=100&&result.bottom<800);
  if(name!=='light-day')assert.equal(result.resolved,true);else assert.equal(result.resolved,false);
  await page.screenshot({path:`tests/screenshots/bearing-${engineName}-${name}.png`});samples.push({name,...result});
 }
 await page.evaluate(async()=>{const a=window.__cosmos,t=await import('three');a.startChapter(0);a.game.timePaused=true;a.game.chapterTime=30;a.game.view='probe';a.game.look.identity();const p=a.game.player,center=a.world.bodyPositions.earth,angle=a.world.camera.fov/2+Math.asin(6371/p.position.distanceTo(center))*180/Math.PI*.25;p.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p.position,center,new t.Vector3(0,1,0))).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(1,0,0),-angle*Math.PI/180));a.world.followReady=false;});await page.waitForTimeout(400);
 const partial=await page.locator('#waypoint').boundingBox();assert.ok(await page.locator('#waypoint.resolved').isVisible());assert.ok(partial.y>300&&partial.y<400);await page.screenshot({path:`tests/screenshots/bearing-${name}-partial-world.png`});
 await page.evaluate(async()=>{const a=window.__cosmos,t=await import('three');a.startChapter(2);a.game.timePaused=true;a.game.player.quaternion.multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),Math.PI));});await page.waitForTimeout(250);
 assert.ok(await page.locator('#waypoint.offscreen').isVisible());assert.equal(await page.locator('#bearing-leader').isVisible(),false);
 await page.keyboard.press('g');await page.waitForTimeout(100);assert.equal(await page.locator('#waypoint').isVisible(),false);assert.equal(await page.locator('#bearing-leader').isVisible(),false);await page.keyboard.press('g');
 await page.setViewportSize({width:1024,height:640});await page.evaluate(()=>{window.__cosmos.startChapter(2,0,'ring-plane');window.__cosmos.game.timePaused=true;});await page.waitForTimeout(250);
 const compact=await page.locator('#waypoint').boundingBox();assert.ok(compact.x>=0&&compact.x+compact.width<=1024&&compact.y>95&&compact.y+compact.height<540);await page.screenshot({path:'tests/screenshots/v38-bearing-compact.png'});
 await page.evaluate(async()=>{const a=window.__cosmos,t=await import('three');a.startChapter(0);a.game.timePaused=true;a.game.destination='moon';const earth=a.world.bodyPositions.earth,moon=a.world.bodyPositions.moon;const p=earth.clone().addScaledVector(earth.clone().sub(moon).normalize(),10000);a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,moon,new t.Vector3(0,1,0)));a.world.setFov(4);});await page.waitForTimeout(250);
 assert.equal(await page.locator('#waypoint').evaluate(e=>e.classList.contains('resolved')),false);assert.match(await page.locator('#waypoint-name').textContent(),/Moon/);
 await page.evaluate(()=>window.__cosmos.game.destination='earth');await page.waitForTimeout(250);assert.ok(await page.locator('#waypoint.resolved').isVisible());assert.equal(await page.locator('#bearing-leader').isVisible(),false);
 // Paired worlds remain the subject of the picture, even as the camera rolls
 // or the lens changes. The HUD must clear both their discs and its own text.
 const pairs=[];
 for(const size of [{width:1440,height:900},{width:1024,height:640},{width:800,height:600}]){
  await page.setViewportSize(size);
  for(const [chapter,study,other] of [[0,'moon','earth'],[1,'io','jupiter']])for(const fov of [58,40])for(const roll of [0,1,2,3]){
   const physical=await page.evaluate(async({chapter,study,fov,roll})=>{
    const a=window.__cosmos,t=await import('three');a.startChapter(chapter,0,study);a.game.timePaused=true;a.game.view='probe';
    a.game.player.quaternion.multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,0,1),roll*Math.PI/2));a.world.setFov(fov);
    return {p:a.game.player.position.toArray(),v:a.game.player.velocity.toArray(),q:a.game.player.quaternion.toArray(),fuel:a.game.fuel,time:a.game.localSeconds};
   },{chapter,study,fov,roll});
   await page.waitForTimeout(200);
   const clearance=await page.evaluate(async other=>{
    const a=window.__cosmos,w=a.world,{discFraming}=await import('/src/view-framing.js'),{BODY_DATA}=await import('/src/mission.js');
    const f=discFraming(w.project(w.bodyPositions[other],a.game.player),BODY_DATA[other].radius,w.camera.fov,w.camera.aspect),b=f.bounds;
    const world={left:Math.max(0,(1+b.x-b.halfWidth)*innerWidth/2),right:Math.min(innerWidth,(1+b.x+b.halfWidth)*innerWidth/2),top:Math.max(0,(1-b.y-b.halfHeight)*innerHeight/2),bottom:Math.min(innerHeight,(1-b.y+b.halfHeight)*innerHeight/2)};
    const r=document.getElementById('waypoint').getBoundingClientRect(),label={left:r.left,right:r.right,top:r.top,bottom:r.bottom};
    const overlays=[...document.querySelectorAll('.chapter-heading,.flight-nav,.telemetry,.log-shortcut,#scene-reading,#photo-receipt,#cruise-scale,#flight-hint,#thrust-feedback,#safety')].filter(e=>!e.hidden).map(e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom};}).filter(r=>r.right>r.left&&r.bottom>r.top);
    const points=document.getElementById('bearing-leader').hidden?null:document.getElementById('bearing-stem').getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
    const avoid=[world,...overlays],labelClear=avoid.every(b=>r.right<=b.left||r.left>=b.right||r.bottom<=b.top||r.top>=b.bottom);
    const leaderClear=!points||avoid.every(b=>{for(let segment=0;segment<points.length-2;segment+=2)for(let i=0;i<=1000;i++){const x=points[segment]+(points[segment+2]-points[segment])*i/1000,y=points[segment+1]+(points[segment+3]-points[segment+1])*i/1000;if(x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom)return false;}return true;});
    return {visible:f.visible,label,world,labelClear,leaderClear,hasLeader:!!points,physical:{p:a.game.player.position.toArray(),v:a.game.player.velocity.toArray(),q:a.game.player.quaternion.toArray(),fuel:a.game.fuel,time:a.game.localSeconds}};
   },other);
   assert.deepEqual(clearance.physical,physical);delete clearance.physical;
   assert.ok(clearance.visible&&clearance.labelClear&&clearance.leaderClear,JSON.stringify({engine:name,...size,study,fov,roll,...clearance}));
   pairs.push({...size,study,fov,roll,...clearance});
   if(roll===0&&fov===58)await page.screenshot({path:`tests/screenshots/bearing-pair-${name}-${study}-${size.width}.png`});
  }
 }
 // A thick atmosphere extends beyond the solid body's silhouette. Check the
 // actual rendered shell with camera rays, independently of the HUD's bounds.
 const atmospheres=[];
 for(const size of [{width:1440,height:900},{width:1024,height:640},{width:800,height:600}]){
  await page.setViewportSize(size);
  for(const fov of [58,50])for(const roll of [0,1]){
   const physical=await page.evaluate(async({fov,roll})=>{
    const a=window.__cosmos,t=await import('three');a.startChapter(2,0,'titan');a.game.timePaused=true;a.game.view='probe';
    a.game.player.quaternion.multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,0,1),roll*Math.PI/2));a.world.setFov(fov);
    return {p:a.game.player.position.toArray(),v:a.game.player.velocity.toArray(),q:a.game.player.quaternion.toArray(),fuel:a.game.fuel,time:a.game.localSeconds};
   },{fov,roll});
   await page.waitForTimeout(200);
   const clearance=await page.evaluate(async()=>{
    const a=window.__cosmos,t=await import('three'),w=a.world,shell=w.bodies.titan.atmosphere;
    const bounds=shell.geometry.boundingSphere.clone().applyMatrix4(shell.matrixWorld),ray=new t.Raycaster(),r=document.getElementById('waypoint').getBoundingClientRect();
    let intersections=0;
    for(let x=0;x<=10;x++)for(let y=0;y<=6;y++){
     ray.setFromCamera(new t.Vector2(2*(r.left+r.width*x/10)/innerWidth-1,1-2*(r.top+r.height*y/6)/innerHeight),w.camera);
     intersections+=ray.ray.intersectsSphere(bounds);
    }
    return {intersections,sampledRays:77,label:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},physical:{p:a.game.player.position.toArray(),v:a.game.player.velocity.toArray(),q:a.game.player.quaternion.toArray(),fuel:a.game.fuel,time:a.game.localSeconds}};
   });
   assert.deepEqual(clearance.physical,physical);delete clearance.physical;
   if(!process.env.COSMOS_BEARING_DIAGNOSTIC)assert.equal(clearance.intersections,0,JSON.stringify({name,...size,fov,roll,...clearance}));
   assert.ok(clearance.label.left>=0&&clearance.label.right<=size.width&&clearance.label.top>=100&&clearance.label.bottom<size.height-100);
   atmospheres.push({...size,fov,roll,...clearance});
   if(fov===58&&roll===0)await page.screenshot({path:`tests/screenshots/bearing-atmosphere-${name}-${size.width}.png`});
  }
 }
 assert.deepEqual(errors,[]);const result={name,engineVersion:browser.version(),samples,pairs,atmospheres,partialWorldBearing:partial,offscreenBearing:true,guidanceToggle:true,compact,occultedTargetUsesInstrumentMarker:true,screenFillingWorldKeepsMarginBearing:true,errors,passed:true};outcomes.push(result);console.log({name,pairedViews:pairs.length,partial,errors});
}finally{await browser.close();}

}
await fs.writeFile('tests/bearing-scenes-results.json',JSON.stringify({version,outcomes},null,2)+'\n');
