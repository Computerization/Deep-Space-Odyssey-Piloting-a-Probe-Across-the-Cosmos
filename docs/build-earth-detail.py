"""Build compact 64K regional imagery from NASA's September 2004 500 m tiles.
Usage: python3 docs/build-earth-detail.py SOURCE_DIRECTORY
Downloads are separate. No generated texture detail or sharpening.
"""
from pathlib import Path
from PIL import Image
import hashlib,json,sys,argparse
Image.MAX_IMAGE_PIXELS=500_000_000
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('source',type=Path);parser.add_argument('--output',type=Path,default=root/'assets/textures/earth-detail');parser.add_argument('--size',type=int,default=65536);parser.add_argument('--quality',type=int,default=60);args=parser.parse_args()
source=args.source;out=args.output;out.mkdir(exist_ok=True);quadrant=args.size//4;count=quadrant//2048
assert args.size in (32768,65536)
rows=[]
for col,letter in enumerate('ABCD'):
 for row in range(2):
  path=source/f'world.200409.3x21600x21600.{letter}{row+1}.jpg'
  im=Image.open(path);assert im.size==(21600,21600)
  if quadrant<=10800:im.draft('RGB',(10800,10800))
  im=im.resize((quadrant,quadrant),Image.Resampling.LANCZOS)
  for y in range(count):
   for x in range(count):
    tile=out/f'{col*count+x:02}-{row*count+y:02}.avif'
    im.crop((x*2048,y*2048,(x+1)*2048,(y+1)*2048)).save(tile,quality=args.quality,speed=6,subsampling='4:4:4',max_threads=2)
  rows.append({'tile':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
  print(path.name,flush=True)
report={'sourcePage':'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/','sourceEpoch':'September 2004','sourceDimensions':[86400,43200],'dimensions':[args.size,args.size//2],'tileEdge':2048,'tiles':args.size**2//(2*2048**2),'bytes':sum(p.stat().st_size for p in out.glob('*.avif')),'encoding':f'AVIF quality {args.quality}, 4:4:4; full-resolution JPEG decode for 64K, then Lanczos reduction. No sharpening or invented detail.','sources':rows}
(out/'source.json').write_text(json.dumps(report,indent=2)+'\n');print(report['bytes'],flush=True)
