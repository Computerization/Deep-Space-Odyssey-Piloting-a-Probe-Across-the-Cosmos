"""Build a compact offline solar-system chart from JPL geometric state vectors.

Only the chart's historical passages use these samples. Encounter snapshots and
local flight keep their existing reference frames. Cached raw responses are QA
inputs outside the delivery; source hashes and interpolation checks are retained.
"""
from pathlib import Path
from urllib.parse import urlencode
import json,subprocess,math,struct,hashlib
ROOT=Path(__file__).resolve().parents[1]
CACHE=Path('/private/tmp/cosmos-chart-v28');CACHE.mkdir(exist_ok=True)
START=2443387.5  # 1 September 1977 00:00 UTC
END=2461362.927858796
PLANETS={'mercury':('199',2),'venus':('299',8),'earth':('399',8),'mars':('499',16),'jupiter':('599',32),'saturn':('699',32),'uranus':('799',32),'neptune':('899',32)}

def fetch(name,command,extra):
    params={'format':'json','COMMAND':f"'{command}'",'OBJ_DATA':"'NO'",'MAKE_EPHEM':"'YES'",'EPHEM_TYPE':"'VECTORS'",'CENTER':"'500@10'",'TIME_TYPE':"'UT'",'OUT_UNITS':"'KM-S'",'VEC_TABLE':"'2'",'REF_PLANE':"'FRAME'",'REF_SYSTEM':"'ICRF'",'VEC_CORR':"'NONE'",'CSV_FORMAT':"'YES'",**extra}
    file=CACHE/(name+'.json')
    if not file.exists():
        raw=subprocess.check_output(['curl','--fail','--silent','--show-error','--retry','2','--max-time','60','https://ssd.jpl.nasa.gov/api/horizons.api?'+urlencode(params)])
        data=json.loads(raw)
        if '$$SOE' not in data.get('result',''):raise RuntimeError(str(data)[:600])
        file.write_bytes(raw)
    raw=file.read_bytes();result=json.loads(raw)['result'];records=[]
    for line in result.split('$$SOE')[1].split('$$EOE')[0].strip().splitlines():
        f=[v.strip() for v in line.split(',')];records.append([float(f[0])]+[float(v) for v in f[2:8]])
    return records,{'sha256':hashlib.sha256(raw).hexdigest(),'parameters':params,'header':result.split('$$SOE')[0][-1800:]}

if __name__=='__main__':
    metadata={'version':1,'source':'NASA/JPL Horizons','frame':'ICRF heliocentric geometric','timeScale':'UTC (Horizons UT)','positionUnitKm':10,'velocityUnitKmS':.000001,'objects':{}}
    packed=bytearray();provenance={};validation={}
    for name,(command,step) in PLANETS.items():
        count=math.ceil((END-START)/step)+1;stop=START+(count-1)*step
        records,source=fetch(name,command,{'START_TIME':f"'JD{START}'",'STOP_TIME':f"'JD{stop}'",'STEP_SIZE':f"'{step} d'"})
        assert len(records)==count,(name,len(records),count)
        metadata['objects'][name]={'offset':len(packed),'count':count,'start':START,'step':step}
        for i,row in enumerate(records):
            assert abs(row[0]-(START+i*step))<1e-8
            encoded=[round(v/10) for v in row[1:4]]+[round(v/.000001) for v in row[4:7]]
            assert all(-(2**31)<=v<2**31 for v in encoded)
            packed.extend(struct.pack('<6i',*encoded))
        # Independent, unpublished samples at interval midpoints and each scene date.
        epochs=json.loads((ROOT/'assets/ephemeris.json').read_text())['objects'][name]
        dates=sorted(set([START+(int((count-2)*(i+.37)/32)+.5)*step for i in range(32)]+[r['jd'] for r in epochs]))
        exact,check=fetch(name+'-checks',command,{'TLIST':"'"+','.join(f'{t:.9f}' for t in dates)+"'"})
        provenance[name]={'samples':source,'checks':check,'count':count,'stepDays':step}
        validation[name]=exact
        print(name,count,flush=True)
    header=json.dumps(metadata,separators=(',',':')).encode()
    output=b'COSMOSP1'+struct.pack('<I',len(header))+header+packed
    (ROOT/'assets/chart-ephemeris.bin').write_bytes(output)
    (ROOT/'docs/chart-ephemeris-v28-source.json').write_text(json.dumps({'sourcePage':'https://ssd.jpl.nasa.gov/horizons/','apiDocumentation':'https://ssd-api.jpl.nasa.gov/doc/horizons.html','runtimeBytes':len(output),'sha256':hashlib.sha256(output).hexdigest(),'metadata':metadata,'provenance':provenance},indent=2)+'\n')
    (ROOT/'tests/fixtures/chart-ephemeris-v28-checks.json').write_text(json.dumps(validation,separators=(',',':'))+'\n')
    print('Runtime bytes:',len(output),flush=True)
