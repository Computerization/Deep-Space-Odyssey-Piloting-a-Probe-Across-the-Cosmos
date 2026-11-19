"""Build a bounded-source cloud tile candidate outside the playable directory.

python3 docs/build-cloud-tiles.py ATLAS OLD_CLOUD_JPG BASE_8K_PNG OUTPUT --avifenc ENCODER
Native Gaia level 4 supplies the 32K grid. Preserve existing polar coverage;
50–60 degree source blending and fixed regional heights remain explicit.
"""
from pathlib import Path
from PIL import Image
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor, as_completed
from tempfile import TemporaryDirectory
import argparse, hashlib, json, re, subprocess, tarfile
import numpy as np

parser=argparse.ArgumentParser(description=__doc__)
for name in ['atlas','previous_source','base','output']:parser.add_argument(name,type=Path)
parser.add_argument('--avifenc',required=True)
args=parser.parse_args()
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert digest(args.atlas)=='22c69645ae1143dc8802256965db9c32fe200641e0d7cdea5b6d0f2d06eade6c'
assert digest(args.previous_source)=='c792eca228989d36ebb45d3ea6ff1198be5e21a25d70d2fbcb2124ffd14ba7f5'
assert digest(args.base)=='fb9530aa94ac7e2818babf9fc7eb5f415b0ca8544d0ce4915be2ca20494e2228'
out=args.output;out.mkdir(parents=True,exist_ok=True);(out/'tiles').mkdir(exist_ok=True)
tiles={}
with tarfile.open(args.atlas) as archive:
 for member in archive:
  match=re.search(r'/level4/tx_(\d+)_(\d+)\.jpg$',member.name)
  if match:
   x,y=map(int,match.groups())
   if 1<=y<=14:tiles[x,y]=Image.open(BytesIO(archive.extractfile(member).read())).convert('L')
assert set(tiles)=={(x,y) for x in range(32) for y in range(1,15)}
prior=Image.open(args.previous_source).getchannel('R');wrap=Image.new('L',(prior.width*3,prior.height))
for i in range(3):wrap.paste(prior,(i*prior.width,0))
padding=8;edge=2048;encoded=edge+padding*2

def encode(source,target,quality):
 with TemporaryDirectory(prefix='.cloud-encode-',dir=out) as tmp:
  tmp=Path(tmp);png=tmp/'field.png';source.info.clear();source.save(png,compress_level=1)
  avif=tmp/'field.avif'
  subprocess.run([args.avifenc,'-c','aom','-d','8','-y','400','-q',str(quality),'-s','4','-j','2','--ignore-icc','--range','full','--cicp','1/13/6',str(png),str(avif)],check=True,stdout=subprocess.DEVNULL)
  avif.replace(target)
 return dict(bytes=target.stat().st_size,sha256=digest(target))

def build(x,y):
 gx,gy=x*edge-padding,y*edge-padding;field=Image.new('L',(encoded,encoded))
 for iy in range(gy//1024,(gy+encoded-1)//1024+1):
  for ix in range(gx//1024,(gx+encoded-1)//1024+1):field.paste(tiles[ix%32,iy],(ix*1024-gx,iy*1024-gy))
 # Periodic longitude includes neighbours on both sides of the old map.
 px=gx/4+prior.width;py=gy/4
 polar=wrap.resize((encoded,encoded),Image.Resampling.BILINEAR,box=(px,py,px+encoded/4,py+encoded/4))
 lat=np.abs(90-(gy+np.arange(encoded)+.5)*180/16384);weight=np.clip((60-lat)/10,0,1);weight*=weight*(3-2*weight)
 mask=Image.fromarray(np.broadcast_to(np.rint(weight[:,None]*255).astype('uint8'),(encoded,encoded)).copy())
 field=Image.composite(field,polar,mask);name=f'tiles/{x:02d}-{y:02d}.avif';result=encode(field,out/name,55)
 print(name,result['bytes'],flush=True);return dict(x=x,y=y,file=name,**result)

records=[]
with ThreadPoolExecutor(max_workers=3) as pool:
 futures=[pool.submit(build,x,y) for y in range(1,7) for x in range(16)]
 for future in as_completed(futures):records.append(future.result())
base=Image.open(args.base);base_result=encode(base,out/'base-8k.avif',70)
report=dict(resolution=[32768,16384],tileSize=edge,padding=padding,columns=16,rows=8,firstRow=1,lastRow=6,
 sourceAtlasSha256=digest(args.atlas),priorSourceSha256=digest(args.previous_source),baseSourceSha256=digest(args.base),
 base=dict(file='base-8k.avif',dimensions=[8192,4096],**base_result),tiles=sorted(records,key=lambda r:(r['y'],r['x'])),
 encoding=dict(codec='libavif / AOM',tileQuality=55,baseQuality=70,speed=4,depth=8,chroma='400',range='full',cicp='1/13/6'),
 source='Toni Sagristà / Gaia Sky NASA-derived cloud atlas, native level-4 grid; INOVE / Solar System Scope polar composite under CC BY 4.0.',
 sourceTransitionAbsoluteLatitude=[50,60],
 limits='Grid dimensions are not measured observational resolution. Coverage is an image-derived proxy. Regional height remains inferred. Padding protects encoded interiors; independently compressed tile joins still require visual/motion verification.')
report['totalBytes']=base_result['bytes']+sum(r['bytes'] for r in records)
(out/'index.json').write_text(json.dumps(report,indent=2)+'\n');print('TOTAL',report['totalBytes'],flush=True)
