"""Use measured OPAL southern cloud variation without baking moon transits into Saturn.

Inputs are deliberately explicit; downloaded TIFFs stay outside the runtime.
The existing credited composite provides the latitude colour palette and all
uncovered latitudes. OPAL 2025 supplies relative longitudinal brightness in
its usable southern coverage. This is a mixed-epoch visual study, not 1980 weather.
"""
import argparse,json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--base',required=True);p.add_argument('--output',required=True);p.add_argument('--report',required=True);a=p.parse_args()
source=np.asarray(Image.open(a.source).convert('RGB'),dtype=np.float32)/255
base=np.asarray(Image.open(a.base).convert('RGB'),dtype=np.float32)/255
h,w=base.shape[:2]
linear=np.where(source<=.04045,source/12.92,((source+.055)/1.055)**2.4)
luma=linear@np.array([.2126,.7152,.0722],dtype=np.float32)
row=np.median(luma,axis=1,keepdims=True)
relative=luma/np.maximum(row,.001)-1
encoded=Image.fromarray(np.uint8(np.clip(relative*255+128,0,255)))
local=(np.asarray(encoded.filter(ImageFilter.MedianFilter(9)),dtype=np.float32)-128)/255
# Suppress isolated high-contrast colour-filter ghosts / moon-shadow outliers.
# Cloud structures with broad support remain. The threshold is conservative;
# affected samples use a local median, never procedural cloud noise.
mask=Image.fromarray(np.uint8(np.abs(relative-local)>.10)*255)
artifacts=np.asarray(mask.filter(ImageFilter.MaxFilter(5)))>0
relative=np.where(artifacts,local,relative)
kernel=np.exp(-np.arange(-2,3,dtype=np.float32)**2/(2*.55**2));kernel/=kernel.sum()
for axis in [0,1]:relative=sum(weight*np.roll(relative,offset,axis=axis) for offset,weight in zip(range(-2,3),kernel))
relative=np.clip(relative,-.18,.18)
# Render sphere latitude is parametric on an oblate ellipsoid. OPAL maps use
# planetographic latitude: tan(phi_graphic) = tan(phi_parametric) / flatten.
parametric=np.linspace(np.pi/2,-np.pi/2,h)
latitude=np.degrees(np.arctan2(np.sin(parametric),.902*np.cos(parametric)))
y=np.clip((90-latitude)/180*(source.shape[0]-1),0,source.shape[0]-1)
wide=np.asarray(Image.fromarray(relative.astype('float32')).resize((w,source.shape[0]),Image.Resampling.BICUBIC))
y0=np.floor(y).astype(int);y1=np.minimum(y0+1,source.shape[0]-1);fraction=(y-y0)[:,None]
detail=wide[y0]*(1-fraction)+wide[y1]*fraction
# Preserve the credited baseline where the newer map is occulted by rings or
# poorly constrained at the limb. Blend only measured, middle southern latitudes.
def smooth(lo,hi,x):
 t=np.clip((x-lo)/(hi-lo),0,1);return t*t*(3-2*t)
blend=smooth(-78,-65,latitude)*(1-smooth(-15,-6,latitude))
palette=np.median(base,axis=1,keepdims=True)
# Relative radiance is converted back to display texture values before shading.
variation=np.maximum(.001,1+detail)**(1/2.2)
candidate=palette*variation[:,:,None]
result=base*(1-blend[:,None,None])+candidate*blend[:,None,None]
Image.fromarray(np.uint8(np.clip(result,0,1)*255+.5)).save(a.output,quality=88,speed=6,subsampling='4:4:4')
report={'source':'https://archive.stsci.edu/missions/hlsp/opal/cycle32/saturn/hlsp_opal_hst_wfc3-uvis_saturn-2025a_f395n-f502n-f631n_v1_globalmap.tif','metadata':'https://archive.stsci.edu/hlsp/opal/opal-saturn-cycle-32','observed':'29 August 2025, rotation A','sourceSha256':hashlib.sha256(Path(a.source).read_bytes()).hexdigest(),'baseSha256':hashlib.sha256(Path(a.base).read_bytes()).hexdigest(),'outputSha256':hashlib.sha256(Path(a.output).read_bytes()).hexdigest(),'outputBytes':Path(a.output).stat().st_size,'size':[w,h],'sourceSize':[source.shape[1],source.shape[0]],'southernBlendDegrees':[-78,-65,-15,-6],'outlierMaskSamples':int(artifacts.sum()),'outlierMaskSamplesInSouthernBand':int(artifacts[(np.linspace(90,-90,source.shape[0])<=-6)&(np.linspace(90,-90,source.shape[0])>=-78)].sum()),'southernBandSamples':int(((np.linspace(90,-90,source.shape[0])<=-6)&(np.linspace(90,-90,source.shape[0])>=-78)).sum()*source.shape[1]),'usesProceduralWeather':False,'interpretation':'Relative measured longitude brightness applied to the existing latitude colour palette; mixed-epoch exploration map.'}
Path(a.report).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
