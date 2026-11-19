import {chromium,BASE_URL} from './browser.mjs';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),page=await browser.newPage(),errors=[],views=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 for(const [width,height,chapter,study,label] of [[1440,900,0,null,'earth'],[800,600,2,null,'saturn-compact'],[1024,640,2,'titan','titan']]){
  await page.setViewportSize({width,height});await page.evaluate(({chapter,study})=>{const a=window.__cosmos;a.startChapter(chapter,0,study);a.game.timePaused=true;a.game.chapterTime=30;},{chapter,study});await page.waitForTimeout(250);
  const shutter=await page.locator('#photo-button').boundingBox();assert.ok(shutter.height>=44&&shutter.x>=0&&shutter.y+shutter.height<=height);
  await page.click('#photo-button');await page.waitForFunction(()=>!document.getElementById('photo-receipt').hidden);await page.screenshot({path:`tests/screenshots/v24-${label}-flight.png`});
  await page.click('#photo-receipt');await page.waitForFunction(()=>document.getElementById('full-photograph')?.naturalWidth>0);
  const image=await page.locator('#full-photograph').boundingBox(),controls=await page.locator('.photograph-toolbar').boundingBox();assert.ok(image.height>=height*.65);assert.ok(controls.y+controls.height<=height);
  const description=await page.locator('#photograph-description').textContent();assert.match(description,/UTC/);await page.screenshot({path:`tests/screenshots/v24-${label}-viewer.png`});
  views.push({label,width,height,shutter,image,controls,description});await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('.gallery'));await page.keyboard.press('Escape');
 }
 assert.deepEqual(errors,[]);await fs.writeFile('tests/photography-layout-v24-results.json',JSON.stringify({version:'0.24.0',views,errors,passed:true},null,2));console.log({views:views.length,errors});
}finally{await browser.close();}
