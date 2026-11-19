import assert from 'node:assert/strict';

export async function checkFreeExploration(page,name){
 await page.click('#begin');await page.waitForFunction(()=>!!document.pointerLockElement);await page.keyboard.press('n');await page.waitForFunction(()=>__cosmos.game.stage==='encounter');
 // Reach the second phenomenon while the first is still suggested.
 await page.evaluate(async()=>{
  const a=__cosmos,T=await import('three'),c=a.world.bodyPositions.earth,r=a.world.bodies.earth.data.radius;
  const sun=c.clone().negate().normalize(),side=new T.Vector3().crossVectors(new T.Vector3(0,1,0),sun).normalize(),angle=130*Math.PI/180;
  a.game.player.position.copy(c).addScaledVector(sun,Math.cos(angle)*r*1.85).addScaledVector(side,Math.sin(angle)*r*1.85);
  a.game.player.velocity.set(0,0,0);a.game.player.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(a.game.player.position,c,new T.Vector3(0,1,0)));
 });
 await page.waitForFunction(()=>__cosmos.game.experience.seen.includes('trail-earth-night'),null,{timeout:12000});
 assert.ok(!await page.evaluate(()=>__cosmos.game.experience.seen.includes('trail-earth-horizon')));
 await page.screenshot({path:`tests/screenshots/free-${name}-unexpected-discovery.png`});
 await page.keyboard.press('x');await page.waitForFunction(()=>__cosmos.game.journeyStep===0);
 // Real keys establish a coast. Camera following must not silently lose range.
 await page.keyboard.press('l');await page.waitForTimeout(1600);
 const read=()=>page.evaluate(()=>{const a=__cosmos;return{range:a.game.player.position.distanceTo(a.world.bodyPositions.earth),position:a.game.player.position.toArray(),speed:a.game.player.velocity.length(),tracking:a.game.tracking}});
 const initial=await read();assert.equal(initial.tracking,'earth');
 assert.match(await page.locator('#journey-caption').textContent(),/[ADRF] · Circle/);
 await page.keyboard.down('d');await page.waitForTimeout(1800);await page.keyboard.up('d');
 const powered=await read();await page.waitForTimeout(2800);const coast=await read();
 assert.ok(Math.abs(coast.range-initial.range)<3,'orbit assist retains range through thrust and coast');
 assert.ok(Math.abs(coast.speed-powered.speed)<1,'coast retains speed');
 assert.ok(Math.hypot(...coast.position.map((v,i)=>v-powered.position[i]))>100,'coasting visibly changes the view');
 await page.mouse.move(850,470);await page.waitForTimeout(300);assert.equal((await read()).tracking,null);
 // Named features must really appear in the rendered view.
 await page.evaluate(()=>__cosmos.startChapter(1));await page.waitForTimeout(300);
 await page.evaluate(()=>__cosmos.journey.reset());await page.waitForFunction(()=>__cosmos.game.routeTarget?.goal);
 await page.evaluate(async()=>{const a=__cosmos,T=await import('three');a.game.player.position.copy(a.game.routeTarget.goal);a.game.player.velocity.set(0,0,0);a.game.angular.set(0,0,0);a.game.player.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(a.game.player.position,a.world.bodyPositions.jupiter,new T.Vector3(0,1,0)));});
 await page.waitForFunction(()=>__cosmos.game.experience.seen.includes('trail-jupiter-clouds'),null,{timeout:15000});
 await page.screenshot({path:`tests/screenshots/free-${name}-great-red-spot.png`});
 await page.keyboard.down('w');await page.keyboard.down('Shift');await page.waitForFunction(()=>{const a=__cosmos;return a.game.player.position.distanceTo(a.world.bodyPositions.jupiter)/a.world.bodies.jupiter.data.radius<1.6},null,{timeout:18000});await page.keyboard.up('w');await page.keyboard.up('Shift');
 const close=await page.evaluate(()=>{const a=__cosmos;return a.game.player.position.distanceTo(a.world.bodyPositions.jupiter)/a.world.bodies.jupiter.data.radius});
 assert.ok(close>=1.45-1e-8&&close<1.6,'a close pass stays within the intended exploration range');
 await page.screenshot({path:`tests/screenshots/free-${name}-jupiter-close-pass.png`});
 await page.keyboard.press('x');await page.waitForFunction(()=>__cosmos.game.journeyStep===1&&__cosmos.game.routeTarget?.goal);
 await page.evaluate(async()=>{const a=__cosmos,T=await import('three');a.game.player.position.copy(a.game.routeTarget.goal);a.game.player.velocity.set(0,0,0);a.game.player.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(a.game.player.position,a.world.bodyPositions.jupiter,new T.Vector3(0,1,0)));});
 await page.waitForFunction(()=>__cosmos.game.experience.seen.includes('trail-jupiter-night'),null,{timeout:10000});
 await page.keyboard.press('j');await page.locator('.field-notes [data-action=recording][data-value=jupiter]').waitFor();
 await page.waitForTimeout(300);await page.keyboard.press('Escape');await page.waitForFunction(()=>__cosmos.game.mode==='play');
 await page.waitForFunction(()=>__cosmos.game.journeyStep===2,null,{timeout:19000});
 await page.evaluate(async()=>{const a=__cosmos,T=await import('three'),{opportunityPoint}=await import('../src/opportunities.js');a.startChapter(2);a.game.player.position.copy(opportunityPoint('north-pole',a.world));a.game.player.velocity.set(0,0,0);a.game.angular.set(0,0,0);a.game.player.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(a.game.player.position,a.world.bodyPositions.saturn,new T.Vector3(0,0,1)));});
 await page.waitForFunction(()=>__cosmos.game.experience.seen.includes('trail-saturn-hexagon'),null,{timeout:15000});
 await page.screenshot({path:`tests/screenshots/free-${name}-saturn-hexagon.png`});
 assert.equal(await page.evaluate(()=>__cosmos.game.mode),'play');assert.ok(await page.locator('#depart').isVisible());
 await checkLunarViews(page,name);
 return{checks:['occulted-earth-excluded','earthrise-away-from-waypoint','framed-lunar-terminator','unordered-discovery','unseen-next-suggestion','keyboard-orbit-and-coast','mouse-releases-following','great-red-spot-visible','close-pass-boundary','optional-recording-in-journal','saturn-polar-discovery','onward-remains-available'],orbit:{initial,powered,coast},close};
}

