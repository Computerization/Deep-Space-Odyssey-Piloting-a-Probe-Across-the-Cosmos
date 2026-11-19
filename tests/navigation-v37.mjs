import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const before=!!process.env.COSMOS_EXPECT_BEFORE,outcomes=[];
const coast=JSON.parse(await fs.readFile('tests/experience-v37-before.json','utf8')).states.find(s=>s.label==='coasting').position;
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_UI_ENGINE&&process.env.COSMOS_UI_ENGINE!==name)continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],bearings=[],time=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 for(const [width,height] of [[1440,900],[1024,640],[800,600]]){
  await page.setViewportSize({width,height});
  for(let corner=0;corner<4;corner++){
   await page.evaluate(async({coast,corner})=>{const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0);a.game.timePaused=true;a.game.chapterTime=30;a.game.view='probe';a.game.look.identity();const p=w.fromFrame(a.game.frame,[.35,.20,2.35],6371);a.game.player.position.fromArray(coast);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,a.game.frame.center,a.game.frame.y)).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),.38)).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,0,1),corner*Math.PI/2));w.followReady=false;},{coast,corner});
   await page.waitForTimeout(250);
   const r=await page.evaluate(async()=>{const a=window.__cosmos,w=a.world,t=await import('three'),label=document.querySelector('#waypoint'),box=label.getBoundingClientRect(),shown=!document.querySelector('#bearing-leader').hidden,d=document.querySelector('#bearing-stem').getAttribute('d'),coords=d?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);let tangentError=null,anchor=null;
    if(shown){const [x1,y1,x2,y2]=coords,len=Math.hypot(x2-x1,y2-y1),nx=(x2-x1)/len,ny=(y2-y1)/len;anchor={x:x1-7*nx,y:y1-7*ny};const tan=Math.tan(w.camera.fov*Math.PI/360),ray=new t.Vector3((2*anchor.x/innerWidth-1)*tan*w.camera.aspect,(1-2*anchor.y/innerHeight)*tan,-1).normalize().applyQuaternion(w.camera.quaternion),direction=w.bodyPositions.earth.clone().sub(a.game.player.position),angular=Math.asin(6371/direction.length());tangentError=Math.abs(Math.acos(Math.max(-1,Math.min(1,ray.dot(direction.normalize()))))-angular);}
    return{resolved:label.classList.contains('resolved'),leader:shown,box:{x:box.x,y:box.y,width:box.width,height:box.height},anchor,tangentError};
   });bearings.push({width,height,corner,...r});
   if(!before){assert.ok(r.resolved&&r.leader,JSON.stringify(bearings.at(-1)));assert.ok(r.box.x>=0&&r.box.x+r.box.width<=width&&r.box.y>=100&&r.box.y+r.box.height<height-90);assert.ok(r.tangentError<.0005,JSON.stringify(bearings.at(-1)));}
   if(name==='Chrome')await page.screenshot({path:`tests/screenshots/v37-${before?'before':'after'}-corner-${width}-${corner}.png`});
  }
 }
 await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(0);a.game.timePaused=true;});await page.waitForTimeout(100);
 const position=await page.evaluate(()=>window.__cosmos.game.player.position.toArray());
 for(let i=0;i<3;i++)await page.keyboard.press('t');await page.waitForTimeout(100);
 const selection=await page.evaluate(()=>({rate:window.__cosmos.game.actualRate,index:window.__cosmos.game.rateIndex,position:window.__cosmos.game.player.position.toArray(),readout:document.querySelector('#time-rate').textContent,detail:document.querySelector('#time-flow-detail').textContent,status:document.querySelector('#time-limit').textContent,toastVisible:document.querySelector('#toast').classList.contains('visible'),toast:document.querySelector('#toast').textContent}));
 assert.equal(selection.rate,0);assert.deepEqual(selection.position,position);assert.equal(selection.index,5);
 if(!before){assert.equal(selection.detail,'Press Space to resume');assert.match(selection.status,/100k× selected/);assert.equal(selection.toastVisible,false);}
 time.push({label:'held-selection',...selection});await page.screenshot({path:`tests/screenshots/v37-${before?'before':'after'}-held-time.png`});
 await page.click('#time-toggle');await page.waitForTimeout(200);const flowing=await page.evaluate(()=>({rate:window.__cosmos.game.actualRate,status:document.querySelector('#time-limit').textContent,detail:document.querySelector('#time-flow-detail').textContent}));assert.ok(flowing.rate>0&&flowing.rate<100000);assert.match(flowing.status,/Near-body limit/);time.push({label:'limited-flow',...flowing});
 await page.keyboard.down('Space');await page.waitForTimeout(100);const temporary=await page.locator('#time-flow-detail').textContent();if(!before)assert.equal(temporary,'Release Space to resume');await page.keyboard.up('Space');
 // The physical boundary path sets these same encounter-local flags. Start
 // passage through its real visible action, then test the actual time button.
 await page.evaluate(()=>{const g=window.__cosmos.game;g.boundaryPaused=true;g.proximityLimited=true;g.timePaused=false;g.actualRate=0;});await page.waitForTimeout(100);await page.click('#depart');await page.waitForTimeout(200);
 const departed=await page.evaluate(()=>({stage:window.__cosmos.game.stage,boundary:window.__cosmos.game.boundaryPaused,proximity:window.__cosmos.game.proximityLimited,rate:window.__cosmos.game.actualRate}));
 await page.click('#time-toggle');await page.waitForTimeout(100);const held=await page.evaluate(()=>({paused:window.__cosmos.game.timePaused,rate:window.__cosmos.game.actualRate}));
 if(before){assert.equal(departed.boundary,true);assert.equal(held.paused,false);assert.ok(held.rate>0);}else{assert.equal(departed.stage,'transit');assert.equal(departed.boundary,false);assert.equal(departed.proximity,false);assert.ok(departed.rate>0);assert.equal(held.paused,true);assert.equal(held.rate,0);}
 // A deliberate time hold remains deliberate across an explicit departure.
 await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(0);a.game.timePaused=true;});await page.waitForTimeout(100);await page.click('#depart');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__cosmos.game.timePaused),true);
 const layouts=[];let controller=null;
 if(!before){
  await page.evaluate(()=>{window.testPad={id:'Synthetic Xbox',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.testPad]});window.testPad.buttons[12]={pressed:true,touched:true,value:1};});await page.waitForTimeout(120);
  await page.evaluate(()=>{window.testPad.buttons[12]={pressed:false,touched:false,value:0};});await page.waitForTimeout(100);
  const padSelection=await page.locator('#time-limit').textContent();assert.match(padSelection,/selected/);assert.equal(await page.locator('#toast').evaluate(e=>e.classList.contains('visible')),false);
  await page.evaluate(()=>{window.__cosmos.game.timePaused=false;window.testPad.buttons[1]={pressed:true,touched:true,value:1};});await page.waitForTimeout(150);assert.equal(await page.locator('#time-flow-detail').textContent(),'Release B to resume');assert.equal(await page.evaluate(()=>window.__cosmos.game.actualRate),0);
  await page.evaluate(()=>{window.testPad.buttons[1]={pressed:false,touched:false,value:0};});await page.waitForTimeout(120);assert.ok(await page.evaluate(()=>window.__cosmos.game.actualRate)>0);controller={selection:padSelection,temporaryHoldResumes:true,physicalControllerTested:false};
  await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(0);a.game.timePaused=true;a.game.rateIndex=10;});
  for(const size of [{width:1440,height:900},{width:1024,height:640},{width:800,height:600}]){
   await page.setViewportSize(size);await page.waitForTimeout(150);
   const boxes=await page.locator('#time-rate,#time-flow-detail,#time-limit,#slower-time,#faster-time,#time-toggle').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{id:e.id,x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};}));
   assert.ok(boxes.every(b=>b.x>=0&&b.right<=size.width&&b.y>=0&&b.bottom<=size.height),JSON.stringify({size,boxes}));
   assert.ok(boxes.filter(b=>['slower-time','faster-time','time-toggle'].includes(b.id)).every(b=>b.width>=44&&b.height>=44));
   assert.ok(boxes.find(b=>b.id==='time-limit').y>=boxes.find(b=>b.id==='time-flow-detail').bottom);
   layouts.push({size,boxes});if(name==='Chrome')await page.screenshot({path:`tests/screenshots/v37-time-${size.width}.png`});
  }
 }
 assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),bearings,time,temporaryHold:temporary,boundaryDeparture:departed,passageTimeButton:held,deliberateHoldRetained:true,layouts,controller,errors,passed:true});
 }finally{await browser.close()}
 await fs.writeFile(`tests/navigation-v37-${before?'before':'results'}.json`,JSON.stringify({version:before?'0.36.0':'0.37.0',outcomes},null,2));
}
