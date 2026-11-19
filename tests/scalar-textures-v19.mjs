import {chromium,firefox,webkit,BASE_URL} from './browser.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const results=[];
for(const [name,engine,options] of [['Chrome',chromium,{channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}],['Firefox',firefox,{headless:true}],['WebKit',webkit,{headless:true}]]){
 const browser=await engine.launch(options),page=await browser.newPage({viewport:{width:1000,height:625}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await page.addInitScript(()=>{window.textureStorage=new Map();const original=WebGL2RenderingContext.prototype.texStorage2D;WebGL2RenderingContext.prototype.texStorage2D=function(target,levels,format,width,height){window.textureStorage.set(this.getParameter(this.TEXTURE_BINDING_2D),{levels,format,width,height});return original.call(this,target,levels,format,width,height);};});
  await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
  const fields=[];
  for(const [file,study] of [['earth-clouds.avif',null],['moon-height.webp','moon']]){
   const sample=await page.evaluate(async({file,study})=>{const a=window.__cosmos,w=a.world,t=await import('three');a.startChapter(0,0,study);a.game.mode='panel';a.game.timePaused=true;w.setQuality('ultra');w.followReady=false;const tex=w.textures[file],c=document.createElement('canvas');c.width=w.canvas.width;c.height=w.canvas.height;const ctx=c.getContext('2d');const capture=()=>{w.update(a.game.player,0,{view:'probe',exposure:1});ctx.drawImage(w.canvas,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};const red=capture(),storage=window.textureStorage.get(w.renderer.properties.get(tex).__webglTexture);tex.format=t.RGBAFormat;tex.needsUpdate=true;const rgba=capture();tex.format=t.RedFormat;tex.needsUpdate=true;const restored=capture();let maxDifference=0,changedChannels=0;for(let i=0;i<rgba.length;i++){maxDifference=Math.max(maxDifference,Math.abs(red[i]-rgba[i]),Math.abs(restored[i]-rgba[i]));if(red[i]!==rgba[i]||restored[i]!==rgba[i])changedChannels++;}let texels=0;for(let i=0;i<storage.levels;i++)texels+=Math.max(1,storage.width>>i)*Math.max(1,storage.height>>i);return{file,storage,maxDifference,changedChannels,scalarBytes:texels,previousRgbaBytes:texels*4,savedBytes:texels*3,glError:w.renderer.getContext().getError()};},{file,study});
   assert.equal(sample.storage.format,33321);assert.equal(sample.glError,0);assert.equal(sample.maxDifference,0);fields.push(sample);
  }
  assert.deepEqual(errors,[]);results.push({name,engineVersion:browser.version(),fields,errors,passed:true});console.log(results.at(-1));
 }finally{await browser.close();}
 await fs.writeFile('tests/scalar-textures-v19-results.json',JSON.stringify({results},null,2));
}
