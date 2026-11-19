# Performance and rendering structure — v0.9.0

This pass concentrates on the existing Voyager experience. Routes, input bindings, scientific scales, source maps, music and saved-flight format retain their existing contracts.

## Rendering work

Static panels keep a stable background. Opening a panel renders its final camera state once; a changed exposure, field of view, quality or viewport invalidates it. Input and menu navigation remain active. Hidden tabs suspend rendering, and menu time does not enter the adaptive flight-resolution measurements.

The Earth cloud layer now has an independent High-mode resolution budget of 1.5× CSS size when the main framebuffer is larger. The original density integration, twenty view samples, self-shadow samples and lighting remain intact. Premultiplied cloud radiance is filtered in a separate half-float target. A lightweight pass on the original shell geometry composites it against the original scene depth, followed by the original full-resolution atmosphere. This preserves foreground occlusion and the globe silhouette. The surface maps, stars, atmosphere and spacecraft retain the main framebuffer resolution. Fine cloud structure is softer in High flight views. Ultra and photography use the original full-resolution cloud rendering.

The cloud target is reused and resized only when dimensions change. The extra target needs approximately 29 MB at a 1600 × 1000 viewport and 1.5× cloud scale; there is no cloud depth texture or full-size depth copy. Scene construction and cloud resources live for the game’s page lifetime. Capture restores the previous live resolution and rendering mode in a finally block.

Stationary spacecraft reuse their surrounding reflection map. Movement or a historical-epoch change invalidates it; camera rotation still transforms the cached environment into the correct spacecraft frame. Renderer calculations reuse temporary vectors/quaternions and fixed body entries. Closest-world selection uses one linear scan, avoiding an allocated map/filter/sort chain every simulation step.

## Module boundaries

| Module | Responsibility |
|---|---|
| `rendering/scene-factory.js` | Construct celestial meshes, atmosphere lookup data, stars, sunlight glare and spacecraft materials |
| `rendering/cloud-layer.js` | Integrate and composite the independent cloud layer |
| `rendering/frame-policy.js` | Decide when a scene needs rendering and when a frame should affect adaptive quality |
| `ui/flight-hud.js` | Present flight, exploration and navigation state |
| `ui/dom.js` | Cache fixed HUD nodes and skip unchanged text, attributes and styles |
| `world.js` | Update physical scene positions, cameras, lighting, frame targets and photographs |
| `main.js` | Coordinate application state, input, panels, saving and observations |

The HUD reads flight state. Transit observation eligibility is set by flight coordination, rather than by drawing its label. The DOM writer compares the actual current value before writing, so event-driven updates remain authoritative. Immediate marker placement preserves survey-controller ordering.

## Measured comparison

`performance-polish.mjs` expects the prior v0.8.1 package on port 4188 (override with `COSMOS_BASELINE_URL`) and the current build on port 4173 (override with `COSMOS_TEST_URL`). It compares an independently extracted v0.8.1 package with the updated source for HUD and pause behaviour. It then alternates full and separate cloud rendering within one current browser context, using WebGL GPU timer queries. The fixed image is 3200 × 2000, Earth departure, probe view. Eight warm-up frames precede thirty-six measured frames in an ABBA order.

- Stationary HUD: 602 text mutations over 43 frames in v0.8.1; zero over 45 frames in the updated run. Changing readings still update every flight frame.
- Paused scene: zero redraws during the 800 ms sample. An exposure adjustment produced one redraw.
- Full cloud path: 24.70 ms median GPU time, 30.40 ms p90.
- Separate cloud path: 22.54 ms median, 28.19 ms p90; an 8.8% median reduction in this measurement.
- Departure, limb, crescent and foreground-Moon fixtures: mean absolute RGB-channel differences of 1.30, 0.70, 0.007 and 0.50 out of 255. Cropped image review shows the expected softening of fine cloud structure. These pixel averages are a regression measure, rather than a claim of visual identity.
- All four saved JPEGs matched the original full-resolution reference output byte for byte. Browser and graphics error logs were empty.

Measurements depend on local workload. The full and separate paths run alternately in the same context to reduce that source of variation. The foreground-Moon fixture deliberately changes its position solely to exercise occlusion; it is not a mission ephemeris or a playable arrangement.

`tests/performance-polish-results.json` records the paired measurements. Independent complete-scene profiles also measured a fixed-resolution chase-view median of 20.70 ms in v0.8.1 and 17.30 ms in v0.9.0; these separate runs are supplemental, rather than paired measurements. `tests/profile-renderer.mjs` isolates clouds and atmosphere with GPU timers. The unit suite, full voyage, input/menu continuity, native-density terrain, three optional flybys, photo/journal resolution, synthetic Xbox, offline-cache, endurance and independently extracted package checks cover the delivered build. The current three-minute run sampled approximately 60 fps in all twelve samples, with 20 geometries and 23 textures throughout and no browser errors or context loss. High’s adaptive main image ranged from 2200 × 1375 to 3200 × 2000 during this run; full-resolution photographs remain independent of that live budget. These are sampled local results, not a minimum-frame-rate guarantee. Detailed current results are recorded in the verification record.
