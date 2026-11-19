# Moving surveys and lunar relief — 0.6

Three optional flights extend the Earth, Jupiter and Saturn chapters. They begin at the player's current position, leaving the main route's observations and task index intact. Voyage places the local flyby above the chapter list so it is easy to find.

| Flight | Task | New visual opportunity |
|---|---|---|
| The lunar traverse | Coast across the sunlit hemisphere and track the Moon | LRO colour imagery, LOLA relief and a changing phase angle |
| Across the cloud tops | Maintain a course while surveying Jupiter | Close, moving views of the cloud bands at a readable image scale |
| Along the ring edge | Fly just above the ring plane, outside the main rings | Changing ring perspective, light transmission and planetary shadow |

## Flight behavior

An entry bearing leads into an alignment stage. Players brake, point toward departure, build velocity, release thrust, then turn to frame the world. Turning the spacecraft or camera preserves the inertial velocity. Time compression is capped during the pass so pointing and course corrections remain manageable; it applies no automatic steering or thrust.

The route is divided into 24 spatial cells, grouped into approach, closest view and departure. Holding Observe while moving, correctly framing the subject and staying in the survey region records a cell. Six distinct cells in each group complete its view. Remaining still or repeatedly recording one location cannot complete the whole pass. Missed sectors remain available on a return pass. After all three views are collected, reaching the departure region completes the survey.

The result shows three actual photographs, tracking quality and closest altitude above the body's reference sphere. Best tracking results persist separately from the main route. Photographs retain the latest pass. A fresh attempt starts from the current location, requiring a manually flown return to entry. Partial coverage, flight position and attitude are restored with the main save. Opening a menu now saves immediately.

Approach routes insert clearance bearings if a globe obstructs the direct line. These are navigation cues rather than an autopilot or an orbital trajectory solver. All three optional paths are declared gameplay reconstructions.

## Visual and camera changes

The Moon uses a 4096 × 2048 NASA LROC mosaic, replacing its previous map. A 1440 × 720 LOLA elevation grid supplies surface slopes; a compact 257 × 145 vertex grid displaces the silhouette at actual scale. The coarse mesh and normal map do not resolve individual boulders or implement terrain ray-traced self-shadows. A Lunar-Lambert reflectance mixture replaces generic diffuse shading for the Moon. Source details are in `CREDITS.md` and editable asset preparation is in `build-lunar-assets.py`.

The optical field of view extends down to 4°. Mouse, arrow-key and right-stick turning becomes finer as the field narrows. Panels hide background flight labels, keeping instructions and results readable. The result page uses the three captured views as its main visual content.

## Verification

- Spatial coverage, stationary observations, wrong aim, return passes, chapter-compatible restoration and globe-clearance bearings have unit checks.
- The automated pilot flies all three approaches and passes with the production thrust/brake integrator; it does not teleport through the routes. Its ideal pointing produces a 100% reference tracking result, rather than measuring human difficulty.
- A separate browser check uses actual W/X/Space keyboard events to establish a course, record part of a sector, pause, reload and resume the same coverage. Exiting preserves the main task index.
- Nine scene views cover entry, middle and departure for each new flight. The lunar vertex radii are checked against the real relief scale.
- The original thirteen observations and four crossings still complete. Standard Xbox mapping, historical recordings and offline reload are exercised separately; physical Xbox hardware is not connected.

Reports: `flybys-results.json`, `flyby-state-results.json`, `flyby-visuals-results.json`, `journey-results.json`, `compatibility-results.json` and `offline-results.json` under `tests/`.
