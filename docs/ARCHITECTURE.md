# Runtime architecture

Cosmos is a local JavaScript application with no build step. `index.html` starts `src/main.js`; `sw.js` owns the offline file list.

## Ownership

| Area | Owner | Responsibility |
|---|---|---|
| Lifecycle | `src/main.js` | Startup, panels, saved sessions and coordination |
| Opening spacecraft study | `src/rendering/spacecraft-plate.js` | Early model preview, independent studio camera, NASA model close-ups and derived reflector; `spacecraft-outline.js` holds the framing hull only |
| Main story | `src/journey.js` | Launch film, contextual guidance, viewpoint dwell/feedback and progression; observation timing, data and geometric eligibility in `src/encounter-trails.js` |
| Local flight | `src/flight-controller.js` | Camera-relative thrust, coasting, counter-thrust, circling and soft limits |
| Interplanetary passage | `src/transit-controller.js` | Ten-second 3D dated passage and arrival (seven seconds for local transfers); steady mode uses historical and projected local charts in `src/ui/passage-chart.js`. Presentation changes leave the simulated pose and clock intact |
| Historical context | `src/mission.js`, `src/encounter-context.js`, `src/trajectory.js` | Milestones, fixed encounter dates and JPL interpolation |
| Camera | `src/observation-camera.js` | Following, independent look, lens and camera changes |
| Optional exploration | `src/exploration-controller.js` | Nearby-world selection and optional local transfers; `sightlines` in `opportunities.js` shares one camera sample with discovery candidates |
| Science | `src/experience-guide.js`, `src/ui/experience-guide.js` | View-dependent knowledge and presentation |
| Deep-space instruments | `src/ui/deep-space.js` | Archival plate locator and a separate, reversible signal clock; neither modifies flight |
| Rendering | `src/world.js`, `src/rendering/` | Physical scale, source imagery, lighting and bounded detail |
| Audio | `src/audio.js`, `src/audio-automation.js` | Score, crossfades, feedback and archive recordings |
| Photos and review | `src/observations.js`, `src/flight-history.js`, `src/ui/` | Shared capture/storage, journal and local flight review |

The story suggests destinations; it does not gate departure on tasks. Local controls directly move the probe. Assisted cruise grows sublinearly with radius so angular travel is slower around giants. `arrivalTarget` in `journey.js` supplies the shared horizon composition for launch, chapter entry and passage arrival; it changes neither the lens nor body dimensions. Following changes the camera, while the flight controller explicitly implements circling. The flight controller integrates turns analytically and divides motion into bounded 1/120-second steps, up to 100 ms per rendered frame. Thrust, boost and braking ease in; release removes thrust and local differential gravity changes momentum without artificial damping. Assisted velocities are navigation state, not physical spacecraft measurements. Historical dates remain attached to scene epochs. The HUD derives altitude from the oblate reference surface. Menu transitions synchronously update input context so immediate Tab presses navigate the newly opened menu. Flight button key labels map to the same actions as pointer activation.

Rendering keeps distant worlds at their true angular sizes. A shared regional loader serves a 32K cloud atlas and a 64K Earth surface atlas. Each layer maintains one 4096² GPU patch and at most eight decoded tiles, reusing its allocation. The 16K GPU-compressed Earth overview remains visible during asynchronous loading; supported smaller devices use its 8K mip. High picture quality keeps world surfaces at the display grid, up to 2× density, and renders clouds at that same grid during stationary viewing and movement. Clarity no longer depends on detecting a stopped clock. Ordinary cloud rays use 4 + 6 minimum view intervals and three minimum sunlight intervals, with density integrated analytically within each interval; longer lateral paths increase the count. The resolved grazing variant retains its 8 + 12 and four minima. In `earth-shaders.js`, sunlight segments above their reconstructed cloud top return before reading coverage. For the ordinary two-tap view estimate, the unmasked mean height gives a conservative ceiling: removing a clear tap can only lower the top. Surviving segments keep their original coverage masks, optical depths and centroids. The sunlight integrator keeps one bounded loop body instead of six expanded copies. Cloud endpoints above the 1.4 km inner shell use the existing elevated-air integration path directly; surface and limb sampling counts are unchanged. Photographs retain native resolution.

Only an active flight or its panels may write a checkpoint. Passage saves include the original departure pose and lens orientation so resuming evaluates the same curve, not a second departure from the displayed position. Older local transfers continue smoothly from their recorded pose. Saved sessions use physics version 3. Existing photographs and settings are preserved; earlier physics sessions migrate without reusing obsolete velocities. Previous propulsion calculations remain reference/test utilities and are not called by assisted flight. Old time-flow UI and opening tutorial paths have been removed from active coordination.

## Verification

`npm test` checks shared geometry, dates, source sampling, storage, input and reference calculations. `tests/journey-experience.mjs` exercises the actual keyboard controls and whole main voyage. Regional surface comparisons and compatibility checks use the local browser harness in `tests/browser.mjs`. Historical browser checks that assume the retired propulsion/time-flow interface are not current acceptance tests.

The offline packer reads `sw.js`, verifies archive hashes and documentation links, and excludes development screenshots, downloaded sources and historical reports.

Gas-cloud depth belongs to `src/rendering/gas-clouds.js`: six view samples and two sunlight samples, with heights inferred from the existing image. The generated 64³ noise texture is removed. Jupiter and Saturn use their existing mapped colours; inferred heights and scattering remain visual reconstructions; fine features retain the limits of the image source. Earth regional loading starts when the view centre resolves source detail, without waiting for the entire viewport to fit inside a patch.

Discoveries write existing journal-note IDs; automatic recognition never captures photographs or opens dialogs. Suggested positions remain navigation aids, while range, phase, visible limb and ring elevation determine the actual discoveries. Close-range crescent checks account for the visible surface cap. Gas-cloud colour uses explicit anisotropic gradients and bounded magnification reconstruction, preserving source limits.

The encounter trail is also the discovery catalogue. A visible, unseen phenomenon can take over the suggestion after a short stable look, regardless of order. Named landmarks use the map’s coordinates and current orientation; the Great Red Spot must be lit and inside the view. `nextDiscovery` chooses unseen phenomena before detours. Recordings remain in journal notes after the suggestion advances. Camera following only requests the assist; `flight-controller.js` owns tangent-velocity transport and close-pass limits.

Earth cloud daylight uses one shared 129 × 64 RGBA16F lookup generated by `src/rendering/cloud-skylight.js`. It tabulates hemispheric skylight and the first cloud-to-air return; resolved and ordinary views use the same table. Catalogue star flux is distributed with a pixel-integrated separable kernel in `scene-factory.js`. Neither feature streams assets during flight. The optional Earthrise and Io pair use the observed gap between silhouettes; a lunar terminator observation requires the visible, near-facing day/night boundary inside the lens.
