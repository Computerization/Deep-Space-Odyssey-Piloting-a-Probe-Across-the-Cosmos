"""Build offline GPU-compressed maps from NASA source images.

python3 docs/build-surface-detail.py /path/to/basisu BMNG.jpg lroc_color_16bit_srgb_16k.tif
For Moon only: python3 docs/build-surface-detail.py --moon-only /path/to/basisu lroc_color_16bit_srgb_16k.tif
Requires Pillow and Basis Universal 2.50. No network access during this build.
The original AVIF files remain the fallback for smaller GPU texture limits.
"""
from pathlib import Path
import hashlib,json,subprocess,sys,tempfile
from PIL import Image
Image.MAX_IMAGE_PIXELS=300_000_000
root=Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
specs={
 'earth':dict(size=(16384,8192),sourceSize=(21600,10800),sourcePage='https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/',sourceUrl='https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/september/world.200409.3x21600x10800.jpg',epoch='September 2004',regions=[('himalaya',85,30),('sahara',15,24),('andes',-68,-20)]),
 'moon':dict(size=(16384,8192),sourceSize=(16384,8192),sourcePage='https://svs.gsfc.nasa.gov/4720/',sourceUrl='https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_16bit_srgb_16k.tif',epoch='December 2025 visualization edition',regions=[('tycho',-11.36,-43.3),('copernicus',-20.08,9.62),('far-side',150,15)]),
}
options=['-etc1s','-q','255','-comp_level','2','-mipmap','-y_flip','-max_threads','4']
def report(sources):
 prior=json.loads((root/'docs/surface-detail-source.json').read_text())
 rows=[row for row in prior['maps'] if row['body'] not in sources]
 for row in rows:row.setdefault('arguments',prior.get('arguments',options))
 for body,source in sources.items():
  spec=specs[body];out=root/f'assets/textures/{body}.ktx2'
  rows.append(dict(body=body,sourcePage=spec['sourcePage'],sourceUrl=spec['sourceUrl'],sourceEdition=spec['epoch'],sourceSha256=digest(source),sourceDimensions=spec['sourceSize'],dimensions=spec['size'],output=str(out.relative_to(root)),sha256=digest(out),bytes=out.stat().st_size,arguments=encoder_options(body)))
 data=dict(version=json.loads((root/'package.json').read_text())['version'],encoder='Basis Universal 2.50.0',colourSpace='sRGB; mip filtering in linear light; vertical flip matches the existing image UV convention',processing='Lanczos reduction for Earth; native Moon dimensions, 16-bit source reduced to 8-bit RGB. No sharpening, palette changes or generated detail.',interpretation='Processed NASA visualization mosaics, not raw calibrated albedo or reconstruction of encounter-era surfaces. Existing terrain, clouds and lighting remain independent.',maps=rows)
 (root/'docs/surface-detail-source.json').write_text(json.dumps(data,indent=2)+'\n')
 return data
def encoder_options(body):
 args=options[:]
 if body=='moon':args[args.index('-q')+1]='180'
 return args
if __name__=='__main__':
 moon_only=sys.argv[1]=='--moon-only'
 if moon_only:
  _,encoder,moon=sys.argv[1:];sources={'moon':moon}
 else:
  encoder,earth,moon=sys.argv[1:];sources={'earth':earth,'moon':moon}
 case_path=root/'tests/fixtures/surface-detail/cases.json'
 cases=[case for case in json.loads(case_path.read_text()) if case['body'] not in sources] if case_path.exists() else []
 fixtures=root/'tests/fixtures/surface-detail';fixtures.mkdir(exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='cosmos-surface-') as temp:
  for body,source in sources.items():
   spec=specs[body];im=Image.open(source);assert im.size==spec['sourceSize']
   im=im.convert('RGB')
   if im.size!=spec['size']:im=im.resize(spec['size'],Image.Resampling.LANCZOS)
   png=Path(temp)/(body+'.png');im.save(png,compress_level=1)
   for label,lon,lat in spec['regions']:
    x=round((lon+180)/360*im.width)-256;y=round((90-lat)/180*im.height)-192;name=body+'-'+label
    im.crop((x,y,x+512,y+384)).save(fixtures/(name+'.png'))
    cases.append(dict(name=name,body=body,rect=[x,y,512,384],size=list(im.size)))
   encoded=Path(temp)/(body+'.ktx2')
   subprocess.run([encoder,str(png),*encoder_options(body),'-output_file',str(encoded)],check=True)
   destination=root/f'assets/textures/{body}.ktx2'
   pending=destination.with_suffix('.ktx2.tmp');pending.write_bytes(encoded.read_bytes());pending.replace(destination)
 (fixtures/'cases.json').write_text(json.dumps(cases,indent=2)+'\n')
 print(json.dumps(report(sources),indent=2))
