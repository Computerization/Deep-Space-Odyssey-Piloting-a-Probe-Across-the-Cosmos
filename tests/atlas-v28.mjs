import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const before=process.env.COSMOS_ATLAS_BEFORE==='1',outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(before&&name!=='Chrome')continue;
 const browser=await engine.launch(options),page=await browser.newPage(),errors=[],layouts=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 for(const [width,height] of [[1440,900],[1280,800],[1024,640]]){
  await page.setViewportSize({width,height});
  for(const [chapter,study] of [[0,null],[0,'moon'],[0,'earth-shadow'],[1,null],[1,'io'],[2,null],[2,'titan'],[2,'ring-plane']]){
   await page.evaluate(({chapter,study})=>{const a=window.__cosmos;a.startChapter(chapter,0,study);a.game.timePaused=true;}, {chapter,study});
   await page.click('#map-button');
   const geometry=await page.evaluate(()=>{
    const selectors=['[data-action=depart]','[data-action=review]',...Array.from(document.querySelectorAll('[data-action=study]'),e=>`[data-action=study][data-value="${e.dataset.value}"]`)];
    return {controls:selectors.map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),p=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {selector,top:r.top,bottom:r.bottom,height:r.height,visible:r.top>=0&&r.bottom<=innerHeight&&!!p&&e.contains(p)}}),horizontalOverflow:document.querySelector('#panel').scrollWidth>innerWidth};
   });
   layouts.push({width,height,chapter,study,...geometry});
   if(!before){assert.ok(geometry.controls.every(c=>c.visible),JSON.stringify(layouts.at(-1)));assert.ok(geometry.controls.every(c=>c.height>=44));assert.equal(geometry.horizontalOverflow,false);}
   if(chapter===2&&(!study||study==='titan'))await page.screenshot({path:`tests/screenshots/v28-${name}-${width}-${study||'saturn'}-${before?'before':'atlas'}.png`});
   await page.keyboard.press('Escape');
  }
 }
 if(!before){
  // Selecting a bearing changes guidance only; opening and closing the atlas keeps physical flight intact.
  await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(2);a.game.timePaused=true;});
  const physical=()=>page.evaluate(()=>{const g=window.__cosmos.game;return {position:g.player.position.toArray(),velocity:g.player.velocity.toArray(),fuel:g.fuel,time:g.localSeconds}});
  const state=await physical();await page.click('#map-button');await page.click('.destination-row[data-value=titan]');assert.deepEqual(await physical(),state);
  await page.click('#map-button');assert.equal(await page.locator('.destination-row[data-value=titan]').getAttribute('aria-pressed'),'true');
  await page.click('[data-action=map-tab][data-value=solar]');await page.click('[data-action=chart-scale][data-value="200"]');await page.locator('.chart-object-list [data-value=neptune]').click();assert.equal(await page.locator('.chart-inspector h3').textContent(),'Neptune');
  await page.screenshot({path:`tests/screenshots/v28-${name}-solar.png`});
  await page.click('[data-action=map-tab][data-value=voyage]');await page.screenshot({path:`tests/screenshots/v28-${name}-voyage.png`});
  await page.click('[data-action=map-tab][data-value=local]');
  await page.locator('.encounter-opportunities summary').click();await page.locator('.opportunity-row').last().focus();
  assert.ok(await page.locator('.opportunity-row').last().evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=document.querySelector('.atlas-footer').getBoundingClientRect().top}));
  const footer=await page.locator('.atlas-footer [data-action=depart]').boundingBox();assert.ok(footer.y+footer.height<=640);
  await page.keyboard.press('Escape');assert.deepEqual(await physical(),state);
  await page.click('#map-button');await page.click('[data-action=study][data-value=titan]');assert.equal(await page.evaluate(()=>window.__cosmos.game.study),'titan');
  await page.click('#map-button');await page.click('[data-action=main-encounter]');assert.equal(await page.evaluate(()=>window.__cosmos.game.study),null);
  await page.click('#map-button');await page.click('[data-action=depart]');assert.equal(await page.evaluate(()=>window.__cosmos.game.stage),'transit');
  await page.click('#map-button');assert.equal(await page.locator('[data-action=depart]').count(),0);await page.click('.atlas-footer [data-action=resume]');assert.equal(await page.evaluate(()=>window.__cosmos.game.mode),'play');
  // A narrow viewport falls back to one continuous scroll area, with the footer always available.
  await page.setViewportSize({width:720,height:640});await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(0);a.game.timePaused=true});await page.click('#map-button');await page.click('[data-action=map-tab][data-value=local]');await page.locator('[data-action=study][data-value=moon]').focus();
  assert.ok(await page.locator('[data-action=study][data-value=moon]').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=document.querySelector('.atlas-footer').getBoundingClientRect().top}));
  await page.screenshot({path:`tests/screenshots/v28-${name}-compact.png`});
 }
 assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),layouts,errors,passed:!before});console.log({name,layouts:layouts.length,hiddenControls:layouts.flatMap(x=>x.controls).filter(x=>!x.visible).length});
 }finally{await browser.close()}
}
await fs.writeFile(`tests/atlas-v28-${before?'before':'results'}.json`,JSON.stringify({version:before?'0.26.0':'0.28.0',outcomes},null,2));
