// Sustained, real animation-frame intervals, not a shader microbenchmark.
// Run by itself. Same route & controls on each build; entry distances can differ.
import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',args:process.platform==='darwin'?['--use-angle=metal','--ignore-gpu-blocklist']:[]});
try{
 const dpr=Number(process.env.COSMOS_DPR||1),page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:dpr,locale:'en-US'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');await page.keyboard.press('n');
 const result={engine:browser.version(),viewport:[1280,800],dpr,frames:300,encounters:{}};
 for(const [i,name] of [[0,'earth'],[1,'jupiter'],[2,'saturn']]){
  await page.evaluate(index=>__cosmos.startChapter(index),i);await page.keyboard.press('l');await page.keyboard.down('a');
  result.encounters[name]=await page.evaluate(async()=>{
   const {world,game}=__cosmos,data=[];let prev;for(let i=0;i<361;i++){const now=await new Promise(requestAnimationFrame);if(i>60)data.push(now-prev);prev=now;}
   data.sort((a,b)=>a-b);return {p50:data[149],p95:data[284],p99:data[296],worst:data[299],over50ms:data.filter(t=>t>50.1).length,textures:world.renderer.info.memory.textures,geometries:world.renderer.info.memory.geometries,tracked:game.tracking};
  });await page.keyboard.up('a');assert.equal(result.encounters[name].tracked,name);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify(result,null,2));if(process.env.COSMOS_CADENCE_REPORT)await fs.writeFile(process.env.COSMOS_CADENCE_REPORT,JSON.stringify(result,null,2)+'\n');
}finally{await browser.close();}
