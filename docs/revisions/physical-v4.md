# Light, volume and material revision — 0.4

## Earth and Titan

Earth clouds are integrated as a thin three-dimensional density field, with an observed 8K coverage map, reconstructed cloud heights, view-path extinction and sunlight self-shadowing. Low cloud receives more vertical integration samples than the upper layer. The density profile preserves thin-cloud transmission; explicit texture footprints keep filtering stable inside the ray march. Cloud height is inferred from brightness, so this is a visual reconstruction rather than retrieved meteorology.

Surface shadows use the cloud optical depth and solar direction. The numerical atmosphere uses midpoint view attenuation, preserving the thin blue limb. Surface, clouds, atmosphere, stars and spacecraft now share a linear half-float image buffer and a single final display conversion. Transparent layers no longer receive separate display conversions before blending.

Titan uses absorbing lower haze and a thinner detached upper layer, with numerical sunlight columns and integration along the view ray. It reproduces the change from a softly shaded daytime disc to an orange and blue backlit limb. Cassini's natural-colour PIA21625 is the comparison reference. The selected vertical profile approximates the appearance; it is not a measurement of Titan in November 1980.

## Rings and spacecraft

Saturn's C, B and A rings and the Cassini Division use separate approximate normal optical-depth ranges guided by NASA's ring fact sheet. The narrow F ring is included. The shadow of the oblate planet uses the angular size of the Sun to determine its penumbra. Reflection and transmission change with the observer's side of the ring plane.

The source ring image is reduced from 8192 × 500 to 8192 × 1 pixels by retaining the central radial profile actually sampled by the renderer. The two central rows are averaged in linear light. This retains all 8,192 radial samples, reduces the PNG from 64,790 to 9,002 bytes and saves 16,351,232 bytes of base-level texture storage before mipmaps.

The NASA spacecraft's grayscale occlusion atlases now supply occlusion instead of fixed painted surface colour. Reconstructed metalness, roughness and small blanket folds follow the supplied colour atlas. Brass structural parts retain smooth metal response. A small environment capture supplies reflections and indirect light from the actual surrounding planets; its prefiltered target is reused. Solar illumination disappears when a planet eclipses the probe.

The Jupiter map now uses its documented planetocentric latitude convention on the oblate globe.

## Flight and photographs

High quality adapts resolution within a 1–2× cap on high-density screens, using a frame-time window and a slow recovery to avoid rapid oscillation. Ultra retains the fixed 2× cap. Balanced and Performance retain their fixed caps. Source image dimensions, geometry, lighting and physical angular sizes are unchanged across quality settings.

Photographs in High and Ultra render at the full display-density cap even when flight rendering has adapted. The renderer restores the live resolution and camera state immediately after capture. Observation records now store the full photograph instead of reducing it to 1280 pixels; journal images decode lazily when they approach the visible area. Display-density supersampling replaces unnecessary extra multisampling at high density; standard-density displays use two-sample antialiasing.

## Review evidence

The review includes eight encounter views, close spacecraft views, nine additional phase-angle views, a solar-eclipse check and a high-density close-flight photograph check. Captures are actual rendered gameplay scenes; the camera is positioned by the review harness for repeatability. Production movement, observation, save, controller and offline paths are checked separately.

Current performance and regression measurements are stored under `tests/`, and the delivery hash and size under `dist/package-verification.json`. Source assets remain local. The additions require no new downloads during play.
