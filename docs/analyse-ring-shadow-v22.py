"""Compare isolated shadow images against 4x renders, excluding the globe edge."""
from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np,json
root=Path(__file__).resolve().parents[1]
rows=[]
for name in ['encounter','detail','ring-plane']:
 def load(tag):return Image.open(root/f'tests/screenshots/v22-shadow-{name}-{tag}.png').convert('L')
 mask=np.asarray(load('mask').filter(ImageFilter.MinFilter(5)))>230
 ref=np.asarray(load('reference').resize((800,500),Image.Resampling.BOX),dtype=float)/255
 base=np.asarray(load('base'),dtype=float)/255
 current=np.asarray(load('current'),dtype=float)/255
 mask &= ((ref<.93)|(base<.93)|(current<.93))
 def rmse(x):return float(np.sqrt(np.mean((x[mask]-ref[mask])**2)))
 def mae(x):return float(np.mean(np.abs(x[mask]-ref[mask])))
 row=dict(view=name,pixels=int(mask.sum()),baseRmse=rmse(base),currentRmse=rmse(current),baseMae=mae(base),currentMae=mae(current))
 row['rmseChangePercent']=(row['currentRmse']/row['baseRmse']-1)*100
 assert row['currentRmse']<row['baseRmse']*.6,row
 rows.append(row)
 Image.fromarray(np.uint8(ref*255)).save(root/f'tests/screenshots/v22-shadow-{name}-reference-downsampled.png')
(root/'tests/ring-shadow-v22-metrics.json').write_text(json.dumps(rows,indent=2)+'\n')
print(json.dumps(rows,indent=2))
