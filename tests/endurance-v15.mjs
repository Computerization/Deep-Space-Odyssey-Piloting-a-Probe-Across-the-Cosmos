import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2}),page=await context.newPage(),errors=[],samples=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');
 await page.evaluate(()=>{window.testContextLosses=0;document.getElementById('universe').addEventListener('webglcontextlost',()=>window.testContextLosses++);});
 const scenes=[[0,null,'Earth'],[0,'moon','Moon'],[1,null,'Jupiter'],[1,'io','Io'],[2,null,'Saturn'],[2,'titan','Titan'],[5,null,'Deep space']];
 const began=Date.now();
 for(let round=0;round<2;round++)for(const [chapter,study,name] of scenes){
  await page.evaluate(({chapter,study,round})=>{const a=window.__cosmos;a.startChapter(chapter,0,study);a.game.rateIndex=1;a.game.view=round?'chase':'probe';}, {chapter,study,round});
  await page.waitForTimeout(2000);
  const result=await page.evaluate(()=>new Promise(resolve=>{
   const intervals=[],begin=performance.now();let last=begin;
   function sample(now){intervals.push(now-last);last=now;if(now-begin<25000){requestAnimationFrame(sample);return;}
    const a=window.__cosmos,w=a.world;intervals.sort((x,y)=>x-y);
    resolve({seconds:(now-begin)/1000,frames:intervals.length,medianMs:intervals[Math.floor(intervals.length*.5)],p95Ms:intervals[Math.floor(intervals.length*.95)],p99Ms:intervals[Math.floor(intervals.length*.99)],longFrames:intervals.filter(x=>x>50).length,renderRatio:w.ratio,cloudScale:w.cloudScale,geometries:w.renderer.info.memory.geometries,textures:w.renderer.info.memory.textures,programs:w.renderer.info.programs.length,history:a.flightHistory.samples.length,contextLosses:window.testContextLosses});
   }requestAnimationFrame(sample);
  }));
  samples.push({round,name,view:round?'chase':'probe',...result});console.log(samples.at(-1));
 }
 assert.deepEqual(errors,[]);assert.ok(samples.every(s=>s.contextLosses===0&&s.history<=480));
 const chase=samples.filter(s=>s.round===1);assert.equal(new Set(chase.map(s=>s.textures)).size,1);assert.equal(new Set(chase.map(s=>s.geometries)).size,1);
 const report={version:'0.15.0',viewport:{width:1440,height:900,dpr:2},elapsedSeconds:(Date.now()-began)/1000,localBrowser:'Chrome headless / Metal',samples,resourceCountsStableAfterChaseWarmup:true,errors};
 await fs.writeFile('tests/endurance-v15-results.json',JSON.stringify(report,null,2));console.log('Endurance complete');
}finally{await browser.close();}
