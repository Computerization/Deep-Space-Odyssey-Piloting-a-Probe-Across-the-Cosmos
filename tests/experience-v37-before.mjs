import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],states=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
async function capture(label){await page.screenshot({path:`tests/screenshots/v37-before-${label}.png`});states.push({label,...await page.evaluate(()=>{const a=window.__cosmos;return{text:document.body.innerText,stage:a.game.stage,mode:a.game.mode,rate:a.game.actualRate,time:a.game.chapterTime,fov:a.world.camera.fov,view:a.game.view,position:a.game.player.position.toArray(),velocity:a.game.player.velocity.toArray()};})});}
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await capture('landing');await page.click('#begin');await page.waitForTimeout(1000);await capture('opening');
 for(let i=0;i<3;i++)await page.keyboard.press('t');await page.waitForTimeout(12000);await capture('coasting');
 await page.click('#time-toggle');await page.click('#map-button');await capture('voyage');await page.click('[data-action=map-tab][data-value=solar]');await capture('chart');await page.keyboard.press('Escape');
 await page.keyboard.press('?');await capture('controls');await page.keyboard.press('Escape');await page.keyboard.press('Escape');await capture('pause');
 await fs.writeFile('tests/experience-v37-before.json',JSON.stringify({version:'0.36.0',states,errors},null,2));
}finally{await browser.close()}
