import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:90000});await page.click('#begin');
 await page.evaluate(async()=>{const a=window.__cosmos,t=await import('three');a.startChapter(0,0,'moon');a.game.timePaused=true;a.game.mode='panel';document.getElementById('hud').hidden=true;a.world.setQuality('ultra');const b=a.world.bodies.moon;window.originalMoonMaterial=b.mesh.material;window.originalNormal=b.uniforms.reliefNormal.value;window.flatNormal=new t.DataTexture(new Uint8Array([128,128,255,255]),1,1);flatNormal.needsUpdate=true;window.moonUnlit=new t.MeshBasicMaterial({map:b.uniforms.surfaceMap.value});window.moonSolid=new t.MeshBasicMaterial({color:0xdddddd});window.normalDiagnostic=new t.ShaderMaterial({uniforms:b.uniforms,vertexShader:b.mesh.material.vertexShader,fragmentShader:b.mesh.material.fragmentShader.replace('float mu=max(dot(n,view),.0001);','gl_FragColor=vec4(n*.5+.5,1.);return;float mu=max(dot(n,view),.0001);')});});
 for(const variant of ['original','no-shadows','flat-normal','unlit','solid','normal-vector','flat-vector']){
  await page.evaluate(variant=>{const a=window.__cosmos,b=a.world.bodies.moon;b.mesh.material=variant.includes('vector')?normalDiagnostic:variant==='unlit'?moonUnlit:variant==='solid'?moonSolid:originalMoonMaterial;b.uniforms.reliefShadows.value=variant==='original'?1:0;b.uniforms.reliefNormal.value=(variant==='flat-normal'||variant==='flat-vector')?flatNormal:originalNormal;a.world.update(a.game.player,0,{view:'probe',exposure:1,look:a.game.look});},variant);
  await page.screenshot({path:`tests/screenshots/v26-lunar-diagnostic-${variant}.png`});
 }
 console.log({errors});const samples=await page.evaluate(async()=>{const t=await import('three'),a=window.__cosmos,ray=new t.Raycaster(),out=[];for(let y=235;y<=250;y++)for(let x=712;x<=735;x++){ray.setFromCamera(new t.Vector2(x/1280*2-1,1-y/800*2),a.world.camera);const hit=ray.intersectObject(a.world.bodies.moon.mesh)[0];if(hit)out.push({x,y,uv:hit.uv.toArray()});}return out;});await fs.writeFile('tests/lunar-diagnostic-v26-uv.json',JSON.stringify(samples));
}finally{await browser.close();}
