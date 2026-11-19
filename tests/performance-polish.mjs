import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const BASELINE_URL=process.env.COSMOS_BASELINE_URL||'http://127.0.0.1:4188';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const reports=[];
 for(const url of [BASELINE_URL,BASE_URL]){
  const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:2}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(url+'/?test=1');await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');await page.waitForTimeout(1000);
  const hud=await page.evaluate(async()=>{
   const a=window.__cosmos;a.game.chapterTime=60;a.game.idle=0;
   let count=0;const observer=new MutationObserver(list=>count+=list.filter(m=>m.type==='childList'||m.type==='characterData').length);
   observer.observe(document.getElementById('hud'),{subtree:true,childList:true,characterData:true});
   const before=a.game.frameCount;await new Promise(r=>setTimeout(r,1200));observer.disconnect();return {mutations:count,frames:a.game.frameCount-before};
  });
  await page.keyboard.press('Escape');await page.waitForTimeout(200);
  const paused=await page.evaluate(async()=>{const w=window.__cosmos.world,before=w.renderCount??w.renderer.info.render.frame;await new Promise(r=>setTimeout(r,800));return (w.renderCount??w.renderer.info.render.frame)-before;});
  if(url===BASE_URL){assert.equal(paused,0);await page.click('[data-action=settings]');await page.waitForTimeout(100);const setting=await page.evaluate(async()=>{const w=window.__cosmos.world,before=w.renderCount;const e=document.getElementById('exposure');e.value=1.2;e.dispatchEvent(new Event('input'));await new Promise(r=>setTimeout(r,150));return w.renderCount-before;});assert.equal(setting,1);}
  reports.push({url,hud,pausedDraws:paused,errors});assert.deepEqual(errors,[]);await page.close();
 }
 assert.ok(reports[1].hud.mutations/reports[1].hud.frames<reports[0].hud.mutations/reports[0].hud.frames*.2);
 const p=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:2}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.goto(BASE_URL+'/?test=1');await p.waitForFunction(()=>window.__cosmos);await p.click('#begin');
 const render=await p.evaluate(async()=>{
  const a=window.__cosmos,g=a.game,w=a.world,{Vector3,Matrix4}=await import('three');a.startChapter(0);g.mode='loading';g.view='probe';w.setQuality('high');
  const gl=w.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');if(!ext)throw Error('GPU timer unavailable');
  const times={full:[],layered:[]};
  for(let i=0;i<44;i++){
   const full=i%4===0||i%4===3;w.capturing=full;
   const q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);w.update(g.player,0,{view:'probe'});gl.endQuery(ext.TIME_ELAPSED_EXT);gl.flush();
   while(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE))await new Promise(r=>setTimeout(r,5));
   if(i>=8&&!gl.getParameter(ext.GPU_DISJOINT_EXT))times[full?'full':'layered'].push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);
  }
  for(const data of Object.values(times))data.sort((a,b)=>a-b);
  const gpu=Object.fromEntries(Object.entries(times).map(([k,d])=>[k,{medianMs:d[Math.floor(d.length/2)],p90Ms:d[Math.floor(d.length*.9)]}]));
  const canvas=document.createElement('canvas');canvas.width=w.canvas.width;canvas.height=w.canvas.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const images=[];
  for(const fixture of ['departure','limb','crescent','moon-occlusion']){
   a.startChapter(0);g.mode='loading';g.view='probe';
   const center=w.bodyPositions.earth,sun=center.clone().negate().normalize(),side=new Vector3().crossVectors(sun,new Vector3(0,1,0)).normalize();
   if(fixture==='limb'||fixture==='crescent'){
    const phase=(fixture==='limb'?85:145)*Math.PI/180,radius=6371*(fixture==='limb'?1.65:2.5);
    g.player.position.copy(center).addScaledVector(sun,Math.cos(phase)*radius).addScaledVector(side,Math.sin(phase)*radius);
    g.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(g.player.position,center,new Vector3(0,1,0)));
   }
   if(fixture==='moon-occlusion')w.bodyPositions.moon.copy(g.player.position).lerp(center,.35);
   w.capturing=true;w.update(g.player,0,{view:'probe'});ctx.drawImage(w.canvas,0,0);const full=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   const referenceJPEG=w.canvas.toDataURL('image/jpeg',.94),referencePNG=w.canvas.toDataURL('image/png');
   w.capturing=false;w.update(g.player,0,{view:'probe'});ctx.drawImage(w.canvas,0,0);const layered=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   let sum=0,peak=0,above8=0;for(let i=0;i<full.length;i+=4){let difference=0;for(let c=0;c<3;c++){const v=Math.abs(full[i+c]-layered[i+c]);sum+=v;difference=Math.max(difference,v);}peak=Math.max(peak,difference);if(difference>8)above8++;}
   const photoMatches=w.capture()===referenceJPEG;
   images.push({fixture,meanAbsolute:sum/(canvas.width*canvas.height*3),peak,above8,photoMatches,reference:referencePNG,layered:w.canvas.toDataURL('image/png')});
  }
  return {gpu,resolution:[canvas.width,canvas.height],cloudPixels:[w.cloudLayer.target.width,w.cloudLayer.target.height],images};
 });
 for(const item of render.images){for(const key of ['reference','layered']){await fs.writeFile(`tests/screenshots/performance-${item.fixture}-${key}.png`,Buffer.from(item[key].split(',')[1],'base64'));delete item[key];}}
 assert.deepEqual(errors,[]);const result={ui:reports,...render,errors};await fs.writeFile('tests/performance-polish-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));for(const item of render.images){assert.ok(item.photoMatches,'Full-resolution photo preserved: '+item.fixture);assert.ok(item.meanAbsolute<1.5,'Image difference: '+item.fixture);}
}finally{await browser.close();}
