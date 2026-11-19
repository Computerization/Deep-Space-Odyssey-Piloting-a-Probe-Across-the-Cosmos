import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
await fs.mkdir('tests/screenshots',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(`${BASE_URL}/?test=1`);
await page.waitForFunction(()=>window.__cosmos||!document.getElementById('fatal').hidden,{timeout:60000});
await page.waitForTimeout(1500);
await page.screenshot({path:'tests/screenshots/initial-title.png'});
console.log('initial',await page.evaluate(()=>window.__cosmos?.inspect()||document.getElementById('fatal-message').textContent));
for(const i of [0,1,2,3,4]){
 await page.evaluate(i=>window.__cosmos.startChapter(i),i);await page.waitForTimeout(1200);
 await page.screenshot({path:`tests/screenshots/initial-${i}.png`});
 console.log('chapter',i,await page.evaluate(()=>window.__cosmos.inspect()));
}
console.log('ERRORS',JSON.stringify(errors));
await fs.writeFile('tests/initial-errors.json',JSON.stringify(errors,null,2));
await browser.close();
