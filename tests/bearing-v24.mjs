import {chromium,BASE_URL} from './browser.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],samples=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');
 for(const [chapter,study,name] of [[0,null,'earth'],[0,'moon','moon'],[1,null,'jupiter'],[2,null,'saturn'],[2,'ring-plane','ring-plane'],[2,'titan','titan'],[5,null,'light-day']]){
  await page.evaluate(({chapter,study})=>{const a=window.__cosmos;a.startChapter(chapter,0,study);a.game.timePaused=true;a.game.chapterTime=30;}, {chapter,study});await page.waitForTimeout(400);
  const result=await page.evaluate(()=>{const marker=document.getElementById('waypoint'),r=marker.getBoundingClientRect(),a=window.__cosmos;return {resolved:marker.classList.contains('resolved'),visible:!marker.hidden,left:r.left,right:r.right,top:r.top,bottom:r.bottom,leader:!document.getElementById('bearing-leader').hidden,subject:a.exploration.destination()?.id,title:document.getElementById('waypoint-name').textContent};});
  assert.ok(result.visible&&result.left>=0&&result.right<=1440&&result.top>=100&&result.bottom<800);
  if(name!=='light-day')assert.equal(result.resolved,true);else assert.equal(result.resolved,false);
  await page.screenshot({path:`tests/screenshots/v24-bearing-${name}.png`});samples.push({name,...result});
 }
 await page.evaluate(async()=>{const a=window.__cosmos,t=await import('three');a.startChapter(2);a.game.timePaused=true;a.game.player.quaternion.multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),Math.PI));});await page.waitForTimeout(250);
 assert.ok(await page.locator('#waypoint.offscreen').isVisible());assert.equal(await page.locator('#bearing-leader').isVisible(),false);
 await page.keyboard.press('g');await page.waitForTimeout(100);assert.equal(await page.locator('#waypoint').isVisible(),false);assert.equal(await page.locator('#bearing-leader').isVisible(),false);await page.keyboard.press('g');
 await page.setViewportSize({width:1024,height:640});await page.evaluate(()=>{window.__cosmos.startChapter(2,0,'ring-plane');window.__cosmos.game.timePaused=true;});await page.waitForTimeout(250);
 const compact=await page.locator('#waypoint').boundingBox();assert.ok(compact.x>=0&&compact.x+compact.width<=1024&&compact.y>95&&compact.y+compact.height<540);await page.screenshot({path:'tests/screenshots/v24-bearing-compact.png'});
 await page.evaluate(async()=>{const a=window.__cosmos,t=await import('three');a.startChapter(0);a.game.timePaused=true;a.game.destination='moon';const earth=a.world.bodyPositions.earth,moon=a.world.bodyPositions.moon;const p=earth.clone().addScaledVector(earth.clone().sub(moon).normalize(),10000);a.game.player.position.copy(p);a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,moon,new t.Vector3(0,1,0)));a.world.setFov(4);});await page.waitForTimeout(250);
 assert.equal(await page.locator('#waypoint').evaluate(e=>e.classList.contains('resolved')),false);assert.match(await page.locator('#waypoint-name').textContent(),/Moon/);
 await page.evaluate(()=>window.__cosmos.game.destination='earth');await page.waitForTimeout(250);assert.ok(await page.locator('#waypoint.resolved').isVisible());assert.equal(await page.locator('#bearing-leader').isVisible(),false);
 assert.deepEqual(errors,[]);await fs.writeFile('tests/bearing-v24-results.json',JSON.stringify({samples,offscreenBearing:true,guidanceToggle:true,compact,occultedTargetUsesInstrumentMarker:true,screenFillingWorldKeepsMarginBearing:true,errors},null,2));console.log({samples,errors});
}finally{await browser.close();}
