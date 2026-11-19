import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const version=(await(await fetch(BASE_URL+'/package.json')).json()).version;
assert.ok(process.env.COSMOS_PREVIOUS_WORLD,'Set COSMOS_PREVIOUS_WORLD to the saved previous renderer source.');
const previous=await fs.readFile(process.env.COSMOS_PREVIOUS_WORLD,'utf8'),current=await(await fetch(BASE_URL+'/src/world.js')).text(),outcomes=[];
const digest=s=>createHash('sha256').update(s).digest('hex');
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),checks=[],errors=[];
 try{
  for(const dpr of [1,2]){
   const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:dpr});
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await page.route('**/src/world.js?render-reference=1',r=>r.fulfill({body:previous,contentType:'application/javascript'}));
   await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
   await page.evaluate(async()=>{
    const a=window.__cosmos,w=a.world,{CosmosWorld}=await import('/src/world.js?render-reference=1'),t=await import('three');a.game.mode='loading';
    window.previousWorld=CosmosWorld.prototype;
    window.renderVariants={previous:{resize:CosmosWorld.prototype.resize,update:CosmosWorld.prototype.update},current:{resize:w.resize,update:w.update}};
    window.selectVariant=name=>Object.assign(w,renderVariants[name]);window.fromHalf=t.DataUtils.fromHalfFloat;window.canvasWrites=0;
    for(const key of ['width','height']){const d=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,key);Object.defineProperty(w.canvas,key,{configurable:true,get(){return d.get.call(this)},set(value){canvasWrites++;d.set.call(this,value)}});}
    window.physical=()=>JSON.stringify([a.game.player.position.toArray(),a.game.player.velocity.toArray(),a.game.player.quaternion.toArray(),a.game.look.toArray(),a.game.fuel,a.game.localSeconds]);
    window.draw=()=>w.update(a.game.player,0,{view:a.game.view,look:a.game.look,exposure:1});
    window.scenePixels=()=>{const p=new Uint16Array(w.frameTarget.width*w.frameTarget.height*4);w.renderer.readRenderTargetPixels(w.frameTarget,0,0,w.frameTarget.width,w.frameTarget.height,p);return p;};
    window.output=()=>{const c=document.createElement('canvas');c.width=innerWidth;c.height=innerHeight;c.getContext('2d').drawImage(w.canvas,0,0,c.width,c.height);return c.toDataURL().split(',')[1];};
    window.resolution=()=>({output:[w.canvas.width,w.canvas.height],scene:[w.frameTarget.width,w.frameTarget.height],starRatio:w.starMaterial.uniforms.pixelRatio.value,glareSize:w.sunGlare.material.uniforms.size.value,cloud:[w.cloudLayer.target.width,w.cloudLayer.target.height]});
    window.difference=(a,b)=>{if(a.length!==b.length)throw Error('Scene grids must match');let max=0,total=0,changed=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i]){const d=Math.abs(fromHalf(a[i])-fromHalf(b[i]));max=Math.max(max,d);total+=d;changed++;}return {max,mean:total/a.length,changed,channelFraction:changed/a.length};};
   });
   const images=[];
   for(const [chapter,study,view] of [[0,null,'probe'],[0,null,'chase'],[0,'moon','probe'],[2,null,'chase']])for(const quality of ['high','ultra','balanced','performance']){
    const pair=await page.evaluate(async({chapter,study,view,quality,keepImage})=>{
     const a=window.__cosmos,w=a.world;selectVariant('current');a.game.view=view;a.startChapter(chapter,0,study);a.game.mode='loading';a.game.timePaused=true;w.setQuality(quality);
     if(quality==='high'){w.ratio=Math.min(devicePixelRatio,1.25);w.cloudScale=.75;w.resize();}draw();
     const before=physical(),values=[],raw=[],previews=[];
     for(const mode of ['previous','previous','current']){
      selectVariant(mode);w.resize();draw();raw.push(scenePixels());values.push({...resolution(),calls:w.renderer.info.render.calls,memory:{...w.renderer.info.memory}});
      if(keepImage&&(mode==='current'||previews.length===0))previews.push(output());
     }
     const present=output();canvasWrites=0;w.resize();const unchanged={writes:canvasWrites,retained:present===output()};
     return {values,unchanged,physicalUnchanged:before===physical(),baselineVariation:difference(raw[0],raw[1]),difference:difference(raw[1],raw[2]),previews};
    },{chapter,study,view,quality,keepImage:name==='Chrome'&&dpr===2&&quality==='high'});
    const d=pair.difference,b=pair.baselineVariation;
    assert.ok(Number.isFinite(d.mean)&&d.mean<Math.max(.00005,b.mean*2)&&d.max<=Math.max(.2,b.max*2)&&d.channelFraction<.002,JSON.stringify({name,dpr,chapter,study,view,quality,d,b}));
    for(const key of ['scene','starRatio','glareSize','cloud','calls','memory'])assert.deepEqual(pair.values[1][key],pair.values[2][key],key);
    assert.deepEqual(pair.unchanged,{writes:0,retained:true});assert.ok(pair.physicalUnchanged);
    for(let i=0;i<pair.previews.length;i++)await fs.writeFile(`tests/screenshots/stable-output-${chapter}-${study||'main'}-${view}-${i?'current':'previous'}.png`,Buffer.from(pair.previews[i],'base64'));delete pair.previews;
    images.push({chapter,study,view,quality,...pair});
   }
   await page.setViewportSize({width:1001,height:627});await page.waitForFunction(()=>window.__cosmos.world.camera.aspect===1001/627);
   const fractional=await page.evaluate(async()=>{
    const a=window.__cosmos,w=a.world;selectVariant('current');a.game.view='probe';a.startChapter(0);a.game.mode='loading';a.game.timePaused=true;w.setQuality('high');
    const before=physical(),sizes=[];
    for(const ratio of [1.375,1,2,.75,1.25,1.5]){
     w.ratio=ratio;canvasWrites=0;w.resize();draw();const actualRatio=Math.min(devicePixelRatio,ratio);
     sizes.push({ratio,actualRatio,writes:canvasWrites,...resolution(),expectedScene:[Math.floor(innerWidth*actualRatio),Math.floor(innerHeight*actualRatio)],expectedOutput:[innerWidth*devicePixelRatio,innerHeight*devicePixelRatio],aspect:w.camera.aspect});
    }
    w.ratio=.875;w.resize();draw();const flight={...resolution(),ratio:w.ratio};canvasWrites=0;
    const photo=w.capture(),bitmap=await createImageBitmap(await(await fetch(photo)).blob()),photoPixels=[bitmap.width,bitmap.height];bitmap.close();
    return {sizes,flight,photoPixels,photoCanvasWrites:canvasWrites,after:{...resolution(),ratio:w.ratio},physicalUnchanged:before===physical(),memory:{...w.renderer.info.memory},programs:w.renderer.info.programs.length};
   });
   for(const s of fractional.sizes){assert.deepEqual(s.scene,s.expectedScene);assert.deepEqual(s.output,s.expectedOutput);assert.equal(s.writes,0);assert.equal(s.aspect,1001/627);assert.equal(s.starRatio,s.actualRatio);}
   assert.deepEqual(fractional.photoPixels,[1001*dpr,627*dpr]);assert.equal(fractional.photoCanvasWrites,0);assert.deepEqual(fractional.after,fractional.flight);assert.ok(fractional.physicalUnchanged);
   let pacing=[];
   if(dpr===2){
    pacing=await page.evaluate(async()=>{
     const a=window.__cosmos,w=a.world,rows=[],now={setQuality:w.setQuality,noteFrame:w.noteFrame};
     const outputPixels=()=>{const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;c.getContext('2d').drawImage(w.canvas,0,0);return c.getContext('2d').getImageData(0,0,c.width,c.height).data;};
     const error=(p,q)=>p.reduce((s,v,i)=>s+(i%4===3?0:Math.abs(v-q[i])),0)/(p.length/4*3);
     for(const [chapter,study] of [[0,'moon'],[1,null],[2,null],[0,null]]){
      a.startChapter(chapter,0,study);a.game.mode='loading';a.game.timePaused=true;a.game.view='probe';const before=physical(),variants={},pixels={};
      for(const mode of ['previous','current']){
       selectVariant(mode);const proto=mode==='previous'?previousWorld:now;proto.setQuality.call(w,'high');draw();
       // A paced 30 Hz display is not evidence that the GPU needs fewer scene pixels.
       for(let i=0;i<360;i++)proto.noteFrame.call(w,1/30);draw();
       variants[mode]={...resolution(),cloudScale:w.cloudScale,png:output()};pixels[mode]=outputPixels();
      }
      selectVariant('current');now.setQuality.call(w,'ultra');draw();const reference=outputPixels();
      rows.push({chapter,study,variants,previousError:error(pixels.previous,reference),currentError:error(pixels.current,reference),physicalUnchanged:before===physical()});
     }
     return rows;
    });
    for(const row of pacing){
     assert.deepEqual(row.variants.current.scene,[2002,1254]);assert.deepEqual(row.variants.previous.scene,[1001,627]);assert.ok(row.physicalUnchanged);
     if(row.study==='moon'||row.chapter>0){assert.equal(row.currentError,0,'Native geometry matches the Ultra reference');assert.ok(row.previousError>0,'Reproduce the resampled image');}
     for(const mode of ['previous','current']){await fs.writeFile(`tests/screenshots/clarity-${name}-${row.chapter}-${row.study||'main'}-${mode}.png`,Buffer.from(row.variants[mode].png,'base64'));delete row.variants[mode].png;}
    }
   }
   checks.push({dpr,imagePairs:images.length,images,fractional,pacing});await page.close();console.log({name,dpr,passed:true,imagePairs:images.length});
  }
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),checks,errors});
 }finally{await browser.close();}
}
await fs.writeFile('tests/render-performance-results.json',JSON.stringify({version,worldSha256:digest(current),referenceWorldSha256:digest(previous),method:'Same physical views, scene targets and quality. Compare previous/current linear HDR scene pixels with a repeated previous-draw control; check display/scene sizing, star/glare/cloud scales, fixed output during adaptation and full-resolution photo restoration.',outcomes},null,2)+'\n');
