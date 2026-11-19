"""Reproject Cassini's published 2013 polar view into the existing Saturn map.

The publication does not supply a georeferenced map label. Register its mean
hexagon colour boundary to 78 degrees planetographic latitude; preserve its
six-sided shape and cloud detail. This is an approximate visual registration,
not navigation-grade cartography or a reconstruction of Voyager-era weather.
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
for name in ['source', 'output', 'report']:
    parser.add_argument('--' + name, required=True, type=Path)
parser.add_argument('--base', type=Path)
parser.add_argument('--projection', choices=['global', 'cap'], default='global')
args = parser.parse_args()
source_hash = hashlib.sha256(args.source.read_bytes()).hexdigest()
assert source_hash == '548d41082eecd6511088a7202c5a7d0ac56cc1bd84917c484e948b2d809a6d78', 'Use the credited original PIA21611 TIFF.'
image = np.asarray(Image.open(args.source).convert('RGB'), dtype=np.float64) / 255
assert image.shape == (1024, 2048, 3), 'Use the original 2048 × 1024 NASA TIFF.'
source = image[:, :1024]  # Left panel: 25 June 2013, natural colour.


def sample(array, x, y):
    x = np.clip(x, 0, array.shape[1] - 1)
    y = np.clip(y, 0, array.shape[0] - 1)
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int)
    x1 = np.minimum(x0 + 1, array.shape[1] - 1)
    y1 = np.minimum(y0 + 1, array.shape[0] - 1)
    fx = (x - x0)[..., None]; fy = (y - y0)[..., None]
    return (array[y0, x0] * (1-fx) + array[y0, x1] * fx) * (1-fy) + (array[y1, x0] * (1-fx) + array[y1, x1] * fx) * fy


def smooth(low, high, value):
    t = np.clip((value-low) / (high-low), 0, 1)
    return t*t*(3-2*t)


angles = np.linspace(0, 2*np.pi, 2048, endpoint=False)
radii = np.arange(280, 461)
annuli = sample(source, 511.5+radii[:, None]*np.cos(angles), 511.5+radii[:, None]*np.sin(angles))
colour = np.median(annuli[..., 0] / np.maximum(annuli[..., 1], .01), axis=1)
kernel = np.exp(-np.arange(-24, 25)**2 / (2*8**2)); kernel /= kernel.sum()
radial = np.convolve(np.pad(colour, 24, mode='edge'), kernel, mode='valid')
gradient = np.gradient(radial)
jet_radius = float(radii[np.argmax(np.where((radii>335)&(radii<420), gradient, -np.inf))])

# Ellipsoidal polar stereographic radius, with the scale calibrated by the jet.
# The globe's UV latitude is parametric; the reference latitude is graphic.
flatten = .902
eccentricity = np.sqrt(1-flatten**2)
def polar_radius(phi):
    t = np.tan(np.pi/4-phi/2) / ((1-eccentricity*np.sin(phi))/(1+eccentricity*np.sin(phi)))**(eccentricity/2)
    return 2*60268*t / np.sqrt((1+eccentricity)**(1+eccentricity)*(1-eccentricity)**(1-eccentricity))

if args.projection == 'cap':
    # Preserve the publication's square pixel grid. Estimate the same broad
    # illumination correction on complete radial rings, not a global UV grid.
    radii = np.arange(513)
    angles = np.linspace(0, 2*np.pi, 4096, endpoint=False)
    rings = sample(source, 511.5+radii[:, None]*np.cos(angles), 511.5+radii[:, None]*np.sin(angles))
    linear = np.where(rings<=.04045, rings/12.92, ((rings+.055)/1.055)**2.4)
    a = 2*np.mean(linear*np.cos(angles)[None, :, None], axis=1)
    b = 2*np.mean(linear*np.sin(angles)[None, :, None], axis=1)
    y, x = np.indices((1024, 1024), dtype=float); x-=511.5; y-=511.5
    radius = np.hypot(x, y)
    first = np.stack([np.interp(radius, radii, a[:, c])*x/radius + np.interp(radius, radii, b[:, c])*y/radius for c in range(3)], axis=-1)
    linear = np.where(source<=.04045, source/12.92, ((source+.055)/1.055)**2.4)
    corrected = np.clip(linear-first, 0, 1)
    result = np.where(corrected<=.0031308, corrected*12.92, 1.055*corrected**(1/2.4)-.055)
    Image.fromarray(np.uint8(result*255+.5)).save(args.output, quality=95, speed=6, subsampling='4:4:4')
    report = {
        'sourceSha256':source_hash, 'sourcePage':'https://science.nasa.gov/photojournal/saturns-hexagon-as-summer-solstice-approaches/',
        'credit':'NASA/JPL-Caltech/Space Science Institute/Hampton University',
        'observation':'25 June 2013; left panel of PIA21611',
        'sourceDimensions':[2048,1024], 'outputDimensions':[1024,1024], 'encoding':{'format':'AVIF','quality':95,'subsampling':'4:4:4'},
        'publishedNativeScaleKmPerPixel':80,
        'projection':'Ellipsoidal polar stereographic, approximate registration; original publication pixel grid retained',
        'flatten':flatten, 'jetReferenceLatitudeGraphic':78, 'detectedMeanJetRadiusPixels':jet_radius,
        'effectiveRegisteredKmPerPixel':float(polar_radius(np.radians(78))/jet_radius),
        'latitudeBlendGraphic':[77,78],
        'lightingCorrection':'First linear-RGB azimuthal harmonic, sampled on 1-pixel radial rings and interpolated on the original image grid; inferred, not retrieved albedo.',
        'limitations':'Published image is not georeferenced. Pixel grid is not native observational resolution. Longitude and 1980 weather are not reconstructed.',
        'usesProceduralWeather':False,
        'outputSha256':hashlib.sha256(args.output.read_bytes()).hexdigest(), 'outputBytes':args.output.stat().st_size,
    }
    if args.base:
        # Compare both stored representations with the corrected publication
        # on its original grid. This measures resampling loss, not new science.
        base = np.asarray(Image.open(args.base).convert('RGB'), dtype=float)/255
        lo = np.full(radius.shape, np.radians(60)); hi = np.full(radius.shape, np.pi/2)
        for _ in range(32):
            mid = (lo+hi)/2
            outer = polar_radius(mid)/polar_radius(np.radians(78))*jet_radius > radius
            lo = np.where(outer, mid, lo); hi = np.where(outer, hi, mid)
        parametric = np.arctan(flatten*np.tan((lo+hi)/2))
        longitude = np.mod(np.arctan2(y,x), 2*np.pi)
        old = sample(base, longitude/(2*np.pi)*(base.shape[1]-1), (.5-parametric/np.pi)*(base.shape[0]-1))
        new = np.asarray(Image.open(args.output).convert('RGB'), dtype=float)/255
        mask = radius<=jet_radius
        report['sourceGridComparison'] = {name:float(np.sqrt(np.mean((value[mask]-result[mask])**2))*255) for name,value in [('globalRmse8bit',old),('capRmse8bit',new)]}
        report['comparisonReference'] = 'Corrected publication grid inside the 78-degree jet; bilinear global-map reprojection versus decoded cap. No sharpening.'
    args.report.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
    raise SystemExit

assert args.base, '--base is required for the global projection'
base_hash = hashlib.sha256(args.base.read_bytes()).hexdigest()
base = np.asarray(Image.open(args.base).convert('RGB'), dtype=np.float64) / 255
height, width = base.shape[:2]
parametric = np.linspace(np.pi/2, -np.pi/2, height)
graphic = np.arctan2(np.sin(parametric), flatten*np.cos(parametric))
rows = np.flatnonzero(np.degrees(graphic)>74)
phi = graphic[rows]
radius = polar_radius(phi) / polar_radius(np.radians(78)) * jet_radius
longitude = np.linspace(0, 2*np.pi, width, endpoint=True)
x = 511.5 + radius[:, None]*np.cos(longitude)
y = 511.5 + radius[:, None]*np.sin(longitude)
polar = sample(source, x, y)

# A publication image contains viewing/lighting gradients. Remove only its
# first azimuthal harmonic, in linear radiance, at each mapped latitude. This
# retains the measured sixfold boundary, colour bands, vortex and small clouds.
linear = np.where(polar<=.04045, polar/12.92, ((polar+.055)/1.055)**2.4)
cosine = np.cos(longitude)[None, :, None]
sine = np.sin(longitude)[None, :, None]
first = 2*np.mean(linear[:, :-1]*cosine[:, :-1], axis=1, keepdims=True)*cosine + 2*np.mean(linear[:, :-1]*sine[:, :-1], axis=1, keepdims=True)*sine
linear = np.clip(linear-first, 0, 1)
polar = np.where(linear<=.0031308, linear*12.92, 1.055*linear**(1/2.4)-.055)
margin = np.minimum.reduce([x, y, 1023-x, 1023-y])
weight = smooth(74.5, 77, np.degrees(phi))[:, None]*smooth(6, 28, margin)
result = base.copy()
result[rows] = base[rows]*(1-weight[..., None]) + polar*weight[..., None]
# Longitude has a single periodic seam; the pole is one physical point.
result[rows, -1] = result[rows, 0]
result[0] = result[0].mean(axis=0)
encoded = np.uint8(np.clip(result, 0, 1)*255+.5)
Image.fromarray(encoded).save(args.output, quality=88, speed=6, subsampling='4:4:4')

report = {
    'sourceUrl':'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia21/pia21611/PIA21611.tif',
    'sourcePage':'https://science.nasa.gov/photojournal/saturns-hexagon-as-summer-solstice-approaches/',
    'credit':'NASA/JPL-Caltech/Space Science Institute/Hampton University',
    'observation':'25 June 2013; left panel of PIA21611',
    'publishedNativeScaleKmPerPixel':80,
    'sourceSha256':source_hash, 'baseSha256':base_hash,
    'sourceDimensions':[2048,1024], 'outputDimensions':[width,height],
    'projection':'Ellipsoidal polar stereographic; graphic latitude mapped to oblate parametric UV',
    'jetReferenceLatitudeGraphic':78, 'detectedMeanJetRadiusPixels':jet_radius,
    'effectiveRegisteredKmPerPixel':float(polar_radius(np.radians(78))/jet_radius),
    'registration':'Approximate: published composite lacks georeferencing; use the observed mean hexagon colour edge and published jet latitude. Absolute longitude and Voyager-era weather are not reconstructed.',
    'latitudeBlendGraphic':[74.5,77], 'sourceEdgeFadePixels':[6,28],
    'lightingCorrection':'Subtract the first azimuthal harmonic of linear RGB per latitude. This is inferred gradient removal, not an atmospheric retrieval.',
    'lowerLatitudePixelsPreservedBeforeEncoding':bool(np.array_equal(encoded[len(rows):],np.uint8(base[len(rows):]*255+.5))),
    'polarSeamDifferenceBeforeEncoding':int(np.max(np.abs(encoded[rows,0].astype(int)-encoded[rows,-1].astype(int)))),
    'usesProceduralWeather':False,
    'outputSha256':hashlib.sha256(args.output.read_bytes()).hexdigest(),
    'outputBytes':args.output.stat().st_size,
}
args.report.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
