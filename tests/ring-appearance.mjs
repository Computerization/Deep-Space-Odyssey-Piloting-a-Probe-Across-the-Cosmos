import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

// Pair the complete colour path: radial map, direct material and ringshine.
const prior=process.env.COSMOS_RING_PREVIOUS;
assert.ok(prior,'Set COSMOS_RING_PREVIOUS to the previous extracted source.');
const files=['src/rendering/shaders.js','src/rendering/ringshine.js','src/rendering/scene-factory.js','src/world.js','assets/textures/saturn-ring.png'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const versions={previous:JSON.parse(await fs.readFile(path.join(prior,'package.json'))).version,candidate:JSON.parse(await fs.readFile('package.json')).version};
const sources={};for(const mode of ['previous','candidate'])sources[mode]=Object.fromEntries(await Promise.all(files.map(async file=>[file,hash(await fs.readFile(mode==='previous'?path.join(prior,file):file))])));
const mapChanged=sources.previous['assets/textures/saturn-ring.png']!==sources.candidate['assets/textures/saturn-ring.png'];
const previousShaders=await fs.readFile(path.join(prior,'src/rendering/shaders.js'),'utf8'),currentShaders=await fs.readFile('src/rendering/shaders.js','utf8');
const shadowChanged=previousShaders.split('export const fragment=')[1].split('export const earthAtmosphereFragment')[0].split('export const ringFragment=')[0]!==currentShaders.split('export const fragment=')[1].split('export const earthAtmosphereFragment')[0].split('export const ringFragment=')[0];
const shadowLookupAdded=!String(await fs.readFile(path.join(prior,'src/world.js'))).includes('ringTransmissionProfile')&&String(await fs.readFile('src/world.js')).includes('ringTransmissionProfile');
// Dense native-profile integration independently resolves the solar footprint.
function denseShadow(source,samples){
 const begin=source.indexOf('  float transmitted=0.;'),end=source.indexOf('  shadow=transmitted;',begin);
 assert.ok(begin>0&&end>begin);
 let sum=0;for(let i=0;i<samples;i++){const x=(i+.5)/samples*6-3;sum+=Math.exp(-.5*x*x);}
 return source.slice(0,begin)+`float transmitted=0.;
 for(int y=0;y<7;y++)for(int x=0;x<7;x++){
  float pixelR=r+((float(x)+.5)/7.-.5)*dx+((float(y)+.5)/7.-.5)*dy;
  for(int i=0;i<${samples};i++){
   float offset=(float(i)+.5)/${samples}.*6.-3.,sampleR=pixelR+offset*sunWidth;
   float a=texture2DLodEXT(ringMap,vec2(clamp((sampleR-1.235)/1.085,0.,1.),.5),0.).a;
   float tau=sampleR>=1.235&&sampleR<=2.323?ringDepth(sampleR,a):0.;
   transmitted+=exp(-.5*offset*offset)/${sum}/49.*exp(-tau/max(.025,abs(localSun.y)));
  }
 }
 `+source.slice(end);
}
const compareReference=async({label,reference,previous,candidate})=>{
      const a=window.__cosmos,w=a.world;a.startChapter(2,0,'ring-plane');a.game.mode='panel';a.game.timePaused=true;a.game.view='probe';a.game.look.identity();w.setFov(label==='plane'?58:label==='plane-detail'?12:4);
      const material=w.bodies.saturn.mesh.material;material.fragmentShader=reference;material.needsUpdate=true;w.update(a.game.player,0,{view:'probe',exposure:1,look:a.game.look});
      const canvas=document.createElement('canvas');canvas.width=w.canvas.width;canvas.height=w.canvas.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(w.canvas,0,0);const dense=ctx.getImageData(0,0,canvas.width,canvas.height).data,metrics={};
      for(const [name,png] of [['previous',previous],['candidate',candidate]]){
       const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let error=0,max=0;
       for(let i=0;i<pixels.length;i++)if(i%4!==3){const d=Math.abs(pixels[i]-dense[i]);error+=d;max=Math.max(max,d);}
       metrics[name]={meanError:error/(pixels.length/4*3),maxError:max};
      }
      return{...metrics,referencePNG:w.canvas.toDataURL().split(',')[1]};
};
const dpr=Number(process.env.COSMOS_TEST_DPR||1);assert.ok([1,2].includes(dpr));
const outcomes=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 if(process.env.COSMOS_TEST_ENGINE&&!process.env.COSMOS_TEST_ENGINE.split(',').includes(name))continue;
 const browser=await engine.launch(options),errors=[],views={},images={};let cache;
 try{
  for(const mode of ['previous','candidate']){
   const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:dpr});
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   if(mode==='previous')for(const file of files)await page.route('**/'+file,route=>route.fulfill({path:path.join(prior,file),contentType:file.endsWith('.png')?'image/png':'text/javascript'}));
   await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,{timeout:90000});await page.click('#begin');
   await page.evaluate(()=>{window.__cosmos.world.setQuality('ultra');window.__cosmos.game.mode='panel';});
   for(const label of ['encounter','close','narrow','lit-low','unlit-low','night','chase','earth','plane','plane-detail','plane-narrow']){
    const result=await page.evaluate(async label=>{
     const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(label==='earth'?0:2,0,label.startsWith('plane')?'ring-plane':null);const g=a.game;
     g.mode='panel';g.timePaused=true;g.view=label==='chase'?'chase':'probe';g.look.identity();w.setFov(label==='close'?8:label==='plane-detail'?12:['narrow','plane-narrow'].includes(label)?4:58);
     const body=w.bodies.saturn,c=w.bodyPositions.saturn,R=body.data.radius,up=new t.Vector3(0,1,0).applyQuaternion(body.group.quaternion),sun=c.clone().negate().normalize();
     if(['close','narrow'].includes(label)){
      const side=new t.Vector3().crossVectors(up,g.player.position.clone().sub(c).normalize()).normalize(),target=c.clone().addScaledVector(side,1.85*R);
      g.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(g.player.position,target,new t.Vector3(0,1,0)));
     }else if(['lit-low','unlit-low','night'].includes(label)){
      const equator=sun.clone().addScaledVector(up,-sun.dot(up)).normalize(),angle=(label==='night'?25:1.427)*Math.PI/180;
      const height=Math.sin(angle)*Math.sign(sun.dot(up))*(label==='unlit-low'?-1:1),side=label==='night'?-1:1;
      g.player.position.copy(c).addScaledVector(equator,side*Math.cos(angle)*4.82*R).addScaledVector(up,height*4.82*R);
      g.player.quaternion.setFromRotationMatrix(new t.Matrix4().lookAt(g.player.position,c,up));
     }
     w.followReady=false;w.environmentDirty=true;
     const state=()=>[g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.fuel,g.localSeconds];
     const before=state();w.update(g.player,0,{view:g.view,look:g.look,exposure:1});
     const canvas=document.createElement('canvas');canvas.width=w.canvas.width;canvas.height=w.canvas.height;
     const ctx=canvas.getContext('2d');ctx.drawImage(w.canvas,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
     let flux=0,green=0,lit=0;for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2],l=.2126*r+.7152*g+.0722*b;flux+=l;if(l>12){lit++;if(g>r+4&&g>b+4)green++;}}
     const pixelSha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',pixels))].map(v=>v.toString(16).padStart(2,'0')).join('');
     return{png:w.canvas.toDataURL().split(',')[1],pixelSha256,before,after:state(),flux,green,lit,width:canvas.width,height:canvas.height,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,textures:w.renderer.info.memory.textures,geometries:w.renderer.info.memory.geometries};
    },label);
    const png=Buffer.from(result.png,'base64');(images[label]??={})[mode]=result.png;delete result.png;
    assert.deepEqual(result.after,result.before);delete result.after;delete result.before;
    result.imageSha256=hash(png);await fs.writeFile(`tests/screenshots/ring-${name}${dpr>1?'-dpr'+dpr:''}-${label}-${mode}.png`,png);
    (views[label]??={})[mode]=result;
   }
   if(mode==='candidate'&&shadowChanged){
    const source=await page.evaluate(()=>window.__cosmos.world.bodies.saturn.mesh.material.fragmentShader);
    // The direct ring material still owns the unchanged optical-depth function.
    const optics=await page.evaluate(()=>{const f=window.__cosmos.world.bodies.saturn.ring.material.fragmentShader;return f.slice(f.indexOf(' float ringDepth('),f.indexOf(' void main()'));});
    for(const label of ['plane','plane-detail','plane-narrow']){
     const reference=denseShadow(source.replace(' void main(){',optics+' void main(){'),61);
     const measured=await page.evaluate(compareReference,{label,reference,...images[label]});
     if(label==='plane-narrow'){
      const fine=denseShadow(source.replace(' void main(){',optics+' void main(){'),121);
      const convergence=await page.evaluate(compareReference,{label,reference:fine,previous:images[label].candidate,candidate:measured.referencePNG});
      measured.convergence={candidateTo121:convergence.previous,reference61To121:convergence.candidate};
      assert.ok(convergence.candidate.meanError<.01,'Dense shadow reference converges');
     }
     await fs.writeFile(`tests/screenshots/ring-${name}${dpr>1?'-dpr'+dpr:''}-${label}-reference.png`,Buffer.from(measured.referencePNG,'base64'));delete measured.referencePNG;
     views[label].reference=measured;
     await page.evaluate(source=>{const m=window.__cosmos.world.bodies.saturn.mesh.material;m.fragmentShader=source;m.needsUpdate=true;},source);
    }
   }
   if(mode==='candidate')cache=await page.evaluate(()=>{
    const w=window.__cosmos.world,texture=w.bodies.saturn.uniforms.ringShadow.value,identity=texture.uuid,rows=[];
    for(const epoch of [2,3,0,2]){w.setEpoch(epoch);w.renderer.initTexture(texture);rows.push({epoch,checksum:texture.image.data.reduce((sum,v,i)=>sum+v*(i+1),0),version:texture.version,textures:w.renderer.info.memory.textures});}
    const version=texture.version;w.setEpoch(2);return{rows,oneTexture:w.bodies.saturn.uniforms.ringShadow.value.uuid===identity,sameEpochRetainsData:texture.version===version,bytes:texture.image.data.byteLength};
   });
   await page.close();
  }
  for(const [label,pair] of Object.entries(views)){
   for(const key of ['width','height','calls','triangles','geometries'])assert.equal(pair.candidate[key],pair.previous[key],`${label}: ${key}`);
   assert.equal(pair.candidate.textures,pair.previous.textures+(shadowLookupAdded?1:0),`${label}: one shared shadow lookup`);
   if(label==='earth')assert.equal(pair.candidate.pixelSha256,pair.previous.pixelSha256,'Unchanged Earth image');
   else if(mapChanged||label.startsWith('plane'))assert.notEqual(pair.candidate.pixelSha256,pair.previous.pixelSha256,`${label}: revised ring appearance`);
  }
  for(const label of mapChanged?['close','narrow']:[]){
   assert.ok(views[label].candidate.green<views[label].previous.green*.1,`${label}: inherited green fringes reduced`);
   const ratio=views[label].candidate.flux/views[label].previous.flux;assert.ok(ratio>.9&&ratio<1.1,'Retained broad image brightness');
  }
  for(const label of shadowChanged?['plane-detail','plane-narrow']:[])assert.ok(views[label].reference.candidate.meanError<views[label].reference.previous.meanError*.5,`${label}: solar-footprint aliasing reduced`);
  assert.ok(cache.oneTexture&&cache.sameEpochRetainsData);assert.equal(cache.rows[0].checksum,cache.rows[3].checksum);assert.notEqual(cache.rows[0].checksum,cache.rows[1].checksum);assert.ok(cache.rows.every(r=>r.textures===cache.rows[0].textures));
  assert.deepEqual(errors,[]);outcomes.push({name,cache,engineVersion:browser.version(),views,physicalStatePreserved:true,errors,passed:true});console.log({name,passed:true,close:views.close});
 }finally{await browser.close();}
 await fs.writeFile(`tests/ring-appearance${dpr>1?'-dpr'+dpr:''}-results.json`,JSON.stringify({versions,dpr,sources,outcomes},null,2)+'\n');
}
