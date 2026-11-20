import assert from 'node:assert/strict';
import {chromium,BASE_URL} from './browser.mjs';

const offline=process.argv.includes('--offline');
const browser=await chromium.launch({channel:'chrome'});
try{
 const ctx=await browser.newContext({locale:'en-US',viewport:{width:1100,height:700}});
 const page=await ctx.newPage(),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(BASE_URL).origin)external.push(r.url());});
 const wait=fn=>page.waitForFunction(fn,null,{timeout:120000});
 const at=(id,text)=>page.waitForFunction(([id,text])=>document.querySelector(id)?.textContent.includes(text),[id,text]);
 const back=async()=>{await page.keyboard.press('Escape');await wait(()=>__cosmos.game.mode==='play');};
 const shot=name=>page.screenshot({path:`tests/screenshots/outer-${name}.png`});
 const seen=()=>page.evaluate(()=>__cosmos.game.experience.seen);
 await page.goto(BASE_URL+'/?test=1',{waitUntil:'commit'});await wait(()=>window.__cosmos);
 if(offline){
  await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});
  await wait(()=>!!navigator.serviceWorker.controller);await ctx.setOffline(true);
  await page.reload({waitUntil:'commit'});await wait(()=>window.__cosmos);
  const archive=await page.evaluate(async()=>{
   const still=await fetch('assets/archive/plasma-spectrum.jpg');const img=await createImageBitmap(await still.blob());
   const wave=await fetch('assets/archive/interstellar-plasma-compact.mp4',{headers:{Range:'bytes=0-1023'}});
   return [img.width,wave.status,(await wave.arrayBuffer()).byteLength,navigator.onLine];
  });assert.deepEqual(archive,[550,206,1024,false]);
 }
 await at('#begin','Begin voyage');await page.click('#landing-language');await at('#begin','开始航行');
 assert.equal(await page.getAttribute('html','lang'),'zh-CN');await shot('landing');
 await page.click('#chapter-select');await page.locator('[data-action=chapter][data-value="3"]').click();
 await at('#outer-station h3','最后的合影');await shot('pale');
 const bearing=await page.textContent('#outer-value');await page.keyboard.down('ArrowRight');
 try{await page.waitForFunction(b=>document.querySelector('#outer-value').textContent!==b,bearing,{timeout:12000});}finally{await page.keyboard.up('ArrowRight');}
 await shot('turn');
 await page.keyboard.press('x');const plate=page.locator('.archive-plate');await plate.waitFor();
 await plate.click({position:{x:10,y:10}});await at('#plate-reading','试试');assert.ok(!(await seen()).includes('3:0'));
 const box=await plate.boundingBox();await plate.click({position:{x:box.width*.5946,y:box.height*.5196}});
 await at('#plate-reading','找到了');assert.ok((await seen()).includes('3:0'));await shot('archive');
 await page.locator('#locate-earth').focus();await page.keyboard.press('Enter');assert.ok(await page.locator('#earth-locator').isHidden());
 await page.keyboard.press('Enter');await at('#locate-earth','隐藏标记');assert.ok(await page.locator('#earth-locator').isVisible());await back();
 await page.keyboard.press('n');await wait(()=>__cosmos.game.stage==='transit');await wait(()=>document.querySelector('#passage-chart.outer-inset:not([hidden])'));
 await shot('passage');await page.keyboard.press('n');await at('#outer-station h3','星际空间的音高');
 await page.keyboard.press('x');await page.click('[data-band=early]');await at('.spectrum-caption','2.1');assert.ok(!(await seen()).includes('4:0'));
 await page.click('[data-band=late]');await at('.spectrum-caption','2.6');await at('#comparison-result','观测笔记');
 await wait(()=>document.querySelector('#historic-media').currentTime>=19&&document.querySelector('#historic-media').readyState>=2);
 await shot('plasma');await back();await page.keyboard.press('n');await wait(()=>__cosmos.game.stage==='transit');
 await page.keyboard.press('n');await at('#outer-station h3','去程一天');await shot('lightday');
 await page.keyboard.press('x');await page.click('#radio-step');await page.click('#radio-step');assert.ok(!(await seen()).includes('5:0'));
 await page.click('#radio-step');await at('#radio-state','地球收到了');await back();
 await page.keyboard.press('n');await at('#panel-title','航行仍在继续');await page.locator('.record-sleeve summary').focus();await page.keyboard.press('Enter');
 await wait(()=>document.querySelector('.record-sleeve').open);await shot('ending');await back();
 const discoveries=await seen();for(const id of ['3:0','4:0','5:0'])assert.equal(discoveries.filter(x=>x===id).length,1,id);
 await page.keyboard.press('Escape');await page.click('[data-action=settings]');
 const pose=()=>page.evaluate(()=>[__cosmos.game.chapter,...['position','velocity','quaternion'].map(k=>__cosmos.game.player[k].toArray())]);
 const before=await pose();await page.selectOption('#language','en');await at('#panel-title','Settings');await at('#outer-station h3','A day each way');assert.deepEqual(await pose(),before);
 await page.selectOption('#language','zh-CN');await at('#panel-title','设置');await page.reload({waitUntil:'commit'});await wait(()=>window.__cosmos);
 await at('#continue','继续航行');await page.click('#continue');await at('#outer-station h3','去程一天');assert.deepEqual(await seen(),discoveries);
 await page.setViewportSize({width:800,height:600});await shot('compact');await page.keyboard.press('g');await wait(()=>document.querySelector('#outer-station').hidden);
 await page.keyboard.press('g');await wait(()=>!document.querySelector('#outer-station').hidden);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(`Chrome ${offline?'offline':''}: route, turn, three instruments, archive media, outlook, language switch and restored save passed`);
}finally{await browser.close();}
