import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');
 for(const id of ['earthrise','shadow','io-pair','ring-edge','titan-light']){
  const result=await page.evaluate(async id=>{
   const a=window.__cosmos,g=a.game,w=a.world,{Vector3,Matrix4}=await import('three');
   const {OPPORTUNITIES,opportunityPoint,opportunityCandidate}=await import('./src/opportunities.js');
   const o=OPPORTUNITIES.find(o=>o.id===id);a.startChapter(o.chapter);g.view='probe';g.guidance=false;g.explored=[];
   g.player.position.copy(opportunityPoint(id,w));let target=w.bodyPositions[o.body];
   if(id==='io-pair'||id==='earthrise'){
    const other=w.bodyPositions[id==='io-pair'?'jupiter':'earth'];
    target=g.player.position.clone().add(target.clone().sub(g.player.position).normalize().add(other.clone().sub(g.player.position).normalize()).multiplyScalar(10000));
   }
   g.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(g.player.position,target,new Vector3(0,1,0)));w.setFov(58);w.update(g.player,0,{view:'probe'});
   const candidate=opportunityCandidate(g,w);g.angular.set(0,0,0);
   for(let i=0;i<115;i++)a.updateFlight(1/30,{...a.zeroInput,observe:true});
   for(const name of ['hud','chapter-intro','discovery','toast'])document.getElementById(name).hidden=true;
   return {id,candidate:candidate?.id,recorded:g.explored.includes('event-'+id),heightTexture:w.textures['moon-height.webp'].image.width};
  },id);
  results.push(result);console.log(result);
  await page.waitForTimeout(500);await page.screenshot({path:`tests/screenshots/v8-${id}.png`});
  assert.equal(result.candidate,'event-'+id);assert.ok(result.recorded);
 }
 assert.deepEqual(errors,[]);await fs.writeFile('tests/encounter-opportunities-results.json',JSON.stringify({results,errors},null,2)+'\n');
}finally{await browser.close();}
