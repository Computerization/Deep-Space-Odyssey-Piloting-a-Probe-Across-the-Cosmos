"""Build the offline sky from NASA SVS 4851's equatorial EXR and its published
print preview. Development only: pip install OpenEXR numpy Pillow. No downloads
or run-time decoder in the game. Usage: build-flight-sky.py EXR PREVIEW OUTPUT.
"""
import argparse
from pathlib import Path
import numpy as np
import OpenEXR
from PIL import Image


def srgb(x):
    return np.where(x <= .0031308, 12.92*x, 1.055*np.maximum(x, 0)**(1/2.4)-.055)


def linear(x):
    return np.where(x <= .04045, x/12.92, ((x+.055)/1.055)**2.4)


def build(source, preview, output):
    with OpenEXR.File(str(source)) as f:
        pixels = f.channels()['RGB'].pixels
        if pixels.shape != (2048, 4096, 3):
            raise ValueError('Use the celestial milkyway_2020_4k.exr, not a galactic or combined map.')
        # Preserve integrated flux while reducing to a single 2048 x 1024 texture.
        rgb = pixels.reshape(1024, 2, 2048, 2, 3).mean(axis=(1, 3), dtype=np.float32)
    weights = np.array([.2126, .7152, .0722], dtype=np.float32)
    y = rgb @ weights
    with Image.open(preview) as im:
        reference = linear(np.asarray(im.convert('RGB'), dtype=np.float32)/255) @ weights
    # Transfer the contrast of the official SDR rendition rather than clipping
    # the EXR highlights. Directions and fine structure come from the EXR.
    q = np.r_[np.linspace(0, .999, 401), .9995, .9999, 1.]
    mapped = np.interp(y, np.quantile(y,q), np.quantile(reference,q)).astype(np.float32)
    rgb *= (mapped/np.maximum(y,1e-12))[...,None]
    display = linear(np.minimum(1, 1.08*np.maximum(srgb(rgb),0)**.90))
    # Bake the inverse low-light offset of the renderer's Neutral tone curve
    # once. Otherwise dark diffuse light is crushed a second time at resolve.
    m = display.min(axis=2,keepdims=True)
    scene = display + np.where(m < .04, .4*np.sqrt(m)-m, .04)
    image = Image.fromarray(np.rint(np.clip(srgb(scene),0,1)*255).astype(np.uint8))
    image.save(output, 'WEBP', quality=94, method=6)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('source','preview','output'):
        parser.add_argument(name, type=Path)
    args = parser.parse_args()
    build(args.source,args.preview,args.output)
