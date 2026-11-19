import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1000,height:625}}),errors=[],outcomes=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 for(const [label,chapter,study,view,panel] of [['held-earth',0,null,'probe',false],['paused-titan',2,'titan','chase',true]]){
  await page.evaluate(({chapter,study,view})=>{const a=window.__cosmos;a.startChapter(chapter,0,study);a.game.view=view;a.game.timePaused=true;},{chapter,study,view});
  await page.waitForTimeout(1800);if(panel)await page.click('#pause-button');
  const result=await page.evaluate(async()=>{
   const a=window.__cosmos,w=a.world,ext=w.renderer.getContext().getExtension('WEBGL_lose_context');if(!ext)throw Error('Context-loss extension unavailable');
   const pose={p:a.game.player.position.toArray(),v:a.game.player.velocity.toArray(),q:a.game.player.quaternion.toArray(),fuel:a.game.fuel};
   const before=w.renderCount,lost=new Promise(r=>w.canvas.addEventListener('webglcontextlost',r,{once:true}));ext.loseContext();await lost;await new Promise(r=>setTimeout(r,100));
   const restored=new Promise(r=>w.canvas.addEventListener('webglcontextrestored',r,{once:true}));ext.restoreContext();await restored;await new Promise(r=>setTimeout(r,1200));
   const c=document.createElement('canvas');c.width=64;c.height=40;const x=c.getContext('2d');x.drawImage(w.canvas,0,0,64,40);const p=x.getImageData(0,0,64,40).data;let lit=0;for(let i=0;i<p.length;i+=4)if(p[i]+p[i+1]+p[i+2]>15)lit++;
   const refreshed=w.renderCount;await new Promise(r=>setTimeout(r,500));
   return {mode:a.game.mode,rendered:refreshed>before,lit,settledDraws:w.renderCount-refreshed,posePreserved:JSON.stringify(pose)===JSON.stringify({p:a.game.player.position.toArray(),v:a.game.player.velocity.toArray(),q:a.game.player.quaternion.toArray(),fuel:a.game.fuel})};
  });
  assert.ok(result.rendered&&result.lit>20&&result.posePreserved);assert.equal(result.settledDraws,0);
  await page.screenshot({path:`tests/screenshots/v23-context-${label}.png`});outcomes.push({label,...result});console.log({label,...result});
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile('tests/context-recovery-v23-results.json',JSON.stringify({version:'0.23.0',engineVersion:browser.version(),simulatedContextLoss:true,outcomes,errors},null,2));
}finally{await browser.close();}
