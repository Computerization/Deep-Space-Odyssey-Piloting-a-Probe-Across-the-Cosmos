# Photographic revision — 0.3

## Image and illumination

Jupiter now uses NASA's Cassini cylindrical mosaic PIA07782 at its original 3601 × 1801 resolution. Its synthesized near-natural colour replaces the earlier enhanced-colour map. The Great Red Spot and surrounding vortices are visible on the approach. The source was photographed in December 2000; this is a visual reconstruction of the Voyager route, not a claim about Jupiter's weather in 1979.

Earth retains 8192 × 4096 surface and cloud maps. The cloud layer gains density-derived relief, self-shadowing, solar extinction near the terminator and projected shadows on the surface. Night-side illumination respects the planet's horizon. Ocean glint uses a rough microfacet reflection model. Cloud height remains inferred from image density.

Atmospheric sunlight columns are integrated once into a small, generated half-float lookup texture. The renderer retains twenty samples along the viewing ray while replacing the eight-sample nested sunlight integration. This reduces repeated work on every frame and uses 96 numerical segments for each precomputed sunlight column. Atmospheric response remains an approximation.

Saturn's rings distinguish reflected and transmitted light, use different optical depths across their radial bands, and retain fine source-map structure. Their shadows depend on the solar direction and oblate globe. The ring-plane observation has a more oblique, closer composition. Saturn’s northern hemisphere now includes observed longitudinal cloud brightness variation from the Hubble OPAL June 2019 map. The oblate latitude mapping is corrected, while the existing latitude colour palette and southern coverage are retained. This is a composite reconstruction with limited source detail, rather than 1980 weather.

The spacecraft retains the NASA model's geometry and gains a subtle thermal-blanket normal map. Chase and world cameras share the same lens. Free look changes the projected spacecraft position, and turning preserves the damped follow behaviour. A full-screen darkening gradient has been removed; text retains its local shadow for readability.

High quality supports up to 2× CSS resolution, Balanced 1.25× and Performance 0.75×. Texture filtering uses up to 16× anisotropy where supported. Source map resolution and geometry are preserved across quality levels.

## Size

- Planet and cloud maps use AVIF while retaining their dimensions. The 8K cloud mask measures 48.94 dB PSNR against the previous source when compared at 2048 × 1024.
- The spacecraft's embedded images use WebP. All nineteen non-image geometry buffers and all mesh/node definitions were compared with the previous model and are unchanged. The model decreases from 3,128,204 to 1,228,208 bytes.
- Four 96-second original compositions use Opus/WebM. Short endpoint fades reduce compression-induced loop discontinuities; music still crossfades between environments.
- The historical plasma presentation retains 960 × 720 dimensions and its exact original compressed audio stream. Video re-encoding measures SSIM 0.996911 against the previous copy.
- The star catalogue retains every numerical value used by the renderer while omitting unused GeoJSON fields.
- Eighteen superseded generated/downloaded intermediates were removed from the working asset folder, freeing 104,019,655 bytes. Source credits and the score-generation script are preserved.

The previous ZIP was 36,549,635 bytes. The final archive size and hash are recorded in `dist/package-verification.json` alongside the delivery. Browser cache installation covers the complete current runtime, including historical media byte ranges.

## Review

Actual game frames are captured for Earth, its limb, Jupiter, a close Jupiter view, Io, Saturn, the rings, Titan and the spacecraft. NASA photographs are reference material, not substituted gameplay backgrounds. These checks establish the changes and their behaviour; they do not establish that every rendered view is indistinguishable from a spacecraft photograph.
