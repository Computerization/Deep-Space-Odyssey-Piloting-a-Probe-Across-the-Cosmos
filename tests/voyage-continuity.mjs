// A private Chrome context. Real reloads run the page's unload handler.
import {chromium,BASE_URL} from './browser.mjs';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const checks=[],issues=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
 const load=async()=>{await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});};
 const reload=async()=>{await page.reload();await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});};
 const stored=()=>page.evaluate(()=>localStorage.getItem('cosmos-voyager-save-v2'));
 const check=(yes,message)=>{(yes?checks:issues).push(message);console.log(yes?'PASS':'FAIL',message);};
 await load();await page.click('#landing-notes');await reload();check(await stored()===null,'About on a first visit creates no flight');
 await page.evaluate(()=>__cosmos.startChapter(1));await page.keyboard.press('Escape');await page.locator('#panel[data-view=pause]').waitFor();await reload();
 const saved=await stored();await page.click('#chapter-select');await reload();check(await stored()===saved,'title encounter menu preserves an existing checkpoint byte for byte');
 await page.click('#begin');await page.locator('#panel[data-view=replace-voyage]').waitFor();await page.keyboard.press('Enter');check(await stored()===saved&&await page.locator('#landing').isVisible(),'cancelling a new voyage retains the previous flight');
 await page.click('#chapter-select');await page.click('[data-action=chapter][data-value="2"]');await page.locator('#panel[data-view=replace-voyage]').waitFor();await page.keyboard.press('Escape');check(await stored()===saved,'cancelling a title chapter jump retains the previous flight');
 await page.click('#chapter-select');const atlas=await page.locator('.route-row strong').allTextContents();check(atlas.join('|')==='Earth|Jupiter|Titan|Saturn|Pale Blue Dot|Interstellar space|One light-day','encounter atlas follows all seven actual stops');await page.click('[data-action=chapter][data-value=titan]');await page.click('[data-action=replace-voyage]');await page.waitForFunction(()=>__cosmos.game.mode==='play'&&__cosmos.game.study==='titan');check(await page.locator('#chapter-title').textContent()==='Titan','title encounter selection opens the actual Titan flyby');
 for(const [study,next,p,legacy] of [['moon',0,.42],[null,1,.16],[null,1,.83],['moon',0,.53,true],[null,1,.13,true]]){
  const sample=()=>page.evaluate(()=>{const g=__cosmos.game;return {p:g.player.position.toArray(),q:g.player.quaternion.toArray(),l:g.look.toArray(),progress:g.transit.progress,paused:g.timePaused,stage:g.stage};});
  await page.evaluate(({study,next,p})=>{const a=__cosmos;a.startChapter(0);a.game.player.position.addScaledVector(a.world.getFrame('earth').x,2500);a.game.look.setFromAxisAngle(a.world.getFrame('earth').y,.27);a.beginTransit(p,{chapter:next,study,name:study?'Moon':'Jupiter'});a.game.timePaused=true;},{study,next,p});
  const before=await sample();await reload();if(legacy)await page.evaluate(()=>{const key='cosmos-voyager-save-v2',s=JSON.parse(localStorage.getItem(key));for(const k of ['origin','orientation','look','segmentStart'])delete s.transit[k];localStorage.setItem(key,JSON.stringify(s));});await page.click('#continue');await page.waitForFunction(()=>__cosmos.game.stage==='transit');const after=await sample();
  check(after.paused&&before.progress===after.progress&&Math.hypot(...after.p.map((n,i)=>n-before.p[i]))<.00005&&Math.abs(after.q.reduce((sum,v,i)=>sum+v*before.q[i],0))>.999999999&&Math.abs(after.l.reduce((sum,v,i)=>sum+v*before.l[i],0))>.999999999,`resume ${legacy?'a legacy save':'a current save'} at the same ${study?'local':'dated'} passage pose and clock (${p})`);
 }
 const heldProgress=await page.evaluate(()=>__cosmos.game.transit.progress);await page.keyboard.press('Space');await page.waitForFunction(p=>__cosmos.game.transit.progress>p,heldProgress);check(await page.evaluate(()=>!__cosmos.game.timePaused),'Space resumes a held passage restored from disk');
 await page.evaluate(()=>{const a=__cosmos;a.startChapter(5);a.game.view='probe';});await page.keyboard.press('n');await page.locator('#panel[data-view=ending]').waitFor();await page.click('[data-action=resume]');check(await page.evaluate(()=>!__cosmos.game.timePaused&&__cosmos.game.view==='probe'),'Stay with Voyager retains the lens mode and returns to active flight');
 await page.keyboard.press('Escape');await page.locator('#panel[data-view=pause]').waitFor();await page.click('[data-action=home]');await page.waitForTimeout(300);check(await page.evaluate(()=>__cosmos.game.mode==='landing'&&!document.pointerLockElement),'returning to title releases mouse control');
 await page.click('#begin');await page.click('[data-action=replace-voyage]');await page.waitForFunction(()=>__cosmos.game.stage==='launch'&&__cosmos.game.mode==='play');check(await page.locator('#launch-film').isVisible(),'confirmed restart opens the launch film');
 assert.deepEqual(errors,[]);assert.deepEqual(issues,[]);await fs.writeFile('tests/continuity-Chrome-results.json',JSON.stringify({checks,errors},null,2)+'\n');
}finally{await browser.close();}
