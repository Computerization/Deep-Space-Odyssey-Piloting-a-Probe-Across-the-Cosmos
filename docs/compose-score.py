"""Cosmos chamber score: original notes, CC0 acoustic instruments, circular reverb.

Run: python3 docs/compose-score.py --samples /path/to/VSCO-2-CE
Only eight named WAVs are needed. See music-v5.md for provenance and regeneration.
Intermediate PCM stays outside the game. No remote requests occur at runtime.
"""
from pathlib import Path
import argparse, json, subprocess, tempfile, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SR = 32000
DURATION = 240
N = SR * DURATION
BEAT = 60 / 64
REPOSITORY = 'https://github.com/sgossner/VSCO-2-CE'
REVISION = '440300901dfe9275fd84e0b7763af1f8443ae62e'
PIANO = {48: 'C3', 55: 'G3', 60: 'C4', 67: 'G4', 72: 'C5', 79: 'G5'}
SAMPLE_PATHS = {
    **{f'piano-{key}': f'Keys/Upright Nr1/UR1_{name}_pp_RR1.wav' for key, name in PIANO.items()},
    # The orchestral filenames use middle C = C3; the upright uses C4.
    'cello': 'Strings/Cello Section/susvib/susvib_C3_v1_1.wav',
    'horn': 'Brass/F Horn/sus/MOHorn_sus_C3_v1_1.wav',
}

# Eight four-bar phrases. Shared D–A–E motif connects the four environments.
SCORES = {
 'departure': {
  'title': 'A World Behind Us', 'piano': 1.0, 'bow': .75, 'horn': .44,
  'chords': [[50,57,62,66,69],[47,54,59,62,66],[43,55,59,62,66],[45,57,62,64,69],
             [42,54,57,62,66],[40,52,55,59,66],[43,55,59,62,64],[45,57,61,64,69]],
  'phrases': [[(1,74),(4,69),(7,76),(10,78)],[(2,78),(5,76),(8,74)],
              [(1,71),(4,74),(7,78),(10,76)],[(2,73),(5,74),(8,76)],
              [(1,74),(3.5,69),(6,76),(9,78),(12,81)],[(2,79),(5,78),(8,76),(11,74)],
              [(1,71),(5,74),(9,76)],[(2,73),(6,69),(10,64)]],
  'energy': [.7,.78,.85,.65,1,.9,.7,.55],
 },
 'encounter': {
  'title': 'Worlds in Motion', 'piano': .75, 'bow': 1, 'horn': .78,
  'chords': [[38,50,57,62,64],[46,53,58,62,65],[43,55,58,62,69],[45,57,62,64,67],
             [41,53,57,62,65],[46,58,62,65,69],[43,55,58,62,64],[45,57,61,64,67]],
  'phrases': [[(2,74),(5,69),(9,76)],[(2,77),(6,74),(10,70)],
              [(1,74),(5,77),(9,81)],[(3,79),(7,76)],
              [(1,77),(4,76),(7,74),(10,69)],[(2,70),(6,74),(10,77)],
              [(1,79),(4,77),(8,74)],[(2,76),(6,73),(10,69)]],
  'energy': [.6,.7,.88,.75,1,.82,.7,.5],
 },
 'rings': {
  'title': 'The Light Between', 'piano': .9, 'bow': .48, 'horn': .25,
  'chords': [[50,57,62,66,76],[47,54,59,62,69],[43,55,59,66,69],[45,57,61,64,71],
             [42,54,57,62,66],[40,52,55,59,66],[43,55,59,62,69],[45,57,62,64,69]],
  'phrases': [[(1,86),(4,81),(7,88),(10,90)],[(2,86),(6,81),(10,78)],
              [(1,83),(4,86),(8,90),(11,88)],[(2,85),(6,83),(10,81)],
              [(1,78),(4,81),(7,86),(10,88)],[(2,91),(6,90),(10,86)],
              [(1,83),(5,86),(9,81)],[(2,76),(6,73),(10,69)]],
  'energy': [.65,.76,.9,.72,.88,1,.65,.45],
 },
 'distance': {
  'title': 'Still Travelling', 'piano': .62, 'bow': .55, 'horn': .42,
  'chords': [[38,50,57,62,64],[35,47,54,59,62],[31,43,55,59,62],[33,45,57,62,64],
             [38,50,57,62,66],[40,52,55,59,62],[43,55,59,62,66],[33,45,57,61,64]],
  'phrases': [[(3,74),(8,69)],[(4,66)],[(3,71),(8,74)],[(4,76)],
              [(2,74),(6,69),(10,76)],[(3,78),(8,76)],[(3,74),(8,71)],[(5,69)]],
  'energy': [.55,.45,.6,.4,.8,.7,.5,.4],
 },
}


