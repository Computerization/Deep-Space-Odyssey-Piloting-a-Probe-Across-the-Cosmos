// One bounded review of the current exploration changes; no historical matrix.
import {chromium,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {stickVector} from '../src/input.js';
for(const angle of [0,.2,.7,Math.PI/2,2.2])for(const radius of [.05,.2,.5,1]){
 const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius,[a,b]=stickVector(x,y);
 if(radius<=.13)assert.equal(Math.hypot(a,b),0);else{assert.ok(Math.abs(Math.atan2(b,a)-angle)<1e-12);assert.ok(Math.abs(Math.hypot(a,b)-((radius-.13)/.87)**2)<1e-12);}
}
assert.ok(Math.abs(Math.hypot(...stickVector(1,1))-1)<1e-12);
const results=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&process.env.COSMOS_TEST_ENGINE!==name)continue;
 const browser=await engine.launch(options),errors=[];
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:120000});await page.click('#begin');
 await page.waitForFunction(()=>document.getElementById('objective-title').textContent.includes('Voyager 1'));
 const started=await page.evaluate(()=>({position:__cosmos.game.player.position.toArray(),fov:__cosmos.world.camera.fov}));
 await page.mouse.move(600,350);await page.mouse.down();await page.mouse.move(780,400,{steps:12});await page.mouse.up();await page.waitForTimeout(2200);
 await page.screenshot({path:`tests/screenshots/experience-${name}-opening.png`});
 await page.keyboard.press('t');await page.waitForTimeout(700);
 assert.ok(await page.evaluate(()=>__cosmos.game.rateIndex>0));
 await page.keyboard.press('m');await page.waitForSelector('[data-action="destination"]');
 assert.equal(await page.locator('.encounter-studies').getAttribute('open'),null);
 const before=await page.evaluate(()=>JSON.stringify([__cosmos.game.player.position.toArray(),__cosmos.game.player.velocity.toArray()]));
 await page.locator('button[data-action="destination"][data-value="moon"]').click();
 assert.equal(await page.evaluate(()=>JSON.stringify([__cosmos.game.player.position.toArray(),__cosmos.game.player.velocity.toArray()])),before,'Bearing selection preserves flight');
 await page.keyboard.press('m');await page.locator('.encounter-studies summary').click();await page.locator('[data-action="study"][data-value="moon"]').click();
 await page.waitForTimeout(1000);await page.keyboard.press('Space');await page.keyboard.up('Space');
 await page.evaluate(()=>{const a=__cosmos;a.game.timePaused=true;a.game.mode='play';a.world.setFov(18);a.world.needsRender=true;});
 await page.waitForTimeout(1600);await page.screenshot({path:`tests/screenshots/experience-${name}-held-moon.png`});
 const photo=await page.evaluate(async()=>{
  const a=__cosmos,before=JSON.stringify([a.game.player.position.toArray(),a.game.localSeconds]);const image=a.world.capture(a.game.player,{view:a.game.view,look:a.game.look});
  const img=new Image();img.src=image;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);const data=x.getImageData(0,0,c.width,c.height).data;let lit=0;for(let i=0;i<data.length;i+=4)if(data[i]>10)lit++;
  return{width:c.width,height:c.height,lit,physicalUnchanged:before===JSON.stringify([a.game.player.position.toArray(),a.game.localSeconds]),preservedBuffer:a.world.renderer.getContext().getContextAttributes().preserveDrawingBuffer};
 });
 assert.ok(photo.lit>10000);assert.ok(photo.physicalUnchanged);assert.equal(photo.preservedBuffer,false);
 await page.setViewportSize({width:1024,height:640});await page.keyboard.press('m');await page.screenshot({path:`tests/screenshots/experience-${name}-explore.png`});
 assert.ok(await page.locator('button[data-action="destination"][data-value="moon"]').isVisible());
 await page.evaluate(()=>__cosmos.audio.select('rings'));
 await page.waitForFunction(()=>Number.isFinite(__cosmos.audio.channels.get('rings')?.el.duration),null,{timeout:15000});
 const audio=await page.evaluate(async()=>{const a=__cosmos;await a.audio.select('rings');await new Promise(r=>setTimeout(r,500));return{...a.audio.status(),duration:a.audio.channels.get('rings').el.duration};});
 console.log(name,JSON.stringify(audio));assert.equal(audio.track,'rings');assert.ok(audio.duration>239&&audio.duration<244,'Container duration may be estimated by WebKit');
 const photos=photo.lit;results.push({name,started,photo,audio,radialStick:true,manualBearing:true,errors});assert.deepEqual(errors,[]);
 }finally{await browser.close()}
}
await fs.writeFile('tests/experience-review-results.json',JSON.stringify({version:JSON.parse(await fs.readFile('package.json')).version,results},null,2)+'\n');console.log(results);
