// Compare the two flight-UI geometry kernels in the same Chrome process.
// No WebGL drawing: times are CPU milliseconds per complete camera sweep.
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {chromium,BASE_URL} from './browser.mjs';

const root=process.env.COSMOS_REFERENCE_ROOT;
assert.ok(root,'Set COSMOS_REFERENCE_ROOT to an unchanged source checkout.');
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage();
 for(const file of ['view-framing.js','ui/bearing-layout.js']){
  const body=await readFile(path.join(root,'src',file),'utf8');
  await page.route(`${BASE_URL}/reference/${file}`,r=>r.fulfill({contentType:'text/javascript',body}));
 }
 // A lightweight same-origin document keeps the game render loop out of the measurement.
 await page.goto(`${BASE_URL}/assets/icon.svg`);
 const results=await page.evaluate(async()=>{
  const views=[],scenes=[];
  for(const fov of [58,12])for(const aspect of [4/3,16/9])for(let i=0;i<900;i++){
   const a=i*Math.PI/450,tilt=.54*Math.sin(3*a),z=Math.cos(tilt)*Math.cos(a);
   const k=Math.max(.0001,Math.abs(z))*Math.tan(fov*Math.PI/360);
   views.push([{x:Math.cos(tilt)*Math.sin(a)/(k*aspect),y:Math.sin(tilt)/k,angle:Math.acos(z),distance:2.5+.5*Math.cos(2*a)},1,fov,aspect]);
  }
  const avoid=[[32,299,22,121],[528,768,22,68],[32,392,350.5,460],[32,304.53125,504,575],[519.640625,768,531,575]].map(([left,right,top,bottom])=>({left,right,top,bottom}));
  for(let i=0;i<240;i++){
   const a=i*Math.PI/120;
   scenes.push({x:-173+470*Math.sin(a),y:1127-690*Math.sin(a/2),radius:603,ellipse:{major:686,minor:376,angle:2.177+.2*Math.sin(2*a)},width:800,height:600,labelWidth:71.375,labelHeight:49,avoid});
  }
  async function suite(dir){
   const {discFraming}=await import(dir+'view-framing.js'),{bearingLayout}=await import(dir+'ui/bearing-layout.js');
   return {discs:()=>views.map(args=>discFraming(...args)),labels:()=>{
    let preferred=null;return scenes.map(scene=>{const p=bearingLayout({...scene,preferred});preferred=p.side;return p;});
   }};
  }
  function equivalent(a,b){
   if(a===b)return true;
   if(typeof a==='number'&&typeof b==='number')return Math.abs(a-b)<=1e-11*Math.max(1,Math.abs(a));
   if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
   return Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>equivalent(a[k],b[k]));
  }
  function time(fn,repeats){const start=performance.now();for(let i=0;i<repeats;i++)fn();return (performance.now()-start)/repeats;}
  const baseline=await suite('/reference/'),candidate=await suite('/src/'),results={};
  for(const [name,repeats] of [['discs',12],['labels',3]]){
   const a=baseline[name](),b=candidate[name]();
   if(!(name==='labels'?JSON.stringify(a)===JSON.stringify(b):equivalent(a,b)))throw Error(`${name}: output changed`);
   const variants=[baseline[name],candidate[name]],samples=[[],[]];
   for(let i=0;i<16;i++)for(const j of i%2?[1,0]:[0,1]){
    const elapsed=time(variants[j],repeats);if(i>=4)samples[j].push(elapsed);
   }
   const median=s=>{s.sort((a,b)=>a-b);return (s[5]+s[6])/2;};
   results[name]={cases:a.length,baselineMs:median(samples[0]),candidateMs:median(samples[1])};
  }
  return results;
 });
 console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
