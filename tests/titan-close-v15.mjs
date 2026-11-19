import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const tag=process.env.COSMOS_CAPTURE_TAG||'after',views=[];
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');
 for(const [radius,phase,direction] of [[4,155,'body'],[1.25,70,'body'],[1.24001,70,'body'],[1.23999,70,'body'],[1.23,70,'body'],[1.1,70,'body'],[1.1,70,'outward'],[4,115,'body'],[4,30,'body']]){
  await page.evaluate(async({radius,phase,direction})=>{
   const {Vector3,Quaternion,Matrix4}=await import('three'),a=window.__cosmos;a.startChapter(2,0,'titan');
   a.game.mode='panel';a.game.timePaused=true;a.game.view='probe';
   const center=a.world.bodyPositions.titan,sun=center.clone().negate().normalize(),side=new Vector3().crossVectors(sun,new Vector3(0,1,0)).normalize();
   const radial=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180));
   a.game.player.position.copy(center).addScaledVector(radial,2574.7*radius);
   const aim=direction==='outward'?a.game.player.position.clone().addScaledVector(radial,1000):center;
   a.game.player.quaternion.setFromRotationMatrix(new Matrix4().lookAt(a.game.player.position,aim,new Vector3(0,1,0)));
   a.world.followReady=false;a.world.setFov(58);a.world.update(a.game.player,0,{view:'probe',exposure:1,look:a.game.look});
   document.getElementById('hud').hidden=true;document.getElementById('toast').classList.remove('visible');document.getElementById('chapter-intro').hidden=true;
  },{radius,phase,direction});
  const filename=`tests/screenshots/v15-titan-${tag}-${radius}-${phase}-${direction}.png`;
  await page.screenshot({path:filename});
  const mean=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=64;c.height=40;const ctx=c.getContext('2d');ctx.drawImage(document.getElementById('universe'),0,0,64,40);const a=ctx.getImageData(0,0,64,40).data;let sum=0;for(let i=0;i<a.length;i+=4)sum+=(a[i]+a[i+1]+a[i+2])/3;return sum/(64*40);});
  if(tag==='after'&&radius<1.3)assert.ok(mean>10,`${radius} ${direction}: ${mean}`);
  views.push({radius,phase,direction,filename,mean});
 }
 let foregroundOcclusion=false;
 if(tag==='after'){
  foregroundOcclusion=await page.evaluate(async()=>{const a=window.__cosmos,t=await import('three'),mesh=new t.Mesh(new t.SphereGeometry(.3,24,16),new t.MeshBasicMaterial({color:0x00ff00}));mesh.position.set(0,0,-2).applyQuaternion(a.game.player.quaternion);a.world.scene.add(mesh);a.world.update(a.game.player,0,{view:'probe',exposure:1,look:a.game.look});const c=document.createElement('canvas');c.width=c.height=1;const ctx=c.getContext('2d');ctx.drawImage(a.world.canvas,a.world.canvas.width/2,a.world.canvas.height/2,1,1,0,0,1,1);const rgb=ctx.getImageData(0,0,1,1).data;a.world.scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();return rgb[1]>100&&rgb[1]>rgb[0]*2&&rgb[1]>rgb[2]*2;});
  assert.equal(foregroundOcclusion,true);
 }
 if(tag==='after'){const outside=views.find(v=>v.radius===1.24001),inside=views.find(v=>v.radius===1.23999);assert.ok(Math.abs(outside.mean-inside.mean)<1);assert.deepEqual(errors,[]);}
 await fs.writeFile(`tests/titan-close-v15-${tag}-results.json`,JSON.stringify({views,foregroundOcclusion,errors},null,2));console.log({views:views.length,errors});
}finally{await browser.close();}
