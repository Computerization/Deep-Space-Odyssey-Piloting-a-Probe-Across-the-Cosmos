"""Reproject the existing lunar sources into two stereographic polar caps.

Usage: python3 docs/build-lunar-poles.py lroc_color_poles_8k.tif normal-5760.png
The XYZ normal input is produced by build-lunar-relief.py --reference DIRECTORY.
Use --reference DIRECTORY to keep lossless colour and XYZ filtering references.
"""
from pathlib import Path
import argparse
import hashlib
import json
import numpy as np
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('colour', type=Path)
parser.add_argument('normal', type=Path)
parser.add_argument('--reference', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
out = root / 'assets/textures'
digest = lambda data: hashlib.sha256(data).hexdigest()
colour_hash = digest(args.colour.read_bytes())
assert colour_hash == 'db7808e878b6a55eb409bb231eab8deb477f84b5c9d7396d76ff73e5d54992d9'
colour = np.asarray(Image.open(args.colour).convert('RGB'))
normal = np.asarray(Image.open(args.normal).convert('RGB'))
assert digest(normal.tobytes()) == 'afb3bd2404c7c3d2be5478ded1c3700e84b7047b29ed0cd91866693a3566d0e5'
assert colour.shape == (4096, 8192, 3) and normal.shape == (2880, 5760, 3)
lut = np.arange(256, dtype=np.float32) / 255
lut = np.where(lut <= .04045, lut / 12.92, ((lut + .055) / 1.055) ** 2.4)


def sample(image, u, v, linear=False):
    h, w = image.shape[:2]
    x, y = u * w - .5, np.clip((1 - v) * h - .5, 0, h - 1)
    ix, iy = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = (x - ix)[..., None], (y - iy)[..., None]

    def read(oy, ox):
        pixels = image[np.minimum(h - 1, iy + oy), (ix + ox) % w]
        return lut[pixels] if linear else pixels.astype(np.float32) / 127.5 - 1

    return (read(0, 0) * (1 - fx) + read(0, 1) * fx) * (1 - fy) + (read(1, 0) * (1 - fx) + read(1, 1) * fx) * fy


size, radius = 1024, np.tan(np.pi / 18)
colours = np.empty((size, size * 2, 3), dtype=np.uint8)
normals, reference = np.empty_like(colours), np.empty_like(colours)
minimum = 1
for hemisphere, sign in enumerate([1, -1]):
    for row in range(0, size, 64):
        c = np.zeros((64, size, 3), dtype=np.float64)
        n = np.zeros_like(c)
        for dy in [.25, .75]:
            for dx in [.25, .75]:
                x = (2 * (np.arange(size)[None, :] + dx) / size - 1) * radius
                z = (1 - 2 * (np.arange(row, row + 64)[:, None] + dy) / size) * radius
                d = 1 + x * x + z * z
                nx, ny, nz = 2 * x / d, sign * (1 - x * x - z * z) / d, 2 * z / d
                phi = np.arctan2(nz, -nx)
                u, v = np.mod(phi / (2 * np.pi), 1), np.arcsin(ny) / np.pi + .5
                cl = np.sqrt(np.maximum(0, 1 - ny * ny))
                mapped = sample(normal, u, v)
                mapped /= np.linalg.norm(mapped, axis=-1, keepdims=True)
                # Transform each sample from its own tangent frame before
                # averaging; longitude and the tangent basis collapse at poles.
                n += np.stack([
                    mapped[..., 0] * np.sin(phi) + mapped[..., 1] * np.cos(phi) * ny + mapped[..., 2] * nx,
                    mapped[..., 1] * cl + mapped[..., 2] * ny,
                    mapped[..., 0] * np.cos(phi) - mapped[..., 1] * np.sin(phi) * ny + mapped[..., 2] * nz,
                ], axis=-1)
                c += sample(colour, u, v, True)
        region = np.s_[row:row + 64, hemisphere * size:(hemisphere + 1) * size]
        c /= 4
        c = np.where(c <= .0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - .055)
        colours[region] = np.round(np.clip(c, 0, 1) * 255).astype(np.uint8)
        n /= np.linalg.norm(n, axis=-1, keepdims=True)
        n = n[..., [0, 2, 1]]
        n[..., 2] *= sign
        minimum = min(minimum, float(n[..., 2].min()))
        reference[region] = np.round((n * .5 + .5) * 255).astype(np.uint8)
        n /= np.sum(np.abs(n), axis=-1, keepdims=True)
        pixels = np.zeros((64, size, 3), dtype=np.uint8)
        pixels[..., :2] = np.round((n[..., :2] * .5 + .5) * 255).astype(np.uint8)
        normals[region] = pixels
assert minimum > 0, 'Upper-octahedron encoding requires positive cap-frame Z.'
files = ['moon-polar-color.avif', 'moon-polar-normal.avif']
for name, pixels in zip(files, [colours, normals]):
    Image.fromarray(pixels).save(out / name, quality=95, speed=6, subsampling='4:4:4')
# Bound compression error separately from source/reprojection limitations.
decoded = np.asarray(Image.open(out / files[1]).convert('RGB'), dtype=np.float64)[..., :2] / 127.5 - 1
decoded = np.concatenate([decoded, np.maximum(0, 1 - np.abs(decoded).sum(axis=-1))[..., None]], axis=-1)
decoded /= np.linalg.norm(decoded, axis=-1, keepdims=True)
expected = reference.astype(np.float64) / 127.5 - 1
expected /= np.linalg.norm(expected, axis=-1, keepdims=True)
angle = np.degrees(np.arccos(np.clip((decoded * expected).sum(axis=-1), -1, 1)))
colour_error = np.asarray(Image.open(out / files[0]).convert('RGB'), dtype=np.float64) - colours
encoding = {'meanNormalAngleDegrees': float(angle.mean()), 'p95NormalAngleDegrees': float(np.quantile(angle, .95)),
            'maxNormalAngleDegrees': float(angle.max()), 'colour8bitRMSE': float(np.sqrt(np.mean(colour_error ** 2)))}
assert encoding['meanNormalAngleDegrees'] < 2 and encoding['p95NormalAngleDegrees'] < 3
assert encoding['maxNormalAngleDegrees'] < 10 and encoding['colour8bitRMSE'] < 2
if args.reference:
    args.reference.mkdir(parents=True, exist_ok=True)
    Image.fromarray(colours).save(args.reference / 'colour.png')
    Image.fromarray(reference).save(args.reference / 'normal-reference.png')
report = {
    'sourcePage': 'https://svs.gsfc.nasa.gov/4720/',
    'colourSourceSha256': colour_hash,
    'normalSource': 'build-lunar-relief.py reference XYZ from LOLA 16 samples/degree',
    'normalSourcePixelSha256': digest(normal.tobytes()),
    'dimensions': [size * 2, size], 'layout': 'North left, south right',
    'projection': 'Stereographic; side-axis edge at 70 degrees latitude; radius tan(10 degrees)',
    'filter': 'Four bilinear source samples per cap texel; linear-light colour; object-space normal average',
    'normalFrame': '[object x, object z, hemisphere * object y]',
    'minimumCapNormalZ': minimum,
    'encodingErrorAgainstLosslessCaps': encoding,
    'codec': 'AVIF quality 95, 4:4:4; colour sRGB, upper-octahedral RG normals linear',
    'blend': 'Latitude 72 to 78 degrees; fade to the global map at coarse distant footprints',
    'limitations': 'NASA colour above 70 degrees uses lower-resolution laser-albedo fill. Reprojection and filtering cannot recover absent source detail. No artificial sharpening, relief exaggeration or synthetic craters.',
    'files': {p: {'bytes': (out / p).stat().st_size, 'sha256': digest((out / p).read_bytes())} for p in files},
}
(root / 'docs/lunar-poles-source.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
