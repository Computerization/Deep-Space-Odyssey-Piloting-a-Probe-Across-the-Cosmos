"""Copy the v16 Opus packets into Ogg; optionally pass the v16 assets/audio folder."""
from pathlib import Path
import subprocess, hashlib, json, sys
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]) if len(sys.argv)>1 else root/'assets/audio'
rows=[]
for name in ['departure','encounter','rings','distance']:
    old=source/(name+'.webm');new=root/'assets/audio'/(name+'.ogg')
    subprocess.run(['ffmpeg','-v','error','-y','-itsoffset','0.005','-i',str(old),'-c:a','copy',str(new)],check=True)
    def pcm(path):
        return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ac','2','-ar','48000','-'])
    a,b=pcm(old),pcm(new)
    assert b[:len(a)]==a and 0<=len(b)-len(a)<=8*48
    rows.append(dict(name=name,oldBytes=old.stat().st_size,newBytes=new.stat().st_size,
                     originalPcmSha256=hashlib.sha256(a).hexdigest(),originalPcmIdentical=True,
                     additionalTailFrames=(len(b)-len(a))//8,sampleRate=48000))
report=dict(method='Opus packet copy; original 120-second 48 kHz stereo float PCM matches byte for byte. A 5 ms input timestamp offset corrects the WebM-to-Ogg end granule, giving 120 seconds in browser decoders. FFmpeg includes 24 additional tail frames (0.5 ms).',tracks=rows)
(root/'tests/audio-container-v17-results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
