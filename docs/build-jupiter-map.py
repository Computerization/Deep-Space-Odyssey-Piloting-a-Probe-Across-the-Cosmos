"""Repair the identified isolated colour outlier in Cassini PIA07782.

The one-pixel correction precedes AVIF encoding. All other source pixels,
latitude/longitude coverage and measured resolution remain unchanged.
"""
from pathlib import Path
import argparse
import hashlib
import json
from io import BytesIO
import numpy as np
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
for name in ['source', 'previous', 'output', 'report']:
    parser.add_argument('--' + name, type=Path, required=True)
args = parser.parse_args()
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
source = np.asarray(Image.open(args.source).convert('RGB')).copy()
assert source.shape == (1801, 3601, 3)
x, y = 1328, 1024
before = source[y, x].copy()
neighbours = np.delete(source[y-1:y+2, x-1:x+2].reshape(-1, 3), 4, axis=0)
replacement = np.median(neighbours, axis=0).astype(np.uint8)
assert int(before[2])-int(before[0]) > 80
assert int(replacement[2])-int(replacement[0]) < -20
source[y, x] = replacement
encoded = BytesIO()
Image.fromarray(source).save(encoded, format='AVIF', quality=85, subsampling='4:4:4', speed=4, max_threads=4)
candidate = encoded.getvalue()
metrics = {}
for key, data in [('previous', args.previous.read_bytes()), ('candidate', candidate)]:
    decoded = np.asarray(Image.open(BytesIO(data)).convert('RGB')).astype(float)
    assert decoded.shape == source.shape
    error = decoded-source
    metrics[key] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                    'meanAbsoluteChannelError': float(np.abs(error).mean()),
                    'rootMeanSquareChannelError': float(np.sqrt((error*error).mean()))}
assert metrics['candidate']['bytes'] < metrics['previous']['bytes']
assert metrics['candidate']['meanAbsoluteChannelError'] < metrics['previous']['meanAbsoluteChannelError']
assert metrics['candidate']['rootMeanSquareChannelError'] < metrics['previous']['rootMeanSquareChannelError']
args.output.write_bytes(candidate)
report = {
    'reference': 'https://science.nasa.gov/photojournal/cassinis-best-maps-of-jupiter-cylindrical-map/',
    'sourceUrl': 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia07/pia07782/PIA07782.tif',
    'sourceSha256': sha(args.source), 'dimensions': [3601, 1801],
    'sourcePixelsChanged': 1, 'coordinate': [x, y], 'before': before.tolist(), 'replacement': replacement.tolist(),
    'method': 'Median of the eight immediate neighbouring source pixels; no global sharpening or added detail.',
    'encoding': {'quality': 85, 'subsampling': '4:4:4', 'speed': 4, 'maxThreads': 4},
    'limitation': 'An isolated image outlier is corrected; the source remains a synthesized-colour 2000 mosaic, not a calibrated 1979 reflectance field.',
    'metrics': metrics
}
args.report.write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
