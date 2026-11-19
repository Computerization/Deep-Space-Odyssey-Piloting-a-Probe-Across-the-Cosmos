"""Encode NASA SVS's 2025 sRGB lunar colour map without changing its palette.

Usage: python3 docs/build-lunar-color-v26.py /path/to/lroc_color_16bit_srgb_4k.tif
The source is a processed LROC/LOLA visualization mosaic, not raw albedo data.
"""
from pathlib import Path
from io import BytesIO
import hashlib,json,sys
from PIL import Image,ImageCms

root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]);image=Image.open(source)
assert image.size==(4096,2048)
profile=ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(BytesIO(image.info['icc_profile']))).strip()
assert 'sRGB' in profile
output=root/'assets/textures/moon.avif'
# Pillow reduces the 16-bit RGB input to 8-bit sRGB; AVIF is the delivery codec.
# No sharpening, saturation, gamma or illumination adjustment is applied here.
image.convert('RGB').save(output,quality=68,speed=6,subsampling='4:2:0')
report={
 'sourcePage':'https://svs.gsfc.nasa.gov/4720/',
 'sourceUrl':'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_16bit_srgb_4k.tif',
 'sourceEdition':'December 2025','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
 'sourceProfile':profile,'dimensions':list(image.size),'outputBitsPerChannel':8,
 'encoding':{'format':'AVIF','quality':68,'speed':6,'subsampling':'4:2:0'},
 'output':'assets/textures/moon.avif','bytes':output.stat().st_size,
 'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),
 'previousBytes':1138093,'bytesSaved':1138093-output.stat().st_size,
 'terrainAndNormalsChanged':False,'surfaceGainChanged':False,
 'interpretation':'NASA visualization mosaic with publisher white balance and polar fill; not an unprocessed or calibrated reflectance measurement.'
}
(root/'docs/lunar-color-v26.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
