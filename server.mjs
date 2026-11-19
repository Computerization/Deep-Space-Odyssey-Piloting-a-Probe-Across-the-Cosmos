import http from 'node:http';
import {createHash} from 'node:crypto';
import { realpath,stat } from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {byteRange} from './server-range.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const projectId=createHash('sha256').update(await realpath(root)).digest('hex');
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary','.ogg':'audio/ogg','.mp4':'video/mp4','.webm':'audio/webm','.avif':'image/avif','.mp3':'audio/mpeg','.m4a':'audio/mp4','.wav':'audio/wav','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.ico':'image/x-icon'};
const server = http.createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    const info = await stat(file);
    if (!info.isFile()) throw Error('Not a file');
    const headers={'X-Cosmos-Project':projectId,'Content-Type':types[path.extname(file)] || 'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
    const range=req.method==='GET'&&!req.headers['if-range']?byteRange(req.headers.range,info.size):null;
    if(range?.unsatisfiable){res.writeHead(416,{'Content-Range':`bytes */${info.size}`,'Content-Length':0,'Accept-Ranges':'bytes'});return res.end();}
    if(range){headers['Content-Range']=`bytes ${range.start}-${range.end}/${info.size}`;headers['Content-Length']=range.end-range.start+1;}
    res.writeHead(range?206:200,headers);
    if(req.method==='HEAD')return res.end();
    const stream=createReadStream(file,range||{});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(port,'127.0.0.1',()=>console.log(`Cosmos is ready at http://127.0.0.1:${port}`));
