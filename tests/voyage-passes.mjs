// Run against a local server. Evidence (including screenshots) stays outside the release.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium,BASE_URL} from './browser.mjs';
const out=process.env.COSMOS_REVIEW_DIR||'/tmp/cosmos-voyage-review';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',args:process.platform==='darwin'?['--use-angle=metal','--ignore-gpu-blocklist']:[]});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},locale:'en-US',reducedMotion:'no-preference'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});
 const shot=name=>page.screenshot({path:join(out,name+'.jpg'),quality:84});
 await page.click('#begin');await page.waitForFunction(()=>document.querySelector('video#launch-film').currentTime>.3);
 const report={engine:browser.version(),viewport:[1280,800]};
 report.film=await page.evaluate(async()=>{const film=document.querySelector('#launch-film'),start=__cosmos.world.renderCount,b=film.getBoundingClientRect(),t=film.currentTime;await new Promise(r=>setTimeout(r,1300));return {width:b.width,height:b.height,draws:__cosmos.world.renderCount-start,mediaSeconds:film.currentTime-t}});
 await shot('launch');await page.keyboard.press('n');await page.waitForFunction(()=>__cosmos.game.stage==='encounter');
 for(const [index,id] of [[0,'earth'],[1,'jupiter'],[2,'saturn']]){
  await page.evaluate(i=>__cosmos.startChapter(i),index);await page.waitForTimeout(450);await shot(id+'-held');
  report[id]=await page.evaluate(b=>{const {world:w,game:g}=__cosmos;return {lens:w.camera.fov,angularDiameter:2*w.observationFraming(b,g.player).angularRadius*180/Math.PI}},id);
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);await shot(id+'-turn');await page.keyboard.up('ArrowRight');await page.keyboard.press('l');await page.keyboard.down('a');
  report[id].motion=await page.evaluate(async()=>{const {world:w,game:g}=__cosmos,start=g.player.position.clone(),samples=[];let last=await new Promise(requestAnimationFrame);for(let i=0;i<40;i++){const t=await new Promise(requestAnimationFrame);samples.push(t-last);last=t;}samples.sort((a,b)=>a-b);return {p50:samples[19],p95:samples[37],distance:start.distanceTo(g.player.position),tracking:g.tracking}});await shot(id+'-circle');const ruler=page.locator('#surface-ruler');if(await ruler.count()){assert.ok(await ruler.isVisible());report[id].span=await ruler.textContent();}await page.keyboard.up('a');assert.ok(report[id].motion.distance>0);
 }
 await page.evaluate(()=>__cosmos.startChapter(5));await page.keyboard.press('n');await page.locator('#panel[data-view="ending"]').waitFor();await shot('ending');
 const turn=page.locator('#turn-record');if(await turn.count()){await turn.focus();await page.keyboard.press('Enter');assert.match(await page.locator('#coda-side').textContent(),/Side B/);await shot('ending-b');await page.keyboard.press('Enter');assert.match(await page.locator('#coda-side').textContent(),/Side A/);}
 assert.deepEqual(errors,[]);await writeFile(join(out,'review.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await browser.close()}
