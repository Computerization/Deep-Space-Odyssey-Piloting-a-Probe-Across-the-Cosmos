import {chromium,BASE_URL} from './browser.mjs';import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2}),rows=[];
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 for(const view of ['probe','chase']){
  const row=await page.evaluate(async view=>{
   const a=window.__cosmos,w=a.world,r=w.renderer,gl=r.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
   a.startChapter(0);a.game.mode='panel';a.game.timePaused=true;w.ratio=2;w.cloudScale=1;w.resize();
   const render=r.render.bind(r),pending=[],passes={},known=new Map([[w.sky,'sky'],[w.scene,'surface'],[w.cloudLayer.volumeScene,'cloud volume'],[w.cloudLayer.resolveScene,'cloud resolve + atmosphere'],[w.shipScene,'spacecraft'],[w.resolveScene,'final resolve']]);let measuring=false;
   r.render=(scene,camera)=>{
    const q=measuring&&ext?gl.createQuery():null;if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);render(scene,camera);if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push({q,name:known.get(scene)||'other'});}
   };
   for(let i=0;i<150;i++){
    await new Promise(requestAnimationFrame);measuring=i>30&&i%3===0;
    w.update(a.game.player,1/60,{view,exposure:1,look:a.game.look});
    for(let j=pending.length-1;j>=0;j--){const {q,name}=pending[j];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(ext.GPU_DISJOINT_EXT))(passes[name]??=[]).push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);pending.splice(j,1);}}
   }
   r.render=render;for(const {q}of pending)gl.deleteQuery(q);
   return {view,passes:Object.fromEntries(Object.entries(passes).map(([name,s])=>{s.sort((a,b)=>a-b);return [name,{samples:s.length,medianMs:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)]}];}))};
  },view);rows.push(row);console.log(row);
 }
 await fs.writeFile('tests/profile-v23-before-results.json',JSON.stringify({viewport:[1440,900],dpr:2,rows},null,2));
}finally{await browser.close();}
