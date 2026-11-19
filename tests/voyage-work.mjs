// Replay identical pilot input without drawing. Measure main-thread voyage work,
// not FPS; compare pose and chart output against the previous playable build.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,BASE_URL} from './browser.mjs';
const browser=await chromium.launch({channel:'chrome',args:['--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});
 const result=await page.evaluate(()=>{
  const a=__cosmos,g=a.game,input={...a.zeroInput,thrust:.6,lateral:.3,vertical:0,pitch:.001,yaw:-.001,roll:.02,observe:false,brake:false,boost:false};
  const times={},states={};
  for(const scene of ['Earth','Io','Saturn','passage','held passage']){
   const passage=scene.includes('passage'),samples=[];
   for(let rep=0;rep<9;rep++){
    a.startChapter(scene==='Saturn'?2:scene==='Io'?1:0,0,scene==='Io'?'io':null);
    g.experience.seen=[];
    if(passage){a.beginTransit(scene.startsWith('held')?.5:0);g.timePaused=scene.startsWith('held');a.updateFlight(0,input);}
    const chart=document.querySelector('#passage-chart'),observer=new MutationObserver(()=>{});
    if(passage)observer.observe(document.querySelector('#passage'),{childList:true,attributes:true,subtree:true});
    const start=performance.now();for(let i=0;i<480;i++)a.updateFlight(1/60,input);
    const elapsed=performance.now()-start;if(rep>=2)samples.push(elapsed);
    states[scene]={position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),attitude:g.player.quaternion.toArray(),...(passage?{date:document.querySelector('#passage-detail').textContent,chart:chart.querySelector('[data-probe]').getAttribute('transform'),writes:observer.takeRecords().length}:{})};observer.disconnect();
   }
   times[scene]=samples.sort((x,y)=>x-y)[3];
  }
  return {framesPerSample:480,medianMilliseconds:times,states};
 });
 if(process.env.COSMOS_COMPARE_WORK){const before=JSON.parse(await fs.readFile(process.env.COSMOS_COMPARE_WORK));for(const scene of Object.keys(result.states)){
  const {writes,...state}=result.states[scene],{writes:oldWrites,...old}=before.states[scene];assert.deepEqual(state,old,scene);
  if(writes!==undefined)assert.ok(writes<oldWrites,scene+' DOM writes');
 }}
 if(process.env.COSMOS_WORK_REPORT)await fs.writeFile(process.env.COSMOS_WORK_REPORT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
