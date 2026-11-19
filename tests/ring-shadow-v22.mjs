import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=await fs.readFile('tests/fixtures/planet-v21.glsl','utf8');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:800,height:500}}),errors=[],views=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 await page.evaluate(base=>{
  const a=window.__cosmos;a.startChapter(2);a.game.mode='panel';a.game.timePaused=true;
  window.baselineShadow=base;window.currentShadow=a.world.bodies.saturn.mesh.material.fragmentShader;
  a.world.sky.visible=false;document.querySelector('#hud').hidden=true;
  for(const b of Object.values(a.world.bodies))for(const child of b.group.children)child.visible=b===a.world.bodies.saturn&&child===b.mesh;
 },base);
 for(const [name,study,fov] of [['encounter',null,58],['detail',null,24],['ring-plane','ring-plane',58]]){
  await page.evaluate(({study,fov})=>{const a=window.__cosmos;a.startChapter(2,0,study);a.game.mode='panel';a.world.setFov(fov);}, {study,fov});
  for(const mode of ['base','current','reference','mask','full']){
   const data=await page.evaluate(mode=>{
    const a=window.__cosmos,w=a.world,mat=w.bodies.saturn.mesh.material;
    let shader=mode==='base'?baselineShadow:currentShadow;
    if(mode!=='full'){
     shader=shader.replace('gl_FragColor=vec4(color,1.);',`gl_FragColor=vec4(vec3(${mode==='mask'?'1.':'shadow'}),1.);`)
      .replaceAll('#include <tonemapping_fragment>','').replaceAll('#include <colorspace_fragment>','');
    }
    mat.fragmentShader=shader;mat.needsUpdate=true;
    const ratio=mode==='reference'?4:1;Object.defineProperty(window,'devicePixelRatio',{value:ratio,configurable:true});w.ratio=ratio;w.resize();
    w.update(a.game.player,0,{view:'probe',exposure:1,look:a.game.look});
    return w.canvas.toDataURL('image/png').split(',')[1];
   },mode);
   const path=`tests/screenshots/v22-shadow-${name}-${mode}.png`;await fs.writeFile(path,Buffer.from(data,'base64'));views.push({name,mode,path});
  }
 }
 assert.deepEqual(errors,[]);await fs.writeFile('tests/ring-shadow-v22-results.json',JSON.stringify({views,errors},null,2));console.log({views:views.length,errors});
}finally{await browser.close();}