def developed_score(name, original):
    """A second, quieter response to the theme makes a four-minute arc."""
    score=dict(original)
    order=[0,2,1,3,4,6,5,7]
    score['chords']=original['chords']+[original['chords'][i][:] for i in order]
    first=[[(beat,midi-(12 if name=='rings' else 0)) for beat,midi in phrase] for phrase in original['phrases']]
    answer=[]
    for section,i in enumerate(order):
        phrase=first[i][::2] if section in [1,3,7] else first[i]
        answer.append([(min(14,beat+1),midi-(12 if name=='departure' and section<4 else 0)) for beat,midi in phrase])
    score['phrases']=first+answer
    score['energy']=original['energy']+[.50,.42,.62,.36,.76,.64,.52,.32]
    return score


def decode(path, instrument=True):
    filters=['-af','highpass=f=45,lowpass=f=6500'] if instrument else []
    data = subprocess.check_output(['ffmpeg','-v','error','-i',str(path),*filters,'-f','f32le','-ac','2','-ar',str(SR),'-'])
    return np.frombuffer(data,dtype='<f4').reshape(-1,2).copy()


def circular_add(out, signal, seconds, gain, pan=0):
    signal = signal * gain * np.array([np.sqrt(1-pan),np.sqrt(1+pan)],dtype=np.float32)
    start = int(seconds*SR) % N
    first = min(len(signal),N-start)
    out[start:start+first] += signal[:first]
    if first<len(signal): out[:len(signal)-first] += signal[first:]


def resample_pitch(sample, semitones):
    step = 2**(semitones/12)
    x = np.arange(0,len(sample)-1,step)
    i = x.astype(np.int32); f = (x-i).astype(np.float32)[:,None]
    return sample[i]*(1-f)+sample[i+1]*f