async function checkLunarViews(page,name){
 await page.evaluate(()=>__cosmos.startChapter(0,0,'moon'));
 // At six radii, put Earth behind the Moon, then bring its whole disc clear.
 const pose=async(kind)=>page.evaluate(async kind=>{
  const a=__cosmos,T=await import('three'),w=a.world,g=a.game,c=w.bodyPositions.moon,r=w.bodies.moon.data.radius;
  const far=w.bodyPositions.earth.clone().sub(c).normalize(),sun=c.clone().negate().normalize();
  const up=new T.Vector3(0,1,0),side=sun.clone().addScaledVector(far,-sun.dot(far)).normalize();
  let n=far.clone().negate(),range=6;
  if(kind==='clear'){const angle=.232;n.multiplyScalar(Math.cos(angle)).addScaledVector(side,Math.sin(angle));}
  if(kind==='shadows'||kind==='away'){n.crossVectors(sun,up).normalize();range=2.1;}
  g.player.position.copy(c).addScaledVector(n,r*range);g.player.velocity.set(0,0,0);g.angular.set(0,0,0);g.look.identity();
  const target=kind==='away'?g.player.position.clone().addScaledVector(n,r):c;
  g.player.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(g.player.position,target,up));w.needsRender=true;
 },kind);
 const seen=id=>page.evaluate(id=>__cosmos.game.experience.seen.includes(id),id);
 await pose('hidden');await page.waitForTimeout(3000);assert.ok(!await seen('trail-moon-earthrise'));
 await pose('clear');await page.waitForFunction(()=>__cosmos.game.experience.seen.includes('trail-moon-earthrise'));
 await page.screenshot({path:`tests/screenshots/field-${name}-earthrise.png`});
 await page.keyboard.press('x');await pose('away');await page.waitForTimeout(2700);assert.ok(!await seen('trail-moon-terminator'));
 await pose('shadows');await page.waitForFunction(()=>__cosmos.game.journeyReady);assert.ok(await page.locator('#field-feedback').isVisible());
 await page.waitForFunction(()=>__cosmos.game.experience.seen.includes('trail-moon-terminator'));
 assert.equal(await page.locator('#journey-action').textContent(),'X · Return');
 await page.screenshot({path:`tests/screenshots/field-${name}-moon-shadows.png`});
}
