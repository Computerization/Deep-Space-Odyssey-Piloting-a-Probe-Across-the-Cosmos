import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const previous=process.env.COSMOS_VISUAL_PREVIOUS;
assert.ok(previous,'Set COSMOS_VISUAL_PREVIOUS to the previous source directory.');
const files=['src/main.js','src/rendering/lunar-shadow.js','src/rendering/cloud-detail.js','src/rendering/earth-shaders.js','src/rendering/cloud-layer.js','src/rendering/shaders.js','src/rendering/scene-factory.js','src/rendering/geometry-detail.js','src/rendering/ringshine.js','src/world.js','src/mission.js','assets/textures/earth-clouds.avif','assets/textures/earth-cloud-height.png','assets/textures/io.avif','assets/textures/saturn-polar.avif','assets/textures/jupiter.avif','assets/textures/earth.avif','assets/textures/moon.avif','assets/textures/moon-normal.avif','assets/textures/moon-height.webp','assets/textures/moon-polar-color.avif','assets/textures/moon-polar-normal.avif','assets/textures/moon-relief.bin'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const versions={previous:JSON.parse(await fs.readFile(path.join(previous,'package.json'))).version,candidate:JSON.parse(await fs.readFile('package.json')).version};
const sources={};
for(const mode of ['previous','candidate'])sources[mode]=Object.fromEntries(await Promise.all(files.map(async file=>[file,await fs.readFile(mode==='previous'?path.join(previous,file):file).then(hash).catch(e=>{if(e.code==='ENOENT'&&(mode==='previous'&&(file.includes('moon-polar-')||file.endsWith('saturn-polar.avif')||file.endsWith('geometry-detail.js')||file.endsWith('cloud-detail.js')||file.endsWith('lunar-shadow.js')||file.endsWith('earth-cloud-height.png'))||file.endsWith('moon-relief.bin')))return null;throw e;})])));
const lunarVisibilityAdded=!sources.previous['src/rendering/lunar-shadow.js']&&!!sources.candidate['src/rendering/lunar-shadow.js'];
const saturnCapAdded=!sources.previous['assets/textures/saturn-polar.avif']&&!!sources.candidate['assets/textures/saturn-polar.avif'];
const geometryDetailAdded=!sources.previous['src/rendering/geometry-detail.js']&&!!sources.candidate['src/rendering/geometry-detail.js'];
const detailVariantsAdded=!String(await fs.readFile(path.join(previous,'src/rendering/cloud-layer.js'))).includes('cloudMaterials')&&String(await fs.readFile('src/rendering/cloud-layer.js')).includes('cloudMaterials');
const cloudHeightChanged=!String(await fs.readFile(path.join(previous,'src/rendering/earth-shaders.js'))).includes('vec2 cloudWeather(')&&String(await fs.readFile('src/rendering/earth-shaders.js')).includes('vec2 cloudWeather(');
const lunarReliefChanged=sources.previous['assets/textures/moon-normal.avif']!==sources.candidate['assets/textures/moon-normal.avif'];
const lunarPolesAdded=!sources.previous['assets/textures/moon-polar-color.avif']&&!!sources.candidate['assets/textures/moon-polar-color.avif'];
const lunarGeometryChanged=!!sources.previous['assets/textures/moon-relief.bin']&&!sources.candidate['assets/textures/moon-relief.bin'];
const cloudHeightMapAdded=!sources.previous['assets/textures/earth-cloud-height.png']&&!!sources.candidate['assets/textures/earth-cloud-height.png'];
const cloudMapChanged=sources.previous['assets/textures/earth-clouds.avif']!==sources.candidate['assets/textures/earth-clouds.avif'];
const ioMapChanged=sources.previous['assets/textures/io.avif']!==sources.candidate['assets/textures/io.avif'];
const jupiterMapChanged=sources.previous['assets/textures/jupiter.avif']!==sources.candidate['assets/textures/jupiter.avif'];
const jupiterSourceChanged=!String(await fs.readFile(path.join(previous,'src/rendering/shaders.js'))).includes('graphicMap')&&String(await fs.readFile('src/rendering/shaders.js')).includes('graphicMap');
const surfaceMapsChanged=String(await fs.readFile('src/mission.js')).includes("map:'earth.ktx2'")&&!String(await fs.readFile(path.join(previous,'src/mission.js'))).includes("map:'earth.ktx2'");
const earthDimensionsChanged=sources.previous['src/mission.js']!==sources.candidate['src/mission.js']&&String(await fs.readFile(path.join(previous,'src/mission.js'))).includes('earth:{radius:6371,')&&String(await fs.readFile('src/mission.js')).includes('earth:{radius:6378.137,');
const shadowLookupAdded=!String(await fs.readFile(path.join(previous,'src/world.js'))).includes('ringTransmissionProfile')&&String(await fs.readFile('src/world.js')).includes('ringTransmissionProfile');
const directRingChanged=String(await fs.readFile(path.join(previous,'src/rendering/shaders.js'))).split('export const ringFragment=')[1].split('export const resolveFragment=')[0]!==String(await fs.readFile('src/rendering/shaders.js')).split('export const ringFragment=')[1].split('export const resolveFragment=')[0];
const scenes=[
 ['chase-earth',0,null,58],['chase-moon',0,'moon',58],['chase-shadow',0,'earth-shadow',58],['chase-jupiter',1,null,58],['chase-titan',2,'titan',58],
 ['earth',0,null,58],['moon',0,'moon',58],['earth-shadow',0,'earth-shadow',58],
 ['jupiter',1,null,58],['jupiter-close',1,null,18],['jupiter-narrow',1,null,8],['io',1,'io',58],
 ['saturn',2,null,58],['titan',2,'titan',58],['ring-plane',2,'ring-plane',58],['north-pole',2,'north-pole',40],['chase',2,null,58]
];
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),errors=[],views={};
 try{
  for(const mode of ['previous','candidate']){
   const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   if(mode==='previous')for(const file of files.filter(f=>sources.previous[f]))await page.route('**/'+file,route=>route.fulfill({path:path.join(previous,file),contentType:file.endsWith('.avif')?'image/avif':file.endsWith('.webp')?'image/webp':'text/javascript'}));
   await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');
   for(const [label,chapter,study,fov] of scenes){
    const result=await page.evaluate(async({label,chapter,study,fov})=>{
     const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(chapter,0,study);const g=a.game;
     g.mode='loading';g.timePaused=true;g.view=label.startsWith('chase')?'chase':'probe';g.look.identity();w.setQuality('ultra');w.setFov(fov);document.getElementById('hud').hidden=true;
     // This runner isolates materials; geometry-detail.mjs verifies the adaptive path.
     if(w.geometryDetail){w.geometryDetail.enabled=false;w.geometryDetail.restore();}
     const state=()=>JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.fuel,g.localSeconds]);
     const before=state(),shadowBefore=w.shadowPose.updates;w.update(g.player,0,{view:g.view,look:g.look});
     if(w.cloudDetail)for(let i=0;i<120;i++){
      const d=w.cloudDetail;if(!d.pending&&(!d.wanted||d.active?.key===d.wanted.key&&d.uniforms.cloudPatchWeight.value===1))break;
      await new Promise(r=>setTimeout(r,40));w.update(g.player,0,{view:g.view,look:g.look});
     }
     const c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;
     const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(w.canvas,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;
     const pixelSha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',pixels))].map(n=>n.toString(16).padStart(2,'0')).join('');
     let outlier=null;
     if(label.startsWith('jupiter')){
      // Project the identified source pixel using the actual map convention.
      const b=w.bodies.jupiter,latitude=Math.PI*(.5-(1024+.5)/1801),u=(1328+.5)/3601-b.uniforms.rotation.value;
      const direction=new t.Vector3(-Math.cos(u*Math.PI*2)*Math.cos(latitude),Math.sin(latitude),Math.sin(u*Math.PI*2)*Math.cos(latitude));
      const radius=1/Math.sqrt(direction.x**2+(direction.y/b.data.flatten)**2+direction.z**2);
      const point=direction.multiplyScalar(radius*b.data.radius).applyQuaternion(b.group.quaternion).add(w.bodyPositions.jupiter),pr=w.project(point,g.player);
      const x=Math.round((pr.x*.5+.5)*c.width),y=Math.round((.5-pr.y*.5)*c.height);let blueExcess=-255;
      for(let j=Math.max(0,y-6);j<Math.min(c.height,y+7);j++)for(let i=Math.max(0,x-6);i<Math.min(c.width,x+7);i++){const k=(j*c.width+i)*4;blueExcess=Math.max(blueExcess,pixels[k+2]-pixels[k]);}
      outlier={x,y,blueExcess,visible:pr.front&&x>=0&&x<c.width&&y>=0&&y<c.height};
     }
     const shadow=g.view==='chase'?{updated:w.shadowPose.updates>shadowBefore,current:w.shadowPose.direction.distanceTo(w.shipKey.position.clone().normalize())<1e-12,reflectedPosition:w.environmentPosition.equals(g.player.position),pending:w.shipKey.shadow.needsUpdate,viewport:w.frameTarget.viewport.toArray()}:null;
     return{cloudPatches:w.cloudDetail?.active?1:0,chaseOffset:w.shipCamera.position.toArray(),pixelSha256,outlier,shadow,physicalStatePreserved:before===state(),calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,textures:w.renderer.info.memory.textures,geometries:w.renderer.info.memory.geometries,programs:w.renderer.info.programs.length,width:c.width,height:c.height};
    },{label,chapter,study,fov});
    await page.screenshot({path:`tests/screenshots/material-${name}-${label}-${mode}.png`});
    (views[label]??={})[mode]=result;
   }
   await page.close();
  }
  for(const [label,pair] of Object.entries(views)){
   assert.ok(pair.previous.physicalStatePreserved&&pair.candidate.physicalStatePreserved,label);
   for(const key of ['calls','width','height'])assert.equal(pair.candidate[key],pair.previous[key],`${label}: ${key}`);
   assert.equal(pair.candidate.geometries,pair.previous.geometries+(geometryDetailAdded?2:0),`${label}: prepared shared geometry`);
   // A cube-map face can include the distant Moon in any encounter.
   const extraTriangles=pair.candidate.triangles-pair.previous.triangles;
   if(lunarGeometryChanged)assert.ok(extraTriangles>=0&&extraTriangles%220672===0,`${label}: only the denser lunar mesh adds triangles`);
   else assert.equal(extraTriangles,0,`${label}: triangles`);
   assert.equal(pair.candidate.textures,pair.previous.textures+(lunarVisibilityAdded?1:0)+(saturnCapAdded?1:0)+(shadowLookupAdded?1:0)+(lunarPolesAdded?2:0)+(cloudHeightMapAdded?1:0)+(pair.candidate.cloudPatches-pair.previous.cloudPatches),`${label}: shared ring shadow lookup`);
   assert.equal(pair.candidate.programs,pair.previous.programs+(lunarVisibilityAdded?1:0)+(detailVariantsAdded?2:0),`${label}: prepared cloud variants`);
   const chaseReframed=label.startsWith('chase')&&JSON.stringify(pair.candidate.chaseOffset)!==JSON.stringify(pair.previous.chaseOffset);
   if(chaseReframed)assert.notEqual(pair.candidate.pixelSha256,pair.previous.pixelSha256,`${label}: changed chase framing`);
   else if(lunarVisibilityAdded&&['moon','earth','earth-shadow','chase-moon','chase-earth','chase-shadow'].includes(label)){/* Filtered lunar shadows may contribute directly or through reflections. */}
   else if(lunarGeometryChanged&&['moon','earth','earth-shadow','chase-moon','chase-earth','chase-shadow'].includes(label)){/* Moon geometry and its reflected image may contribute. */}
   else if(lunarPolesAdded&&['moon','chase-moon'].includes(label)){/* Polar filtering may or may not contribute at this framing. */}
   else if(cloudMapChanged&&['earth','earth-shadow','moon','chase-earth','chase-moon','chase-shadow'].includes(label)){if(label==='earth')assert.notEqual(pair.candidate.pixelSha256,pair.previous.pixelSha256,`${label}: revised cloud source encoding`);}
   else if(lunarReliefChanged&&['moon','chase-moon'].includes(label))assert.notEqual(pair.candidate.pixelSha256,pair.previous.pixelSha256,`${label}: source-derived lunar relief`);
   else if(surfaceMapsChanged&&['earth','moon','earth-shadow','chase-earth','chase-moon','chase-shadow'].includes(label)){if(['earth','moon'].includes(label))assert.notEqual(pair.candidate.pixelSha256,pair.previous.pixelSha256,`${label}: higher-resolution source maps`);}
   else if(cloudHeightChanged&&['earth','earth-shadow','chase-earth','chase-shadow'].includes(label)){if(label==='earth')assert.notEqual(pair.candidate.pixelSha256,pair.previous.pixelSha256,`${label}: revised cloud height field`);}
   else if(earthDimensionsChanged&&['earth','moon','earth-shadow','chase-earth','chase-moon','chase-shadow'].includes(label)){if(label.includes('earth'))assert.notEqual(pair.candidate.pixelSha256,pair.previous.pixelSha256,`${label}: revised Earth dimensions`);}
   else if(saturnCapAdded&&['saturn','ring-plane','north-pole','titan','chase','chase-titan'].includes(label)){if(label==='north-pole')assert.notEqual(pair.candidate.pixelSha256,pair.previous.pixelSha256,'Saturn: revised polar sampling');}
   else if((shadowLookupAdded||directRingChanged)&&['saturn','ring-plane','north-pole','titan','chase','chase-titan'].includes(label)){if(['saturn','ring-plane'].includes(label))assert.notEqual(pair.candidate.pixelSha256,pair.previous.pixelSha256,`${label}: revised ring shadow`);}
   else if(ioMapChanged&&['io','jupiter','jupiter-close','jupiter-narrow','chase-jupiter'].includes(label)){if(label==='io')assert.notEqual(pair.candidate.pixelSha256,pair.previous.pixelSha256,'Io: source imagery changed');}
   else if(!jupiterMapChanged||!label.includes('jupiter')&&label!=='io')assert.equal(pair.candidate.pixelSha256,pair.previous.pixelSha256,`${label}: unchanged pixels`);
   if(label.startsWith('chase'))for(const mode of ['previous','candidate']){
    const s=pair[mode].shadow;assert.ok(s.updated&&s.current&&s.reflectedPosition&&!s.pending,`${label}: fresh physical shadow and reflection`);
    assert.deepEqual(s.viewport,[0,0,pair[mode].width,pair[mode].height],`${label}: full restored viewport`);
   }
  }
  for(const label of jupiterMapChanged&&!jupiterSourceChanged?['jupiter-close','jupiter-narrow']:[]){
   const pair=views[label];assert.ok(pair.previous.outlier.visible&&pair.candidate.outlier.visible,label);
   assert.ok(pair.previous.outlier.blueExcess>20,`${label}: reproduced blue outlier`);
   assert.ok(pair.candidate.outlier.blueExcess<0,`${label}: isolated blue outlier removed`);
  }
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),views,errors,passed:true});console.log({name,views:Object.keys(views).length,passed:true});
 }finally{await browser.close();}
}
await fs.writeFile('tests/visual-review-results.json',JSON.stringify({versions,sources,method:'Full original meshes in both variants isolate material rendering. Adaptive geometry is verified separately.',outcomes},null,2)+'\n');
