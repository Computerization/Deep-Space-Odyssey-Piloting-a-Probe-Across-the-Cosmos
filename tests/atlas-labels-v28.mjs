import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const results=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1024,height:640}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const Observer=ResizeObserver;window.activeChartObservers=new Set();window.ResizeObserver=class extends Observer{observe(target,...rest){if(target.matches('.atlas-plot'))window.activeChartObservers.add(this);return super.observe(target,...rest)}disconnect(){window.activeChartObservers.delete(this);return super.disconnect()}}});
 try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');await page.evaluate(()=>window.__cosmos.game.timePaused=true);await page.click('#map-button');
 const local=await page.locator('.local-chart text:not(.chart-scale-label)').evaluateAll(es=>es.map(e=>parseFloat(getComputedStyle(e).fontSize)*e.getScreenCTM().a));assert.ok(local.every(v=>Math.abs(v-14)<.05));
 await page.click('[data-action=map-tab][data-value=solar]');
 const views=[];
 for(const viewport of [{width:1024,height:640},{width:1440,height:900},{width:720,height:640}]){
 await page.setViewportSize(viewport);await page.waitForTimeout(50);
 for(const extent of [2,12,35,100,200]){
  await page.click(`[data-action=chart-scale][data-value="${extent}"]`);await page.locator('.chart-object-list [data-value=earth]').click();await page.waitForTimeout(50);
  const labels=await page.locator('.solar-chart .chart-object text,.solar-chart .chart-tick').evaluateAll(es=>es.filter(e=>getComputedStyle(e).display!=='none').map(e=>{const r=e.getBoundingClientRect();return {name:e.textContent,expected:e.classList.contains('chart-tick')?11:14,size:parseFloat(getComputedStyle(e).fontSize)*e.getScreenCTM().a,left:r.left,right:r.right,top:r.top,bottom:r.bottom}}));
  assert.ok(labels.every(l=>Math.abs(l.size-l.expected)<.05));
  const ticks=await page.locator('.chart-tick').allTextContents();assert.ok(ticks.every(t=>Number(t)<extent),'Grid rings remain within the selected extent');
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i],b=labels[j];assert.ok(!(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top),JSON.stringify({name,viewport,extent,a,b}));}
  assert.equal(await page.evaluate(()=>window.activeChartObservers.size),1);
  views.push({viewport,extent,labels});
 }
 }
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.activeChartObservers.size),0);assert.deepEqual(errors,[]);
 results.push({name,engineVersion:browser.version(),localScreenPixels:local,views,observerReleasedOnClose:true,errors,passed:true});console.log({name,views:views.length,passed:true});
 }finally{await browser.close()}
}
await fs.writeFile('tests/atlas-labels-v28-results.json',JSON.stringify({version:'0.28.0',results},null,2));
