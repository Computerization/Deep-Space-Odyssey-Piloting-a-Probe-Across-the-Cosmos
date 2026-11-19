import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const before=!!process.env.COSMOS_EXPECT_BEFORE,outcomes=[];
const cases=[['earth',0,'welcome'],['science',0,'note'],['quiet',0,'quiet'],['exposure',0,'exposure'],['saturn',2,'welcome'],['titan',2,'welcome','titan'],['passage',2,'transit'],['lightday',5,'welcome']];
for(const [name,engine,options]of [['Chrome',chromium,{channel:'chrome',args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{}],['WebKit',webkit,{}]]){
 if(process.env.COSMOS_UI_ENGINE&&name!==process.env.COSMOS_UI_ENGINE)continue;
 const browser=await engine.launch({headless:true,...options}),page=await browser.newPage(),errors=[],layouts=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
  for(const [width,height]of [[1440,900],[1024,640],[800,600]]){
   await page.setViewportSize({width,height});
   for(const [label,chapter,mode,study]of cases){
    await page.evaluate(async({chapter,mode,study})=>{const a=window.__cosmos,{SCIENCE_NOTES}=await import('/src/experience-guide.js');a.startChapter(chapter,0,study);a.game.timePaused=true;a.game.chapterTime=mode==='welcome'?0:30;a.game.view='probe';a.game.look.identity();a.game.experience.seen=mode==='quiet'?SCIENCE_NOTES.map(n=>n.id):[];a.experienceGuide.guide.reset();if(mode==='exposure'){const T=await import('three');a.game.suggestedView=true;a.game.player.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(a.game.player.position,a.world.bodyPositions.earth,a.game.frame.y));a.world.followReady=false;}if(mode==='note')for(let i=0;i<150;i++)a.updateFlight(1/60,a.zeroInput);if(mode==='transit')a.beginTransit(.3);},{chapter,mode,study});
    await page.waitForTimeout(180);
    const r=await page.evaluate(()=>{
     const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
     const visible=e=>!!e.getClientRects().length;
     const buttons=[...document.querySelectorAll('#hud button')].filter(visible).map(e=>({id:e.id,...rect(e),font:parseFloat(getComputedStyle(e).fontSize)}));
     const reading=document.querySelector('.objective'),caption=document.querySelector('#objective-caption');
     const boxes=Object.fromEntries(['.chapter-heading','.flight-nav','.telemetry','.log-shortcut','.objective','#cruise-scale','#flight-hint'].map(s=>{const e=document.querySelector(s);return[s,visible(e)?rect(e):null];}));
     const label=document.querySelector('#waypoint'),bearing=visible(label)?rect(label):null;
     return {buttons,boxes,bearing,readingVisible:visible(reading),captionVisible:visible(caption),readingArea:visible(reading)?rect(reading).width*rect(reading).height:0,captionFont:parseFloat(getComputedStyle(caption).fontSize),photo:rect(document.querySelector('#photo-button')),caption:caption.textContent};
    });layouts.push({width,height,label,...r});
    const intersects=(a,b)=>a&&b&&a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
    if(!before){
     assert.ok(r.buttons.every(b=>b.left>=0&&b.right<=width&&b.top>=0&&b.bottom<=height&&b.height>=44&&b.width>=44),JSON.stringify(layouts.at(-1)));
     for(let i=0;i<r.buttons.length;i++)for(let j=0;j<i;j++)assert.ok(!intersects(r.buttons[i],r.buttons[j]),`${label} ${width} ${r.buttons[i].id}/${r.buttons[j].id}`);
     const boxes=Object.entries(r.boxes).filter(([,v])=>v);for(let i=0;i<boxes.length;i++)for(let j=0;j<i;j++)assert.ok(!intersects(boxes[i][1],boxes[j][1]),`${label} ${width} ${boxes[i][0]}/${boxes[j][0]}`);
     assert.ok(r.captionFont>=17);assert.ok(r.photo.top>=height-100);
     if(mode==='quiet')assert.equal(r.readingVisible,false);
     if(mode==='exposure')assert.ok(r.buttons.some(b=>b.id==='observe-action'));
     if(r.bearing)for(const [key,box]of boxes.filter(([key])=>['.objective','.chapter-heading','.flight-nav','#cruise-scale'].includes(key)))assert.ok(!intersects(r.bearing,box),`${label} ${width} bearing/${key}`);
    }
    if(name==='Chrome')await page.screenshot({path:`tests/screenshots/v38-${before?'before':'after'}-${label}-${width}.png`});
   }
  }
  if(!before){
   // Controls remain reachable after their relocation, with a stable photo target.
   await page.evaluate(()=>{const a=window.__cosmos;a.startChapter(0);a.game.timePaused=true;});await page.waitForTimeout(100);
   await page.locator('#photo-button').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>!document.querySelector('#photo-receipt').hidden);
   await page.click('#photo-receipt');await page.waitForFunction(()=>document.querySelector('#full-photograph')?.naturalWidth>0);await page.keyboard.press('Escape');await page.keyboard.press('Escape');
   await page.click('#depart');await page.waitForFunction(()=>window.__cosmos.game.stage==='transit');assert.equal(await page.locator('#depart').isVisible(),false);
   await page.click('#time-toggle');await page.waitForFunction(()=>window.__cosmos.game.actualRate>0);await page.click('#time-toggle');await page.waitForFunction(()=>window.__cosmos.game.actualRate===0);
   await page.click('#map-button');await page.waitForSelector('.atlas-footer');await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),layouts,photoAndPassageControls:!before,errors,passed:true});
 }finally{await browser.close()}
 await fs.writeFile(`tests/hud-layout-v38-${before?'before':'results'}.json`,JSON.stringify({version:before?'0.37.0':'0.38.0',outcomes},null,2));
}
