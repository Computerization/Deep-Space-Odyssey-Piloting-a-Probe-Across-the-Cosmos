// Shared ordinary-lens visual review; deterministic cameras retain real Sun directions.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
export async function checkPlanetPortraits(page,name){
 const label=process.env.COSMOS_COMPARISON_LABEL||'current',views=[];
 for(const [body,chapter,study] of [['earth',0,null],['moon',0,'moon'],['io',1,'io'],['jupiter',1,null],['saturn',2,null],['titan',2,'titan']]){
  if(process.env.COSMOS_PORTRAIT_BODIES&&!process.env.COSMOS_PORTRAIT_BODIES.split(',').includes(body))continue;
  const poses=[['globe',40],['crescent',135],['near',40]];
  if(process.argv.includes('--sweep'))poses.push(['terminator',90],['backlit',170],['limb',55]);
  for(const [kind,phase] of poses){
   await page.evaluate(async({body,chapter,study,kind,phase})=>{
    const a=__cosmos,T=await import('three');a.startChapter(chapter,0,study);a.game.timePaused=true;a.game.showHud=false;document.querySelector('#hud').hidden=true;a.game.view='probe';a.game.tracking=null;a.game.look.identity();a.game.player.velocity.set(0,0,0);
    const b=a.world.bodies[body],c=a.world.bodyPositions[body],sun=c.clone().negate().normalize(),up=new T.Vector3(0,1,0),side=new T.Vector3().crossVectors(sun,up).normalize();
    const {CLOSE_PASS}=await import('../src/flight-controller.js');
    const angle=phase*Math.PI/180,range=kind==='limb'?CLOSE_PASS[body]+.03:kind==='near'?(body==='titan'?1.45:Math.max(1.4,CLOSE_PASS[body])):body==='saturn'?5.2:3;
    a.game.player.position.copy(c).addScaledVector(sun,Math.cos(angle)*range*b.data.radius).addScaledVector(side,Math.sin(angle)*range*b.data.radius);
    const target=c.clone();
    if(kind==='limb'){const radial=a.game.player.position.clone().sub(c).normalize(),tangent=new T.Vector3().crossVectors(radial,up).normalize();target.copy(c).addScaledVector(radial,b.data.radius/range).addScaledVector(tangent,b.data.radius*Math.sqrt(1-1/(range*range)));}
    a.game.player.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(a.game.player.position,target,up));a.world.setFov(58);a.world.needsRender=true;
   },{body,chapter,study,kind,phase});
   await page.waitForTimeout(body==='earth'?2000:700);
   await page.evaluate(()=>{__cosmos.world.needsRender=true;});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{__cosmos.world.renderer.getContext().finish();resolve()}))));
   const file=`tests/screenshots/portrait-${name}-${label}-${body}-${kind}.png`;
   await page.screenshot({path:file});views.push({body,kind,file});
   assert.equal(await page.evaluate(()=>__cosmos.world.camera.fov),58);
  }
 }
 await page.evaluate(async()=>{const a=__cosmos,T=await import('three');a.startChapter(0);a.game.timePaused=true;a.game.showHud=false;document.querySelector('#hud').hidden=true;a.game.view='probe';a.game.player.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(a.game.player.position,a.world.bodyPositions.sun,new T.Vector3(0,1,0)));a.world.needsRender=true;});
 await page.waitForTimeout(700);await page.screenshot({path:`tests/screenshots/portrait-${name}-${label}-sun.png`});
 const stars=await (await import('./star-sampling.mjs')).measureStarSampling(page);
 const flux=stars.map(s=>s.flux);assert.ok(Math.min(...flux)>0&&Math.max(...flux)/Math.min(...flux)<1.02,JSON.stringify(stars));
 assert.ok(Math.abs(stars.at(-1).centroid-stars[0].centroid)>.7,JSON.stringify(stars));
 return{label,views,stars};
}
