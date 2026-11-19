"""Fetch a compact, reproducible set of JPL Horizons vectors for mission scenes."""
from urllib.parse import urlencode
from datetime import datetime, timezone
from pathlib import Path
import json
import subprocess
ROOT = Path(__file__).resolve().parents[1]
dates = ['1977-09-05T18:00:00','1979-03-05T12:05:26','1980-11-12T23:46:30','1980-11-12T05:41:00','1990-02-14T04:48:00','2012-08-25T00:00:00','2026-11-18T10:16:07']
epochs = [datetime.fromisoformat(d).replace(tzinfo=timezone.utc).timestamp()/86400+2440587.5 for d in dates]
objects = {'earth':'399','moon':'301','jupiter':'599','io':'501','saturn':'699','titan':'606','voyager':'-31','mercury':'199','venus':'299','mars':'499','uranus':'799','neptune':'899'}
def fetch(item):
    name, command = item
    params = {'format':'json','COMMAND':f"'{command}'",'OBJ_DATA':"'NO'",'MAKE_EPHEM':"'YES'",'EPHEM_TYPE':"'VECTORS'",'CENTER':"'500@10'",'TLIST':"'"+','.join(str(e) for e in epochs)+"'",'TIME_TYPE':"'UT'",'OUT_UNITS':"'KM-S'",'VEC_TABLE':"'2'",'REF_PLANE':"'FRAME'",'CSV_FORMAT':"'YES'"}
    raw = json.loads(subprocess.check_output(['curl','-L','--fail','--silent','--show-error','--max-time','50','https://ssd.jpl.nasa.gov/api/horizons.api?'+urlencode(params)]))
    result = raw.get('result','')
    if '$$SOE' not in result: raise RuntimeError(name+': '+str(raw)[:500])
    vectors=[]
    for line in result.split('$$SOE')[1].split('$$EOE')[0].strip().splitlines():
        fields = [p.strip() for p in line.split(',')]
        vectors.append({'jd':float(fields[0]),'position':[float(x) for x in fields[2:5]],'velocity':[float(x) for x in fields[5:8]]})
    print(name,len(vectors),flush=True)
    return name,[min(vectors,key=lambda record:abs(record['jd']-jd)) for jd in epochs]
vectors=dict(fetch(item) for item in objects.items())
out={'source':'NASA/JPL Horizons','frame':'ICRF, heliocentric, geometric vectors','units':'km, km/s','timeScale':'UTC (Horizons UT)','epochs':dates,'objects':vectors}
(ROOT/'assets/ephemeris.json').write_text(json.dumps(out,separators=(',',':')))
