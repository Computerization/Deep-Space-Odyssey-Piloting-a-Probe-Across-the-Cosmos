import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});const errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(`${BASE_URL}/?test=1`);await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');
const views=[['earth',0,0,58],['earth-limb',0,1,38],['jupiter',1,0,48],['jupiter-close',1,0,22],['io',1,3,30],['saturn',2,0,50],['rings',2,1,58],['titan',2,2,30]];
for(const[name,chapter,task,fov]of views){
 await page.evaluate(async({chapter,task,fov})=>{const a=window.__cosmos,{Matrix4,Vector3}=await import('three');a.startChapter(chapter,task);a.game.player.position.copy(a.taskPoint());a.game.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(a.game.player.position,a.targetPosition(),new Vector3(0,1,0)));a.game.view='probe';a.world.setFov(fov);for(const id of ['hud','chapter-intro','discovery','toast'])document.getElementById(id).hidden=true;},{chapter,task,fov});await page.waitForTimeout(1200);await page.screenshot({path:`tests/screenshots/v3-${name}.png`});
 if(chapter===1&&task===0)console.log(name,await page.evaluate(()=>window.__cosmos.world.bodies.jupiter.uniforms.localCamera.value.toArray()));
}
await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(0);a.game.view='chase';for(const id of ['hud','chapter-intro','discovery','toast'])document.getElementById(id).hidden=true;});await page.waitForTimeout(600);await page.screenshot({path:'tests/screenshots/v3-voyager.png'});
console.log('ERRORS',errors);await fs.writeFile('tests/photographic-visual-results.json',JSON.stringify({views:views.map(v=>v[0]),errors},null,2));await browser.close();
