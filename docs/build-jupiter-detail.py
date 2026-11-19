"""Encode Bjorn Jonsson's 2025 Voyager 1 map without sharpening or new detail.

Usage: python3 docs/build-jupiter-detail.py source.jpg mask.png
The author permits attributed use: https://bjj.mmedia.is/acknow.html
"""
from pathlib import Path
import hashlib,json,sys
from io import BytesIO
import numpy as np
from PIL import Image

root=Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
source,mask=sys.argv[1:]
assert digest(source)=='ead1343a61c93946afb99179b160385fb10ae7fb5d7715a23b5e99db51b63db4'
assert digest(mask)=='63263e598b8d6b989b9e48eb28f5099e916bbbb05599e3252f9ee0cd216e49c5'
im=Image.open(source).convert('RGB');assert im.size==(7200,3600)
textures=root/'assets/textures';fixtures=root/'tests/fixtures/jupiter-detail';fixtures.mkdir(exist_ok=True)
# A development-only half-resolution control isolates the resolution gain.
# Linear-light reduction avoids a gamma-dependent dark fringe.
rgb=np.asarray(im,dtype=np.float32)/255
linear=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
small=np.stack([np.asarray(Image.fromarray(linear[:,:,i]).resize((3600,1800),Image.Resampling.LANCZOS)) for i in range(3)],axis=-1)
small=np.clip(small,0,1);small=np.where(small<=.0031308,small*12.92,1.055*small**(1/2.4)-.055)
Image.fromarray(np.round(small*255).astype(np.uint8)).save(fixtures/'control.avif',quality=90,subsampling='4:4:4',speed=4,max_threads=4)
encoded=BytesIO();im.save(encoded,format='AVIF',quality=85,subsampling='4:4:4',speed=4,max_threads=4)
staged=textures/'.jupiter.avif.tmp';staged.write_bytes(encoded.getvalue());staged.replace(textures/'jupiter.avif')
cases=[]
for name,rect in [('red-spot',[5250,2030,512,384]),('northern-storms',[3850,810,512,384]),('equatorial-clouds',[1900,1470,512,384]),('southern-ovals',[3500,2490,512,384])]:
 x,y,w,h=rect;im.crop((x,y,x+w,y+h)).save(fixtures/(name+'.png'))
 cases.append(dict(name=name,body='jupiter',rect=rect,size=list(im.size)))
(fixtures/'cases.json').write_text(json.dumps(cases,indent=2)+'\n')
report=dict(sourcePage='https://bjj.mmedia.is/data/jupiter_vgr1/index.html',sourceUrl='https://bjj.mmedia.is/data/jupiter_vgr1/jupiter_vgr1_2025.jpg',permission='https://bjj.mmedia.is/acknow.html',credit='NASA / JPL / Bjorn Jonsson',sourceSha256=digest(source),maskSha256=digest(mask),sourceEdition='2025 colour reconstruction; Voyager 1 images from 27 February 1979, 03:55:47 to 12:52:35 UTC',dimensions=list(im.size),projection='Simple cylindrical; planetographic latitude; System III longitude 0 at both edges and 180 at the centre',encoding=dict(encoder='Pillow AVIF',quality=85,subsampling='4:4:4',speed=4,maxThreads=4,control='Development only: 3600 x 1800; linear-light Lanczos reduction, AVIF quality 90, 4:4:4'),processing='Original RGB pixels retained before compressed encoding; no sharpening, generated detail, palette edits or texture reprojection.',limitations='Synthetic green and RGB reconstruction from orange/violet observations; manually blended seams and smooth missing polar data as documented by the author. Not the exact cloud pattern at the 5 March closest approach. The 7200-wide grid slightly oversamples the original observations.',files={name:dict(bytes=(textures/name).stat().st_size,sha256=digest(textures/name)) for name in ['jupiter.avif']})
(root/'docs/jupiter-detail-source.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
