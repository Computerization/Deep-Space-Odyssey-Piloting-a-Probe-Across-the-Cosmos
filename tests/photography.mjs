import {chromium,BASE_URL} from './browser.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1600,height:1000}});
await page.goto(`${BASE_URL}/?test=1`);await page.waitForFunction(()=>window.__cosmos);await page.click('#begin');
for(const [name,chapter]of [['earth',0],['jupiter',1],['saturn',2],['sun',4]]){
 await page.evaluate(async i=>{const a=window.__cosmos;const{Matrix4,Vector3}=await import('three');a.startChapter(i);const wp=a.taskPoint();if(wp)a.game.player.position.copy(wp);a.game.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(a.game.player.position,a.targetPosition(),new Vector3(0,1,0)));a.game.showHud=false;for(const id of ['hud','chapter-intro','discovery','toast'])document.getElementById(id).hidden=true;},chapter);
 await page.waitForTimeout(1200);await page.screenshot({path:`tests/screenshots/photograph-${name}.png`});
 if(name==='sun')console.log(await page.evaluate(()=>{const w=window.__cosmos.world;return{visible:w.sunGlare.visible,size:w.sunGlare.material.uniforms.size.value,position:w.sunGlare.position.toArray(),projection:w.project(w.bodyPositions.sun,window.__cosmos.game.player),maxPoint:w.renderer.getContext().getParameter(w.renderer.getContext().ALIASED_POINT_SIZE_RANGE)};}));
}
await browser.close();
