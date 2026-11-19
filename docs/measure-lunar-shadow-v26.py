"""Compare the retained and repaired lunar shadows with a denser ray reference.
Run tests/lunar-v26.mjs first. Differences are within the existing height model,
not measurements against spacecraft radiometry.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
report=json.loads((root/'tests/lunar-v26-results.json').read_text())
results=[]
for outcome in report['outcomes']:
 name=outcome['name']
 images={kind:np.asarray(Image.open(root/f'tests/screenshots/v26-{name}-lunar-{kind}.png').convert('RGB'),dtype=np.float64) for kind in ['old','current','reference','unshadowed']}
 yy,xx=np.indices(images['old'].shape[:2])
 mask=((xx-640)**2+(yy-400)**2<200**2)&(images['unshadowed'].max(axis=2)>15)
 metrics={}
 for kind in ['old','current']:
  delta=(images[kind]-images['reference'])[mask]
  metrics[kind]={'meanAbsolute8Bit':float(abs(delta).mean()),'rms8Bit':float(np.sqrt((delta*delta).mean()))}
 metrics['rmsReductionPercent']=100*(1-metrics['current']['rms8Bit']/metrics['old']['rms8Bit'])
 results.append({'browser':name,'comparedPixels':int(mask.sum()),**metrics})
out={'referenceHeightSamples':128,'runtimeHeightSamples':14,'sameCurrentColorMap':True,'scope':'Initial lunar study, 1280 x 800, native texture-level height field; denser numerical reference, not spacecraft-image equivalence.','results':results}
(root/'tests/lunar-shadow-v26-metrics.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
