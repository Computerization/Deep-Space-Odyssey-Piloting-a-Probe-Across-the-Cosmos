// Compare display-grid cloud reconstruction with a full-resolution volume.
import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const previous=process.env.COSMOS_COMPOSITE_PREVIOUS;
const sources=['src/rendering/earth-shaders.js','src/rendering/cloud-layer.js','assets/textures/earth-clouds.avif'];
const hashes=Object.fromEntries(await Promise.all(sources.map(async p=>[p,createHash('sha256').update(await fs.readFile(p)).digest('hex')])));
const version=JSON.parse(await fs.readFile('package.json')).version,outcomes=[];
const scenes=[['day',2.35,35],['terminator',2.35,90],['crescent',2.35,150],['night',2.35,175],['close',1.08,35],['grazing',1.08,90],['resolved-limb',1.05,35,1.2645,4],['occlusion',2.35,35]];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),errors=[],views=[];let page,pageDpr;
 const preparePage=async dpr=>{
  await page?.close();page=await browser.newPage({viewport:{width:800,height:500},deviceScaleFactor:dpr});pageDpr=dpr;
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  if(previous){const source=(await fs.readFile(previous+'/src/rendering/earth-shaders.js','utf8')).replaceAll("from '../","from '/src/");await page.route('**/previous-cloud-shaders.js',r=>r.fulfill({body:source,contentType:'text/javascript'}));}
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
  await page.evaluate(async previous=>{
   const a=window.__cosmos,w=a.world;a.game.mode='loading';document.getElementById('hud').hidden=true;
   const currentHelper=(await import('/src/rendering/earth-shaders.js')).cloudReconstruction;
   const oldHelper=previous?(await import('/previous-cloud-shaders.js')).cloudReconstruction:null;
   const materials=[w.cloudLayer.splitCloud.material,w.cloudLayer.resolve].map(m=>{
    const current=m.fragmentShader,linear=oldHelper?current.replace(currentHelper,oldHelper):current.replace('sampleCloud(gl_FragCoord.xy/viewport,o,d)','texture2D(cloudColor,gl_FragCoord.xy/viewport)');
    if(linear===current&&!oldHelper)throw Error('Cloud reconstruction call missing');return{m,current,linear};
   });
   window.selectComposite=mode=>{for(const o of materials){const s=mode==='candidate'?o.current:o.linear;if(o.m.fragmentShader!==s){o.m.fragmentShader=s;o.m.needsUpdate=true;}}};
   window.cloudRender=w.cloudLayer.render;
  },!!previous);
 };
 try{
  await preparePage(2);
  const cases=[...scenes.flatMap(scene=>[1,.75].map(scale=>({scene,scale,dpr:2}))),{scene:scenes[0],scale:1,dpr:2,capture:true},...['day','resolved-limb'].map(label=>({scene:scenes.find(s=>s[0]===label),scale:1,dpr:1}))];
  for(const config of cases.filter(c=>!process.env.COSMOS_COMPOSITE_CASES||process.env.COSMOS_COMPOSITE_CASES.split(',').includes(c.capture?'capture':c.scene[0]))){
   if(config.dpr!==pageDpr)await preparePage(config.dpr);
   const result=await page.evaluate(async({scene,scale,dpr,capture=false})=>{
    const [label,radius,phase,yaw=0,fov=58]=scene,a=window.__cosmos,w=a.world,g=a.game,t=await import('three');
    a.startChapter(0);g.mode='loading';g.timePaused=true;g.look.identity();w.setQuality('high');w.cloudScale=scale;w.capturing=capture;w.setFov(fov);
    const c=w.bodyPositions.earth,sun=c.clone().negate().normalize(),side=new t.Vector3().crossVectors(sun,new t.Vector3(0,1,0)).normalize();
    const p=sun.multiplyScalar(Math.cos(phase*Math.PI/180)).addScaledVector(side,Math.sin(phase*Math.PI/180)).multiplyScalar(w.bodies.earth.data.radius*radius).add(c);
    g.player.position.copy(p);g.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(p,c,new t.Vector3(0,1,0))).multiply(new t.Quaternion().setFromAxisAngle(new t.Vector3(0,1,0),yaw));w.followReady=false;
    if(label==='occlusion')w.bodyPositions.moon.copy(p).lerp(c,.45);
    const physical=()=>JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.localSeconds,g.fuel]),before=physical(),frames={},resources=[];
    for(const mode of ['previous','candidate','reference','repeat']){
     selectComposite(mode);
     w.cloudLayer.render=mode==='reference'?function(renderer,camera,target,width,height,preserve){return cloudRender.call(this,renderer,camera,target,target.width,target.height,preserve)}:cloudRender;
     for(let i=0;i<2;i++)w.update(g.player,0,{view:'probe',look:g.look});
     const canvas=document.createElement('canvas');canvas.width=w.canvas.width;canvas.height=w.canvas.height;const x=canvas.getContext('2d',{willReadFrequently:true});x.drawImage(w.canvas,0,0);
     const data=new Uint16Array(w.frameTarget.width*w.frameTarget.height*4);w.renderer.readRenderTargetPixels(w.frameTarget,0,0,w.frameTarget.width,w.frameTarget.height,data);
     frames[mode]={display:x.getImageData(0,0,canvas.width,canvas.height).data,linear:Float32Array.from(data,t.DataUtils.fromHalfFloat),png:canvas.toDataURL().split(',')[1]};
     resources.push({calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,textures:w.renderer.info.memory.textures,geometries:w.renderer.info.memory.geometries});
    }
    const error=(a,b)=>{let sum=0,sq=0,max=0,gradient=0,n=0;for(let i=0;i<a.length;i++){if(i%4===3)continue;const e=a[i]-b[i];if(!Number.isFinite(e))throw Error('Non-finite reconstruction');sum+=Math.abs(e);sq+=e*e;max=Math.max(max,Math.abs(e));if(i>=4){const d=(a[i]-a[i-4])-(b[i]-b[i-4]);gradient+=d*d;}n++;}return{mean:sum/n,rmse:Math.sqrt(sq/n),max,gradientRmse:Math.sqrt(gradient/n)}};
    const metrics=Object.fromEntries(['previous','candidate'].map(mode=>[mode,Object.fromEntries(['display','linear'].map(type=>[type,error(frames[mode][type],frames.reference[type])]))]));
    const change=error(frames.previous.display,frames.candidate.display),repeat=error(frames.previous.display,frames.repeat.display);
    w.cloudLayer.render=cloudRender;w.capturing=false;
    return{label,scale,dpr,capture,metrics,change,repeat,resources,physicalStatePreserved:physical()===before,images:['day','close','crescent'].includes(label)&&dpr===2&&!capture?Object.fromEntries(Object.entries(frames).map(([k,v])=>[k,v.png])):null};
   },config);
   if(result.images&&name==='Chrome')for(const [mode,png] of Object.entries(result.images))await fs.writeFile(`tests/screenshots/cloud-composite-${result.label}-${result.scale}-${mode}.png`,Buffer.from(png,'base64'));delete result.images;
   assert.ok(result.physicalStatePreserved);assert.equal(result.repeat.max,0,'Repeated linear control remains identical');for(const r of result.resources)assert.deepEqual(r,result.resources[0]);
   for(const type of ['display','linear']){
    const a=result.metrics.previous[type],b=result.metrics.candidate[type];
    assert.ok(b.rmse<=a.rmse*1.01+1e-6,JSON.stringify({name,...result}));
    assert.ok(b.gradientRmse<=a.gradientRmse*1.01+1e-6,JSON.stringify({name,...result}));
   }
   if(previous||config.dpr===1||config.capture)assert.equal(result.change.max,0,'Native grids and direct photography stay unchanged');
   else if(['day','close'].includes(result.label))assert.ok(result.metrics.candidate.display.rmse<result.metrics.previous.display.rmse*.95,'Resolved cloud detail must improve');
   views.push(result);console.log({name,label:result.label,scale:result.scale,dpr:result.dpr,capture:result.capture,previous:result.metrics.previous.display.rmse,candidate:result.metrics.candidate.display.rmse});
  }
  assert.deepEqual(errors,[]);outcomes.push({name,engineVersion:browser.version(),views,errors});
 }finally{await browser.close()}
}
await fs.writeFile(process.env.COSMOS_COMPOSITE_REPORT||'tests/cloud-composite-results.json',JSON.stringify({version,hashes,previousHelper:previous||null,method:'Same volume field and physical state. Prior bilinear reconstruction versus bounded cubic reconstruction; independent full-display-resolution volume as reference. Display/linear error and horizontal gradient error, two adaptive budgets, native-grid and direct-photography controls. This measures reconstruction fidelity, not photographic equivalence.',outcomes},null,2)+'\n');
