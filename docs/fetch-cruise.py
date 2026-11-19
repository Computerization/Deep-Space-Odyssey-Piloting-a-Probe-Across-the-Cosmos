"""Fetch offline heliocentric ICRF trajectories. Dates are explicitly UTC (Horizons UT).

Dense samples around gravity assists; sparse, smooth outer cruise. Horizons
returns epochs sorted, so every record is matched by Julian date, never index.
"""
import json, subprocess, time
from pathlib import Path
from urllib.parse import urlencode
ROOT=Path(__file__).resolve().parents[1]
base=json.loads((ROOT/'assets/ephemeris.json').read_text())
ends=[base['objects']['voyager'][i]['jd'] for i in [0,1,2,4,5,6]]
times=set(ends)
for a,b in zip(ends,ends[1:]):
    n=int((b-a)/30)+1
    times.update(a+(b-a)*i/n for i in range(n+1))
for e in ends[:3]:
    for days in [1/24,3/24,6/24,.5,1,2,4,8,16]:
        for sign in [-1,1]:
            t=e+days*sign
            if ends[0]<=t<=ends[-1]: times.add(t)
times=sorted(times)
objects={}
for name,command in {'voyager':'-31'}.items():
    cache=ROOT/'assets'/('cruise-'+name+'.tmp.json')
    if cache.exists(): objects[name]=json.loads(cache.read_text()); continue
    records=[]
    for k in range(0,len(times),40):
        params={'format':'json','COMMAND':f"'{command}'",'OBJ_DATA':"'NO'",'EPHEM_TYPE':"'VECTORS'",'CENTER':"'500@10'",'TLIST':"'"+','.join(f'{t:.9f}' for t in times[k:k+40])+"'",'TIME_TYPE':"'UT'",'OUT_UNITS':"'KM-S'",'VEC_TABLE':"'2'",'REF_PLANE':"'FRAME'",'CSV_FORMAT':"'YES'"}
        raw=json.loads(subprocess.check_output(['curl','--fail','--silent','--show-error','--retry','2','--max-time','50','https://ssd.jpl.nasa.gov/api/horizons.api?'+urlencode(params)]))
        result=raw.get('result','')
        if '$$SOE' not in result: raise RuntimeError(str(raw)[:500])
        for line in result.split('$$SOE')[1].split('$$EOE')[0].strip().splitlines():
            f=[v.strip() for v in line.split(',')]
            records.append([float(f[0])]+[float(v) for v in f[2:8]])
    objects[name]=records;cache.write_text(json.dumps(records));print(name,len(records),flush=True)
out={'source':'NASA/JPL Horizons','frame':'ICRF heliocentric','units':'JD UTC, km, km/s','ends':ends,'objects':objects}
(ROOT/'assets/cruise.json').write_text(json.dumps(out,separators=(',',':')))
for name in objects:(ROOT/'assets'/('cruise-'+name+'.tmp.json')).unlink(missing_ok=True)
print('Written cruise.json',flush=True)
