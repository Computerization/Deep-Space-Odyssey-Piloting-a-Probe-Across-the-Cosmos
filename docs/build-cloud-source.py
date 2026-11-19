"""Preserve the credited cloud source's red-channel coverage in compact AVIF.

Usage: python3 docs/build-cloud-source.py 8k_earth_clouds.jpg --avifenc /path/to/avifenc
No resampling, sharpening, colour adjustment or generated weather is applied.
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
parser.add_argument('--avifenc', default='avifenc')
parser.add_argument('--reference', type=Path, help='Optional lossless coverage PNG for browser comparison')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
assert digest(args.source) == 'c792eca228989d36ebb45d3ea6ff1198be5e21a25d70d2fbcb2124ffd14ba7f5'
source = np.asarray(Image.open(args.source).convert('RGB'))[:, :, 0]
assert source.shape == (4096, 8192)
output = root / 'assets/textures/earth-clouds.avif'
with tempfile.TemporaryDirectory(prefix='cosmos-cloud-') as directory:
    png = Path(directory) / 'coverage.png'
    # A fresh scalar image removes inherited RGB colour-profile metadata.
    Image.fromarray(source).save(png)
    subprocess.run([args.avifenc, '-c', 'aom', '-d', '8', '-y', '400', '-q', '70',
                    '-s', '4', '-j', '4', '--ignore-icc', '--range', 'full',
                    '--cicp', '1/13/6', str(png), str(output)], check=True)
    if args.reference:
        args.reference.parent.mkdir(parents=True, exist_ok=True)
        args.reference.write_bytes(png.read_bytes())
reference = source.astype(np.float32)
decoded = np.asarray(Image.open(output).convert('RGB'), dtype=np.float32)[:, :, 0]
error = decoded - reference
gradient_error = np.diff(decoded, axis=1) - np.diff(reference, axis=1)
report = {
    'sourcePage': 'https://www.solarsystemscope.com/textures/',
    'sourceUrl': 'https://www.solarsystemscope.com/textures/download/8k_earth_clouds.jpg',
    'credit': 'Solar System Scope / INOVE; NASA-derived imagery',
    'license': 'https://creativecommons.org/licenses/by/4.0/',
    'sourceSha256': digest(args.source), 'sourceBytes': args.source.stat().st_size,
    'dimensions': [8192, 4096], 'channel': 'Original decoded red channel, used as a coverage proxy',
    'encoding': 'libavif 1.4.2 / AOM; monochrome AVIF, quality 70, speed 4, 8 bit, full range, CICP 1/13/6, no ICC',
    'processing': 'No resampling, sharpening, palette edits, invented detail or changed regional-height reconstruction.',
    'errorAgainstSource8bit': {'rmse': float(np.sqrt(np.mean(error * error))),
                             'gradientRMSE': float(np.sqrt(np.mean(gradient_error * gradient_error))),
                             'max': float(np.max(np.abs(error))), 'bias': float(error.mean())},
    'limitations': 'The supplier map is a processed NASA-derived composite with finite resolution. Image brightness is not a calibrated optical-depth measurement; the renderer infers cloud heights and thickness. It is not historical 1977 weather or a measured 3D cloud volume.',
    'file': {'name': output.name, 'bytes': output.stat().st_size, 'sha256': digest(output)},
}
(root / 'docs/cloud-source.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
