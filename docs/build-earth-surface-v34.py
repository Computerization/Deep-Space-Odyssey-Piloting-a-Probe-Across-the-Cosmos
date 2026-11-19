"""Build the Earth colour image and independent geographic water coverage.

python3 docs/build-earth-surface-v34.py BMNG.jpg ne_10m_land.zip ne_10m_lakes.zip
Requires Pillow and NumPy. Inputs are downloaded separately; no network at build time.
"""
from pathlib import Path
from zipfile import ZipFile
import hashlib, json, struct, sys
import numpy as np
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
Image.MAX_IMAGE_PIXELS = 300_000_000
colour_source, land_source, lake_source = map(Path, sys.argv[1:4])
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def rings(path):
    """Read ESRI Polygon rings, retaining their documented winding direction."""
    with ZipFile(path) as z:
        data = z.read(next(n for n in z.namelist() if n.endswith('.shp')))
    assert struct.unpack_from('>i', data)[0] == 9994
    offset = 100
    while offset < len(data):
        words = struct.unpack_from('>i', data, offset + 4)[0]
        record = memoryview(data)[offset + 8:offset + 8 + words * 2]
        offset += 8 + words * 2
        kind = struct.unpack_from('<i', record)[0]
        if kind == 0:
            continue
        assert kind == 5, kind
        parts, points = struct.unpack_from('<ii', record, 36)
        starts = list(struct.unpack_from(f'<{parts}i', record, 44)) + [points]
        xy = np.frombuffer(record, '<f8', points * 2, 44 + 4 * parts).reshape(-1, 2)
        group = []
        for a, b in zip(starts, starts[1:]):
            ring = xy[a:b]
            area = np.sum(ring[:-1, 0] * ring[1:, 1] - ring[1:, 0] * ring[:-1, 1])
            group.append((abs(area), area < 0, ring.copy()))
        yield sorted(group, key=lambda r: -r[0])

# Match the existing 8K geography without adding baked relief or recolouring.
source = Image.open(colour_source)
assert source.size == (21600, 10800)
colour = source.convert('RGB').resize((8192, 4096), Image.Resampling.LANCZOS)
out = root / 'assets/textures/earth.avif'
colour.save(out, quality=70, speed=6, subsampling='4:2:0')

# A 4K R8 coverage map costs 10.67 MiB including mipmaps. Supersampling keeps
# small islands/coasts fractional. Water is white; land (including ice) black.
width, height = 8192, 4096
mask = Image.new('L', (width, height), 255)
draw = ImageDraw.Draw(mask)
counts = {}
for label, path, fill in [('land', land_source, 0), ('lakes', lake_source, 255)]:
    count = 0
    for group in rings(path):
        for _, exterior, ring in group:
            coords = [((lon + 180) / 360 * width - .5, (90 - lat) / 180 * height - .5) for lon, lat in ring]
            draw.polygon(coords, fill=fill if exterior else 255 - fill)
            count += 1
    counts[label] = count
mask = mask.resize((4096, 2048), Image.Resampling.BOX)
mask_out = root / 'assets/textures/earth-water.png'
mask.save(mask_out, optimize=True)

encoded = np.asarray(Image.open(out)).astype('float32')
reference = np.asarray(colour).astype('float32')
error = np.abs(encoded - reference)
encoding_comparison = dict(meanAbsoluteError8bit=float(error.mean()),
    rgbMeanShift8bit=(encoded-reference).mean((0, 1)).tolist(),
    psnrDb=float(10*np.log10(255*255/(error*error).mean())))

checks = []
for label, lon, lat, expected in [
    ('Pacific', -140, 0, 255), ('Atlantic', -30, 0, 255),
    ('Sahara', 20, 22, 0), ('Amazon', -64, -4, 0),
    ('Australia', 134, -25, 0), ('Greenland', -42, 74, 0),
    ('Antarctica', 0, -85, 0), ('Lake Superior', -87, 47.7, 255),
    ('Caspian Sea', 51, 42, 255), ('Lake Victoria', 33, -1, 255),
    ('Madagascar', 47, -20, 0), ('Borneo', 114, 1, 0),
]:
    value = mask.getpixel((int((lon + 180) / 360 * mask.width), int((90 - lat) / 180 * mask.height)))
    assert value == expected, (label, value, expected)
    checks.append(dict(label=label, longitude=lon, latitude=lat, value=value))

report = {
    'sourcePage': 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/',
    'sourceUrl': 'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/september/world.200409.3x21600x10800.jpg',
    'sourceSha256': digest(colour_source), 'sourceDimensions': list(source.size),
    'sourceEpoch': 'September 2004', 'colourDimensions': list(colour.size),
    'encoding': {'quality': 70, 'speed': 6, 'subsampling': '4:2:0'},
    'colourSha256': digest(out), 'colourBytes': out.stat().st_size,
    'encodingComparison': encoding_comparison,
    'previousColourBytes': 2454000,
    'combinedBytes': out.stat().st_size + mask_out.stat().st_size,
    'combinedBytesSaved': 2454000 - out.stat().st_size - mask_out.stat().st_size,
    'maskSources': [dict(url=f'https://naciscdn.org/naturalearth/10m/physical/ne_10m_{name}.zip', sha256=digest(path)) for name, path in [('land', land_source), ('lakes', lake_source)]],
    'maskPages': ['https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/', 'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-lakes/'],
    'maskDimensions': list(mask.size), 'maskBytes': mask_out.stat().st_size,
    'maskSha256': digest(mask_out), 'maskRings': counts, 'geographicChecks': checks,
    'addedNominalMipmappedBytes': 4096 * 2048 * 4 // 3,
    'interpretation': 'NASA processed monthly cloud-free colour composite; not raw calibrated albedo or a reconstruction of 1977. Natural Earth coast/lake coverage is generalized cartography, not subpixel satellite classification. Existing reconstructed cloud/weather layer is unchanged. Dynamic sea ice and subpixel shorelines remain approximate.',
}
(root / 'docs/earth-surface-v34-source.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
