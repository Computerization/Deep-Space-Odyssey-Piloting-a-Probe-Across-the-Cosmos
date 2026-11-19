import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(BASE_URL+'/?test=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});
 const settle=()=>page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))));await settle();
 const stage=page.locator('#craft-stage'),tabs=page.locator('#craft-views button');
 async function shot(id){await settle();await page.screenshot({path:`tests/screenshots/spacecraft-plate-${id}.png`});}
 const counter=await page.evaluate(()=>{const r=__cosmos.world.renderer,f=r.render;window.plateDraws=0;r.render=function(...args){window.plateDraws++;const scene=args[0];if(scene.environment&&!window.plateMesh){let original,refined;const dish=o=>o.material?.name==='tex_02_AO';__cosmos.world.ship.traverse(o=>{if(dish(o))original=o;});scene.traverse(o=>{if(dish(o))refined=o;});if(refined){window.plateMesh={flightFaces:original.geometry.index.count/3,studyFaces:refined.geometry.index.count/3,sharedMaterial:refined.material===original.material,bytes:Object.values(refined.geometry.attributes).reduce((sum,a)=>sum+a.array.byteLength,refined.geometry.index.array.byteLength)};refined.geometry.addEventListener('dispose',()=>window.plateReleased=true);}}return f.apply(this,args)};return __cosmos.world.renderCount;});
 await shot('overview');await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.plateDraws),0,'a still display draws once');
 for(const [i,id] of ['antenna','cameras','power','boom'].entries()){await tabs.nth(i+1).click();await shot(id);assert.equal(await tabs.nth(i+1).getAttribute('aria-pressed'),'true');}
 await stage.focus();const before=await stage.screenshot();await page.keyboard.press('ArrowRight');await page.keyboard.press('Equal');await settle();assert.ok(!before.equals(await stage.screenshot()),'keyboard changes the image');await page.keyboard.press('Home');await settle();
 const box=await stage.boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.57,{steps:5});await page.mouse.up();await page.mouse.wheel(0,-100);await settle();
 assert.equal(await page.evaluate(()=>__cosmos.world.renderCount),counter);assert.equal(await page.evaluate(()=>localStorage.getItem('cosmos-voyager-save-v2')),null);
 await tabs.first().click();await page.setViewportSize({width:800,height:600});await shot('compact');assert.ok(await page.locator('#begin').isVisible());
 await page.click('#begin');await page.waitForFunction(()=>__cosmos.game.stage==='launch'&&__cosmos.game.mode==='play');await page.keyboard.press('n');await page.waitForFunction(()=>__cosmos.game.stage==='encounter');await page.keyboard.press('Escape');await page.waitForFunction(()=>__cosmos.game.mode==='panel');
 const mesh=await page.evaluate(()=>window.plateMesh);assert.equal(mesh.studyFaces,4*mesh.flightFaces);assert.ok(mesh.sharedMaterial);assert.ok(await page.evaluate(()=>window.plateReleased));
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cosmos-voyager-save-v2')));await page.reload();await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await tabs.nth(1).click();await settle();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('cosmos-voyager-save-v2')).position),saved.position);await page.click('#continue');await page.waitForFunction(()=>__cosmos.game.stage==='encounter'&&__cosmos.game.mode==='play');assert.deepEqual(errors,[]);
 const result={views:5,reflector:mesh,releasedOnDeparture:true,keyboardOrbitAndZoom:true,heldDraws:0,flightEpochUnaffected:true,launch:true,resume:true,errors};await fs.writeFile('tests/spacecraft-plate-results.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{await browser.close();}
