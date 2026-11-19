import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${BASE_URL}/?test=1`);await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');
 await page.evaluate(async()=>{
  const a=window.__cosmos,{Matrix4,Vector3}=await import('three');a.beginSurvey('lunar');const g=a.surveyGeometry();
  // Fixture at the entry; tests below exercise persistence and actual key input.
  a.game.player.position.copy(g.start);a.game.player.velocity.set(0,0,0);a.updateFlight(1/60,a.zeroInput);
  a.game.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(g.start,g.end,new Vector3(0,1,0)));a.game.view='probe';
 });
 await page.keyboard.down('w');await page.waitForTimeout(1800);await page.keyboard.up('w');
 assert.equal(await page.evaluate(()=>window.__cosmos.game.survey.stage),'scan');
 await page.evaluate(async()=>{const a=window.__cosmos,{Matrix4,Vector3}=await import('three');a.game.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(a.game.player.position,a.world.bodyPositions.moon,new Vector3(0,1,0)));});
 await page.keyboard.down('x');await page.waitForTimeout(4200);await page.keyboard.up('x');
 await page.keyboard.down('Space');await page.waitForTimeout(1800);await page.keyboard.up('Space');await page.keyboard.press('Escape');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cosmos-voyager-save-v2')));
 assert.ok(saved.survey.cells.some(x=>x>0));assert.equal(saved.task,0);
 await page.reload();await page.waitForFunction(()=>window.__cosmos);await page.click('#continue');await page.keyboard.press('Escape');
 const restored=await page.evaluate(()=>window.__cosmos.game.survey.cells);assert.deepEqual(restored,saved.survey.cells);
 await page.click('[data-action=leave-survey]');assert.equal(await page.evaluate(()=>window.__cosmos.game.survey),null);assert.equal(await page.evaluate(()=>window.__cosmos.game.task),0);
 // Narrower lenses preserve angle-dependent sizes and give finer controls.
 await page.evaluate(()=>window.__cosmos.world.setFov(4));await page.waitForTimeout(100);
 const precision=await page.evaluate(()=>window.__cosmos.input.aimScale);assert.ok(precision<=.13);
 assert.deepEqual(errors,[]);const result={actualKeyboardThrust:true,actualKeyboardObservation:true,partialCoverageSaved:saved.survey.cells.filter(x=>x>0).length,resumed:true,cancelPreservesMainRoute:true,narrowLensAimScale:precision,errors};
 await fs.writeFile('tests/flyby-state-results.json',JSON.stringify(result,null,2));console.log(result);
}finally{await browser.close();}
