"""Build the lunar lighting fields from NASA's 16 samples/degree LOLA map.

Usage: python3 docs/build-lunar-relief.py ldem_16_uint.tif --reference /tmp/reference
The runtime derives the silhouette from this same height image. Surface colour has a separate build owner.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import tempfile
import numpy as np
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
parser.add_argument('--reference', type=Path)
parser.add_argument('--avifenc', default='avifenc', help='libavif avifenc (validated with 1.4.2 / AOM)')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
out = root / 'assets/textures'
source_hash = hashlib.sha256(args.source.read_bytes()).hexdigest()
assert source_hash == '45a2b32d56e81ed30db07fead8abc842b249b6511219d9ca2c53f81bc2dc5d62'
raw = np.asarray(Image.open(args.source), dtype=np.float32)
assert raw.shape == (2880, 5760)
height = (raw - 20000) / 2000  # km above the 1737.4 km reference sphere
ny, nx = height.shape
radius = 1737.4 + height
latitude = np.pi / 2 - (np.arange(ny, dtype=np.float32) + .5) * np.pi / ny
east = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) / (2 * radius * (2 * np.pi / nx) * np.cos(latitude[:, None]))
# Continue the spherical height field across either pole at longitude +180°.
above = np.concatenate([np.roll(height[:1], nx // 2, axis=1), height[:-1]], axis=0)
below = np.concatenate([height[1:], np.roll(height[-1:], nx // 2, axis=1)], axis=0)
north = (above - below) / (2 * radius * np.pi / ny)
normal = np.stack([-east, -north, np.ones_like(height)], axis=-1)
normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
# Positive-Z height-field normals use the upper octahedron. RG8 avoids storing
# the dependent third component; the shader reconstructs and normalizes it.
octahedron = normal / np.sum(np.abs(normal), axis=-1, keepdims=True)
pixels = np.zeros(normal.shape, dtype=np.uint8)
pixels[:, :, :2] = np.round((octahedron[:, :, :2] * .5 + .5) * 255).astype(np.uint8)
# Slopes are two independent data channels. Identity RGB avoids a lossy
# luminance/chroma conversion before AV1 compression; no runtime changes.
with tempfile.TemporaryDirectory(prefix='cosmos-lunar-') as directory:
    source_png = Path(directory) / 'normal.png'
    Image.fromarray(pixels).save(source_png)
    subprocess.run([args.avifenc, '-c', 'aom', '-d', '8', '-y', '444', '-q', '90',
                    '-s', '6', '-j', '4', '--cicp', '1/13/0', str(source_png),
                    str(out / 'moon-normal.avif')], check=True)
height8 = np.round(np.clip((height + 10) / 21, 0, 1) * 255).astype(np.uint8)
Image.fromarray(height8).save(out / 'moon-height.webp', lossless=True, method=6)
if args.reference:
    args.reference.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.round((normal * .5 + .5) * 255).astype(np.uint8)).save(args.reference / 'normal-5760.png')
    Image.fromarray(pixels).save(args.reference / 'normal-oct-5760.png')
    np.ascontiguousarray(((height + 10) / 21)[::-1], dtype='<f4').tofile(args.reference / 'height-reference.bin')
report = {
    'source': 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_16_uint.tif',
    'sourcePage': 'https://svs.gsfc.nasa.gov/4720/', 'sourceSha256': source_hash,
    'dimensions': [nx, ny], 'heightBoundsKm': [float(height.min()), float(height.max())],
    'verticalExaggeration': 1, 'heightEncoding': 'R8 lossless, -10 to +11 km',
    'normalEncoding': 'Upper-hemisphere octahedral RG8, AVIF quality 90, identity RGB 4:4:4, full range; linear data in the renderer',
    'normalEncoder': 'libavif 1.4.2 / AOM, depth 8, speed 6, CICP 1/13/0',
    'normalMethod': 'Spherical central differences of unquantized height at pixel centres; half-turn pole continuation',
    'silhouette': '513 x 289 runtime vertices sampled from the same height image at texel centres; longitude wrapping and averaged pole heights; physical vertical scale',
    'encodingReference': 'https://jcgt.org/published/0003/02/01/',
    'limitations': 'Finite-difference slopes, source interpolation and polar sampling remain approximations. Height R8 rounding error is at most 41.18 m. No vertical exaggeration or synthetic craters.',
    'files': {name: {'bytes': (out / name).stat().st_size, 'sha256': hashlib.sha256((out / name).read_bytes()).hexdigest()} for name in ['moon-normal.avif', 'moon-height.webp']},
}
(root / 'docs/lunar-relief-source.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
