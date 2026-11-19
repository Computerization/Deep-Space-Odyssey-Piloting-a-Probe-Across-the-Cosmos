"""Prepare source-derived cloud maps without changing playable assets.

python3 docs/build-cloud-detail.py NASA-atlas.tar.gz 8k_earth_clouds.jpg output-folder
The atlas's level-3 tiles retain their 16K grid. Existing polar coverage remains
above 60 degrees; a smooth 50–60 degree composite transition joins the sources.
Requires Pillow and NumPy. No generated weather, sharpening or palette edits.
"""
from pathlib import Path
from PIL import Image
from io import BytesIO
import argparse
import hashlib
import json
import re
import subprocess
import tarfile
import numpy as np

Image.MAX_IMAGE_PIXELS = 200_000_000
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('atlas', type=Path)
parser.add_argument('previous_source', type=Path)
parser.add_argument('output', type=Path)
parser.add_argument('--avifenc', help='Optionally encode the monochrome runtime candidate')
args = parser.parse_args()
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
assert digest(args.atlas) == '22c69645ae1143dc8802256965db9c32fe200641e0d7cdea5b6d0f2d06eade6c'
assert digest(args.previous_source) == 'c792eca228989d36ebb45d3ea6ff1198be5e21a25d70d2fbcb2124ffd14ba7f5'
out = args.output
out.mkdir(parents=True, exist_ok=True)
size = (16384, 8192)
source = Image.new('L', size)
tiles = set()
with tarfile.open(args.atlas) as archive:
    for member in archive:
        match = re.search(r'/level3/tx_(\d+)_(\d+)\.jpg$', member.name)
        if not match:
            continue
        x, y = map(int, match.groups())
        tile = Image.open(BytesIO(archive.extractfile(member).read())).convert('L')
        assert tile.size == (1024, 1024) and (x, y) not in tiles
        source.paste(tile, (x * 1024, y * 1024))
        tiles.add((x, y))
assert tiles == {(x, y) for y in range(8) for x in range(16)}
prior = Image.open(args.previous_source).getchannel('R').resize(size, Image.Resampling.BILINEAR)
latitude = np.abs(90 - (np.arange(size[1]) + .5) * 180 / size[1])
weight = np.clip((60 - latitude) / 10, 0, 1)
weight = weight * weight * (3 - 2 * weight)
mask = Image.fromarray(np.broadcast_to(np.rint(weight[:, None] * 255).astype('uint8'), (size[1], size[0])).copy())
coverage = Image.composite(source, prior, mask)
coverage.info.clear()  # Scalar coverage must not inherit the prior RGB ICC profile.
del prior, source, mask
coverage.save(out / 'hybrid-16384.png', compress_level=1)
coverage.resize((8192, 4096), Image.Resampling.LANCZOS).save(out / 'hybrid-8192.png', compress_level=1)

# The height footprint remains 2048 x 1024 (roughly 20 km at the equator).
# Keep regional cloud height independent of fine coverage resolution.
height = np.asarray(coverage, dtype=np.float32).reshape(1024, 8, 2048, 8).mean(axis=(1, 3))
Image.fromarray(np.floor(height + .5).astype('uint8')).save(out / 'earth-cloud-height.png', optimize=True)
# Bottom-first R8 reference streams directly to the review GPU without an
# unnecessary full-resolution RGBA decode. This file is never packaged.
(out / 'reference-r8.bin').write_bytes(np.asarray(coverage)[::-1].tobytes())
crops = out / 'crops'
crops.mkdir(exist_ok=True)
cases = []
for name, x, y in [('trade-wind', 6400, 4200), ('southern-front', 11200, 5700),
                   ('northern-cyclone', 5100, 2200), ('fine-stratus', 8600, 3150),
                   ('polar-transition', 4300, 1450), ('south-pole', 9100, 7480),
                   ('longitude-seam', 0, 3900), ('equatorial', 3000, 3700)]:
    crop = crops / (name + '.png')
    coverage.crop((x, y, x + 512, y + 384)).save(crop)
    cases.append(dict(name=name, rect=[x, y, 512, 384], size=list(size),
                      reference=str(crop.resolve()), sha256=digest(crop)))
(out / 'cases.json').write_text(json.dumps(cases, indent=2) + '\n')
files = ['hybrid-16384.png', 'hybrid-8192.png', 'reference-r8.bin', 'earth-cloud-height.png']
if args.avifenc:
    subprocess.run([args.avifenc, '-c', 'aom', '-d', '8', '-y', '400', '-q', '65',
                    '-s', '4', '-j', '4', '--ignore-icc', '--range', 'full',
                    '--cicp', '1/13/6', str(out / 'hybrid-16384.png'),
                    str(out / 'earth-clouds.avif')], check=True)
    files.append('earth-clouds.avif')
report = dict(sourceAtlas=str(args.atlas), sourceAtlasSha256=digest(args.atlas),
              priorSourceSha256=digest(args.previous_source), dimensions=list(size),
              candidateDimensions=list(size), heightGrid=[2048, 1024], transitionAbsoluteLatitude=[50, 60],
              method='NASA-derived atlas through 50 degrees; retain existing Solar System Scope polar composite beyond 60 degrees. Smooth latitude transition. No displacement of cloud formations.',
              limits='Composite brightness and inferred heights, not calibrated optical depth, measured 3D clouds, or encounter-era weather. Polar detail stays at its previous 8K source resolution. Atlas grid size is not measured observational resolution.',
              files={name:dict(bytes=(out / name).stat().st_size, sha256=digest(out / name))
                     for name in files})
(out / 'source.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
