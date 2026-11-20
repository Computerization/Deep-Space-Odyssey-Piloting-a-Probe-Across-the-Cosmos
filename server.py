"""Cosmos local launcher. Python standard library only; no network dependencies."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from http.client import HTTPConnection,HTTPException
from pathlib import Path
from functools import partial
from cosmos_browser import open_browser
import argparse,threading,re,os,hashlib,errno
parser=argparse.ArgumentParser();parser.add_argument('--open',action='store_true');parser.add_argument('--port',type=int,default=4173);args=parser.parse_args()
root=str(Path(__file__).resolve().parent)
project_id=hashlib.sha256(os.fsencode(root)).hexdigest()
def same_project(port):
    # Browser saves belong to an origin, including its port. Reopen this copy
    # if it is already running; never adopt a server from a different folder.
    conn=HTTPConnection('127.0.0.1',port,timeout=.4)
    try:
        conn.request('HEAD','/index.html');response=conn.getresponse()
        return response.status==200 and response.getheader('X-Cosmos-Project')==project_id
    except (OSError,HTTPException):return False
    finally:conn.close()
class Handler(SimpleHTTPRequestHandler):
    extensions_map={**SimpleHTTPRequestHandler.extensions_map,'.js':'text/javascript','.mjs':'text/javascript','.glb':'model/gltf-binary','.m4a':'audio/mp4','.mp3':'audio/mpeg','.mp4':'video/mp4','.webm':'audio/webm','.avif':'image/avif'}
    def handle(self):
        # Reloading a tab can cancel a normal asset or a media range mid-write.
        try:super().handle()
        except (BrokenPipeError,ConnectionResetError):pass
    def log_message(self,*args):pass
    def end_headers(self):
        self.send_header('X-Cosmos-Project',project_id)
        self.send_header('Cache-Control','no-cache');self.send_header('Accept-Ranges','bytes');super().end_headers()
    def send_head(self):
        self.range_bytes=None
        value=self.headers.get('Range','').strip()
        match=re.fullmatch(r'bytes=(\d*)-(\d*)',value,re.IGNORECASE)
        target=Path(self.translate_path(self.path))
        if self.command!='GET' or self.headers.get('If-Range') or not match or not any(match.groups()) or not target.is_file():
            return super().send_head()
        first,last=match.groups();size=target.stat().st_size
        if first:
            start=int(first);end=int(last) if last else size-1
            if last and end<start:return super().send_head()
        else:
            count=int(last);start=max(0,size-count) if count else size;end=size-1
        if size==0 or start>=size:
            self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.send_header('Content-Length','0');self.end_headers();return None
        end=min(end,size-1)
        try:source=target.open('rb')
        except OSError:self.send_error(404,'File not found');return None
        info=os.fstat(source.fileno());source.seek(start);self.range_bytes=end-start+1
        self.send_response(206);self.send_header('Content-Type',self.guess_type(str(target)))
        self.send_header('Content-Range',f'bytes {start}-{end}/{size}');self.send_header('Content-Length',str(self.range_bytes))
        self.send_header('Last-Modified',self.date_time_string(info.st_mtime));self.end_headers();return source
    def copyfile(self,source,output):
        if self.range_bytes is None:return super().copyfile(source,output)
        remaining=self.range_bytes
        while remaining:
            chunk=source.read(min(65536,remaining))
            if not chunk:break
            output.write(chunk);remaining-=len(chunk)
server=None
for port in range(args.port,args.port+20):
    try:
        server=ThreadingHTTPServer(('127.0.0.1',port),partial(Handler,directory=root));break
    except OSError as error:
        if error.errno==errno.EADDRINUSE and same_project(port):break
        continue
else:
    raise SystemExit('Cosmos could not find a free local port. Close another launcher and try again.')
url=f'http://127.0.0.1:{port}'

if server is None:
    print(f'Cosmos is already running at {url}. Keep the original launcher window open.')
    if args.open:open_browser(url)
    raise SystemExit(0)
print(f'Cosmos is ready at {url}\nKeep this window open while playing. Press Control-C to stop.')
if args.open:threading.Timer(.4,open_browser,args=(url,)).start()
try:server.serve_forever()
except KeyboardInterrupt:server.server_close()
