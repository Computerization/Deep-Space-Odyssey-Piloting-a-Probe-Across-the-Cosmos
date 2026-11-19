import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:2}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');
 await page.waitForTimeout(18000);
 const previous=await page.evaluate(()=>window.__cosmos.world.ratio);
 await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(3);a.world.ratio=2;a.world.resize();});await page.waitForTimeout(1000);
 const returned=await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(0);return a.world.ratio;});assert.equal(returned,previous);
 const samples=[];for(let i=0;i<6;i++){await page.waitForTimeout(1000);samples.push(await page.evaluate(()=>({fps:window.__cosmos.game.fps,ratio:window.__cosmos.world.ratio})));}
 const photo=await page.evaluate(async()=>{const w=window.__cosmos.world,ratio=w.ratio,image=await createImageBitmap(await(await fetch(w.capture())).blob());const size=[image.width,image.height];image.close();return {size,before:ratio,after:w.ratio};});assert.deepEqual(photo.size,[3200,2000]);assert.equal(photo.after,photo.before);
 const outgoing=await page.evaluate(()=>{const a=window.__cosmos,before=a.world.ratio;a.startChapter(3);return {before,after:a.world.ratio};});assert.equal(outgoing.after,2,'A previously stable lighter scene restores its full resolution');
 assert.deepEqual(errors,[]);const result={previous,returned,samples,photo,outgoing,errors};await fs.writeFile('tests/return-resolution-results.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{await browser.close();}