def compose(name, score, samples, temp):
    rng = np.random.default_rng(19770905 + list(SCORES).index(name))
    piano = np.zeros((N,2),np.float32); orchestra = np.zeros_like(piano)
    bed = np.zeros_like(piano); events=[]; cache={}
    def play(kind, midi, beat, duration, level, pan=0):
        key = (kind,midi)
        if key not in cache:
            root = min(PIANO,key=lambda n:abs(n-midi)) if kind=='piano' else 60
            source = samples[f'piano-{root}'] if kind=='piano' else samples[kind]
            cache[key] = resample_pitch(source,midi-root)
        data = cache[key]
        count = min(len(data),int(duration*SR))
        data = data[:count].copy(); time=np.arange(count)/SR
        if kind=='piano':
            envelope=np.minimum(time/.008,1)*np.minimum((count/SR-time)/.65,1)
            destination=piano; level*=12
        else:
            # Keep natural bow/breath onset; let each long phrase fall away.
            envelope=np.minimum(time/1.6,1)**1.5*np.minimum((count/SR-time)/2,1)**1.5
            destination=orchestra; level*=3.5
        data*=envelope[:,None].astype(np.float32)
        circular_add(destination,data,beat*BEAT,level,pan)
        events.append({'instrument':kind,'midi':midi,'beat':round(beat,3),'seconds':round(duration,2),'gain':round(level,4)})
    for section,chord in enumerate(score['chords']):
        start=section*16; energy=score['energy'][section]
        quiet=section in [3,7,9,11,15]
        # Low fundamentals and a quiet sustained fifth; no pulsing engine drone.
        duration=21; t=np.arange(int(duration*SR))/SR
        env=np.sin(np.pi*t/duration)**2
        for j,midi in enumerate([chord[0],chord[1]]):
            f=440*2**((midi-69)/12)
            s=(np.sin(2*np.pi*f*t)+.15*np.sin(2*np.pi*2*f*t))*env
            circular_add(bed,np.repeat(s.astype(np.float32)[:,None],2,axis=1),start*BEAT-3,.012*energy,(-.12 if j else .12))
        # Sparse, rolled open voicings leave room for the separate theme.
        for offset,weight in [(0,.85),(8,.55)]:
            if (name=='distance' or quiet) and offset==8: continue
            for j,midi in enumerate(chord[1:3] if quiet else chord[1:4]):
                play('piano',midi,start+offset+j*.095+float(rng.uniform(-.018,.018)),9,
                     .105*weight*energy*score['piano'],-.22+j*.14)
        for j,(offset,midi) in enumerate(score['phrases'][section]):
            play('piano',midi,start+offset+float(rng.uniform(-.025,.025)),10,
                 .24*energy*score['piano']*float(rng.uniform(.91,1.04)),.12)
            # Upper partials answer the ring theme, once per phrase.
            if name=='rings' and j==1:
                play('piano',midi-12,start+offset+1.5,9,.055*energy,-.3)
        if section in [0,2,4,6,8,10,12,14]:
            play('cello',chord[2]-12,start+2,12,.11*energy*score['bow'],-.24)
            play('cello',chord[3]-12,start+10,10,.065*energy*score['bow'],-.2)
        if section in [2,4,5,12,14]:
            play('horn',chord[2],start+4,11,.095*energy*score['horn'],.24)
    dry=piano+orchestra+bed
    # A deterministic room impulse response wraps around the 120 s score.
    # Every tail from the end is already present at the beginning of the loop.
    wet=np.zeros_like(dry)
    for i,delay in enumerate(np.geomspace(.041,5.9,40)):
        gain=.075*np.exp(-delay/1.45)*float(rng.uniform(.7,1.1))
        wet+=np.roll(dry[:,::-1] if i%2 else dry,int(delay*SR),axis=0)*gain
    out=dry+wet
    # Small circular zero-phase smoothing removes ultrasonic interpolation edges.
    out=(out*.6+np.roll(out,1,axis=0)*.2+np.roll(out,-1,axis=0)*.2)
    out-=np.mean(out,axis=0)
    # Opus starts with an empty prediction history. A 6 ms raised-cosine taper
    # prevents a codec-boundary transient while retaining the wrapped room tail.
    edge=int(.006*SR); ramp=np.sin(np.linspace(0,np.pi/2,edge))**2
    out[:edge]*=ramp[:,None];out[-edge:]*=ramp[::-1,None]
    source=temp/f'{name}.wav'
    peak=float(abs(out).max());out*=.75/max(peak,1e-6)
    with wave.open(str(source),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
        f.writeframes((out*32767).astype('<i2').tobytes())
    measured=subprocess.run(['ffmpeg','-v','info','-i',str(source),'-af',
        'loudnorm=I=-23:TP=-3:LRA=12:print_format=json','-f','null','-'],capture_output=True,text=True,check=True).stderr
    loud=json.JSONDecoder().raw_decode(measured[measured.rfind('{'):])[0]
    gain=min(-23-float(loud['input_i']),-3-float(loud['input_tp']))
    dest=ROOT/'assets/audio'/f'{name}.ogg'
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-af',f'volume={gain}dB,afade=t=in:d=0.024:curve=hsin,afade=t=out:st={DURATION-.024}:d=0.024:curve=hsin',
        '-c:a','libopus','-b:a','64k','-vbr','constrained','-application','audio',
        '-metadata',f'title={score["title"]}','-metadata','artist=Cosmos original score',str(dest)],check=True)
    decoded=decode(dest,False);rms=np.sqrt(np.mean(decoded.astype(np.float64)**2))
    step=float(abs(decoded[0]-decoded[-1]).max())
    analysis={'track':name,'title':score['title'],'seconds':len(decoded)/SR,'bytes':dest.stat().st_size,
        'peak':float(abs(decoded).max()),'rms':float(rms),'loopStep':step,
        'integratedLufs':round(float(loud['input_i'])+gain,2),'loudnessRangeLu':float(loud['input_lra']),
        'notes':len(events),'sourceRevision':REVISION}
    (temp/f'{name}-events.json').write_text(json.dumps(events,indent=2))
    print(json.dumps(analysis),flush=True)
    return analysis


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--samples',type=Path,required=True)
    parser.add_argument('--work',type=Path,default=Path(tempfile.gettempdir())/'cosmos-score-v5')
    args=parser.parse_args();args.work.mkdir(parents=True,exist_ok=True)
    samples={k:decode(args.samples/v) for k,v in SAMPLE_PATHS.items()}
    results=[compose(name,developed_score(name,score),samples,args.work) for name,score in SCORES.items()]
    (ROOT/'docs/score-source-analysis.json').write_text(json.dumps(results,indent=2)+'\n')
