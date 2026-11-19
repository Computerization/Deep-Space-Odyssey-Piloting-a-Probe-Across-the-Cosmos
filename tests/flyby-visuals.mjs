import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${BASE_URL}/?test=1`);await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');
 for(const [id,chapter]of [['lunar',0],['clouds',1],['ringlight',2]]){
  for(const phase of [0,.5,1]){
   await page.evaluate(async({id,chapter,phase})=>{const a=window.__cosmos,{Matrix4,Vector3}=await import('three'),{SURVEYS}=await import('./src/surveys.js');a.startChapter(chapter);a.beginSurvey(id);const g=a.surveyGeometry(),d=SURVEYS.find(s=>s.id===id);a.game.player.position.lerpVectors(g.start,g.end,phase);a.game.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(a.game.player.position,a.world.bodyPositions[d.body],new Vector3(0,1,0)));a.game.player.velocity.set(0,0,0);a.game.view='probe';a.world.setFov(id==='lunar'?40:58);for(const name of ['hud','chapter-intro','discovery','toast'])document.getElementById(name).hidden=true;},{id,chapter,phase});
   await page.waitForTimeout(700);await page.screenshot({path:`tests/screenshots/v6-${id}-${phase}.png`});
  }
 }
 const relief=await page.evaluate(()=>{const a=window.__cosmos,m=a.world.bodies.moon.mesh.geometry.attributes.position;let low=Infinity,high=-Infinity;for(let i=0;i<m.count;i++){const r=Math.hypot(m.getX(i),m.getY(i),m.getZ(i));low=Math.min(low,r);high=Math.max(high,r);}return{radiusRange:[low,high],vertices:m.count,color:[a.world.textures['moon.avif'].image.width,a.world.textures['moon.avif'].image.height],normal:[a.world.textures['moon-normal.avif'].image.width,a.world.textures['moon-normal.avif'].image.height]};});
 assert.ok(relief.radiusRange[0]>.99&&relief.radiusRange[0]<1&&relief.radiusRange[1]>1&&relief.radiusRange[1]<1.01);assert.deepEqual(relief.color,[4096,2048]);assert.deepEqual(errors,[]);
 await fs.writeFile('tests/flyby-visuals-results.json',JSON.stringify({relief,errors},null,2));console.log({relief,errors});
}finally{await browser.close();}
