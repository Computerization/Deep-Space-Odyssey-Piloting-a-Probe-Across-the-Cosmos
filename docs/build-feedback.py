"""Compact acoustic interface instrument from the score's existing CC0 upright.
Usage: python3 docs/build-feedback.py /path/to/UR1_C5_pp_RR1.wav
The original sample is C5 (MIDI 72); runtime playback supplies written pitches.
"""
from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parents[1]
subprocess.run(['ffmpeg','-v','error','-y','-i',sys.argv[1],'-t','3.2','-af',
 'highpass=f=70,lowpass=f=8500,afade=t=in:d=0.006,afade=t=out:st=2.4:d=0.8',
 '-ar','48000','-ac','2','-c:a','libopus','-b:a','72k',
 '-metadata','title=Cosmos interface upright — CC0 VSCO 2 CE',
 str(root/'assets/audio/interface-piano.webm')],check=True)
print((root/'assets/audio/interface-piano.webm').stat().st_size)
