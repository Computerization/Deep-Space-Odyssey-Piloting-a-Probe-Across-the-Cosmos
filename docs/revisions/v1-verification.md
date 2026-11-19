# Archived V1 verification — superseded by the rebuild

# Cosmos — review and verification record

## Delivered scope

A complete English-language Voyager 1 route: **Earth → Jupiter and Io → Saturn and Titan → Pale Blue Dot → interstellar space**. Eleven observations and four manually piloted, time-compressed crossings connect the five chapters. The game includes free three-dimensional flight, probe/chase views and free look, subtle instrument bearings, physical angular sizes and signal delay, original music, a saved journey log, chapter selection, recovery and offline launch.

The full project name remains **Deep Space Odyssey: Piloting a Probe Across the Cosmos**. Cosmos is the experience name. The supplied application form is background material; the user's later decisions about free flight, viewpoints, music and on-screen learning govern this implementation.

## Three substantive review-and-revision passes

### 1. Rendering and complete-route audit

Inspected every chapter and title at runtime in Chrome. The first build exposed depth precision artefacts in Saturn/ring occlusion, under-visible Earth clouds, free-look alignment and stale continuation state. Revisions added logarithmic depth to custom shaders, corrected cloud-map colour space and opacity, corrected free-look quaternion composition, and made Continue read the latest save. A shader compilation issue discovered during the revision was corrected before rechecking.

Verification: all five flight/scale checks passed. The full route test flew every region and crossing with the production movement integrator and reached the ending with 11 observations and zero browser errors. Keyboard thrust, braking, observation and view switching were exercised separately.

### 2. Photographic appearance, nearby worlds and sound

Compared rendered planets with NASA Cassini photographic references. Revisions moderated surface response and saturation, improved clouds, added an original numerical Earth single-scattering atmosphere, analytic planet/moon eclipses and filtered ring shadows, and corrected a texture-derivative seam that produced bright speckles on Jupiter. Titan's atmospheric edge was softened. The chase camera was recomposed around the NASA probe model. Optical field-of-view control, corrected star output and a compact unresolved solar image were added.

Io and Titan received close observation regions using their JPL positions. The Pale Blue Dot observation now opens the actual NASA historical image. Distant chapters begin facing outward, so looking back toward home requires a real turn. Music was normalized to a usable listening level while preserving headroom; chapter changes crossfade, old tracks stop decoding after fading, and rapid chapter selection respects the latest choice.

Verification: reviewed all near-world views, chase view and distant chapters at 1600 × 1000. The complete route passed again after the near-moon and navigation revisions. The observed Pale Blue Dot Earth image spans approximately **0.0021 screen pixels** at a 52° field of view and 900-pixel height; it is not enlarged into a visible planet. AAC files decode as four 96-second stereo tracks, with measured peaks below 0.52 full scale.

### 3. Handling, resilience and offline delivery

The final interaction audit found frame-rate-dependent keyboard/stick turning and a conflict between the voyage shortcut and keyboard Tab navigation. Revisions make turn rate depend on elapsed time, restore keyboard menu traversal, allow Escape from settings, keep behind-camera bearings on the correct screen edge, and reduce time compression near observation regions. Full-screen control and automatic selection of an available launcher port improve exhibition use.

Verification completed:

- Six flight/scale/navigation unit checks passed.
- Full-route integration: 11 observations, all four crossings, historical archive and ending; zero browser errors.
- Synthetic standard Xbox mapping: thrust, brake, observe, viewpoint, optical zoom, menu navigation, pause and disconnect recovery.
- Actual mouse drag; free-look movement preserves the probe's flight heading.
- Keyboard Tab/Enter menus, settings Escape, full-screen entry, hazardous-region recovery, saved continuation and JPEG export.
- Actual audio output measured through the Web Audio graph; media playback crossed the loop boundary successfully.
- Fresh production browser cache: 29 runtime requests; network disabled, page reloaded, Earth launched and Saturn opened successfully.
- Layout inspected at 1024 × 640, 1366 × 768 at device scale 2, 1440 × 900 and 1600 × 1000. High rendering caps device resolution at 1.5×.

The machine used for these checks is an Apple M4 with 16 GB memory. Warm runtime samples were near 60 fps in the tested Chrome configuration. These are local observations, not performance guarantees for exhibition hardware.

Sustained run: three minutes at 1600 × 1000, device scale 2, High quality. Twelve chapter changes completed at approximately 60 fps, with no WebGL context loss or browser errors. JavaScript heap samples stayed between 10.8 and 11.6 MB; geometry/texture counts stabilized at 9/9. After each crossfade exactly one music track remained playing. This is a bounded stability check rather than a multi-hour soak.

## Delivery verification

The ZIP was extracted into a separate temporary folder and started with its own Python server. Controller/audio checks and the service-worker offline reload passed against that copy. The complete route was then flown against the extracted runtime: all 11 observations, four crossings, historical archive and conclusion passed with zero browser errors. The package builder verifies every entry against its SHA-256 manifest. Runtime files in the final archive are compared with this tested copy; later documentation and test-result additions do not change those runtime files.

## Reproducible evidence

- `tests/flight.test.mjs`: units, angular size, inertia, compression and integration.
- `tests/journey.mjs`: movement-based complete route.
- `tests/visual-review.mjs`: every encounter, moon, chase and distant view.
- `tests/compatibility.mjs`: synthetic controller, audio output and service-worker offline operation.
- `tests/usability.mjs`: mouse, free look, menus, recovery, screenshot and music loop.
- `tests/endurance.mjs`: sustained rendering, repeated chapter changes and audio resource behavior.
- JSON results and runtime screenshots accompany the editable workspace. The compact delivery includes verification JSON and development checks.

## Verification boundaries

Physical Xbox hardware has not been connected, so its specific browser/OS mapping still needs a hardware check. Sound has been verified through decoded waveforms and the actual output graph; no claim of human listening evaluation is made. Chrome is the primary tested browser. The game is a real-time reconstruction using spacecraft-derived maps and simplified scattering/material models; literal photographic indistinguishability has not been established. Scene geometry uses historical snapshots and documented gameplay adaptations, rather than a complete orbital simulation.
