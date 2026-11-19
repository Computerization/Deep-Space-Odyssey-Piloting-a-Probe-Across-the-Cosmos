import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 await page.evaluate(async()=>{const a=window.__cosmos,t=await import('three');window.oldMoonMap=await new t.TextureLoader().loadAsync('/tests/fixtures/moon-v25.avif');oldMoonMap.colorSpace=t.SRGBColorSpace;oldMoonMap.wrapS=t.RepeatWrapping;oldMoonMap.anisotropy=a.world.textures['moon.avif'].anisotropy;oldMoonMap.needsUpdate=true;window.newMoonMap=a.world.textures['moon.avif'];newMoonMap.colorSpace=t.SRGBColorSpace;newMoonMap.wrapS=t.RepeatWrapping;newMoonMap.anisotropy=oldMoonMap.anisotropy;newMoonMap.needsUpdate=true;});
 for(const [label,radius,phase,polar] of [['study',0,0,false],['close',1.5,70,false],['full',4,20,false],['crescent',3,125,false],['polar',3,80,true]]){
  await page.evaluate(async({radius,phase,polar})=>{const a=window.__cosmos,t=await import('three');a.startChapter(0,0,'moon');a.game.timePaused=true;a.game.mode='panel';a.game.view='probe';a.game.look.identity();a.world.setQuality('ultra');document.getElementById('hud').hidden=true;document.getElementById('toast').classList.remove('visible');
   if(radius){const center=a.world.bodyPositions.moon,sun=center.clone().negate().normalize(),up=new t.Vector3(0,1,0).applyQuaternion(a.world.bodies.moon.group.quaternion),side=polar?up.clone().addScaledVector(sun,-up.dot(sun)).normalize():new t.Vector3().crossVectors(sun,up).normalize();a.game.player.position.copy(center).addScaledVector(sun,1737.4*radius*Math.cos(phase*Math.PI/180)).addScaledVector(side,1737.4*radius*Math.sin(phase*Math.PI/180));a.game.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(a.game.player.position,center,up));}a.world.followReady=false;
  },{radius,phase,polar});
  for(const variant of ['2019','2025']){
   await page.evaluate(variant=>{const a=window.__cosmos;a.world.bodies.moon.uniforms.surfaceMap.value=variant==='2019'?oldMoonMap:newMoonMap;a.world.update(a.game.player,0,{view:'probe',exposure:1,look:a.game.look});},variant);
   await page.screenshot({path:`tests/screenshots/v26-lunar-${label}-${variant}.png`});
  }
 }
 console.log({views:10,errors});await fs.writeFile('tests/lunar-texture-v26-results.json',JSON.stringify({views:10,sourceDimensions:[4096,2048],errors},null,2)+'\n');
}finally{await browser.close();}
