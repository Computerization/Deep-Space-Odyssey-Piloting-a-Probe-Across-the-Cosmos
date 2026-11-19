import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');
for(const [name,camera]of [['ship-front',[1,1,8]],['ship-side',[6,2,4]],['ship-back',[-2,1,-8]]]){
 await page.evaluate(async camera=>{const a=window.__cosmos,{Vector3}=await import('three');a.startChapter(0);a.game.view='chase';a.world.shipCamera.position.set(...camera);a.world.shipCamera.lookAt(new Vector3());a.game.look.copy(a.world.shipCamera.quaternion);for(const id of ['hud','chapter-intro','discovery','toast'])document.getElementById(id).hidden=true;},camera);
 await page.waitForTimeout(1800);await page.screenshot({path:`tests/screenshots/v4-${name}.png`});
}
const fps=[];for(const chapter of [0,1,2,4]){await page.evaluate(c=>window.__cosmos.startChapter(c),chapter);await page.waitForTimeout(2200);fps.push(await page.evaluate(()=>({chapter:window.__cosmos.game.chapter,fps:window.__cosmos.game.fps,resources:window.__cosmos.world.renderer.info.memory})));}
console.log(JSON.stringify({fps,errors}));await fs.writeFile('tests/close-review-results.json',JSON.stringify({fps,errors},null,2));await browser.close();
