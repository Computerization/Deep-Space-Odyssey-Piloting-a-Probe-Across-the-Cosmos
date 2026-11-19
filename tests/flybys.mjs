import {chromium,BASE_URL} from './browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${BASE_URL}/?test=1`);await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');
 for(const [chapter,id]of [[0,'lunar'],[1,'clouds'],[2,'ringlight']]){
  const result=await page.evaluate(async({chapter,id})=>{
   const a=window.__cosmos,{Matrix4,Vector3}=await import('three'),{SURVEYS}=await import('./src/surveys.js');
   a.startChapter(chapter);a.game.view='probe';const d=SURVEYS.find(s=>s.id===id),before=a.game.player.position.clone();a.beginSurvey(id);if(before.distanceTo(a.game.player.position)>0)throw Error('Accepting a flyby moved the player');
   const g=a.game,p=g.player,z=a.zeroInput;let approachSteps=0;
   // This test pilot drives the production movement integrator to each bearing.
   while(g.survey?.stage==='approach'&&approachSteps++<16000){
    const nav=a.surveyNavigation(),range=p.position.distanceTo(nav.point);g.rateIndex=5;
    p.quaternion.setFromRotationMatrix(new Matrix4().lookAt(p.position,nav.point,new Vector3(0,1,0)));
    a.updateFlight(1/30,{...z,thrust:1});
    if(g.mode==='panel')throw Error('Collision during approach '+id);
   }
   if(g.survey?.stage!=='align')throw Error('Approach stalled '+id);
   // Settle, point along the pass and build velocity using actual thrust.
   for(let i=0;i<80;i++)a.updateFlight(1/30,{...z,brake:true});
   const geometry=a.surveyGeometry();p.quaternion.setFromRotationMatrix(new Matrix4().lookAt(p.position,geometry.end,new Vector3(0,1,0)));
   for(let i=0;i<90;i++)a.updateFlight(1/30,{...z,thrust:true});
   let steps=0,midpoint=null;
   while(g.survey&&steps++<6000){
    // Turn the camera toward the body while coasting: attitude changes leave velocity intact.
    p.quaternion.setFromRotationMatrix(new Matrix4().lookAt(p.position,a.world.bodyPositions[d.body],new Vector3(0,1,0)));
    a.updateFlight(1/30,{...z,observe:true});
    if(steps===500)midpoint={position:p.position.toArray(),attitude:p.quaternion.toArray()};
    if(g.mode==='panel'&&g.survey)throw Error('Collision during pass '+id);
   }
   if(g.survey)throw Error('Pass incomplete '+id+' '+JSON.stringify(g.survey.cells));
   return {id,approachSeconds:approachSteps/30,passSeconds:(steps+170)/30,task:g.task,result:document.getElementById('panel-content').textContent,midpoint};
  },{chapter,id});
  assert.equal(result.task,0);assert.match(result.result,/Three views collected/);results.push(result);
  await page.waitForFunction(()=>document.querySelector('#flyby-memories img')?.naturalWidth>0);await page.screenshot({path:`tests/screenshots/v6-${id}-result.png`});
  await page.click('[data-action=journal]');await page.waitForFunction(()=>!document.getElementById('panel-content').textContent.includes('Opening'));assert.ok(await page.locator('.gallery figure').count()>=(chapter+1)*3);
  await page.screenshot({path:`tests/screenshots/v6-${id}-journal.png`});await page.keyboard.press('Escape');
 }
 assert.deepEqual(errors,[]);await fs.writeFile('tests/flybys-results.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));
}finally{await browser.close();}
