"""Exercise the actual macOS launcher without opening tabs in a player's browser."""
from contextlib import contextmanager
import http.client, http.server, os, pathlib, socket, struct, subprocess, sys, tempfile, threading, time
root=pathlib.Path(__file__).resolve().parents[1]
@contextmanager
def process(args,env,cwd):
    proc=subprocess.Popen(args,env=env,cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    try:yield proc
    finally:
        proc.terminate();proc.wait(timeout=5)
def wait_ready(port,proc):
    for _ in range(100):
        assert proc.poll() is None
        conn=http.client.HTTPConnection('127.0.0.1',port,timeout=.3)
        try:
            conn.request('HEAD','/index.html');r=conn.getresponse()
            if r.status==200 and r.getheader('X-Cosmos-Project'):return
        except OSError:pass
        finally:conn.close()
        time.sleep(.05)
    raise RuntimeError('Launcher did not serve the game')
class Other(http.server.BaseHTTPRequestHandler):
    def do_HEAD(self):self.send_response(200);self.end_headers()
    def log_message(self,*a):pass
with tempfile.TemporaryDirectory() as tmp,http.server.ThreadingHTTPServer(('127.0.0.1',0),Other) as other:
    port=other.server_port;threading.Thread(target=other.serve_forever,daemon=True).start();env=os.environ.copy()
    env.update(PATH=tmp+os.pathsep+env['PATH'],PYTHONUNBUFFERED='1',BROWSER='true',COSMOS_OPEN_LOG=tmp+'/opened')
    opener=pathlib.Path(tmp)/'open';opener.write_text('#!/bin/sh\nprintf "%s\\n" "$*" >> "$COSMOS_OPEN_LOG"\n');opener.chmod(0o755)
    cmd=[str(root/'Start Cosmos.command'),'--port',str(port)] if sys.platform=='darwin' else [sys.executable,str(root/'server.py'),'--port',str(port)]
    with process(cmd,env,tmp) as proc:
        line=proc.stdout.readline();assert 'ready at' in line,line
        actual=int(line.rstrip().rsplit(':',1)[1]);assert actual!=port;wait_ready(actual,proc)
        repeated=subprocess.run(cmd,env=env,cwd=tmp,capture_output=True,text=True,timeout=5,check=True)
        assert f'already running at http://127.0.0.1:{actual}' in repeated.stdout,repeated.stdout
        if sys.platform=='darwin' and pathlib.Path('/Applications/Google Chrome.app').exists():
            for _ in range(40):
                if opener.with_name('opened').exists() and len(opener.with_name('opened').read_text().splitlines())==2:break
                time.sleep(.05)
            assert opener.with_name('opened').read_text().splitlines()==[f'-a Google Chrome http://127.0.0.1:{actual}']*2
        # Abort a full transfer just as a browser reload would; keep serving.
        with socket.create_connection(('127.0.0.1',actual)) as sock:
            sock.sendall(b'GET /assets/models/voyager-compact.glb HTTP/1.1\r\nHost: localhost\r\n\r\n');sock.recv(64)
            sock.setsockopt(socket.SOL_SOCKET,socket.SO_LINGER,struct.pack('ii',1,0))
        wait_ready(actual,proc);time.sleep(.15)
    assert 'Traceback' not in proc.stdout.read()
    with process(['node',str(root/'server.mjs')],{**env,'PORT':str(actual)},tmp) as proc:
        wait_ready(actual,proc);reused=subprocess.run([sys.executable,str(root/'server.py'),'--port',str(actual)],capture_output=True,text=True,timeout=5,check=True);assert 'already running' in reused.stdout
    other.shutdown()
print('Launcher passed: root command from another directory; unrelated port skipped; Python and Node origins reused.')
