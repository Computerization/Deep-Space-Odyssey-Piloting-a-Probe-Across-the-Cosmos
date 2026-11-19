// A held view should retain photographic detail without continuous redraws.
import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const baseline=process.env.COSMOS_SETTLED_BASELINE==='1',outcomes=[];
const dpr=Number(process.env.COSMOS_SETTLED_DPR||2);assert.ok([1,2].includes(dpr));
const version=JSON.parse(await fs.readFile('package.json')).version;
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1000,height:625},deviceScaleFactor:dpr}),errors=[],views=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  if(baseline){
   assert.ok(process.env.COSMOS_SETTLED_PREVIOUS,'Set COSMOS_SETTLED_PREVIOUS to the baseline source directory');
   for(const file of ['src/main.js','src/world.js','src/rendering/cloud-layer.js'])await page.route('**/'+file,r=>r.fulfill({path:process.env.COSMOS_SETTLED_PREVIOUS+'/'+file,contentType:'text/javascript'}));
  }
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:120000});await page.click('#begin');
  await page.evaluate(()=>{
   const a=window.__cosmos,w=a.world,g=a.game;window.detailDraws=[];
   const update=w.update;w.update=function(...args){const start=performance.now();try{return update.apply(this,args);}finally{detailDraws.push({settled:!!this.lastRender.options.settled,layered:this.cloudLayer.enabled(this),pending:!!this.cloudDetail.pending,cpuMs:performance.now()-start});}};
   window.detailState=()=>JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.localSeconds,g.fuel,g.look.toArray(),w.camera.fov]);
   window.detailPixels=()=>{const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(w.canvas,0,0);return {pixels:x.getImageData(0,0,c.width,c.height).data,png:c.toDataURL().split(',')[1]};};
  });
  const stable=async()=>{
   for(let i=0;i<40;i++){
    const before=await page.evaluate(()=>window.__cosmos.world.renderCount);await page.waitForTimeout(250);
    if(await page.evaluate(n=>{const w=window.__cosmos.world,d=w.cloudDetail;return w.renderCount===n&&!w.needsRender&&!(w.needsRefinement?.())&&!d.pending&&(!d.wanted||d.active?.key===d.wanted.key&&d.uniforms.cloudPatchWeight.value===1);},before))return;
   }throw Error(name+': held detail did not settle');
  };
  for(const [label,radius,phase,yaw,fov] of [['day',2.35,35,0,58],['close',1.08,35,0,58],['limb',1.05,35,1.2645,4]]){
   const initial=await page.evaluate(async({radius,phase,yaw,fov})=>{
    const a=window.__cosmos,w=a.world,g=a.game,T=await import('three');a.startChapter(0);g.timePaused=true;g.view='probe';g.look.identity();w.setQuality('high');w.cloudScale=.75;w.setFov(fov);
    const c=w.bodyPositions.earth,sun=c.clone().negate().normalize(),side=new T.Vector3().crossVectors(sun,new T.Vector3(0,1,0)).normalize();
    const p=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180)).multiplyScalar(w.bodies.earth.data.radius*radius).add(c);
    g.player.position.copy(p);g.player.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(p,c,new T.Vector3(0,1,0))).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw));w.followReady=false;detailDraws.length=0;return detailState();
   },{radius,phase,yaw,fov});
   await stable();
   const result=await page.evaluate(async()=>{
    const a=window.__cosmos,w=a.world,g=a.game,count=w.renderCount,physical=detailState(),draws=detailDraws.slice(),options={...w.lastRender.options},live=detailPixels();g.mode='loading';
    w.capturing=true;w.update(g.player,0,{...options,settled:false});const reference=detailPixels();w.capturing=false;w.update(g.player,0,options);
    let sq=0,max=0;for(let i=0;i<live.pixels.length;i++)if(i%4!==3){const d=live.pixels[i]-reference.pixels[i];sq+=d*d;max=Math.max(max,Math.abs(d));}
    g.mode='play';return {physical,referencePreserved:physical===detailState(),count,draws,options:{settled:!!options.settled},referenceError:{rmse:Math.sqrt(sq/(live.pixels.length*.75)),max},image:live.png,reference:reference.png};
   });
   assert.equal(result.physical,initial);assert.ok(result.referencePreserved);
   if(baseline)assert.ok(result.referenceError.rmse>0,'Reproduce the lower-resolution held view');
   else{assert.equal(result.referenceError.max,0,JSON.stringify({message:'Held picture matches direct full-resolution rendering',name,label,options:result.options,draws:result.draws,error:result.referenceError}));assert.ok(result.options.settled);assert.equal(result.draws.filter(d=>d.settled).length,1,'Refine once after the picture settles');}
   await stable();const count=await page.evaluate(()=>window.__cosmos.world.renderCount);await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>window.__cosmos.world.renderCount),count,'Refined picture remains cached');
   for(const mode of ['image','reference'])await fs.writeFile(`tests/screenshots/settled-${name}-${label}-${baseline?'baseline-':''}${mode}.png`,Buffer.from(result[mode],'base64'));
   delete result.image;delete result.reference;views.push({label,...result});console.log({name,label,error:result.referenceError});
  }
  await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(0);a.game.timePaused=true;a.world.setQuality('high');a.world.cloudScale=.75;});await stable();
  const before=await page.evaluate(()=>({state:detailState(),count:detailDraws.length,position:window.__cosmos.game.player.position.toArray()}));
  await page.keyboard.down('ArrowRight');await page.waitForFunction(n=>detailDraws.length>n,before.count);const turning=await page.evaluate(()=>({draw:detailDraws.at(-1),position:window.__cosmos.game.player.position.toArray()}));await page.keyboard.up('ArrowRight');
  assert.equal(turning.draw.settled,false);assert.equal(turning.draw.layered,true);assert.deepEqual(turning.position,before.position);await stable();
  const beforeLens=await page.evaluate(()=>detailDraws.length);await page.mouse.move(500,300);await page.mouse.wheel(0,240*dpr);await page.waitForFunction(n=>detailDraws.length>n,beforeLens);
  const lens=await page.evaluate(n=>detailDraws.slice(n),beforeLens);assert.ok(lens.some(d=>!d.settled&&d.layered));await stable();
  await page.evaluate(()=>{const g=window.__cosmos.game;g.rateIndex=0;g.actualRate=1;g.timePaused=false;detailDraws.length=0;});await page.waitForTimeout(350);
  const flight=await page.evaluate(()=>({seconds:window.__cosmos.game.localSeconds,draws:detailDraws.slice()}));assert.ok(flight.seconds>0&&flight.draws.length>1);assert.ok(flight.draws.every(d=>!d.settled&&d.layered));
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),views,turning,lens,flight,errors,passed:true});
 }finally{await browser.close();}
}
await fs.writeFile(process.env.COSMOS_SETTLED_REPORT||'tests/settled-detail-results.json',JSON.stringify({version,baseline,dpr,outcomes},null,2)+'\n');
