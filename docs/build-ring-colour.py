"""Reconstruct the existing radial texture's colour from Cassini PIA11142.

Colour is a broad radial estimate from a natural-colour mosaic, not a calibrated
albedo retrieval. Existing optical-depth alpha and fine luminance are retained.
The original image, prior texture and this tool stay outside the playable ZIP.
"""
from pathlib import Path
import argparse
import hashlib
import json
import numpy as np
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, required=True)
parser.add_argument('--prior', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--report', type=Path, required=True)
args = parser.parse_args()
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
linear = lambda x: np.where(x <= .04045, x / 12.92, ((x + .055) / 1.055) ** 2.4)
srgb = lambda x: np.where(x <= .0031308, x * 12.92, 1.055 * x ** (1 / 2.4) - .055)
weights = np.array([.2126, .7152, .0722])
source = np.asarray(Image.open(args.source).convert('RGB'), dtype=float) / 255
prior = np.asarray(Image.open(args.prior).convert('RGBA')).copy()
assert source.shape == (1439, 11341, 3) and prior.shape == (1, 8192, 4)

# Native coordinates at the labelled lower edge of the annotated mosaic.
# A short strip avoids mixing radii along the curved arcs. Smooth chromaticity
# over ~400 km: fine colour registration is not justified by this mosaic.
pixels = [656, 3543, 7487, 8211, 10368, 10940]
radii_km = [74500, 92000, 117580, 122200, 136780, 140220]
profile = np.median(linear(source[1158:1175]), axis=0)
profile = np.stack([np.convolve(c, np.ones(65) / 65, 'same') for c in profile.T], axis=1)
radius = 60268 * (1.235 + 1.085 * np.arange(8192) / 8191)
coordinates = np.interp(radius, radii_km, pixels)
colour = np.stack([np.interp(coordinates, np.arange(len(profile)), c) for c in profile.T], axis=1)
reference_luminance = colour @ weights
chroma = colour / np.maximum(reference_luminance, 1e-12)[:, None]
chroma[reference_luminance < 1e-8] = 1
# The existing F-ring material uses a constant colour outside the A ring.
chroma[radius > 2.270 * 60268] = 1

# Preserve the old material's actual diffuse luminance, including its retired
# channel gains, blue clamp and albedo ceiling. Only chromaticity changes.
rgb = linear(prior[0, :, :3] / 255)
old_albedo = np.minimum(np.stack([rgb[:, 0] * 1.08, rgb[:, 1] * 1.04,
                                np.minimum(rgb[:, 2], rgb[:, 1])], axis=1) * 2.6, .85)
luminance = old_albedo @ weights
delta = luminance[:, None] * (chroma - 1)
limit = np.min(np.where(delta > 1e-12, (.85 - luminance[:, None]) / np.maximum(delta, 1e-12), 1), axis=1)
albedo = luminance[:, None] + delta * np.clip(limit, 0, 1)[:, None]
prior[0, :, :3] = np.round(srgb(np.clip(albedo / 2.6, 0, 1)) * 255).astype('uint8')
decoded = np.minimum(linear(prior[0, :, :3] / 255) * 2.6, .85)
error = np.abs(decoded @ weights - luminance)
assert error.max() < .005 and np.array_equal(prior[:, :, 3], np.asarray(Image.open(args.prior))[:, :, 3])
Image.fromarray(prior).save(args.output, optimize=True)
report = dict(source='https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia11/pia11142/figures/PIA11142_fig1.jpg',
              reference='https://science.nasa.gov/photojournal/a-full-sweep-of-saturns-rings/',
              credit='NASA/JPL/Space Science Institute', sourceSha256=sha(args.source),
              priorSha256=sha(args.prior), outputSha256=sha(args.output),
              calibrationPixels=pixels, calibrationRadiiKm=radii_km, sourceRows=[1158, 1174],
              chromaWindowPixels=65, width=8192, height=1, alphaByteIdentical=True,
              maximumLinearAlbedoLuminanceError=float(error.max()), meanLinearAlbedoLuminanceError=float(error.mean()),
              priorBytes=args.prior.stat().st_size, outputBytes=args.output.stat().st_size,
              limitation='Broad Cassini-era colour estimate; inherited radial luminance and optical-depth alpha. Not a measured albedo or 1980 reconstruction.')
args.report.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
