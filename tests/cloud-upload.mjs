// Isolate warmed patch assembly and upload. This is not an FPS benchmark.
import {chromium,BASE_URL} from './browser.mjs';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const previous=process.env.COSMOS_CLOUD_STREAM_PREVIOUS;assert.ok(previous);
const source=await fs.readFile(previous+'/src/rendering/cloud-detail.js','utf8');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']}),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.route('**/src/rendering/cloud-detail.js?upload-reference',r=>r.fulfill({body:source,contentType:'text/javascript'}));
 await page.goto(BASE_URL+'/?test=1');await page.waitForFunction(()=>window.__cosmos,null,{timeout:120000});await page.click('#begin');
 const result=await page.evaluate(async()=>{
  const a=window.__cosmos,w=a.world,d=w.cloudDetail,g=a.game;g.mode='loading';
  const state=()=>JSON.stringify([g.player.position.toArray(),g.player.velocity.toArray(),g.player.quaternion.toArray(),g.localSeconds,g.fuel]),physical=state();
  const reference=(await import('./src/rendering/cloud-detail.js?upload-reference')).CloudDetail;
  const variants={previous:reference.prototype.load,candidate:d.load},targets=[{x:14,y:3,key:'14-3'},{x:15,y:3,key:'15-3'}];
  const gl=w.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');assertAvailable();
  function assertAvailable(){if(!ext)throw Error('GPU timer unavailable');}
  for(const mode of ['previous','candidate'])for(const target of targets){d.wanted=target;await variants[mode].call(d,target);w.renderer.initTexture(d.active.texture);gl.finish();}
  const samples=[];
  for(let i=0;i<32;i++){
   const mode=['previous','candidate','candidate','previous'][i%4],target=targets[i%2];gl.finish();
   const start=performance.now();d.wanted=target;await variants[mode].call(d,target);const assembled=performance.now();
   const q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);w.renderer.initTexture(d.active.texture);gl.endQuery(ext.TIME_ELAPSED_EXT);const uploaded=performance.now();gl.finish();const finished=performance.now();
   for(let i=0;i<60&&!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE);i++)await new Promise(requestAnimationFrame);
   const gpuMs=!gl.getParameter(ext.GPU_DISJOINT_EXT)&&gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)?gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6:null;gl.deleteQuery(q);
   samples.push({mode,group:Math.floor(i/4),key:target.key,assemblyMs:assembled-start,uploadCPUMs:uploaded-assembled,finishReturnMs:finished-start,gpuMs,texture:d.active.texture.uuid});
  }
  return{samples,preserved:state()===physical,graphicsError:gl.getError(),cacheSize:d.cache.size,resources:{...w.renderer.info.memory}};
 });
 assert.ok(result.preserved);assert.equal(result.graphicsError,0);assert.ok(result.cacheSize<=8);assert.deepEqual(errors,[]);
 const summary=Object.fromEntries(['previous','candidate'].map(mode=>[mode,Object.fromEntries(['assemblyMs','uploadCPUMs','finishReturnMs','gpuMs'].map(key=>{const values=result.samples.filter(s=>s.mode===mode&&s[key]!==null).map(s=>s[key]).sort((a,b)=>a-b);return[key,{median:values[Math.floor(values.length/2)],p95:values[Math.floor(values.length*.95)],samples:values.length}];}))]));
 const digest=x=>createHash('sha256').update(x).digest('hex');
 await fs.writeFile(process.env.COSMOS_CLOUD_UPLOAD_REPORT||'tests/cloud-upload-results.json',JSON.stringify({method:'Chrome Metal. Two adjacent regions warmed into the same decoded cache. Eight ABBA groups compare old/new load methods on one renderer. CPU assembly, upload submission, time until the finish call returns and GPU query intervals are separate. CPU finish-return timing and GPU query intervals differ and must not be treated as interchangeable. This does not represent normal frame scheduling.',sourceHashes:{previous:digest(source),candidate:digest(await fs.readFile('src/rendering/cloud-detail.js'))},summary,...result,errors},null,2)+'\n');console.log(summary);
}finally{await browser.close();}
