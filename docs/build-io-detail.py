"""Build Io's display map from the public USGS merged Galileo/Voyager mosaic.
Usage: python3 docs/build-io-detail.py /path/to/avifenc Io_Galileo_SSI_Global_Mosaic_ClrMerge_1km.tif
Requires Pillow, NumPy and libavif 1.4.2 avifenc. No network or generated terrain.
"""
from pathlib import Path
from PIL import Image
import numpy as np,math,json,hashlib,sys,subprocess,tempfile
Image.MAX_IMAGE_PIXELS=100_000_000
root=Path(__file__).resolve().parents[1];encoder=sys.argv[1];source=Path(sys.argv[2])
sourceHash=hashlib.sha256(source.read_bytes()).hexdigest()
assert sourceHash=='524dcabd247c889a4e7c2a1bfd9e5fcc545c6a039b2c765da9b741befdfd00bd'
im=Image.open(source);assert im.size==(11445,5723)
# Honour the GeoTIFF's one-kilometre grid rather than stretching its padded
# extent. Extend only the exterior border; the first row is declared NoData.
raw=np.asarray(im).copy();assert np.all(raw[0]==0);raw[0]=raw[1]
padded=np.pad(raw,((2,2),(2,2),(0,0)),mode='edge');padded[:,:2]=padded[:,-4:-2];padded[:,-2:]=padded[:,2:4];del raw
box=(2+(5723000-math.pi*1821460)/1000,2+(2862000-math.pi*1821460/2)/1000,2+(5723000+math.pi*1821460)/1000,2+(2862000+math.pi*1821460/2)/1000)
result=np.empty((5722,11444,3),np.uint8)
for channel in range(3):
 a=padded[:,:,channel].astype(np.float32)/255;a=np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4)
 a=np.asarray(Image.fromarray(a).resize((11444,5722),Image.Resampling.LANCZOS,box=box));a=np.clip(a,0,1);a=np.where(a<=.0031308,a*12.92,1.055*a**(1/2.4)-.055)
 result[:,:,channel]=np.round(a*255).astype(np.uint8)
 del a
im=Image.fromarray(result)
output=root/'assets/textures/io.avif';staged=output.with_suffix('.avif.tmp')
options=['-c','aom','-d','8','-y','444','-q','87','-s','4','-j','2','--cicp','1/13/0']
with tempfile.TemporaryDirectory(prefix='cosmos-io-') as temp:
 png=Path(temp)/'source.png';im.save(png,compress_level=1)
 subprocess.run([encoder,*options,str(png),str(staged)],check=True)
staged.replace(output)
fixtures=root/'tests/fixtures/io-detail';fixtures.mkdir(exist_ok=True)
cases=[]
for name,lon,lat in [('io-pele',104.7,-18.7),('io-loki',51.9,12.6),('io-northern-terrain',-123.5,63),('io-volcanic-plains',-114.7,25.4)]:
 x=round((lon+180)/360*im.width)-256;y=round((90-lat)/180*im.height)-192;rect=[x,y,512,384]
 im.crop((x,y,x+512,y+384)).save(fixtures/(name+'.png'));cases.append(dict(name=name,body='io',rect=rect,size=list(im.size)))
(fixtures/'cases.json').write_text(json.dumps(cases,indent=2)+'\n')
# Same-source half-resolution control isolates retained detail from source colour.
small=np.empty((2048,4096,3),np.uint8)
for c in range(3):
 a=result[:,:,c].astype(np.float32)/255;a=np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4);a=np.asarray(Image.fromarray(a).resize((4096,2048),Image.Resampling.LANCZOS));a=np.clip(a,0,1);a=np.where(a<=.0031308,a*12.92,1.055*a**(1/2.4)-.055);small[:,:,c]=np.round(a*255).astype(np.uint8)
Image.fromarray(small).save(fixtures/'control.avif',quality=90,subsampling='4:4:4',speed=4,max_threads=4)
report=dict(sourcePage='https://astrogeology.usgs.gov/search/map/io_galileo_ssi_global_color_merge_mosaic_1km',sourceUrl='https://planetarymaps.usgs.gov/mosaic/Io_Galileo_SSI_Global_Mosaic_ClrMerge_1km.tif',credit='NASA / JPL / USGS',sourceSha256=sourceHash,sourceDimensions=[11445,5723],sourceGridMetres=1000,sourceResolutionKm=[1,10],sourceProjectionRadiusMetres=1821460,sourcePixelExtent=[x-2 for x in box],filterBorderPixels=2,dimensions=[11444,5722],projection='Simple cylindrical, planetocentric; GeoTIFF easting/northing resampled to -180 to 180 degrees east and 90 to -90 degrees north',encoding=dict(encoder='libavif 1.4.2 / aom',arguments=options,channels='8-bit full-resolution RGB, identity matrix; sRGB primaries/transfer'),processing='Linear-light Lanczos reduction on the original georeferenced grid. Extend the single exterior NoData row from its nearest valid row and wrap longitude filtering. No sharpening, new terrain or palette editing.',limitations='Merged multi-date Galileo colour-ratio and Voyager/Galileo monochrome mosaic. Spatial source resolution varies from 1 to 10 km. Published IR/green/violet ratios and inherited polar fill are not calibrated natural colour or an exact 1979 surface.',control='Development-only 4096 x 2048 reduction of the same prepared image, AVIF quality 90; isolates encoding and resolution from source changes.',files={'io.avif':dict(bytes=output.stat().st_size,sha256=hashlib.sha256(output.read_bytes()).hexdigest())})
(root/'docs/io-detail-source.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
