"""Measure actual browser-loop PCM captured by tests/audio-seams-v16.mjs.
This establishes signal continuity, not a headphone listening judgement.
"""
from pathlib import Path
import argparse,json,wave
import numpy as np
p=argparse.ArgumentParser();p.add_argument('--audio',type=Path,default=Path('/private/tmp/cosmos-audio-v16'));p.add_argument('--capture',type=Path,default=Path('tests/audio-seams-v16-capture.json'));p.add_argument('--output',type=Path,default=Path('tests/audio-seams-v16-results.json'));a=p.parse_args()
report=json.loads(a.capture.read_text());results=[]
for track in report['tracks']:
 name=track['name']
 with wave.open(str(a.audio/(name+'.wav'))) as f:sr=f.getframerate();samples=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,2).astype(float)/32768
 timeline=track['timeline'];wraps=[t['context'] for i,t in enumerate(timeline) if i and t['media']<timeline[i-1]['media']]
 assert wraps,f'{name}: capture did not cross the actual loop'
 wrap=wraps[0];offset=track['firstChunk']-(4096-128)/sr
 near=samples[max(0,int((wrap-offset-.25)*sr)):min(len(samples),int((wrap-offset+.25)*sr))]
 quiet=np.max(abs(near),axis=1)<=1/32768*1.01;edges=np.diff(np.r_[False,quiet,False].astype(int));starts=np.where(edges==1)[0];ends=np.where(edges==-1)[0];gap=(ends-starts).max(initial=0)/sr
 block=round(sr*.01);rms=[float(np.sqrt(np.mean(near[i:i+block]**2))) for i in range(0,len(near)-block,block)]
 results.append({'name':name,'wrapContextSeconds':wrap,'silentRunMs':gap*1000,'minimum10msRms':min(rms),'maximum10msRms':max(rms),'rmsNearLoop':float(np.sqrt(np.mean(near**2))),'maximumSampleStep':float(np.max(abs(np.diff(near,axis=0))))})
result={'tracks':results,'audioWorkletCapturedActualOutput':True,'listeningQualityAuditioned':False};a.output.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
