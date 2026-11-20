import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,BASE_URL} from './browser.mjs';
// Measure broad structure on the visible flight canvas, not stars picked from a
// single pixel or the surrounding HTML. Store actual screen captures for review.
const before=process.argv.includes('--baseline'),dir=`tests/screenshots/flight-sky/${before?'before':'after'}`;
await fs.mkdir(dir,{recursive:true});const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({locale:'en-US',viewport:{width:1100,height:700}}),errors=[],results={};
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(BASE_URL+'/?test=1',{waitUntil:'commit'});await page.waitForFunction(()=>window.__cosmos||document.querySelector('#fatal:not([hidden])'),null,{timeout:180000}).catch(async e=>{console.error(errors,await page.locator('body').innerText(),page.url());throw e;});assert.ok(await page.evaluate(()=>!!window.__cosmos),JSON.stringify(errors));
 if(process.argv.includes('--offline')){
  await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await page.context().setOffline(true);await page.reload({waitUntil:'commit'});await page.waitForFunction(()=>window.__cosmos,null,{timeout:120000});
 }
 async function enterFromTitle(){
  await page.click('#chapter-select');await page.locator('[data-action=chapter][data-value="3"]').click();
  if(await page.locator('[data-action=replace-voyage]').isVisible())await page.click('[data-action=replace-voyage]');
  await page.waitForFunction(()=>__cosmos.game.mode==='play');
 }
 await enterFromTitle();
 const initialView=await page.evaluate(()=>__cosmos.game.view);await page.keyboard.press('h');await page.waitForFunction(()=>!__cosmos.game.showHud&&getComputedStyle(document.querySelector('#hud')).opacity==='0');
 // The camera-change toast is transient HTML, not part of the sky being measured.
 await page.addStyleTag({content:'#toast{visibility:hidden!important}'});
 async function view(target){if(await page.evaluate(()=>__cosmos.game.view)!==target)await page.keyboard.press('c');}
 async function shot(name){
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const png=await page.screenshot({path:`${dir}/${name}.png`});
  results[name]=await page.evaluate(async b64=>{
   const img=await createImageBitmap(new Blob([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],{type:'image/png'}));
   const c=document.createElement('canvas');c.width=32;c.height=20;const ctx=c.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(img,0,0,32,20);img.close();const p=ctx.getImageData(0,0,32,20).data,tiles=[];
   for(let i=0;i<p.length;i+=4)tiles.push(Math.round(.2126*p[i]+.7152*p[i+1]+.0722*p[i+2]));const a=[...tiles].sort((a,b)=>a-b);return{p10:a[64],p50:a[320],p90:a[576],tiles};
  },png.toString('base64'));
 }
 for(const id of [3,4,5]){
  if(id!==3)await page.evaluate(i=>__cosmos.startChapter(i),id);
  await view('probe');await shot(`c${id}-probe`);await view('chase');await shot(`c${id}-chase`);
 }
 await view('probe');await shot('turn-start');await page.keyboard.down('ArrowRight');
 try{await page.waitForTimeout(1100);await shot('turning');}finally{await page.keyboard.up('ArrowRight');}
 await page.evaluate(()=>{__cosmos.startChapter(1);__cosmos.game.timePaused=false;});await view('chase');await page.keyboard.press('l');
 const pos=()=>page.evaluate(()=>__cosmos.game.player.position.toArray()),start=await pos();await page.keyboard.down('a');try{await page.waitForTimeout(500);await shot('jupiter-orbit');}finally{await page.keyboard.up('a');}assert.notDeepEqual(start,await pos());
 await fs.writeFile(`${dir}/metrics.json`,JSON.stringify({initialView,results,errors}));
 console.log(initialView,JSON.stringify(Object.fromEntries(Object.entries(results).map(([k,{tiles,...q}])=>[k,q]))));assert.deepEqual(errors,[]);
 if(!before){
 const registration=await page.evaluate(async()=>{
  const {Vector2}=await import('three'),mesh=__cosmos.world.galacticSky,tex=mesh.material.map,g=mesh.geometry.attributes;let maxError=0;
  for(let i=1;i<g.position.count;i+=23){
   const x=g.position.getX(i),y=g.position.getY(i),z=g.position.getZ(i);if(Math.abs(y)>.999)continue;
   const u=.5-Math.atan2(-z,x)/(2*Math.PI),v=.5-Math.asin(y)/Math.PI,at=tex.transformUv(new Vector2().fromBufferAttribute(g.uv,i));
   const dx=Math.abs(at.x-u);maxError=Math.max(maxError,Math.min(dx,Math.abs(1-dx)),Math.abs(at.y-v));
  }return {maxError,width:tex.image.width,height:tex.image.height};
 });assert.ok(registration.maxError<1e-5,JSON.stringify(registration));assert.equal(registration.width,2*registration.height);console.log('ICRF registration and texture:',registration);
 // A deliberate first-person choice survives returning to chapter selection.
 await view('probe');await page.keyboard.press('Escape');await page.waitForFunction(()=>__cosmos.game.mode==='panel');
 await page.reload({waitUntil:'commit'});await page.waitForFunction(()=>!!window.__cosmos,null,{timeout:180000});await enterFromTitle();assert.equal(await page.evaluate(()=>__cosmos.game.view),'probe');
 assert.equal(initialView,'chase');for(const id of [3,4,5]){const q=results[`c${id}-probe`];assert.ok(q.p50>=13&&q.p90-q.p10>=8,`Visible extended sky without the HUD in chapter ${id}: ${JSON.stringify([q.p10,q.p50,q.p90])}`);}
 const diff=results.turning.tiles.reduce((s,x,i)=>s+Math.abs(x-results['turn-start'].tiles[i]),0)/640;assert.ok(diff>2,`Sky follows actual turn: ${diff}`);}
}finally{await browser.close();}
