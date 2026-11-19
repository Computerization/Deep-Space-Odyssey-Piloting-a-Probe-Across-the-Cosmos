import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],scenes=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
  for(const [chapter,study,label] of [[0,null,'Earth'],[0,'moon','Moon'],[1,null,'Jupiter'],[1,'io','Io'],[2,null,'Saturn'],[2,'ring-plane','Ring-plane'],[2,'titan','Titan']]){
   await page.evaluate(({chapter,study})=>{const a=window.__cosmos;a.startChapter(chapter,0,study);a.game.timePaused=true;a.game.chapterTime=30;}, {chapter,study});await page.waitForTimeout(400);
   const lit=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=50;const x=c.getContext('2d');x.drawImage(window.__cosmos.world.canvas,0,0,80,50);const p=x.getImageData(0,0,80,50).data;let lit=0;for(let i=0;i<p.length;i+=4)if(p[i]+p[i+1]+p[i+2]>15)lit++;return lit;});
   assert.ok(lit>30,`${name} ${label}: empty rendered image`);scenes.push({label,lit});
   await page.screenshot({path:`tests/screenshots/v34-${name.toLowerCase()}-${label.toLowerCase()}.png`});
  }
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),scenes,errors,passed:true});console.log({name,scenes:scenes.length,passed:true});
 }finally{await browser.close();}
 await fs.writeFile('tests/rendering-v34-results.json',JSON.stringify({version:'0.34.0',outcomes},null,2));
}
