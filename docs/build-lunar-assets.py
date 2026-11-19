"""Historical v0.6 preparation, retained for reproduction only. Sources: NASA SVS 4720.
Current colour: build-surface-detail.py; current lighting: build-lunar-relief.py.
Usage: python3 docs/build-lunar-assets.py color_4k.tif ldem_4_uint.tif
Height units: unsigned half-metres relative to 1727.4 km; mean radius 1737.4 km.
"""
from pathlib import Path
import sys,json
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1];out=root/'assets/textures'
color=Image.open(sys.argv[1]).convert('RGB')
color.save(out/'moon.avif',quality=68,speed=6,subsampling='4:2:0')
raw=np.asarray(Image.open(sys.argv[2]),dtype=np.float64);height=(raw-20000)/2000
Image.fromarray(np.round(np.clip((height+10)/21,0,1)*255).astype(np.uint8)).save(out/'moon-height.webp',lossless=True,method=6)
h,w=height.shape;radius=1737.4
lat=np.linspace(np.pi/2,-np.pi/2,h)
dx=(np.roll(height,-1,axis=1)-np.roll(height,1,axis=1))/(2*radius*(2*np.pi/w)*np.maximum(.05,np.cos(lat[:,None])))
dy=np.gradient(height,axis=0)/(radius*np.pi/(h-1))
normals=np.stack([-dx,dy,np.ones_like(height)],axis=-1);normals/=np.linalg.norm(normals,axis=-1,keepdims=True)
Image.fromarray(np.round((normals*.5+.5)*255).astype(np.uint8)).save(out/'moon-normal.avif',quality=85,speed=6,subsampling='4:4:4')
# The sphere has 256 longitude bands and 144 latitude bands. Preserve metre-scale
# height units in a compact vertex grid; the normal map retains finer relief.
x=np.linspace(0,w,257)%w;y=np.linspace(0,h-1,145);ix=x.astype(int);iy=y.astype(int);fx=x-ix;fy=y-iy
v=(raw[iy[:,None],ix[None,:]]*(1-fx)+raw[iy[:,None],(ix[None,:]+1)%w]*fx)*(1-fy[:,None])+(raw[np.minimum(iy+1,h-1)[:,None],ix[None,:]]*(1-fx)+raw[np.minimum(iy+1,h-1)[:,None],(ix[None,:]+1)%w]*fx)*fy[:,None]
v[0]=np.mean(v[0]);v[-1]=np.mean(v[-1]);np.round(v).astype('<u2').tofile(out/'moon-relief.bin')
result={'colorDimensions':color.size,'normalDimensions':[w,h],'reliefGrid':[257,145],'heightKm':[float(height.min()),float(height.max())],'files':{p.name:p.stat().st_size for p in out.glob('moon*')},'source':'https://svs.gsfc.nasa.gov/4720/','verticalExaggeration':1}
(root/'docs/lunar-assets.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
