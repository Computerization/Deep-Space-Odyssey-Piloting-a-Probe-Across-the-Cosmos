import {chromium,BASE_URL} from './browser.mjs';import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 const rows=await page.evaluate(async()=>{
  const a=window.__cosmos,w=a.world; a.startChapter(0);a.game.mode='panel';a.game.timePaused=true;w.ratio=2;w.cloudScale=1;w.resize();
  const cloud=w.cloudLayer.volume.material,air=w.bodies.earth.atmosphere.material,original={cloud:cloud.fragmentShader,air:air.fragmentShader},rows=[];
  for(const mode of ['full','no-cloud','no-air','no-surface','full']){
   cloud.fragmentShader=mode==='no-cloud'?'void main(){gl_FragColor=vec4(0.);}':original.cloud;cloud.needsUpdate=true;
   air.fragmentShader=mode==='no-air'?'void main(){gl_FragColor=vec4(0.);}':original.air;air.needsUpdate=true;w.bodies.earth.mesh.visible=mode!=='no-surface';
   const times=[];let last=0;
   for(let i=0;i<150;i++){const now=await new Promise(requestAnimationFrame);if(i>30)times.push(now-last);last=now;w.update(a.game.player,0,{view:'probe',exposure:1,look:a.game.look});}
   times.sort((a,b)=>a-b);rows.push({mode,frames:times.length,meanMs:times.reduce((a,b)=>a+b,0)/times.length,medianMs:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)]});
  }return rows;
 });console.log(rows);await fs.writeFile('tests/ablation-v23-before-results.json',JSON.stringify({viewport:[1440,900],dpr:2,rows},null,2));
}finally{await browser.close();}
