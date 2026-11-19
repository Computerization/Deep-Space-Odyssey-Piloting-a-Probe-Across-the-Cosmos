import {spawn} from 'node:child_process';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const source=await fs.readFile('assets/audio/rings.webm'),reports=[];
for(const [name,command,args,port] of [['Node','node',['server.mjs'],4191],['Python','python3',['-u','server.py','--port','4192'],4192]]){
 const child=spawn(command,args,{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',v=>output+=v);child.stderr.on('data',v=>output+=v);
 try{
  const timeout=Date.now()+10000;while(!output.includes('Cosmos is ready')){assert.ok(Date.now()<timeout,output);assert.equal(child.exitCode,null);await new Promise(r=>setTimeout(r,100));}
  const url=`http://127.0.0.1:${port}/assets/audio/rings.webm`,cases=[];
  for(const [range,status,start,end] of [['bytes=0-1023',206,0,1023],['bytes=-512',206,source.length-512,source.length-1],[`bytes=${source.length-50}-`,206,source.length-50,source.length-1],[`bytes=${source.length-50}-999999999`,206,source.length-50,source.length-1],[`bytes=${source.length}-`,416],['bytes=-0',416],['bytes=20-10',200],['bytes=0-2,5-8',200]]){
   const r=await fetch(url,{headers:{Range:range}}),body=Buffer.from(await r.arrayBuffer());assert.equal(r.status,status);assert.equal(r.headers.get('accept-ranges'),'bytes');
   if(status===206){assert.deepEqual(body,source.subarray(start,end+1));assert.equal(r.headers.get('content-range'),`bytes ${start}-${end}/${source.length}`);}
   else if(status===416){assert.equal(body.length,0);assert.equal(r.headers.get('content-range'),`bytes */${source.length}`);}else assert.deepEqual(body,source);
   cases.push({range,status,bytes:body.length});
  }
  const head=await fetch(url,{method:'HEAD',headers:{Range:'bytes=0-10'}});assert.equal(head.status,200);assert.equal(Number(head.headers.get('content-length')),source.length);assert.equal((await head.arrayBuffer()).byteLength,0);
  reports.push({name,cases,headIgnoresRange:true});
 }finally{child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}
}
await fs.writeFile('tests/media-server-v16-results.json',JSON.stringify({reports},null,2));console.log({launchers:reports.length,rangeCases:reports.reduce((n,r)=>n+r.cases.length,0)});
