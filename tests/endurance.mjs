import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const version=(await(await fetch(BASE_URL+'/package.json')).json()).version;
const output=process.env.COSMOS_ENDURANCE_REPORT||'tests/endurance-results.json',trace=output.replace(/\.json$/,'.jsonl');
const rounds=Number(process.env.COSMOS_ENDURANCE_ROUNDS||4);assert.ok(Number.isInteger(rounds)&&rounds>=4);
const rateIndex=Number(process.env.COSMOS_ENDURANCE_RATE_INDEX||0);assert.ok(Number.isInteger(rateIndex)&&rateIndex>=0&&rateIndex<=10);
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2}),page=await context.newPage(),errors=[],samples=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');await page.evaluate(()=>window.__cosmos.startChapter(0));
 await page.evaluate(()=>{window.testContextLosses=0;document.getElementById('universe').addEventListener('webglcontextlost',()=>window.testContextLosses++);});
 const scenes=[[0,null,'Earth'],[0,null,'Earth limb'],[0,'moon','Moon'],[1,null,'Jupiter'],[1,'io','Io'],[2,null,'Saturn'],[2,'titan','Titan'],[3,null,'Pale Blue Dot'],[4,null,'Heliopause'],[5,null,'Light-day']].filter(s=>!process.env.COSMOS_ENDURANCE_SCENES||process.env.COSMOS_ENDURANCE_SCENES.split(',').includes(s[2]));assert.ok(scenes.length);
 await fs.writeFile(trace,'');
 const began=Date.now();
 for(let round=0;round<rounds;round++)for(const [chapter,study,name] of scenes){
  await page.evaluate(async({chapter,study,name,round,rateIndex})=>{const a=window.__cosmos;a.startChapter(chapter,0,study);a.game.rateIndex=rateIndex;a.game.actualRate=1;a.game.view=round%2?'chase':'probe';
   if(name==='Earth limb'){
    const t=await import('three'),w=a.world,c=w.bodyPositions.earth,sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize();
    const p=sun.multiplyScalar(Math.cos(35*Math.PI/180)).addScaledVector(side,Math.sin(35*Math.PI/180)).multiplyScalar(6371*1.05).add(c);
    a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0))).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),1.2645));w.setFov(4);w.followReady=false;
   }
  }, {chapter,study,name,round,rateIndex});
  await page.waitForTimeout(2000);
  const result=await page.evaluate(()=>new Promise(resolve=>{
   const a=window.__cosmos,renderStart=a.world.renderCount,simStart=a.game.localSeconds,intervals=[],begin=performance.now();let last=begin;
   function sample(now){intervals.push(now-last);last=now;if(now-begin<8000){requestAnimationFrame(sample);return;}
    const a=window.__cosmos,w=a.world;intervals.sort((x,y)=>x-y);
    resolve({seconds:(now-begin)/1000,frames:intervals.length,renderedFrames:w.renderCount-renderStart,simulationSeconds:a.game.localSeconds-simStart,held:a.game.timePaused||a.game.boundaryPaused,audioTracks:a.audio.status().playing.length,medianMs:intervals[Math.floor(intervals.length*.5)],p95Ms:intervals[Math.floor(intervals.length*.95)],p99Ms:intervals[Math.floor(intervals.length*.99)],longFrames:intervals.filter(x=>x>50).length,renderRatio:w.ratio,cloudScale:w.cloudScale,geometries:w.renderer.info.memory.geometries,textures:w.renderer.info.memory.textures,programs:w.renderer.info.programs.length,history:a.flightHistory.samples.length,contextLosses:window.testContextLosses,drawCalls:w.renderer.info.render.calls,cloudAnisotropy:w.textures['earth-clouds.avif'].anisotropy});
   }requestAnimationFrame(sample);
  }));
  samples.push({round,name,view:round%2?'chase':'probe',...result});console.log(samples.at(-1));await fs.appendFile(trace,JSON.stringify(samples.at(-1))+'\n');
 }
 const flightValid=samples.every(s=>s.contextLosses===0&&s.history<=480&&s.renderedFrames>=s.frames*.9&&s.simulationSeconds>1&&!s.held&&s.audioTracks===1);
 // Both cameras must visit every epoch before comparing retained resources.
 // The first chase round uploads ship materials and previously unseen epoch maps.
 const warmed=samples.filter(s=>s.round>=2),stable=['textures','geometries','programs'].every(key=>new Set(warmed.map(s=>s[key])).size===1);
 const report={version,sourceURL:BASE_URL,rounds,rateIndex,sceneNames:scenes.map(s=>s[2]),flightValid,passed:flightValid&&stable&&errors.length===0,viewport:{width:1440,height:900,dpr:2},elapsedSeconds:(Date.now()-began)/1000,localBrowser:'Chrome headless / Metal',samples,resourceCountsStableAfterChaseWarmup:stable,ringshineMaps:await page.evaluate(()=>window.__cosmos.world.ringLightCache.size),errors};
 await fs.writeFile(output,JSON.stringify(report,null,2));console.log('Endurance complete');
 assert.deepEqual(errors,[]);assert.ok(flightValid,'Every sampled flight must render, advance physical time and retain a live context and score');
 assert.ok(stable,'Retained graphics resources must remain stable after all scenes and cameras have warmed');
}finally{await browser.close();}
