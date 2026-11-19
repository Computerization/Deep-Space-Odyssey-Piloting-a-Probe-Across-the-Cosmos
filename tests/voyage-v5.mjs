import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${BASE_URL}/?test=1`);await page.waitForFunction(()=>window.__cosmos);await page.evaluate(()=>document.fonts.ready);
 const fonts=await page.evaluate(()=>({body:document.fonts.check('20px Karrik'),readouts:document.fonts.check('20px "Sometype Mono"'),face:getComputedStyle(document.body).fontFamily}));
 assert.ok(fonts.body&&fonts.readouts);assert.match(fonts.face,/Karrik/);
 await page.screenshot({path:'tests/screenshots/v5-title.png'});await page.click('#begin');
 await page.waitForTimeout(900);await page.keyboard.press('Escape');await page.screenshot({path:'tests/screenshots/v5-pause.png'});
 const download=page.waitForEvent('download');await page.click('[data-action=photo]');await download;
 await page.keyboard.press('j');await page.waitForSelector('.field-delete');assert.equal(await page.locator('.field-delete').count(),1);
 const title=await page.locator('.field-caption').locator('..').locator('h3').textContent();
 await page.screenshot({path:'tests/screenshots/v5-journal.png'});
 await page.reload();await page.waitForFunction(()=>window.__cosmos);await page.click('#continue');await page.keyboard.press('j');await page.waitForSelector('.field-delete');
 assert.equal(await page.locator('.field-delete').count(),1);await page.click('.field-delete');await page.waitForFunction(()=>!document.querySelector('.field-delete'));
 await page.reload();await page.waitForFunction(()=>window.__cosmos);await page.click('#continue');await page.keyboard.press('j');await page.waitForFunction(()=>!document.getElementById('panel-content').textContent.includes('Opening'));assert.equal(await page.locator('.field-delete').count(),0);
 await page.keyboard.press('Escape');
 await page.evaluate(async()=>{const a=window.__cosmos,{Matrix4,Vector3}=await import('three');a.startChapter(0,1);const p=a.game.player,target=a.taskPoint();p.quaternion.setFromRotationMatrix(new Matrix4().lookAt(p.position,target,new Vector3(0,1,0)));p.velocity.set(30,0,0);a.game.rateIndex=0;});
 await page.waitForTimeout(400);assert.ok(await page.locator('#coast-prediction').isVisible());await page.screenshot({path:'tests/screenshots/v5-guidance.png'});
 const guidance=await page.locator('#coast-prediction').textContent();
 await page.evaluate(async()=>{const a=window.__cosmos,{Matrix4,Vector3}=await import('three');a.startChapter(0,1);a.game.player.position.copy(a.taskPoint());a.game.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(a.game.player.position,a.targetPosition(),new Vector3(0,1,0)));a.game.view='probe';a.world.setFov(38);for(const id of ['hud','chapter-intro','discovery'])document.getElementById(id).hidden=true;});
 await page.waitForTimeout(800);await page.screenshot({path:'tests/screenshots/v5-earth-limb.png'});
 await page.setViewportSize({width:1024,height:640});await page.keyboard.press('Escape');await page.screenshot({path:'tests/screenshots/v5-small-pause.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);const result={fonts,fieldPhotograph:{title,persisted:true,removedAndReloaded:true,controllerMenu:true},guidance,errors};await fs.writeFile('tests/voyage-v5-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
