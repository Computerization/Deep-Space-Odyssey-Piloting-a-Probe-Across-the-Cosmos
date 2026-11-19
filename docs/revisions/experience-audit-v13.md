# Cosmos — experience audit and repair ledger

Baseline: 0.12.0. Audit started 14 November 2026. This is a living list of observed defects and concrete improvements, not a claim that every possible defect has been found.

The direction remains an English, offline-capable Voyager 1 experience: physical scale, restrained thrust, historical time passage, optional guidance, free exploration within each encounter, and photography-led science. No scores or compulsory training sequence.

## Priority repairs

| ID | Observed weakness | Repair / acceptance evidence | State |
|---|---|---|---|
| E01 | Suggested scenic points were authored for an obsolete high-speed flight model; pointing at one implies it can be reached. | Use body bearings and a coast forecast; provide explicit optional starts for all five suggested compositions. | Repaired in 0.15; five-study save/restore and departure verification |
| E02 | Passing a good view or reaching the exploration boundary leaves a restart as the only useful recovery. | Add flight review with a scrubbable, bounded history; restore position, momentum, propellant and local time together. Cancel must preserve the flight. | Repaired; browser restore/cancel and bounded-history tests passed |
| E03 | The current heading can be mistaken for direction of motion. | Show the curved projected coast on the local chart and clearly identify the velocity marker. | Repaired; gravity-aware current-pass chart |
| E04 | Time buttons show requested rates in a toast but actual rates elsewhere, without explaining the limit. | One time readout explains the actual rate and any nearby-body limit; 1× must read one second per second. | Repaired; actual flow, selected limit and readable time units |
| E05 | Boundary and proximity holds are indistinguishable; hold controls can appear ineffective. | Provide accurate hold reasons and a direct Review flight action. Preserve momentum. | Repaired; distinct hold reason and direct flight review |
| E06 | Science and navigation both write the same large block of text every frame. | Establish one quiet context area with separate optional actions and transient science. | Repaired; HUD action state separated from science copy |
| E07 | The new player has no concise visible control reference; opening a long help panel is the only route. | A brief, dismissing-by-time control line with mouse/controller-specific wording, without gates. | Repaired; brief device-specific control line |
| E08 | Long crossings are a date counter over mostly empty space. | Improve passage overview and human-readable elapsed/remaining time, preserve scale and user time control. | Repaired; travel/remaining distances and arrival estimate; five passages passed |
| U01 | Accumulated CSS contains three generations of conflicting buttons and layout overrides. | Replace with owned base and interface styles; remove obsolete filled states and inherited uppercase styling. | Repaired; structural/presentation ownership |
| U02 | Plus/minus and some toolbar controls have small targets. | Minimum 44-pixel targets with visible keyboard focus. | Repaired; browser-measured 44-pixel targets |
| U03 | In-flight text competes with the scene; the large static objective reads as a task list. | Separate scene reading from persistent travel and camera controls. Place continuation with the chapter, group photography with footer tools, and hide the empty reading area. Retain 17 px body copy and consistent 44 px targets. | Revised in 0.38; visual and interaction review recorded below; subjective refinement continues |
| U04 | Six historical nodes need excessive scrolling; current position is not clear. | A compact chronological list with current node and clear historical/predicted labels. | Repaired; all six nodes fit 1440 × 900 |
| U05 | Solar-chart symbols and labels overlap around the inner planets. | Collision-aware label placement and enlarged focus targets without enlarging physical distances. | Repaired; collision-aware labels and unit check |
| U06 | Global keyboard shortcuts can act while a panel is open; keyboard/controller navigation differs. | Shared visible-control navigation, arrow/Home/End keys, native sliders, focus trapping and Xbox D-pad/A/B. | Repaired in 0.14; keyboard and synthetic controller checks passed; physical controller remains D03 |
| V01 | Opening probe model and busy UI compete with the Earth image. | Refine initial framing and start with unobstructed probe-camera view; retain chase view. | Repaired; unobstructed probe view at launch |
| V02 | Planet imagery, lighting and ring appearance still read as a simulation. | Compare actual captures with credited spacecraft references; correct specific material, shadow and exposure defects. | Partial: Earth colour/water/air balance revised in 0.34; close-cloud map detail and broader material review remain open; RGB atmospheric transmission and cloud-depth composition corrected in 0.42 |
| V03 | Close-range rendering needs sustained performance checks, and a long local run can stall or lose its graphics context. | The first v48 six-minute run recorded one approximately eight-second Moon chase stall followed by a context reset; rendering recovered. Matching two-minute Earth/Moon/Jupiter repeats on v47 and v48 pass without a reset and keep warmed resources stable. The cause remains unresolved; investigate repeatability and verify the exhibition machine. Short numerical/graphics comparisons do not establish sustained reliability. | Partial |
| A01 | Music transitions need repeated interruption checks and listening review. | Verify transition continuity and recovery, capture the real mix, and review listening quality. | Partial: transition and actual-output checks added; subjective listening remains open |
| A02 | Instrument cues can become repetitive during exposure/approach. | Review cue frequency, volume and quiet exploration behaviour. | Repaired; automatic repeated cues removed |
| C01 | Dead graded-survey systems remain wired into normal runtime orchestration. | Remove obsolete runtime paths and their assets/cache entries while preserving saved photographs. | Repaired; obsolete controller and runtime dependencies removed |
| C02 | Navigation allocates many vectors and arrays and recalculates route state per frame. | Simplify bearings; calculate forecasts on demand, keep bounded flight history. | Repaired; forecasts on demand and bounded snapshots |
| C03 | Main orchestration mixes panel HTML, physics and history concerns. | Extract new review and navigation logic into focused modules. | Repaired; separate history, forecast and review modules |
| D01 | Browser updates may retain a prior offline version. | Version-scoped cache reads prevent late old requests from restoring obsolete code. A real v12 → v13 upgrade, offline reload and isolation regression passed. | Repaired |
| D02 | Documentation and package reports can lag behind changed runtime. | Refresh controls, limitations, repair ledger and final package verification together. | Updated for 0.38; final package verification recorded with the release |
| D03 | Physical Xbox hardware, multiple browser engines and long sessions are not verified. | Firefox 153 and Playwright WebKit 26.5 pass seven scene captures, control/chart checks, actual music output, mute and offline restore. Physical Xbox and exhibition-hardware checks remain. | Partial; actual Safari application untested |

## Scientific constraints carried forward

- Encounter flight is a local, fixed-epoch study with physical gravity and small finite propellant thrust. It is not a reconstructed engineering simulation of the complete mission.
- Historical passage follows sampled JPL trajectory data. Local exploration never adds arbitrary cruise speed.
- Flight review is an explicit time-navigation tool. Restoring a recorded state is not an engine manoeuvre.
- The one-light-day endpoint remains NASA's published prediction as of 14 November 2026.
- Real spacecraft imagery is credited separately from rendered images. Photorealistic equivalence is not established.

## First implementation pass

- Flight review records up to 480 samples, coarsens older samples while retaining arrival, and restores position, velocity, attitude, fuel and local time. It pauses after restoration. In v13, review was local to the browser visit. Version 0.14 adds compact persistence (D04).
- Direction markers now name an actual body and explicitly identify themselves as bearings. The encounter chart has a current-pass scale and a whole-encounter scale, with an unpowered forecast using the flight gravity model.
- Three generations of CSS were replaced with structural and presentation layers. Navigation uses sentence case, clear focus indicators and 44-pixel primary instrument targets. All six mission nodes fit the 1440 × 900 voyage view.
- Removed the obsolete graded-survey controller and its six legacy tests. Existing saved survey photographs remain viewable. The current suite adds three physics/history regressions (40 current checks, including chart-label and legacy-cache regressions).
- Cloud scattering renders to its own target at ordinary display density too. Initial headless Chrome measurements at 1440 × 900 / DPR 1 showed Earth's p95 frame interval changing from 33.4 ms to 16.8 ms with cloud scale 1.0. A subsequent same-browser alternating comparison measured both paths at about 16.7 ms median and 16.7–16.8 ms p95. The initial difference therefore does not establish a causal speedup; these short measurements do not establish performance on every exhibition machine.
- Ring shadows filter transmitted light across the solar/pixel footprint, including optical-depth region boundaries. Ring radiance no longer receives opacity twice during compositing. NASA's [Colorful Threads and Shadows](https://science.nasa.gov/resource/colorful-threads-and-shadows/) describes translucent rings and shadow structure; geometry differs by epoch and viewpoint.
- Removed repeated automatic exposure/proximity piano cues. Deliberate action confirmations remain. Mute preference now survives reloads. Musical loop and headphone listening review remain open.

### Additional findings

| ID | Finding | Next action | State |
|---|---|---|---|
| E09 | Close visits to the Moon, Io and Titan remain impractical from some main-planet scenic starts under the real small-thrust model. | Added explicit close-pass studies with local gravity, finite propellant, reference velocity, bounds, dates and accessible first-screen entries. | Repaired in 0.14; three-study browser checks passed |
| E10 | Some optional observation descriptions still assume those distant approaches are readily reachable. | Moon/Io/Titan descriptions now direct to optional studies; bearings continue to locate physical bodies. | Repaired in 0.14 |
| V04 | Saturn's source map has limited southern cloud variation; sharper rendering alone does not supply missing measured features. | Blend measured OPAL 2025 southern longitudinal detail, excluding unsuitable coverage and outliers; compare the same rendered views. | Repaired in 0.15; mixed-epoch map and source limits documented |
| D04 | Reloading loses the earlier flight-review timeline. | Save up to 120 samples with the current study identity; validate physical states, chronological order and the saved endpoint before loading. Keep 480 in-memory samples and preserve arrival/latest state. | Repaired in 0.14; save/reload and physical rewind passed in all three studies |

- Upgrade testing reproduced a real old-cache resurrection fault. Offline reads now use only the active version cache; install requests explicitly reload resources. A v12 → v13 browser upgrade and subsequent offline launch passed. Version 0.14 also passed an independent v13 → v14 upgrade, restored the old physical save and opened a new Moon study offline.

## Second implementation pass — 0.14

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| A03 | A restored mute preference could leave the first audio graph at normal gain even while the interface said Sound off. Firefox also starts a same-time exponential target from the default gain despite an explicit zero anchor. | Initialise music/recording gains consistently and start exponential targets one sample after the initial anchor. Verify zero gain after restoring a muted session. | Repaired in 0.21; restored mute remains at exactly zero gain in Chrome, Firefox and WebKit |

- Three optional close passes begin at four physical body radii. Their speed retains the two-body specific energy of the corresponding historical Voyager snapshot; the tangential starting direction is an explicit exploration adaptation. Moon and Io share their parent encounter epoch. Titan selects the existing 05:41 UTC snapshot. Main mission nodes and historical passage data stay authoritative.
- The encounter context supplies the physics anchor, body-relative velocity, map centre, exploration boundary, header date and photograph metadata together. Selecting a study begins a new local history and preserves the journal. Continuing the voyage returns explicitly to its recorded passage.
- The encounter menu puts close-pass entries beside the chart, visible at 1440 × 900. Additional compositions are collapsed. Chart names sit outside the body discs.
- Keyboard arrows, Home/End and Tab reach visible menu controls. Ranges retain native keyboard behaviour; synthetic Xbox D-pad tests cover focus, sliders, quality selection, review and cancellation. The paused physical state stays unchanged under flight shortcuts.
- Persistent review keeps at most 120 states, retaining the first and most recent sample. Invalid, cross-study or out-of-order histories fall back to the saved current state. Selecting another study resets its history.
- Audio validation distinguishes signal state from listening quality. The new lifecycle check covers initial saved mute, rapidly interrupted crossfades, actual media loop wrap and hidden-tab gain. Human headphone audition remains open under A01.

At 0.14 the ledger contained 30 findings. Composition access and southern Saturn detail were carried forward into 0.15; the current state is recorded below.

### 0.14 verification

- 45 unit checks pass, including persistent-history validation and the Titan epoch/reference-frame selection.
- Three close-study browser checks pass for initial flyby energy, body-relative instruments, bounded regions, visible entry points, exact save/resume, reloadable physical rewind and return to the historical voyage.
- Keyboard and synthetic Xbox menu checks pass; native range keys, focus trapping, hidden-detail exclusion and compact pause layout are verified.
- Audio graph checks pass for mute-before-playback, interrupted transitions settling to one active track, media-loop wrap and hidden-tab fades. This is signal-state evidence, not an assessment of musical taste or headphone quality.
- Six historical nodes and five passages pass the scientific experience regression.
- An independent extraction launches offline with 67 matching runtime hashes, zero external requests and zero browser errors. Its Titan study restores and rewinds after an offline reload; photographs, chart controls, saved passages and four stereo tracks work offline.
- The previous v13 save survives a real service-worker upgrade to v14. A recreated stale cache cannot replace the new offline application.

## Third implementation pass — 0.15

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| V05 | Approaching Titan clipped the haze shell; crossing into it could remove the atmosphere and reveal an almost black surface. | Render the far shell, integrate the actual ray segment and write entrance depth; reduce the local camera near plane to 1 km. Check nine views, both sides of the shell boundary, interior outward views and foreground occlusion. | Repaired; continuous boundary brightness and foreground occlusion passed |

- Removed repeated study titles from the in-flight context area; the chapter header names the place, while the lower caption explains the view. Science titles and historical-passage titles remain visible.
- Added explicit Earth shadow-edge and Saturn ring-plane studies. Together with Moon, Io and Titan, all five suggested compositions now have a reachable starting viewpoint. Selection begins a new local pass; it never steers the probe automatically. Dates, gravity, reference velocities, review and bounds remain coherent.
- Saturn’s southern map now uses measured relative brightness from Hubble OPAL 2025. Ring occultation, polar gaps and isolated filter/moon artifacts are excluded. Southern colour comes from the existing credited latitude palette. Same-camera comparisons show subtle cloud variation without artificial storms or added procedural noise. The source is 1,800 × 900; output size is not a claim of greater measured resolution.
- Titan’s previous close views at 1.25, 1.23 and 1.1 body radii had mean image brightness near 2/255. The repaired 1.24001 / 1.23999-radius boundary samples differ by less than 0.001/255, and a foreground object remains correctly visible. Reference images support the blue upper haze and orange lower haze; this remains an approximate scattering model.
- A 379-second local Chrome run covered seven scenes in both probe and chase views at 1440 × 900 / DPR 2. All 14 samples had median frame intervals around 16.7 ms. Earth in both views and Titan chase had p95 around 33.3 ms; other scenes were around 16.7–16.8 ms. Warmed chase resource counts stayed at 20 geometries / 23 textures, with no context loss or browser errors. This run predates the same-sized Saturn texture substitution; final map acceptance uses the visual and offline checks.

The ledger contains 31 findings. E01, V04 and V05 are repaired. Broader material fidelity (V02), long-session/exhibition performance (V03), subjective listening (A01), physical Xbox and additional browser engines (D03), and subjective interface refinement (U03) remain open.

### 0.15 verification

- 45 unit checks pass.
- Five study flows pass entry visibility, initial physical energy, reference frame, bounds, exact save/restore, persistent rewind and historical departure. The Earth shadow start measures approximately 49.8% visible sunlight; the ring-plane start is 1.43° above Saturn’s equator and outside the main rings.
- The in-flight context omits a duplicated study title; a historical passage restores its own title. Keyboard and synthetic Xbox menu navigation pass with the expanded viewpoint list.
- Nine Titan views pass continuity and foreground-occlusion checks. The source-backed Saturn before/after comparison uses the same two camera positions and records both texture hashes.
- Six historical nodes and five passages pass. A real v14 → v15 service-worker upgrade preserves the Titan physical state and review timeline, opens the new ring-plane study offline, and isolates late stale caches. An independently extracted package passes offline checks with 67 matching runtime hashes, no external requests and no browser errors. Photos, chart controls, historical saves, Titan study review, four stereo tracks and ranged archival video work offline.

## Fourth implementation pass — 0.16

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| V06 | Near-edge-on ring bands alias into broken lines and flicker during subpixel camera motion. | Integrate radiance and coverage over a 3 × 3 projected pixel footprint before compositing. Keep texture gradients local to each sample. Compare four inclinations against 4× renders and measure camera-motion stability and rendering cost. | Repaired; reference error and flux variation reduced |
| D05 | The Node and Python launchers return complete files for every media request; Chrome can reject a seek and restart at zero. | Support byte-range responses, suffix/open-ended ranges, 416 for unsatisfiable ranges and HEAD. Stream requested data. | Repaired; 16 HTTP cases across both launchers pass |
| A04 | Earlier loop tests only checked that playback was below three seconds afterward. A failed seek could satisfy that condition without crossing the loop. | Assert the seek reached the tail, trace the actual media-time wrap, and capture six seconds of real channel output through an AudioWorklet. | Repaired; all four captures cross the actual loop |

- The ring comparison uses identical geometry, material parameters and camera positions. In four inclinations (0.25°, 1.427°, +8°, −8°), image RMSE relative to a 4× render falls by 38%, 58%, 56% and 68%. This measures sampling fidelity to the existing model, not fidelity to a spacecraft photograph.
- Over 20 small camera rotations, integrated ring-image brightness variation falls from 0.514% to 0.251% at 0.25°, and from 0.0858% to 0.0420% at 1.427°. The measurement isolates rings and holds the observer position fixed.
- An alternating same-browser test at 1000 × 625 / DPR 2 covers broad and edge-on rings. Both versions measure about 16.7 ms median and 16.7–16.8 ms p95 across 180-frame windows, with no frames over 50 ms. This short, local check shows no measurable frame-interval regression; it is not a GPU-cost or exhibition-hardware guarantee.
- Actual loop captures show 6.8–10.5 ms of near-zero PCM around the encoded boundary and a retained soft fade; no claim of inaudibility is made. This is stronger output evidence than a media-state flag, while A01 headphone review remains open.
- The earlier v5/v14 loop-wrap claims are superseded by A04. Their mute, gain and channel-state checks remain useful, but a low final playback time alone was insufficient loop evidence. The new captures verify a real 117.5-second seek followed by the actual end-to-start transition. Subjective music/headphone review remains open.
- Local byte-range handling follows the single-range semantics in [RFC 9110 §14](https://www.rfc-editor.org/rfc/rfc9110.html#section-14); unsupported multi-ranges and invalid syntax are ignored. Conditional If-Range requests receive the full representation.

The ledger now has 34 findings. V06, D05 and A04 are repaired. The broader open areas remain U03, V02, V03, A01 and D03.

### 0.16 delivery verification

- 48 unit checks pass, including bounded, suffix, open-ended and unsatisfiable media-range behaviour.
- Both launchers return exact requested bytes across 16 HTTP cases; HEAD reports the complete length with no response body.
- The independently extracted package matches all 67 cached runtime files and makes no external requests offline. Its archival video seeks to 10 seconds; its music seek reaches 118.8 seconds and actually loops back to below one second.
- The v15 → v16 upgrade preserves the previous Titan state and review history, supports the ring-plane study offline, and isolates a recreated stale cache.
- Photographs, charts, saved passage and Titan review restore offline. Muting before playback, interrupted transitions and background fades pass the revised audio lifecycle check.

## Fifth implementation pass — 0.17

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| A05 | WebKit plays the WebM score without sending samples through its Web Audio processing chain, undermining gain, crossfades and mute. | Copy the same Opus packets into Ogg, compare decoded original PCM, and verify real output and mute in Firefox / WebKit. | Repaired; actual mixed output and mute pass in both engines |
| U08 | Entering or resuming a voyage waits for the audio device before restoring the scene, leaving the menu briefly unresponsive. | Request audio in the user gesture, restore flight immediately, then select the current score when audio is ready. Test with deliberately delayed audio readiness. | Repaired; deliberately delayed audio readiness stays playable in Firefox and WebKit |
| U07 | Bearing names and distances sit across the middle of the planet or rings, competing with the image. | Place resolved-world labels outside a conservative angular footprint, with a short leader; avoid contextual text, preserve placement while available, and retain edge arrows / unresolved instrument markers. | Repaired; seven scenes, offscreen navigation, guidance toggle and compact layout pass |

- The position and physical size of each world remain unchanged. The navigation label moves around the world’s projected extent; Saturn’s extent includes the rings. If a world fills the view, the label docks to a readable margin.
- The layout retains its chosen side while space remains available, reducing jumps during small camera movements. Size measurements update through ResizeObserver instead of forcing a layout read on each frame.
- Three unit checks cover clear geometry, obstruction avoidance / stable placement, and the full-screen fallback. Browser checks cover Earth, Moon, Jupiter, Saturn, ring-plane, Titan and the light-day endpoint, including a target behind the camera and a 1024 × 640 viewport.

The repair ledger now contains 37 findings. Cross-engine results are recorded with this release; physical Xbox and exhibition-hardware checks remain separate.

- WebKit 26.5 reproduced zero samples at the music mix output for WebM while a decoded buffer produced signal. The same Opus packets in Ogg produced signal through the graph. This aligns with [WebKit issue 276813](https://bugs.webkit.org/show_bug.cgi?id=276813); the local measurements determine this repair. Four remuxed tracks preserve all original 120-second decoded PCM byte for byte and reduce runtime audio by 135,416 bytes. A 5 ms timestamp offset corrects the remux end granule; browser decoders receive the full 120-second duration. FFmpeg includes 24 additional tail frames (0.5 ms). Fresh loop captures check actual playback.

### 0.17 verification

- 51 unit checks pass. Bearing checks cover seven scenes, offscreen arrows, guidance visibility, a 1024 × 640 viewport, a foreground-occluded Moon and a world filling the narrow lens.
- Firefox 153 and Playwright WebKit 26.5 render seven worlds/views without page errors. Time hold preserves physical state while attitude responds; solar-chart selection, delayed-audio startup, four stereo-track decodes, real mixed output and mute pass. These are test-engine results, not an installed Safari or physical Xbox certification.
- WebKit’s simulated-offline automation produced an internal navigation error. Stopping the test’s own local server instead confirms actual cache loading, saved ring-plane restoration, archival-video seeking and ranged audio offline. Both engines pass with their own local server stopped.
- Four fresh Chrome AudioWorklet captures cross the actual Ogg loop. Near-zero runs at the softened seam are 7.8–11.5 ms; the source taper remains. This does not establish headphone listening quality. Saved mute, rapid transitions, single-channel settling and background fades pass.
- The independently extracted final runtime passes all 68 offline hashes, photos, chart selection, saved historical passage, Titan review, 120-second stereo tracks, music looping and video seeking. No external requests or page errors occur. The v16 → v17 update preserves physical flight and review history and isolates a recreated stale cache.

U03, V02, V03, A01 and the physical-hardware portion of D03 remain open. The ledger records 37 observed findings; it is not an exhaustive claim about every possible defect.

## Sixth implementation pass — 0.18

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| U09 | The quiet-flight context repeats the body name/range already supplied by the bearing, leaving a permanent text block over the view. | Reserve the context area for the opening invitation and newly encountered science; retain photography, continuation, bearings and time controls. | Repaired; quiet-flight, retained navigation / photography, science journal and restored passage captions pass |
| E11 | After a scene/menu transition, the global neutral-input gate swallows a newly pressed turn until every held control is released. | Isolate only controller axes/buttons held at the transition. Clear old keyboard presses while accepting fresh events on the first frame. Dispatch menu actions before reading flight controls. | Repaired; four regressions and browser first-frame / held-trigger checks pass |
| V07 | Saturn’s night side receives only a uniform tiny floor; reflected light from the rings is absent. | Integrate ring radiance over visible ring area, respecting oblate-surface horizons, both ring faces, optical depth, colour and the planet’s shadow. Cache per historical epoch and add a contextual ringshine note. | Repaired within the existing approximate optical model; day, crescent and both night hemispheres reviewed |
| D06 | The Saturn photographic-reference link carries PIA17648, which identifies a Mars image. | Correct the linked Jewel of the Solar System reference to NASA’s PIA17474. | Repaired against the primary-source page |

- [Cassini’s Saturn by Ringshine](https://science.nasa.gov/resource/saturn-by-ringshine/) and [Golden Night on Saturn](https://science.nasa.gov/resource/golden-night-on-saturn/) identify reflected ring light on the night side and unequal illumination of the two hemispheres. The light follows the historical Sun direction; a southern-season reference does not imply the south must always be brighter.
- The renderer replaces Saturn’s empirical shadow fill with a ring-area integral. It retains the existing ring-scattering approximation and albedo reconstruction. It does not claim calibrated Cassini radiometry or a full multiple-scattering atmosphere. Day/crescent/night comparisons use identical camera positions, exposure and source maps before and after.
- A 64 × 33 half-float lookup per epoch needs one texture sample on Saturn. All epoch maps are prepared during loading with a yield between epochs. Viewpoint changes bind cached maps; they never integrate the light again per frame.
- Twenty-four actual-profile quadrature comparisons against a denser 192 × 256 ring-area integration have a maximum channel irradiance difference below 0.001 in the model’s normalized units. This checks numerical convergence, not the physical accuracy of the underlying optical approximation.
- Four input cases first failed on v17 and then passed: immediate new keyboard turn, held keyboard thrust plus a new turn, held trigger plus a new stick/keyboard direction, and independent stick rearming. Browser checks also verify that a held menu-selection press does not become a photograph.
- 60 unit checks and keyboard / synthetic Xbox menu flows pass. The physical controller remains untested. Extended stability and final delivery checks are recorded alongside this release.

The ledger now contains 41 observed findings. Broader interface refinement (U03), material realism (V02), exhibition-length/hardware performance (V03), subjective listening (A01) and physical-controller validation (D03) remain open.

### 0.18 rendering stability

- One uninterrupted run completed 36 measurement windows over at least 972 seconds: nine scenes, four visits, alternating probe and chase view, at 1440 × 900 / DPR 2. All median frame intervals are approximately 16.7 ms. Earth and Titan chase retain slower 33 ms frames; this remains V03.
- After both cameras have visited every epoch, all 18 remaining records retain 20 geometries, 30 textures and 32 programs. No context loss or browser error occurred. Rendering/input source hashes match the delivered sources; the quiet-context presentation change is checked separately.
- The original harness incorrectly included first-use chase uploads in its stability assertion. It completed all windows and then exited at that assertion. The complete raw measurements are retained in `tests/endurance-v18-raw.log`; `docs/assess-endurance-v18.py` validates their sequence, source hashes and corrected post-warmup criterion. The reusable browser harness now applies that criterion and writes its report before asserting. This correction is reported explicitly rather than relabelling the original run as an unqualified test pass.

### 0.18 interface verification

- Quiet Earth and Saturn views clear repeated subject copy while bearings, flight review, continuation and independent photography remain available. Opening invitations still appear.
- The ring-reflection note appears on a suitable night-side view, expires from flight and remains in the Journal. Starting historical passage restores the title and elapsed-time caption. Screenshots were inspected and the interaction check reports no page errors.
- The standalone interface check uses the current photographic action and the actual elapsed-time passage caption; an unaligned opening view correctly offers no composed-observation hold button.

### 0.18 delivery verification

- 60 unit checks pass. Firefox 153 and Playwright WebKit 26.5 pass seven-view rendering, held-time attitude control, chart selection, actual audio output/mute and offline saved study restoration.
- An independently extracted package verifies all 69 offline runtime files against their source hashes, with zero external requests or browser errors. Photographs, star-chart controls, historical passage saves and Titan review restore offline. All four stereo tracks decode to 120 seconds; music seeks to the actual tail and loops, and archival video seeks to 10 seconds.
- A real v17 → v18 update restores the previous Titan position, velocity, fuel and review history, opens the ring-plane study offline, and isolates a recreated stale cache. The final ZIP is checked against the independently tested runtime and launchers.
- The package remains approximately 17.2 MB. Ring illumination adds about 118 KB of retained GPU texture data for seven historical epochs; no external assets are required.

## Seventh implementation pass — 0.19

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| C04 | The cloud-density and lunar-height fields occupy four-channel GPU textures although shaders read only one channel. | Upload their unchanged red channels as R8; inspect actual WebGL storage and compare the rendered pixels in three engines. | Repaired; identical pixels in Chrome, Firefox and WebKit; nominal mipmapped texture storage reduced by 138,364,782 bytes |
| C05 | The spacecraft shadow map is redrawn every frame even when its light direction and pose are unchanged. | Reuse only an exactly unchanged shadow; refresh on any pose/light change and after graphics-context restoration. | Repaired; 30 held renders trigger zero shadow draws; tiny turns, steering and epoch changes refresh correctly |
| C06 | Cloud samples calculate coordinates in empty vertical regions and trace sunlight where the solar contribution is zero. | Skip only mathematically zero-density or zero-sunlight work; retain extinction and all contributing samples. | Repaired; five whole-frame comparisons differ by at most 1/255 in a few channels |
| V08 | Uniform atmospheric steps poorly allocate samples across the steep lower-air density gradient. | Use twelve Gaussian samples for ground-facing rays; retain the established twenty uniform steps near the limb. Compare against a 160-step reference in five views. | Repaired within the existing scattering model; day, terminator and close-view error reduced; crescent/night results retained |
| V09 | Main-framebuffer adaptive resolution is remembered by epoch, so Moon/Earth and Io/Jupiter studies overwrite one another’s records and share recent frame measurements. | Key the record and reset measurements by encounter/study/passage, while leaving ephemeris dates unchanged. | Repaired; return visits restore distinct values and quality changes clear previous records |
| D07 | A paused scene has no invalidation after the graphics context is restored, leaving its image and cached indirect lighting stale. | Mark the frame, environment map and shadow cache dirty on restoration. | Repaired; v18 stays blank while paused after simulated restoration; v19 redraws the scene and its lighting |

- R8 preserves the exact measured scalar channel. Actual immutable GPU storage is inspected through WebGL calls. The saving is the nominal texture/mipmap allocation, not a claim that the entire browser process shrinks by that amount; decoded source images and driver overhead remain separate.
- Held shadow comparisons are pixel-identical to a forced redraw. A small pose tolerance was rejected because thin antenna depth comparisons exposed local differences; the shipped cache requires exact equality.
- Gaussian integration improves numerical agreement with this renderer’s dense reference, not with a calibrated spacecraft photograph. In the measured day, terminator and close views, atmosphere-region RMSE falls from about 0.586 / 0.534 / 0.437 to 0.270 / 0.294 / 0.261 on an 8-bit channel scale. The crescent and night cases retain their prior results.
- Cloud-density optimizations preserve all nonzero contributions. The daylight, terminator, crescent, night and close-view comparisons contain either identical pixels or isolated 1/255 channel differences.
- The fixed-resolution ABBA comparison uses the same held view at 1440 × 900 / DPR 2, full cloud quality, previous shaders/RGBA fields/per-frame shadows versus the shipped changes. Earth remains expensive at this density. The small frame-rate differences do not establish a substantial speedup; the verified gains are lower texture storage, fewer redundant shadow draws and more accurate atmospheric integration. Full-frame GPU-query values are retained as diagnostics; they are not added to partial-pass timings or treated as exhibition-machine certification.

The ledger now contains 47 observed findings. U03, V02, V03, A01 and physical-hardware validation in D03 remain open. Final compatibility, route, sustained-flight and delivery results follow below.

### 0.19 verification

- 60 unit checks pass. Five optional studies retain their physical reference frames, bounds, exact save/restore, rewind history and historical departures. Six historical nodes and five passages pass the scientific-experience check.
- Firefox 153 and Playwright WebKit 26.5 pass rendering, time hold / attitude, charts, real mixed audio output / mute and offline saved-flight/media checks. Chrome, Firefox and WebKit all report R8 allocations with pixel-identical red-channel rendering for both scalar fields.
- Graphics restoration was reproduced against an independent v18 extraction: while paused, its canvas remained blank with no redraw. Version 0.19 redraws the paused scene and rebuilds cached indirect light and shadows. This is a simulated WebGL reset, not a physical GPU-failure certification.
- The current uninterrupted rendering run lasts 360.7 seconds, covering nine scenes and four alternating probe/chase visits. All 18 post-warmup records retain 20 geometries, 30 textures and 32 programs. No context loss or browser errors occur. Earth has approximately 33 ms p95 intervals; the other sampled views are about 16.7–16.8 ms. High quality adapts its main render density; the source-map detail remains unchanged.
- The final rendering and scene-control source hashes are retained with the measurements. The separate fixed-resolution ABBA report captures the remaining full-density Earth cost; neither report establishes exhibition-machine frame rates.

### 0.19 delivery verification

- The independent extraction verifies all 69 offline runtime hashes with zero external requests or browser errors. Its photographs, solar chart, historical passage save, Titan study and persisted flight review remain usable offline.
- All four stereo tracks decode to 120 seconds; music seeks to the actual tail and loops. Archival video seeks to 10 seconds and returns ranged data correctly.
- The real v18 → v19 service-worker update preserves the previous Titan position, velocity, fuel and review history, opens the ring-plane study offline, and isolates a recreated stale cache.
- The final archive is checked entry by entry, and its runtime and launchers are compared byte for byte with the independently tested extraction.

## Eighth implementation pass — 0.20

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| U10 | Settings obscure the photographed scene, and sliders hide their numeric values. Exposure cannot be judged while adjusting it. | Use a narrow, unblurred settings overlay with live numeric values, native keyboard ranges, quality explanations and a clear Done action. Preserve the paused physical state and redraw only for picture changes. | Repaired; live exposure, paused state, persistence and compact controls pass in three engines |
| U11 | The controls reference calls Hold X / A a photograph command without distinguishing suggested observations from independent photography. | Name Photograph / P / Xbox left-stick click as independent capture; show Hold X / A separately as recording a suggested view. Remove repeated introductory filler. | Repaired; independent and suggested capture commands are distinguished |
| U12 | Custom buttons have little press feedback; pause lists give settings and flight actions the same emphasis, and blur hides the scene's detail. | Add a restrained press state, consistent row selection feedback and a quieter utility group. Preserve the sharp scene behind Pause. | Repaired; rendered views reviewed; keyboard and synthetic Xbox navigation pass |
| U13 | The fullscreen action keeps its old label after changing state. | Update its label and pressed state on the actual fullscreenchange event, including external exits. | Repaired; real fullscreen entry / exit updates the label and pressed state in all three engines |

The interaction changes apply [Apple's button guidance](https://developer.apple.com/design/human-interface-guidelines/buttons): explicit press feedback, adequate hit areas and a clear hierarchy of actions. The monochrome text-and-rule treatment is specific to Cosmos; no platform component styling or new typeface is imported. Settings are extracted into `src/ui/settings.js` so labels, numeric formatting and live updates share one implementation.

The redesigned settings, pause menu and controls reference were inspected in rendered screenshots. The standard 1440 × 900 view retains the Earth image at the right; compact settings preserve 44-pixel control targets. This is an interface pass. Planet shading, physics, historical data and music assets are unchanged.

### 0.20 interface verification

- Chrome 158, Firefox 153 and Playwright WebKit 26.5 apply live exposure, volume, feedback and look-sensitivity changes. Numeric and accessible values follow native keyboard adjustments and survive reloads.
- The same fixed Earth view brightens when exposure changes from 0.35 to 1.5. Position, velocity, orientation, fuel and local time stay exactly unchanged while Settings is open. After the changed picture is drawn, the static view stops rendering again.
- Settings controls retain at least 44 × 44 pixel hit areas at 1024 × 640 and 800 × 600. A WebKit intrinsic-select height issue found during review was corrected while retaining native option selection.
- Actual fullscreen entry and exit update the action label and pressed state in all three tested engines. Focus follows keyboard and synthetic Xbox controls; ranges, quality selection, review cancellation, focus trapping and closed-detail skipping pass.
- 60 unit checks pass. This pass makes no new frame-rate, calibrated-photography, subjective-listening or physical-controller claim.

### 0.20 delivery verification

- The independent extraction verifies all 70 offline runtime hashes, including the new settings module. Live exposure preview, photographs, the solar chart, historical passage saving and persisted Titan flight review work offline, with no external requests or browser errors.
- Four stereo music tracks retain their 120-second duration. Music reaches its actual tail and loops; archival video seeks to 10 seconds.
- A real v19 → v20 update retains position, velocity, fuel, study identity and flight-review history. The ring-plane study opens offline, and a recreated stale cache cannot replace the current application.
- Final runtime and launcher contents match the independently tested extraction. The rendering and passage sources match the measured v19 hashes; this UI release does not repeat or extend the earlier endurance result. Current interface source hashes are in `tests/interface-v20-source-hashes.json`.

## Ninth implementation pass — 0.21

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| A06 | A wall-clock timer pauses an outgoing score while the audio device is suspended, although its fade has barely progressed. Playback resumes with the outgoing part missing. | Retire channels against AudioContext time, suspend retirement checks with the device, and resume checking on state changes. Verify a long interruption and reselect an outgoing track. | Repaired; suspension, resume and outgoing-track reselection pass in Chrome, Firefox and WebKit |
| A07 | Square-root interpolation makes the fade's silent endpoints substantially steeper than the middle. | Use sine/cosine power interpolation, retaining the held gains and combined power across interrupted multi-track changes. | Numerical endpoint and power checks pass; listening review remains A01 |
| U14 | Sound settings show numeric volume without exposing the saved mute state, so moving a volume slider can appear ineffective. | Show an inline sound toggle and synchronize it with the keyboard shortcut, gamepad activation and saved preference. | Repaired; mouse, keyboard, synthetic Xbox, saved mute and compact layouts pass |
| A09 | WebKit permits the first score but rejects a new, lazily created media element during an automatic encounter change. | Prepare the four silent-gain score channels in the player’s initial start gesture; reuse them for later crossfades. | Repaired; all three engines select later tracks without another gesture and settle to one playing track |
| A08 | Firefox's fallback cancels future events but leaves an already-started value curve. A rapid new selection then throws when inserting a value inside that curve. | Use equivalent linear ramp segments in fallback engines, holding the current gain before replacing future segments. | Repaired; interrupted fades pass with Firefox ramps and native holding in Chrome / WebKit |

The v20 baseline reproduces A06 with an unchanged suspended audio time of 8.384 seconds. Its outgoing channel still has gain 0.983, yet the wall-clock timer has already paused it. The v21 test suspends audio for 8.1 wall-clock seconds, resumes the transition, then reselects an outgoing track during another interruption. This is a simulated AudioContext interruption, not a Bluetooth/headphone hardware test.

The timing change follows the [Web Audio specification's suspended-context semantics](https://www.w3.org/TR/webaudio-1.1/#dom-audiocontext-suspend). The fallback explicitly handles the limited availability of [cancelAndHoldAtTime](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/cancelAndHoldAtTime). Browser checks cover native holding and Firefox's fallback.

The fade retains its 7.5-second duration and 129 control points. At a silent endpoint, the first/last control-step amplitude changes from 0.08839 to 0.01227, an 86.1% reduction. This describes the gain envelope, not a measured improvement in musical preference. The authored four two-minute pieces and their compressed files are unchanged. Shared parameter-holding and fade scheduling now live in `src/audio-automation.js`.

### 0.21 audio verification

- 66 unit checks pass, including power interpolation, endpoint slope and native/fallback parameter holding.
- Chrome, Firefox and WebKit preserve the outgoing channel through an 8.1-second simulated device suspension. Immediately after resuming, the sum of active channel gain-squared values remains near 1; completed transitions settle to the selected track. Reselecting an outgoing track during suspension does not let a stale retirement deadline stop it.
- Chrome's rapid five-selection sequence settles to one track with four bounded channels. Saved mute, hidden-tab fade/recovery and actual tail-to-start loop playback pass.
- A 9.984-second capture of the actual browser mix after the limiter covers departure → rings. Its peak is approximately 0.2561, RMS 0.0416, with no non-finite samples or clipping. The separate Opus excerpt preserves that mix for review; it is not added to the game archive.
- Authored music and runtime media files remain unchanged. No claim of subjective audition or physical audio-device validation is made.

WebKit's automatic-selection check initially rejected `select('encounter')` with `NotAllowedError`, while the departure track kept playing. Preparing the four existing media channels during the start gesture allows the same automatic selection without another click. This follows WebKit's documented [per-element playback policy](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/). All preparation gains start at zero, and unselected channels pause as soon as preparation completes. The channel count remains bounded at four; no new score asset is added.

### 0.21 settings and initial-silence verification

The Settings sound switch exposes the saved mute preference beside the sliders. Its state follows mouse activation, keyboard B and synthetic Xbox A. Keyboard changes within Settings use that inline state instead of an overlapping toast. Controls retain 44-pixel targets at 1024 × 640 and 800 × 600; rendered compact views were inspected.

A cross-engine reload check reopened A03: Firefox could begin a same-time exponential target from gain 1 despite an explicit zero value anchor. A minimal browser reproduction measured gain 0.7418 after 100 ms for that schedule, while a target one sample later stayed at exactly zero. Initial gains are explicitly anchored and exponential targets begin one sample later. Chrome, Firefox and WebKit now retain exact zero music gain when continuing a muted saved session. Existing live exposure, physical-state hold, numeric values, fullscreen and saved settings checks also pass in all three engines.

### 0.21 delivery verification

- An independent extraction verifies all 71 offline runtime hashes. Exposure preview, the sound switch and keyboard state, photographs, the solar chart, historical-passage saves and persisted Titan review work without network access or browser errors.
- All four stereo scores retain their 120-second duration; playback reaches the tail and loops. Archival video seeks to 10 seconds.
- A real v20 → v21 update retains position, velocity, fuel, study identity and review history. Optional studies work offline, and a recreated obsolete cache cannot replace the current app.
- Final runtime files and launchers match the independently tested extraction. Rendering and passage sources match the measured v19 hashes. This release adds no new endurance or hardware-performance claim.
- Current source hashes are recorded in `tests/audio-v21-source-hashes.json` and `tests/interface-v21-source-hashes.json`. The repair list retains five broader open areas among its 56 findings.

## Tenth implementation pass — 0.22

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| E12 | Real millimetre-per-second-squared thrust is hard to perceive; the speed display may look unchanged while a jet is working, and the opening reference omits thrust. | Show actual accepted thrust acceleration and accumulated impulse during a command, then a short coasting readout. Separate time hold and exhausted model propellant. Add W/S and controller triggers to the brief reference. | Repaired; physical impulse, time hold, fine control, simulated Xbox input and review reset pass in three engines |
| V10 | Ring shadows on Saturn form jagged narrow bands. The old five samples combine pixel coverage and solar penumbra into one width and can exponentiate mip-averaged opacity. | Integrate transmitted light over a 3 × 3 pixel footprint and the existing finite-Sun kernel independently. Classify each full-resolution profile sample before filtering. Skip pixels whose footprints cannot intersect the rings. | Repaired within the existing optical model; three-view image comparison and seven-scene checks pass in Chrome, Firefox and WebKit |

### Propulsion feedback

The transient readout uses impulse returned by accepted physical integration steps. It excludes gravitational acceleration and rejected boundary-crossing steps. Fine control and analogue input retain their actual throttle, and held time delivers zero impulse. The readout reports accumulated thrust Δv, rather than claiming that the spacecraft's total speed changes by the same amount. Small values use mm/s so a short burn is visible without implying a boost. After release, the coasting result clears in 2.5 real seconds. Starting a new encounter or restoring flight review clears the previous burn.

The instrument occupies one line above the speed/time controls. It replaces the brief opening control hint while active, adds no button, and remains absent during historical passage. The model still uses its existing 0.889 N equivalent jet and finite fuel.

### Ring-shadow comparison

The shadow footprint uses a three-point Gaussian rule in each screen direction, with nine pixel samples. Each evaluates the existing five-point solar-width approximation. All samples use the original optical-depth profile before averaging transmitted light; mips of opacity are no longer exponentiated as though they represented mean transmission. Ring optical depth, illumination, planet maps and artistic exposure are unchanged. The extra samples run only where the expanded projected footprint can intersect a ring shadow.

At 800 × 500, isolated shadow images are compared with 4× renders of the revised integration. The globe edge is excluded, and the comparison covers the union of shadow pixels. RMS image error falls by 64.1% in the default encounter, 70.5% at the narrower 24° lens, and 61.8% in the ring-plane study. This is numerical convergence within the existing approximate optical model, not photographic calibration. `tests/ring-shadow-v22.mjs` and `docs/analyse-ring-shadow-v22.py` reproduce the comparison.

The physical reference remains the observed separation of narrow ring shadows, such as NASA's Cassini [Rings and Shadows](https://science.nasa.gov/photojournal/rings-and-shadows/) and [Narrow Shadow](https://science.nasa.gov/photojournal/narrow-shadow/) images. Those different-epoch observations support the visual phenomenon, not an exact match to the 1980 encounter.

Alternating baseline/current windows at 1000 × 625, DPR 2 and a 32° lens retain approximately 33.3 ms median / 33.4 ms p95 for both versions. The short comparison establishes no measured regression in that view; sustained performance remains V03.

### 0.22 browser and flight verification

- 68 unit checks pass. Chrome, Firefox and WebKit pass physical thrust-feedback checks, including 1× time, held time, fine control, simulated half-trigger input, release-to-coast, review reset and depleted model propellant. The displayed integrated impulse agrees with the propellant-derived rocket equation.
- All three engines render Earth, the Moon, Jupiter, Io, Saturn, the ring-plane study and Titan without browser or shader errors. Final flight and compact screenshots were reviewed.
- The scientific-experience check retains six historical nodes, five passages, free photographs and science, time-held momentum, exploration boundaries and saved historical passage.

### 0.22 delivery verification

- All 71 runtime files match an independently extracted offline package. Real key input displays the new thrust feedback offline; settings, photography, star charts, passage saves and persisted flight review also pass.
- A real v21 → v22 update preserves the physical save and review history, opens the ring-plane study offline, and isolates a recreated obsolete cache.
- Final runtime files and local launchers match the independently tested extraction. No runtime image or music asset was added. Earlier full-scene endurance and listening limitations remain open; this release verifies the explicitly described rendering windows and interaction changes.


## Eleventh implementation pass — 0.23

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| C07 | Holding time redraws the entire scene even after the camera has stopped. Released attitude input leaves a numerical tail, and repeatedly normalising an unchanged quaternion can oscillate its final bits. | Cache exactly unchanged physical views. Finish chase interpolation and pending reflections first; invalidate on pose, lens, exposure, resize, epoch and graphics recovery. Stop only a released rotation below 1e-12 rad/s. Keep input, science and audio updates active. | Repaired; held pixels and physical state are retained, fresh turns respond immediately, moving flight keeps rendering |
| C08 | High-quality Earth renders clouds and atmosphere through two full-resolution blend passes and two dense meshes, including on high-density displays. | Combine premultiplied cloud radiance with atmospheric scattering for full-budget high-density frames. Retain original shell coverage at ordinary density and reduced adaptive cloud budgets, plus foreground depth and full-resolution photography. | Repaired; eight fixed views pass in three engines, with one fewer draw and 73,216 fewer triangles in full-budget high-density layered views |

### Held views and responsive controls

A held view compares position, orientation and free look exactly against the last rendered values, without rounding the physical pose. Chase interpolation and pending environment lighting finish before caching. Changing the lens, exposure, display size or encounter invalidates the image. Input, contextual science, music and interface updates continue on animation frames. Skipped frames do not count as rendering headroom for adaptive resolution.

Only a released attitude-control tail below 1e-12 rad/s is snapped to zero; a nonzero command remains untouched. When angular velocity is zero, its quaternion is no longer multiplied and normalised again. Translational inertia, thrust, fuel, time compression and historical data are unchanged.

In the three-engine held-view check, a 1.2-second stationary window performs zero scene renders while still processing input and interface frames. Its canvas pixels are identical. Fresh keyboard rotation responds on the next processed frame in the recorded runs. The check also covers released turns, chase settling, a pending reflection update after a straight coast, live exposure, resize, continuing music/science, and rendering during ordinary coasting. This verifies reduced redundant work, not a measured battery-life percentage.

### Cloud and atmosphere composition

On the non-multisampled, high-density framebuffer, the former full-size cloud resolve and atmosphere blend become one premultiplied composition: atmospheric radiance plus cloud radiance attenuated by atmospheric transparency. The existing atmospheric opacity floor is retained. A full-resolution analytic shell check prevents resampled cloud colour leaking beyond the cloud layer. Cloud-volume integration, source maps, scatter parameters and exposure remain unchanged. Photographs and Ultra still use the existing full-resolution material path.

At 1000 × 625 with DPR 2, eight view pairs cover day, terminator, crescent, night, close approach, chase, foreground occlusion and capture. Chrome, Firefox and WebKit pass. The largest mean difference is 0.004035 on the 0–255 channel scale; the 99th percentile is zero in every pair. The largest isolated channel difference is 12/255 near the cloud silhouette, where the analytic support replaces the old polygonal shell. Capture pairs are exactly identical. Full images and native-resolution limb crops were inspected; these comparisons establish preservation of the previous rendered detail, rather than equivalence to spacecraft photography.

The full-budget high-density layered path removes one draw and 73,216 submitted triangles per view. The ordinary probe example changes from 7 draws / 292,866 triangles to 6 / 219,650; warmed chase changes from 12 / 313,256 to 11 / 240,040. The comparison warms both paths before measuring, excluding initial environment-map creation. See `tests/cloud-composite-v23-results.json` and the retained v22 compositor fixture.

The additional ordinary-density check initially found a 21/255 peak channel difference along a few cloud-edge pixels. Its cause was the loss of the original cloud shell's multisample coverage: a single fragment-level mask also blending the larger atmosphere cannot reproduce both boundaries independently. Multisampled framebuffers now retain the original separate cloud and atmosphere resolves. A separate reduced-cloud-grid check found up to 20/255 at isolated silhouette pixels after resampling. Reduced adaptive cloud budgets therefore also retain the original shell resolve. The combined path remains for the larger high-density target at its full cloud budget. Ordinary-density comparisons in all three engines are exactly identical; the high-density 0.75 cloud-budget comparison is also required to be identical. The established contour is preserved without weakening the comparison threshold.

### Measurement limits

The host had low-power mode enabled during this pass. Chrome and WebKit showed approximately 33.3 ms animation-frame intervals even on an empty page; removing expensive render stages did not change that cadence. Per-pass GPU query timing also perturbed the tiled workload. These diagnostics do not establish a frame-rate improvement, so this release reports draw-count, triangle-count, image-fidelity and idle-render evidence. Multi-hour operation and exhibition-hardware performance remain V03 and D03.


### 0.23 interaction and recovery verification

- 71 unit checks pass, including exact view invalidation and excluding idle frames from adaptive-resolution headroom.
- Chrome, Firefox and WebKit pass held rendering, pending reflection completion and seven-scene captures. Keyboard and synthetic Xbox menu actions retain their existing behaviour.
- Simulated graphics-context loss restores both the held Earth view and paused Titan chase view. Physical position, velocity, orientation and fuel are unchanged; the recovered scene returns to zero redundant draws.
- Six historical nodes and five passages retain their physical-time behaviour. Optional science, photographs, bounded exploration, time hold, saved passage and star-chart selection pass.
- Current source state is recorded in `tests/revision-v23-source-hashes.json`. No new full-duration endurance or hardware test is claimed.


### 0.23 delivery verification

- All 71 offline runtime files match an independently extracted package. Held-view caching, physical thrust feedback, Settings, photographs, the star chart, historical-passage saves and Titan flight review work offline without external requests or browser errors.
- All four stereo scores decode to 120 seconds. Tail-to-start looping and archival-video seeking pass.
- A real v22 → v23 update retains position, velocity, propellant, study identity and earlier review samples. The ring-plane study works offline, and a recreated obsolete cache remains isolated.
- No runtime image or music asset was added. Final runtime and launcher hashes are checked against the independently tested extraction when assembling the release.


## Twelfth implementation pass — 0.24

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| U15 | Independent photography is hidden behind P or Pause, while the visible flight action implies that every photograph requires a held, eligible observation. Each independent shot also forces a browser download. | Promote a labelled Photograph action with P / Xbox left-stick click, keep long exposures contextual, save normally to the journal, and provide a brief actual thumbnail with optional review. Downloads remain an explicit viewer/journal action, with a fallback when persistence fails. | Repaired; mouse, keyboard, synthetic Xbox, optional exposure, explicit export and unchanged physical flight pass |
| U16 | The photograph viewer reserves large document margins, reducing the scene to a smaller rectangle; its caption omits the recorded date. | Display the complete captured frame at the largest size that fits the viewport. Place title and controls at the edges, show capture date/range/lens, and retain science in the journal. | Repaired; 1440 × 900, 1024 × 640 and 800 × 600 views inspected; controls fit |
| E13 | A photograph taken during historical passage can be named after a hidden planetary body and retain the departure encounter date; an empty-space distance has no stated reference. | Classify passage frames as Deep space, use the actual playback date with historical/projected identification, and state that the distance is from the Sun. | Repaired; an advanced passage photograph matches its playback date and solar-distance reference |
| D08 | A closed browser database can throw during photography or journal reads. Rapid capture commands can overlap while a save is pending, and a capture exception can leave the action uncertain. | Keep a session copy, catch database failures, export a fallback image, coalesce commands while saving, and restore the action after a failed capture. | Repaired; delayed writes, a closed database, retained image review and injected capture failure pass |

### Design direction and concrete changes

The flight UI now exposes the action people can take with the view they have chosen. It uses the existing local Barlow and Sometype typefaces, text alignment and a single selection rule. The ordinary hold-to-photograph prompt is absent until the player deliberately records a suggested view; instrumental listening remains visible when relevant. No photograph or exposure is required to explore or continue the historical route.

NASA's [Eyes May release notes](https://science.nasa.gov/blogs/eyes/2026/06/02/may_release_notes/) document replacing an unexplained circular plus button with a labelled Learn More action and making an important sharing control prominent. The applied principle is explicit, readily located actions. Cosmos implements its own typography and layout; it imports no interface asset or artwork from that reference.

A successful capture stays in the journal and briefly shows its actual image, without pausing flight or starting a browser download. The receipt opens the saved image and normally clears after 6.5 seconds. Hover or keyboard focus keeps it in place. Bearings account for the receipt's occupied area. The free shutter remains available without an eligible scientific observation, including during historical passage. Xbox left-stick click takes a photograph; Journal remains available through Pause. P and the on-screen action do the same thing.

The viewer fits the whole recorded image to the viewport, without cropping it. Title and controls sit at the edges over shallow contrast fades; exported image pixels are unchanged. The short caption names the recorded date, distance and lens. Longer science remains available with the image in the journal. Original image and audio assets, physics, ephemerides and rendering shaders are unchanged.

### Verification scope

The photography flow covers normal storage without automatic downloads, deliberate export, actual image review, keyboard and synthetic Xbox capture, pending-write coalescing, an image retained while its receipt is focused, receipt expiry after focus leaves, unprompted views, passage metadata, optional long exposures, compact controls and storage/capture failures. Physical Xbox hardware remains D03.

The closed-database case is a deliberate fault injection. It confirms that the captured frame stays accessible for the session and that a fallback download is triggered; it does not promise persistent storage when the browser refuses it. The screenshot viewer uses the same full-resolution capture as the previous release. UI screenshots, seven scene captures, offscreen bearings, keyboard/controller menus and the six-node/five-passage scientific regression accompany this pass. The unit suite remains 71 checks.


### 0.24 delivery verification

- Chrome, Firefox and Playwright WebKit pass the full photography flow, including injected capture/storage failures, passage metadata and all seven rendered scenes. Three viewport sizes were inspected, including 800 × 600. Keyboard and synthetic Xbox menus, offscreen bearings, six historical nodes and five passages pass. All 71 unit checks pass.
- An independent extraction verifies all 72 offline runtime files and the visible shutter, actual photograph viewer, physical flight, Settings, star chart, saved historical passage and persisted Titan review. Normal captures trigger no automatic download. No external requests or browser errors occur.
- All four stereo scores decode to 120 seconds; actual tail-to-start looping and archival-video seeking pass. No new listening evaluation is claimed.
- A real v23 → v24 update retains position, velocity, propellant, study, review history and a previously stored photograph byte for byte. The ring-plane study works offline, and a late obsolete cache remains isolated.
- Current changed-source hashes are recorded in `tests/revision-v24-source-hashes.json`. Final runtime and launcher hashes are compared with the independently tested extraction. Media, rendering and physical-flight modules retain their prior content; no new FPS or photographic-equivalence claim is made.


## Thirteenth implementation pass — 0.25

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| E14 | Science uses a horizontal-angle shortcut even at vertical viewport edges; a prior caption can remain after its subject has left the picture. | Test the spherical body against the complete rectangular field of view, including corners and visible limbs. Keep captions attached to the current topic and clear them when it leaves. | Repaired; Chrome, Firefox and WebKit context and photography checks pass |
| U17 | Hidden instruments still consume science notes, and a momentary caption is immediately saved as seen. H also places a confirmation message over the clean view. | Suspend discovery while the HUD is hidden, allow interrupted notes to return after a new dwell, and record a note only after four visible seconds. Remove the redundant visibility confirmation and clear earlier transient feedback when hiding the HUD. | Repaired; Chrome, Firefox and WebKit context and photography checks pass |
| E15 | Independent photography requires the body centre to be inside the image, so a clearly visible planetary limb can be labelled Deep space. | Share the rectangular framing geometry with science, preserve centre-ray occlusion checks, and rank visible bodies by angular prominence. Keep empty-space captures unnamed by an offscreen planet. | Repaired; Chrome, Firefox and WebKit context and photography checks pass |
| U18 | When a planetary centre leaves the viewport but its limb remains visible, the bearing falls back to an edge marker over the visible world. | Keep visible partial worlds in the resolved-bearing layout, using the perspective-correct spherical silhouette bounds and existing interface avoidance. | Repaired; seven scenes, partial-world placement, offscreen/occulted targets and compact layouts pass in three engines |

### Context and quiet exploration

The science overlay remains automatic and optional. It introduces no action button, completion gate or extra tutorial. A two-second steady view makes a relevant note eligible after the opening invitation. A note stays for up to eleven seconds while its topic remains in view. Four visible seconds add it to the journal; this is an opportunity to read, not a claim that the player has read it. Turning away sooner or hiding the HUD leaves it eligible for a later visit. Existing saved notes stay intact.

Framing finds the closest ray in the actual rectangular viewport to a spherical body's centre. It checks the interior, four edges and corners, then compares angular separation with the body's angular radius. This fixes both the vertical false positive and the off-centre-limb false negative. Science requires a small visible penetration to avoid a caption caused by a grazing sliver. The check is a geometric approximation using the body's existing spherical radius and centre-ray occlusion; it does not classify individual surface features, ring-only images or the exact visible fraction of a partially occulted body. Bearing placement uses tangent planes to bound the off-axis projected sphere; it stays just beyond the visible limb instead of being displaced by an overly large angular radius. Rendering, physical flight and recorded images remain unchanged.

### Evidence

The prior guide reproduced an Earth caption after turning away and while disabled, and marked it seen at first display (`tests/context-v25-before.json`). Unit coverage now includes vertical and corner exclusion, partial-limb visibility, field-of-view changes, interrupted notes and disabled guidance. The older exploratory-science test now allows the explicit visible reading interval before checking the journal.


### 0.25 interaction verification

- All 77 unit checks pass, including analytic tangent-ray bounds and the note lifecycle.
- Chrome 158, Firefox 153 and Playwright WebKit 26.5 pass interrupted notes, hidden-HUD dwell, four visible seconds before journal persistence, vertical exclusion and partial-limb photography. The normal free-shutter, explicit export and storage-failure flows also pass in all three engines.
- After the final perspective-bound adjustment, a dedicated three-engine bearing pass covers seven scenes, the same clipped Earth view, behind-camera and occulted targets, guidance toggling, compact layout and a screen-filling world. The clipped Earth's label sits just below its actual visible limb; screenshots were inspected.
- Keyboard and synthetic Xbox menus, six historical nodes and five passages pass. Physical position, velocity and propellant are preserved during the new reading/photography checks. Actual Xbox hardware remains unverified.
- No scene asset, render shader, audio source or physical-flight module changes in this revision. Source hashes are recorded in `tests/revision-v25-source-hashes.json`; no new frame-rate or photo-realism claim is made.


### 0.25 delivery verification

- All 73 runtime files match the independent offline extraction. Free photography, full-frame review, Settings, chart navigation, held-view caching and persisted historical/Titan flight review pass without external requests or browser errors. All four 120-second stereo scores decode; actual music looping and archive-video seeking pass.
- A real v24 → v25 update preserves position, velocity, propellant, study identity, review samples, saved science-note IDs and an existing photograph byte for byte. Offline reload and obsolete-cache isolation pass.
- Final archive hashes, runtime files and launchers are compared with the tested extraction. No image, music or renderer asset is added. Subjective listening, physical Xbox, actual Safari, material realism and exhibition-hardware validation remain open.


## Fourteenth implementation pass — 0.26

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| V11 | The lunar study contains a black streak on the illuminated limb. Height lookups use implicit texture derivatives within a pixel-varying shadow branch. | Sample the measured height field at an explicit native mip level for both ray origin and occluders. Preserve the fourteen-sample runtime ray and the same geometry/normal maps. | Repaired; the old defect reproduces and the correction passes in Chrome, Firefox and WebKit |
| V12 | The lunar colour texture uses the older 2019 visualization map, with weaker colour retention and polar coverage than NASA's updated edition. | Encode the published December 2025 4K sRGB map at the same dimensions and codec quality, without additional palette or sharpening changes. | Five matched views inspected; new map is 80,908 bytes smaller |

### Diagnosis and correction

The lunar black streak remains visible with the normal map and disappears when terrain shadows are disabled; flat unlit geometry is intact. Retaining the old fragment shader reproduces it at the same camera pose. The shader's implicit height lookups sit inside the non-uniform local-solar-elevation branch. The [Khronos specification](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf) leaves those implicit derivatives undefined. Explicit level-zero sampling gives every ray a consistent height field and removes the observed streak. The runtime still traces fourteen heights and retains measured terrain at its original scale.

A 128-sample ray over the same distance interval supplies a denser numerical comparison. A fixed bright-side patch and five small camera turns distinguish the streak from genuine crater shadow. Illuminated lunar-region errors are recorded separately. This verifies the sampled model's behaviour; it does not calibrate the model against spacecraft photometry or remove the limits of the coarse height field.

### Lunar imagery

[NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/) supplies the updated colour mosaic. Its sRGB profile is checked; the 4096 × 2048 delivery image uses 8-bit AVIF at the existing quality setting. The shader's surface gain and the measured terrain/normal assets stay unchanged. Five matched views cover the existing study, close approach, a near-full view, crescent and polar illumination. Source and output hashes, encoding and size are recorded in `docs/lunar-color-v26.json`.

These are processed visualization mosaics with publisher white balance and polar fill. The newer edition improves source colour retention and polar detail, while reducing the delivery texture from 1,138,093 to 1,057,185 bytes. It is not an unprocessed historical Voyager image.


### 0.26 verification

- Chrome 158, Firefox 153 and Playwright WebKit 26.5 each reproduce ten false dark pixels in the selected bright-side patch with the retained shader and zero with the correction. Five small turns retain zero false-dark pixels against the denser reference. Runtime draw count remains seven in this scene.
- Close, near-full, crescent and polar views are retained for review in all three engines. The shared surface shader also passes all seven standard scene captures.
- `tests/lunar-shadow-v26-metrics.json` records illuminated lunar-region RMS and mean absolute error against the 128-sample height ray, using the same new colour map for both shaders. This separates the shadow correction from the source-image update.
- 77 unit checks, keyboard/synthetic Xbox menus, six historical nodes and five passages pass. No FPS gain, hardware controller validation or spacecraft-image equivalence is claimed.


The illuminated lunar-region RMS error falls by 63.6–64.1% across the three engines against this numerical reference. This does not measure equivalence to a camera photograph or establish an FPS gain.

### 0.26 delivery verification

- All 73 runtime files match an independently extracted package. The corrected lunar bright-side sample remains lit offline, and the new lunar view is captured from that extraction. Photography, settings, star chart, held-view caching, saved passage and persisted Titan review pass with no external requests or browser errors.
- All four stereo scores decode to 120 seconds; actual tail-to-start looping and archive-video seeking pass.
- A real v25 → v26 update preserves physical state, study identity, review samples, science-note IDs and a previously captured image byte for byte. Offline reload and obsolete-cache isolation pass.
- Final archive hashes and launchers are checked against the tested extraction. The only runtime changes are the lunar texture, the surface shader's two height lookups and the source-credit line. Broader realism and physical-device/listening checks remain open.


## Fifteenth implementation pass — 0.27

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| U19 | The encounter page pushes continuation and flight review below the viewport; local studies and explanatory copy make the problem worse on smaller desktop screens. Current bearing selection is also unclear. | Keep voyage actions in a persistent footer, fit the atlas to the viewport, separate the chart and exploration choices, shorten repeated copy, and mark the selected bearing. Scroll extra compositions within their own region. | Repaired; all primary controls fit in 72 desktop scene/viewport/engine combinations; flight and study transitions pass |
| U20 | Resizing the SVG chart also shrinks its labels to roughly 8–9 screen pixels. Enlarging names alone can collide with neighbouring names or grid numbers. | Keep body names at 14 screen pixels and scale labels at 11; recompute collision avoidance at the current projection scale and give names precedence over conflicting grid numbers. Release the resize observer on every panel transition. | Repaired; 36 solar scale/viewport/engine combinations retain readable, non-overlapping names and ticks; observer cleanup passes |

### Interface and behaviour

- The atlas title names the encounter or study; the right column distinguishes locating a subject from beginning a separate viewpoint. Existing physical distances and projected positions retain their linear scale.
- Continue, flight review, revisit and return-to-main-encounter actions live at the bottom of the atlas, also when switching to the solar chart or voyage timeline. Passage and title-screen views offer the appropriate return action.
- At desktop sizes, the chart uses the available height and additional compositions scroll in the adjacent inspector. At narrow widths, one scroll region contains the stacked chart and inspector while the footer stays available. Focused controls scroll into view.
- The solar inspector uses a compact two-column distance/light-time readout and a readable object list. All six voyage entries fit at 1024 × 640. Selecting a subject changes its bearing without changing physical state.
- No textures, geometry, lighting, flight integration, ephemeris data or sound sources change in this revision.

### 0.27 verification

- `tests/atlas-v27-before.json` reproduces 54 below-viewport primary-control occurrences across 24 Chrome desktop scene/viewport cases in v26. `tests/atlas-v27-results.json` records zero hidden primary controls in 24 cases per engine: Chrome, Firefox and Playwright WebKit. The measured controls are at least 44 pixels high.
- `tests/atlas-labels-v27-results.json` checks local names and 12 solar scale/viewport combinations per engine, including actual screen font sizes, pairwise name/tick overlap and observer release. World coordinates and the linear chart scale remain unchanged.
- Actual clicks cover setting a bearing, solar object selection, optional studies, return to the main encounter, continuation and passage return. Keyboard and synthetic Xbox menu checks pass. Physical Xbox remains unverified.
- 77 unit checks pass. Earlier rendering and audio reports retain their original revision scope; no new visual-material or listening claim is made here.

### 0.27 delivery verification

- The independently extracted package works offline with all 74 runtime-file hashes matching. Its compact atlas footer is visible and local body names measure 14 screen pixels. Flight, held-view reuse, settings, photographs, saved passage, Titan study/review, all four music tracks and media seeks pass with no external requests or browser errors.
- A real v26 → v27 service-worker update preserves physical state, study identity, review samples, science notes and a previously captured image byte for byte. Obsolete-cache removal and late-stale-cache isolation pass.
- The final archive is rebuilt with these reports. Every archive entry is hashed; final runtime files and launchers match the independently tested extraction. `dist/release-review.json` records current scope and remaining broader work.


## Sixteenth implementation pass — 0.28

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| E16 | During historical passage, the solar chart retains the departure date and planet/Voyager positions; the instrument signal time also uses departure Earth. The title-screen chart can mix the previous encounter with its decorative camera. | Derive passage chart positions from the current playback Julian date, reuse Voyager's existing trajectory, supply compact JPL planetary vectors, and use current Earth for signal distance. Keep encounter snapshots and title-screen context explicit. | Repaired; independent ephemeris samples and passage-state checks pass; final browser/delivery results recorded below |
| U21 | Selecting a distant body can leave it outside the current solar-chart extent, with no visible position. The probe has no visible trail connecting its current location to earlier travel. | Fit a newly selected offscreen subject, retain deliberate scale choices, add a 100 AU extent, and show the historical trail ending at the current Voyager position during passage. | Repaired; selection, manual scale retention and projected trail checks pass |

### Evidence and scientific scope

- The retained v27 reproduction opens a voyage on 21 May 2001: flight position is 81.156 AU from the Sun, while the chart still displays 14 February 1990 and 40.4 AU. See `tests/transit-chart-v28-before.json` and its captured view.
- `assets/chart-ephemeris.bin` contains geometric heliocentric ICRF positions and velocities from [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/). Queries explicitly select UT, kilometres/seconds, the Sun as origin and no light-time correction, following the [Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html).
- Eight planets use uniform samples across the full mission interval: Mercury every two days; Venus/Earth eight; Mars sixteen; the giant planets thirty-two. Cubic Hermite interpolation uses both positions and velocities. The compact encoding stores positions in 10 km units and velocities in 1 mm/s units, in 405,399 bytes total.
- Separate Horizons requests provide 32 interval-interior epochs plus the seven encounter/study epochs for each planet. All 312 sampled position comparisons are below 800 km; the largest is approximately 772 km. This is measured interpolation agreement for a solar-system chart, not a global error bound or navigation-grade claim. Source hashes, exact query parameters and independent records are retained.
- Voyager keeps its original full-precision sampled trajectory. Encounter gravity, relative velocities, local reference frames, study epochs, boundaries, imagery and audio remain unchanged. The encounter chart still identifies its reference epoch and uses the player's flown position; it does not imply fully time-evolving planetary dynamics during a local study.
- The passage trail projects the existing three-dimensional trajectory onto the ecliptic; height remains in the inspector. A selected far body becomes visible by changing chart extent, never by relocating it or enlarging astronomical distances. Explicit scale changes remain manual.
- The flight instrument and passage chart calculate geometric one-way light time from Earth at the same simulation date. This is distance divided by light speed, not a retarded-position radio-link solution.


### 0.28 verification

- 81 unit checks pass, including all 312 independent JPL comparisons, fifteen passage epochs on Voyager's original curve, encounter/title context isolation, trail endpoints and selection extents.
- The three-engine passage check covers five legs at 10%, 50% and 90% progress: dates, solar/Earth distances, geometric light time, visible probe marker, trail, matching instrument readout and unchanged paused flight. It also checks far-body selection, deliberate narrowing, reopened manual scale and title-screen context.
- The atlas layout regression retains 24 desktop scene/viewport cases per engine; selected controls stay reachable. Label checks cover five scales at three viewport sizes in all three engines, retaining screen text size and non-overlap.
- Keyboard and synthetic Xbox menu checks pass. Six nodes, all five historical passages, finite fuel, boundaries, time hold and saved passage recovery pass the scientific-experience regression.


### 0.28 delivery verification

- The independently extracted final-runtime package works offline with all 77 runtime hashes matching. Its 21 May 2001 atlas displays 81.2 AU, a 100 AU extent, 20/50/80 AU rings and the historical trail; no external requests occur.
- Flight controls, held-frame reuse, settings, photographs, saved passage, Titan review, lunar detail, four stereo scores and actual media seeks remain functional offline.
- A real v27 → v28 update preserves the physical save, review history, photographs and science notes. The newly added ephemeris and passage atlas work offline after updating; old cache cleanup and late-stale-cache isolation pass.
- The final archive includes source provenance and current reports. Every entry is hash-verified, and runtime files plus launchers match the independently tested extraction. The release summary is `dist/release-review.json`.


## Seventeenth implementation pass — 0.29

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| V13 | Four midpoint sunlight samples treat cloud density as constant through each ray segment. They miss thin cloud tops and over-brighten some low-Sun edges; simply doubling samples raises rendering cost. | Integrate the existing vertical density profile analytically within each of the four segments, retaining one weather lookup per segment, twenty view samples and the same measured texture. Compare against a 128-sample sunlight reference, including small camera turns. | Repaired within the existing cloud model; image and cost evidence below |

### Cloud-light integration

- Keep the original 1.4–9 km cloud support, coverage map, optical-density interpretation, scattering, atmosphere and view integration. Each sunlight segment still uses its midpoint's weather value. The repair integrates the vertical smoothstep profile over its endpoint heights, including clear portions above and below the column.
- Reuse the previous segment's endpoint height. A short constant-height case avoids dividing two nearly equal heights; empty segments retain their early exit. No additional images, textures, framebuffers, meshes or draw calls are introduced.
- The dense reference uses the unchanged v28 cloud density with 128 quadratic midpoint sunlight samples. It tests numerical agreement within this approximate reconstruction. The two-dimensional weather map does not supply measured three-dimensional clouds, and close-view realism remains V02.
- Eight fixed views in each of Chrome, Firefox and Playwright WebKit cover day, terminator, crescent, night, close, grazing and two small yaw offsets. All visible-cloud cases reduce mean and root-mean-square reference error; night remains unchanged. Chrome mean channel error falls approximately 97% in the day view, 85% at the terminator, 91% in the close view and 37% in the grazing view. Some individual near-horizontal pixels retain sizeable error.
- Experimental four/six-point Gaussian and split-layer quadratures were compared before selection. Doubling midpoint samples was also measured and rejected for its higher cost. Experimental reports remain in the workspace; the delivered test compares the actual final source with the retained old shader.

### 0.29 verification

- `tests/cloud-light-v29-results.json` records 24 view/engine comparisons and unchanged draw counts. `tests/cloud-cost-v29-final-results.json` records alternating old/new whole-frame GPU timing windows at a fixed 1280 × 800 resolution. Timings are local measurements, not a frame-rate guarantee.
- The two old/new GPU-window median averages are 41.21 → 42.97 ms for the day view and 38.27 → 39.63 ms for grazing. Each window contains sixty measured renders after twenty warmup renders. The approximately 4% local increase is the measured accuracy tradeoff; draw count, geometry and texture allocation stay fixed. This does not establish sustained exhibition-device performance.
- The high-density cloud/atmosphere composite passes eight views in all three engines, including foreground occlusion, chase view and full-resolution photography. Full-frame composite mean difference stays below 0.004 / 255 against the retained separate-shell compositor; captured photographs match exactly.
- All 81 unit checks pass. Seven standard scenes render without browser/shader errors in Chrome, Firefox and Playwright WebKit (21 scene/engine cases). The runtime hash comparison confirms that only the rendering shader changed among the 77 runtime files; flight, charts, imagery and audio retain their v28 bytes.

### 0.29 delivery verification

- An independently extracted package runs offline with all 77 runtime hashes matching. Physical flight, thrust feedback, held-view caching, settings, the passage atlas, photographs, saved transit and Titan study/review pass with no external requests or browser errors.
- All four stereo scores decode to 120 seconds. Actual music tail-to-start looping and archive-video seeking pass. The lunar bright-side regression remains corrected offline.

- A real v28 → v29 update preserves the physical save, study review, photographs and science-note history. Upgraded studies and the passage chart work offline; obsolete-cache cleanup and late-stale-cache isolation pass.
- The final archive includes current reports and the retained v28 shader. Every entry is hash-verified; final runtime and launchers match the independently tested extraction. The complete release scope is recorded in `dist/release-review.json`.


## Eighteenth implementation pass — 0.30

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| U22 | The controls reference repeats keyboard and Xbox mappings side by side, covers the whole scene and pushes important explanations below the viewport. | Show one selected device, group flight and camera/time controls, place less frequent commands in More controls, and keep the return action visible. Use a wider two-column reference on short desktop screens. | Repaired; both devices and three viewport sizes pass in Chrome, Firefox and WebKit |
| U23 | Journal thumbnails are cropped and each photograph repeats export/remove controls. Long science passages compete with browsing the collection. | Present uncropped photographs in a responsive contact sheet with one target per image; move image actions into the full-frame viewer and provide a separate Field notes view. Keep all existing science and historical media available. | Repaired; six full photographs fit at 1280 × 800; notes, old discoveries and photograph-specific science are retained |
| U24 | Returning from the photograph viewer selects the image originally opened, even after browsing to a later image. Linear navigation also fails to match a multi-column photo layout. | Return to the currently viewed photograph, reveal it within the scrolling collection, and move keyboard / controller focus by the actual responsive grid. Keep a route back to tabs and the return action. | Repaired; current-image focus, two/three-column navigation and synthetic Xbox checks pass |
| D09 | Removing a photograph has no recovery action. A database failure silently completes the remove request without distinguishing failure from success. | Keep the latest removed image available for session Undo; only discard the in-memory image after a successful persistent deletion. Report failure and preserve the original frame. | Repaired; removal/Undo preserve the exact image bytes; a closed-database check retains the original |

### Design decisions and scope

- Follow [Apple's collection guidance](https://developer.apple.com/design/human-interface-guidelines/collections): a regular image grid for photographs, readable text for notes, and clear focus space around items. Follow [Xbox XAG 112](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112) for navigation that follows the visual arrangement and consistent ways to leave a submenu. These are applied design references, not a claim of full guideline compliance.
- The prior journal showed two complete photo controls at 1280 × 800, nineteen buttons/links and a 3,302-pixel document. The revised reference case shows six complete photo controls inside the visible scrolling region, ten buttons and a fixed footer. Real photos retain their full aspect ratio; no thumbnail crops are introduced.
- Export and Remove appear after opening a photograph. Undo retains the latest removed frame for the current session. A subsequent removal replaces that recovery item; reloading clears the session recovery item. Existing image bytes and the browser database format remain unchanged.
- The journal combines old task discoveries, current contextual notes and unique photograph-specific text. Source archive images and instrument recordings remain in the appropriate notes. No encounter or observation is required to use either view.
- Control reference content is separate from runtime orchestration. The obsolete in-flight guide's journal renderer and replaced gallery-layout rules are removed. Flight integration, historical positions, rendering and sound are unchanged.

### 0.30 verification

- `tests/journal-guide-v30-results.json` covers both control devices at 1280 × 800, 1024 × 640 and 800 × 600 in all three engines, plus photo layout, actual keyboard/synthetic-Xbox movement, current-photo return, exact export/Undo bytes, retained science, failure recovery and unchanged paused physical state.
- The old presentation is recorded in `tests/journal-guide-v30-before.json`. Chrome screenshots show the before/after journal, the notes page and the compact/regular controls layouts.
- All 83 unit checks pass. The two added data-retention checks verify all legacy mission texts/details and attached archives/recordings, plus deduplication of repeated photograph-specific science.
- Undo persists across reload in all three engines. A closed-database removal also preserves an older image with no prior in-memory capture copy; the failed transaction leaves the stored image intact and restores a session copy.
- Keyboard/synthetic Xbox menu regressions and three compact photograph-viewer layouts pass. All three engines also pass the actual contextual-science flow through to the new Field notes tab, including interrupted reading, hidden guidance and visible-limb photography. Delivery results follow below.


### 0.30 delivery verification

- An independently extracted package runs offline with all 79 runtime hashes matching. The new device reference and journal tabs work, and thumbnails retain their complete images. No external requests occur.
- Existing physical flight, feedback, held-frame reuse, live settings, solar chart, photographs, saved transit and Titan review pass. Four stereo scores decode to 120 seconds; actual looping and archive-video seeking remain functional.
- A real v29 → v30 upgrade retains the prior physical save, Titan review history, science-note IDs and a photograph byte for byte. Upgraded study navigation and the passage chart work offline; obsolete-cache cleanup and late-stale-cache isolation pass.
- The final archive includes current reports. All archive entries are hashed, and final runtime/launcher bytes match the independently tested extraction. `dist/release-review.json` records current scope and remaining broader work.


## Nineteenth implementation pass — 0.31

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| U25 | Fine control, a clean flight view and instrument readings largely depend on keyboard shortcuts. The Xbox reference has no usable menu route to these features. | Add saved Fine control, Flight interface and Route guidance switches plus Flight instruments to Settings → Flight. Keep Menu / Escape working with the interface hidden and synchronise shortcut/menu state. | Repaired; three-engine synthetic Xbox-only navigation, persistence and actual-thrust verification passed |
| U26 | Sound, picture and flight settings share one long form; instruments replace the whole scene and have no consistent route back to their origin. | Separate settings into three concise pages with a persistent footer; move focus horizontally with their displayed order. Show readings beside the scene and return to the same settings control, or directly to flight when opened with I. | Repaired; all three pages and instruments fit three viewport sizes in three engines; state-preserving return and live preview checks passed |
| D10 | The README still describes a fixed passage chart and omits the 100 AU scale introduced in 0.28. | Describe the current date-dependent planetary ephemeris and distinguish it from fixed local-study positions; state the geometric light-time calculation. | Repaired; documentation checked against chart state and available extents |

### Design decisions and scope

- Apply [Xbox XAG 112](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112) to predictable digital navigation, consistent back actions and reachable configuration. Tabs move horizontally; hidden pages stay outside the focus order. The footer stays in place. This applies selected navigation principles, not a full accessibility certification.
- Retain the existing narrow typography and restrained text controls. Each setting has one label, its current value and a short explanation where useful. The spacecraft view remains visible; no new imagery, fonts or sound files are added.
- Flight preferences use the existing voyage save and existing precision/guidance/HUD behaviour. Changing a switch immediately updates the visible interface without advancing physical flight or marking science notes as read.
- Instruments use the existing physical readouts and current passage date. Local studies show six readings; passages omit local propellant, encounter time and applied thrust. Instrument UI is extracted from the main action handler.

### 0.31 verification

- `tests/flight-options-v31-results.json` covers Chrome, Firefox and Playwright WebKit. A synthetic Xbox-only flow reaches all flight switches and instruments, recovers a hidden interface, and returns to the same settings entry. Keyboard shortcuts and saved preferences remain synchronised after reload.
- The 27 settings page/viewport/engine cases and nine instrument layouts fit at 1280 × 800, 1024 × 640 and 800 × 600. Visible controls retain at least 44-pixel targets. Captures are inspected separately from geometric checks.
- Opening settings/instruments and changing options preserves position, velocity, attitude, propellant, encounter time and science-read state. The actual thrust test measures approximately 0.218 mm/s² with Fine control and 1.091 mm/s² with standard control. The propulsion code is unchanged.
- `tests/settings-v31-results.json` verifies live exposure, saved sound/quality/sensitivity, keyboard mute sync, native fullscreen where exposed, unchanged paused flight and stopped rendering after a static adjustment in all three engines.
- All 83 unit checks pass. The keyboard/synthetic Xbox menu regression also passes. The runtime comparison identifies five changed UI/orchestration files including the new instrument module; physics, ephemerides, rendering and audio retain their v30 bytes.

- A screenshot preview appeared to omit menu text. Original-pixel inspection and repeat captures show complete titles, controls and footers; the page/footer pixel regions match exactly. No runtime change was made for this inspection (`tests/settings-visual-v31-results.json`).

### 0.31 delivery verification

- An independently extracted package runs offline with all 80 runtime hashes matching. Settings → Flight and its instrument/back flow work offline alongside the existing photography, atlas, Titan review, lunar detail and saved-passage checks. No external requests or browser errors occur.
- Four stereo scores decode to 120 seconds, loop successfully and retain archive-video seeking. The active physical model and renderer are unchanged.
- A real v30 → v31 upgrade preserves saved position, momentum, fuel, Titan review, photographs, science-note IDs and non-default fine-control/guidance/interface preferences. New settings and instruments work offline after the upgrade; cache cleanup and stale-cache isolation pass.
- The final ZIP includes current reports. Every entry is hash-verified; final runtime and launcher bytes match the independently tested extraction. `dist/release-review.json` records the release scope and remaining broader work.


## Twentieth implementation pass — 0.32

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| V14 | Cloud minification estimates an elongated pixel footprint from two offset mip reads. Its direction can be wrong, and the mip plus tap separation blur the same extent twice. | Find the footprint's principal axes from its full screen derivatives. Let the mip cover the short axis and use two symmetric samples for the remaining long-axis variance. Blend back to the established magnified-texel method near 1:1 sampling. | Repaired within the existing cloud model; spatial reference and small-turn checks pass in three engines |
| C09 | Cloud samples above each column's own top still compute optical depth before returning zero. Sunlight segments fully above that top likewise evaluate an empty density integral. | Skip these mathematically empty parts after the existing weather lookup. Keep the same contributing samples, density profile, lighting, source imagery and geometry. | Repaired; empty-work-only pixels stay within one 8-bit channel value; complete-frame cost is recorded below |

### Design decisions and scope

- Cloud imagery remains the same credited 8192 × 4096 map. The runtime still uses two view-density texture reads, twenty view steps, four sunlight segments and the same one-channel GPU storage. It adds no generated weather or sharpening.
- Use the pixel-footprint model described in [Physically Based Rendering, Image Texture](https://pbr-book.org/3ed-2018/Texture/Image_Texture) as a filtering principle. This project's approximation uses the covariance of the screen-to-texture Jacobian to orient two samples; it is not the book's full EWA filter.
- For squared principal widths L and S, the mip width squared is max(S, L/4). The symmetric sample offsets supply the remaining major-axis variance, (L − width²)/12. Thus the mip and taps have different work; nearly isotropic footprints do not receive a redundant directional blur. Align the axis sign before blending with the near-view filter to avoid cancellation at the crossover.
- Magnified texels retain the established area average. Minified texels smoothly adopt the new footprint between one and two source texels per pixel. Sunlight-segment mip selection is unchanged. The runtime uses ordinary explicit-mip reads on all three engines; it adds no anisotropic-sampler capability requirement.
- Native anisotropic-sampler experiments improved static detail but introduced a small Firefox temporal-reference regression. Wider and mixed variants did not remove that tradeoff. The selected explicit two-sample footprint improves both static and small-turn reference error in all three engines without additional texture reads.
- Compare against spatially supersampled **linear premultiplied cloud radiance**, rather than treating agreement between filters as photographic proof. The independent reference integrates 4 × 4 subpixels at a 640 × 400 target size, using the same scattering model and a high-quality sampler. The reference-only shader is retained in `tests/fixtures/cloud-reference-v32.glsl`. Material/weather reconstruction and full photographic equivalence remain open.

### 0.32 verification

- All 83 unit checks pass. The empty-work comparison covers eleven views in Chrome, Firefox and Playwright WebKit, including near views, small turns, the sampling crossover, a body-local pole and an explicitly illuminated longitude seam. Skipping empty density work changes at most one 8-bit channel value; draw counts and geometry are unchanged.
- The spatial reference covers ten views per engine. Daylight mean absolute error falls about 10–12%; terminator error falls about 6–12%. The two tested small-yaw differences reduce residual RMSE by about 2.8–10.2%. Magnified close views remain effectively unchanged. These are bounded sampling comparisons within the same cloud reconstruction, not a general photographic or motion-quality score.
- The fixed 1280 × 800 ultra-quality GPU check warms each variant for 240 frames, then records 160 frames in each ABBA window after 40 additional warmup frames. The mean of the two window medians is 12.030 → 12.081 ms in daylight and 11.938 → 12.280 ms in the grazing view. The selected filter has a small measured cost (+0.05 / +0.34 ms); no frame-rate improvement is claimed. An earlier cold-first-window run is excluded from this comparison.
- Twenty-four cloud/atmosphere composition views and twenty-one ordinary scene/engine views pass. Exact photograph composition is retained. Simulated graphics-context recovery succeeds for held Earth and paused Titan; saved pose survives and rendering returns to zero draws once the restored view settles.
- The current six-minute Chrome / Metal run rotates nine scenes through both cameras four times, producing 36 cases. After both cameras warm, retained resources remain at 20 geometries, 30 textures and 33 programs. There are no context losses or browser errors. Earth still has occasional 33 ms frames; multi-hour runs and exhibition hardware remain open.
- Runtime comparison against the delivered v31 package identifies only `src/rendering/shaders.js` as changed among the 80 cached files. There are no new images, fonts, audio files, texture buffers or hardware-sampler requirements. Flight, UI, ephemerides and sound keep their v31 bytes.

### 0.32 delivery verification

- The independently extracted package runs offline with all 80 runtime hashes matching and no external requests or browser errors. Physical thrust, held-frame reuse, settings/instruments, chart navigation, photographs, saved passage, Titan review and corrected lunar detail pass.
- Four stereo scores decode to 120 seconds; actual looping and archive-video seeking pass. No audio source or music file changes in this revision.
- A real v31 → v32 upgrade retains position, velocity, model propellant, non-default flight preferences, Titan review, science-note IDs and photograph bytes. Offline study/atlas/settings flows, obsolete-cache removal and late-stale-cache isolation pass.
- The final archive includes the current evidence reports. Every archive entry is hash-verified; runtime and launcher bytes match the independently tested extraction. `dist/release-review.json` records the current scope and five remaining broader areas.


## Twenty-first implementation pass — 0.33

| ID | Finding | Repair / acceptance evidence | State |
|---|---|---|---|
| E17 | Opening flight review after turning while time is held can replace the current picture with an older heading. Forced recording rejects the unchanged timestamp. | Refresh the latest snapshot at the same instant when entering review, retaining unique timestamps and the current attitude, independent look and camera mode. | Repaired; the old jump reproduces and three-engine present-view checks pass |
| E18 | Review records omit the lens, so past views use the current zoom. Adding preview zoom also requires protecting the present lens during cancellation, saving and reload. | Record field of view with new snapshots; preview and commit that lens, retain the live lens for cancellation/save, and accept older records using their present lens. | Repaired; recorded-lens restoration, cancel, preview reload and legacy history checks pass |
| U27 | The review track spaces record indices evenly although coarsening and time flow make intervals unequal. Its browser-default slider differs from the rest of the interface. | Position the scrubber by elapsed encounter time and select the nearest recorded moment. Keyboard arrows and Xbox left/right step between records. Use the existing thin-line control with a compact thumb focus indicator. | Repaired; elapsed-time mapping, pointer/keyboard/synthetic Xbox and nine layout cases pass |
| U28 | After mouse interaction, synthetic Xbox navigation moves menu focus without a visible selection mark in Chrome, Firefox and WebKit. Browser focus-visible heuristics do not recognise controller input. | Apply the established keyboard focus treatment while the controller is active. Pointer input clears controller focus; keyboard interaction retains native focus behaviour. Preserve menu selection and flight controls. | Repaired; old-release defect reproduces in three engines and current focus/menu checks pass |
| U29 | WebKit’s default Tab behaviour can skip menu buttons and move focus to the page, leaving the next action unreachable through the displayed order. | Traverse visible enabled controls explicitly in the landing screen and every panel, including entry, wrapping and reverse traversal. Keep native range key behaviour and the existing arrow navigation. | Repaired; old WebKit focus escape reproduces, and current landing/panel keyboard checks pass in three engines |

### Design decisions and scope

- The replay is a review of recorded states. It preserves position, momentum, propellant, attitude, camera mode, independent look and the recorded field of view. The elapsed-time slider selects the nearest sample; it does not invent intermediate physical states. Arrow keys and D-pad left/right visit adjacent stored moments, including after history coarsening.
- Time held still allows reframing. Entering review refreshes that latest composition without adding duplicate timestamps. A single-record history disables seeking and gives focus directly to Return to present.
- Previewing a lens only changes the displayed camera. Save/reload and cancellation keep the uncommitted present lens with its matching physical state. Committing a historical frame restores its recorded lens before saving. Optional lens values extend the existing history format; old histories remain readable and use the present lens where no historical value exists.
- Reuse the interface's narrow typography, text actions and fine-line range styling. Controller focus follows the same selected-item mark or outline as keyboard focus; switching devices changes the focus treatment without changing selection. No new menu buttons or runtime assets are added.
- Changes are confined to history, review, input modality, interface styles and the main orchestration. Propulsion, ephemerides, planetary rendering and audio retain their v32 bytes.

### 0.33 verification

- All 86 unit checks pass. New regressions cover held-time composition refresh without duplicate timestamps, retained/legacy/invalid lens data, and nearest-time lookup across coarsened intervals.
- `tests/flight-review-v33-before.json` reproduces the v32 heading jump, missing lens records and index-based track. The current three-engine review check covers true elapsed-time positioning, actual pointer seeking, keyboard and synthetic Xbox stepping, unchanged live physical state during preview, cancellation, save/reload while previewing, committed lens/physics and legacy records. A single-record history gives focus to its usable return action.
- Nine review layouts fit at 1280 × 800, 1024 × 640 and 800 × 600, with visible controls retaining 44-pixel targets. Captures show the restrained time rail, focused thumb and original scene.
- The independently extracted v32 comparison reproduces invisible controller selection in all three engines and WebKit Tab escaping to the page. Current checks verify the pause selection mark, settings/reference outlines, pointer/keyboard device changes, landing Tab entry and the next settings button. Physical Xbox remains untested.
- The existing keyboard/synthetic Xbox menu regression passes. All three engines also pass live exposure, persisted volume/sensitivity/quality, mute synchronisation, paused physical state, fullscreen where exposed and stopped rendering after a static adjustment.
- Six runtime files change: history, review, input modality, main orchestration and the two interface stylesheets. All other cached files retain their v32 hashes, including physics, ephemerides, rendering, imagery and music. There are no new runtime assets.

### 0.33 delivery verification

- An independently extracted package runs offline with all 80 runtime hashes matching. Recorded-lens preview, cancellation and commit work offline alongside existing flight, settings, charts, photographs, Titan review and lunar detail. There are no external requests or browser errors.
- A real v32 → v33 upgrade retains the physical save, non-default flight preferences, photographs byte for byte, science-note IDs, review history and the current lens. Legacy snapshots without a recorded lens remain reviewable using that current lens. Offline study/atlas/settings flows, cache cleanup and stale-cache isolation pass.
- The four stereo scores still decode to 120 seconds, loop successfully and retain archive-video seeking. No sound or imagery files change.
- All final archive entries are hash-verified. Runtime and launcher bytes match the independently tested extraction; `dist/release-review.json` records the current release scope and five remaining broader areas.

## Twenty-second implementation pass — 0.34

| ID | Observed issue | Repair / improvement | Current status |
|---|---|---|---|
| V15 | Earth's source map includes enhanced colour, while an additional saturation reduction and gain conceal the source palette. Large ocean areas have uniform bright blue colour. | Adopt NASA's September 2004 Blue Marble Next Generation base composite at the existing 8K resolution. Preserve the published palette and remove the Earth-only saturation/gain correction. | Repaired within the processed-image model; six matched views reviewed in three engines |
| V16 | Ocean reflection is selected from the blue channel. Dark and green water can lose reflection; material identity changes when the colour map changes. | Use independently rasterized geographic land/lake coverage, including fractional coasts, in a scalar 4K texture. Preserve the existing rough-water model. | Repaired; twelve geographic asset checks and eight isolated rendered land/water checks per engine pass |
| V17 | Diffuse ground, microfacet reflection and atmospheric scattering use incompatible brightness multipliers. A factor of seven gives the atmosphere an excessive blue veil. | Use a Lambertian Earth diffuse term and pi-normalized water/air radiance in the same irradiance convention. Remove the unrelated warm glint tint. | Repaired within the existing approximate model; compositing and complete-scene checks recorded |

### Source, appearance and resource decisions

- NASA's base map supplies measured-image geography and publisher-processed colour. September 2004 is chosen as the same calendar month as departure; it does not reconstruct 1977 terrain/weather. Keep the cloud source separate and retain the current historical trajectory, controls and exploration limits.
- Land/ocean material identity comes from public-domain Natural Earth polygons, independently of scene exposure, surface colour and saturation. The coverage is generalized at 1:10 million; the 4K map preserves fractional coast coverage and uses R8 with mipmaps. It adds a nominal 10.67 MiB of graphics storage and one Earth-surface texture read.
- The new 8K colour map is 1,834,803 bytes; the coverage map is 153,611 bytes. Together they save 465,586 bytes against the previous 2,454,000-byte colour map. AVIF mean absolute difference from the resized NASA input is 0.904 / 255, with mean channel shifts below 0.19 / 255. No new music or fonts are added.
- Direct comparisons show a deeper ocean, less blue veiling and a clearer cloud/ground separation. The same captures also expose visible weather-map texels in very close cloud views. That remains part of V02, alongside approximate cloud heights, scalar atmospheric transmission, sea ice and photographic equivalence. This revision does not establish calibrated spectral accuracy.

### 0.34 verification

- All 86 unit checks pass. Three engines pass six Earth views each, including day, terminator, crescent, close, grazing and night views. Before/after captures use identical pose, lighting, lens, exposure, quality and resolution; the retained previous surface shader, palette and air multiplier reconstruct the old rendering for comparison.
- Each engine separately verifies eight geographic locations with weather/air disabled and Sun/view directions aligned to the local surface normal. Pacific, Atlantic, Lake Superior and the Caspian Sea reflect; Sahara, Amazon, Australia and Greenland retain diffuse-only material. The old colour selector loses the dark-water reflection. Twelve independent coordinates validate the generated geographic coverage.
- All seven planetary/study scenes render in all three engines without page or graphics errors. The 24 high-density cloud/air composite cases have a maximum mean difference of 0.00325 / 255 against separate passes. Differences above one level are confined within 0.049 pixels of the analytic cloud limb (fewer than 0.002% of colour channels). Lower air brightness exposes a maximum single-channel difference of 20 / 255 at that existing analytic-sphere versus tessellated-shell boundary; the test now explicitly bounds its physical extent rather than retaining the older brightness-dependent maximum of 16. This is an explained reference-geometry difference, not an exact-equivalence claim. Photograph composition is exact.
- Antialiased and reduced-cloud-resolution paths retain separate coverage passes. Their additional checks, paired GPU timing and independently extracted offline delivery are recorded in the v34 reports.

- All sixteen additional Chrome composition cases pass with exact pixels through multisampled and 75%-resolution cloud paths. The existing separate-pass fallback preserves their edge coverage.
- Paired, warmed complete-frame GPU measurements at 1280 × 800 Ultra average the two median windows per variant: daylight 11.664 → 11.708 ms; grazing view 11.854 → 11.896 ms. This local run shows a roughly 0.04 ms increase; it establishes neither a universal performance gain nor exhibition-hardware performance. Draw counts and geometry are unchanged.

### 0.34 delivery verification

- The independently extracted package runs offline with all 81 runtime hashes matching, including the new Earth colour and scalar water map. The opening Earth, physical flight, settings, charts, photographs, recorded-lens review, Titan and lunar detail work without external requests or browser errors. All four unchanged stereo scores decode and loop, and archive seeking remains available.
- A real v33 → v34 upgrade retains physical flight, non-default controls, photographs byte for byte, science-note IDs and history. The present lens remains 34°; the earliest stored 58° view previews and commits with its recorded lens. The upgrade check now distinguishes recorded lenses from older missing-lens fallbacks.
- Four existing runtime files change: the Earth image, texture loading, material setup and surface/atmosphere shader module. One scalar geographic texture is added. Physical flight, ephemerides, interface, cloud rendering, music and the other planetary image assets retain their v33 bytes. Shared planetary shaders compile for all seven tested scenes.
- Every final archive entry is hash-verified. The final runtime and launcher bytes equal the independently tested extraction. `dist/release-review.json` records the release, comparisons, measured resource tradeoff and five remaining broader areas.

## Twenty-third implementation pass — 0.35

| ID | Observed issue | Repair / improvement | Current status |
|---|---|---|---|
| V18 | Close cloud views show contour-like bands; highly magnified slant views show lateral stripes. A single midpoint density skips partial segments and long rays cross more weather texels than their fixed samples resolve. | Integrate the existing vertical profile over each view segment, light it at the density centroid, and allocate bounded extra samples according to resolved lateral weather distance. Share profile integral/moment calculations. | Improved; dense-reference and camera-motion comparisons pass. Residual maximum-zoom sampling and source-map detail remain open under V02 |

### Rendering decisions

- Keep the credited 8K weather field and its inferred vertical profile. Integrate its existing smooth bottom/top profile across a view segment, including partial occupation, rather than treating the midpoint density as uniform. The first moment supplies the location for sunlight evaluation. Atmospheric transmission, source colour, water reflection and the physical-flight model retain their v34 implementation.
- Reuse the two weather reads per view sample and the four existing sunlight segments. The default upper/lower intervals retain their 8 + 12 minimum; long resolved rays can use up to 32 samples in each interval (64 total). The requested count follows angular weather-map distance divided by the pixel's mip footprint. The full sample budget also remains available when a ray only intersects the upper cloud shell.
- This removes much of the visible contouring without inventing new weather detail or adding textures, geometry or graphics buffers. It does not eliminate limited source resolution, the reconstructed height field, approximate scattering or all maximum-zoom sampling error. Those remain visible in the retained comparisons.
- The numerical reference independently samples the unchanged v34 density field at 320 uniformly spaced view points. Seven selected views also use 640 points to establish convergence. All versions keep the same weather filter and sunlight model. Linear premultiplied RGBA is measured before exposure, atmospheric compositing and display encoding; the complete displayed scene is captured separately. Display-only errors in the extremely faint crescent are affected by quantization, so linear error is the governing integration comparison.
- The fixed-twenty-sample ablation in the zoom check isolates the contribution of adaptive sampling from the profile/centroid change. The checks retain exact source shaders and do not assert photographic equivalence.

### 0.35 verification

- All 86 existing unit checks pass. The new browser checks compare day, terminator, crescent, night, close ground-facing views, actual horizon-facing views and small camera turns in Chrome, Firefox and WebKit. Dedicated 20° and 4° lens cases test resolved cloud details and the thin limb.
- Current results, convergence and motion measurements are retained in `tests/cloud-view-v35-results.json` and `tests/cloud-zoom-v35-results.json`. The v34 shader is retained in `tests/fixtures/cloud-v34.glsl`.
- Seven standard scenes per engine and cloud/air composition checks cover the shared shader module and existing composite. Paired GPU timings are recorded separately; the test host's configured low-power setting is included in that report.

- Across 36 standard reference views, linear premultiplied RGBA mean error falls by at least 22%. The close ground-facing case falls by about 65%; the independent 4° magnified-limb case falls by about 68%, and the 20° cloud case by about 51%. The 640-sample checks establish that reference discretization is substantially below these gains.
- Small-turn residual motion error falls by about 69% in the close view and 43% at the limb. This describes image stability against the same dense reference, not frame-rate improvement.
- In the magnified-limb ablation, bounded adaptive sampling reduces mean error by about 66% relative to the same profile/centroid integration fixed at twenty steps. The comparison separates the two improvements. Residual thin-ridge patterns and image-limited weather detail remain visible at high magnification.
- All 21 standard planetary scenes render without errors. The 24 composition checks preserve exact photographs; above-one-level differences between merged and separate passes remain confined to the existing subpixel cloud silhouette. No physics, interface, audio or asset bytes change.

- Six additional pole/seam cases pass in three engines, including independent 640-sample convergence. Longitude wrapping and the high-latitude texture footprint retain improved linear accuracy. This brings the reference-view total to 48, with 21 convergence comparisons.
- Paired warmed complete-frame GPU measurements at fixed 1280 × 800 Ultra, with low-power mode configured on the host: day 33.053 → 35.263 ms, close 31.498 → 34.156 ms, low Sun 31.800 → 33.854 ms. The two-window median averages increase by 6.5–8.4%. This is a visual-quality tradeoff, not a performance improvement.
- The resolved 4° limb case costs 13.777 → 33.561 ms under the same benchmark procedure. That large increase follows the extra lateral samples and remains a concrete V03 optimization target. Existing high-quality adaptive resolution and held-frame caching remain available, but those mechanisms are excluded from this fixed-Ultra comparison; this benchmark does not establish default-mode or exhibition-device FPS.

### 0.35 delivery verification

- An independently extracted package runs offline with all 81 runtime hashes matching. Physical flight, settings, star charts, passage review, recorded lenses, photographs, Titan exploration and lunar detail pass without external requests or browser errors. The four unchanged stereo scores decode and loop; archive-video seeking remains functional.
- A real v34 → v35 upgrade retains physical state, non-default flight preferences, photograph bytes, science-note IDs and review history. The present lens remains 34° and the earliest stored 58° view retains its recorded lens. Offline reload, cache cleanup and late-stale-cache isolation pass.
- Only the shared shader module changes among cached runtime files. All image, sound, interface, physics and ephemeris bytes retain their v34 hashes. No runtime assets are added.
- Every final archive entry is hash-verified. Runtime and launcher bytes equal the independently tested extraction. The release review records the visual improvement, measured performance cost, 93 observed findings and six open findings across five broader areas.


## Twenty-fourth implementation pass — 0.36

| ID | Observed issue | Repair / improvement | Current status |
|---|---|---|---|
| C10 | The adaptive cloud march repeatedly divides interval lengths, integrates flat profile regions, and remaps four nearby sunlight samples with separate spherical trigonometry. V35 increases the number of times this work repeats in magnified views. | Precompute interval steps, integrate constant-density segments directly, and share a quadratic spherical-coordinate expansion across short sunlight paths. Keep exact mapping for long paths and near the poles. | Repaired within the existing sampled model; three-engine coordinate and image comparisons pass. Sustained and exhibition-hardware performance remain V03 |

### Rendering decisions

- Preserve the v35 view-sampling budget, weather field, vertical profile, density centroid, four sunlight segments, optical depth and atmospheric response. No source imagery, graphics buffers or runtime assets are added.
- Compute upper/lower step lengths once per ray. A segment wholly within the profile's constant-density region has its exact average density and midpoint centroid directly; this also avoids subtracting nearby profile integrals.
- For a short sunlight path, evaluate spherical coordinates and their first two derivatives at its midpoint. The four existing samples use that quadratic expansion. Accept the local expansion only when the path is shorter than 4% of the minimum endpoint distance from the polar axis; the polar distance must also exceed 0.05 normalized Earth radii. Longer paths and polar regions retain exact spherical mapping. Weather still has one texture lookup per sunlight segment.
- The coordinate comparison compiles the actual runtime helper and compares it with exact spherical mapping on the GPU. In each engine, 4,096 seeded paths cover general positions, polar regions, longitude seams and long horizon paths. The four samples per path produce 16,384 comparisons; 10,984 use the local map and 5,400 use the exact fallback. The largest observed coordinate error is 0.00414 of an 8K source texel. This is sampled verification, not a universal numerical bound.
- This is a bounded numerical approximation to the same cloud model. It does not supply new cloud detail or establish photographic equivalence. The close-weather source limitation remains V02/V18.

### 0.36 verification

- All 86 unit checks pass. Three engines pass 48 complete-image comparisons against the released v35 cloud shader, including daylight, terminator, crescent, night, close views, small camera turns, 20°/4° lenses, poles and longitude seams.
- The largest complete-frame mean difference is 0.001948 / 255; the largest channel difference is 2 / 255. Isolated linear premultiplied cloud output has a maximum mean difference of 0.000006523 and RMS difference of 0.00007919. Draw counts and geometry remain unchanged. The comparisons retain exact old shader source and matched camera/lighting settings.
- Formal paired full-frame GPU timing, dense-reference detail checks, seven planetary scenes per engine and existing cloud/air composition are recorded in the v36 reports. The cost benchmark excludes adaptive resolution and held-frame caching and records the host's low-power setting.

- Paired warmed full-frame GPU tests at 1280 × 800 Ultra average two median windows per variant: day 36.144 → 34.227 ms (5.3% lower), close 34.788 → 34.385 ms (1.2%), low Sun 34.844 → 34.278 ms (1.6%), and resolved 4° limb 31.458 → 28.626 ms (9.0%). Each window measures 160 GPU queries after warmup. The host has low-power mode configured. Small close/low-Sun changes may be within run variation; these results establish neither exhibition-device FPS nor a universal improvement. The high-magnification cost remains open under V03.

- Six additional cases at the actual 1.035-Earth-radius exploration limit, all at the 4° lens, pass in three engines. These ground-facing and limb-facing comparisons bring the total to 54. The largest complete-frame differences retain the same 0.001948 / 255 mean and 2 / 255 maximum. The dense-reference zoom checks preserve v35 integration accuracy within 0.002% in mean error, with independent 640-sample convergence. All 21 planetary scenes and 24 composition cases pass; photographs remain exact through the composition paths.


### 0.36 delivery verification

- The independently extracted package runs offline with all 81 runtime hashes matching. Physical flight, settings, the star chart, passage review, photographs, recorded lenses, Titan exploration and lunar detail work without external requests or browser errors. The four unchanged stereo scores decode and loop; archive-video seeking passes.
- A real v35 → v36 upgrade preserves physical state, non-default preferences, photograph bytes, science-note IDs and review history. The present 34° lens and earliest recorded 58° lens both retain their intended roles. Offline reload, obsolete-cache cleanup and late-stale-cache isolation pass.
- Only the cloud portion of the shared shader module changes among cached runtime files. All other shader sections, image assets, audio, interface, physics and ephemerides retain their v35 bytes. Runtime size grows by 1,580 bytes; no graphics textures, geometry or assets are added.
- Every final archive entry is hash-verified. The final runtime and launchers match the independently tested extraction. The release review records 94 observed findings, the measured performance/accuracy tradeoff and six remaining findings across five broader areas.


## Twenty-fifth implementation pass — 0.37

| ID | Observed issue | Repair / improvement | Current status |
|---|---|---|---|
| U30 | A partially visible world in a screen corner loses its leader and sends its bearing to an unrelated upper-right position. Four axis-aligned candidates around a conservative circle cannot use the available diagonal space. | Use the perspective spherical silhouette ellipse, try cardinal and diagonal supporting tangents, and extend clearance around existing interface text. Keep a stable valid direction and a visible limb anchor. | Repaired; old-release corner cases reproduced; current geometry and browser checks recorded below |
| U31 | Time changes show a central toast with the requested multiplier, even while the actual rate is limited. During a time hold, the selected rate disappears and the display repeats Held without explaining recovery. | Keep actual flow prominent and place selected-rate feedback beside it. Retain limit explanations, show the hold/resume action, and reserve a stable readable status line. Remove the central time-selection toast. | Repaired; held/limited flow, pointer, keyboard, synthetic Xbox and compact-layout checks |
| E19 | Continuing historical passage from an encounter boundary leaves its boundary/proximity flags active. The visible time button then attempts to open unavailable encounter review instead of holding passage time. | Clear encounter-only boundary state on explicit departure; preserve deliberate user time holds. | Repaired; v36 reproduces the failed time button and current transition checks pass |
| E20 | Flight review deliberately holds the restored clock, but Space/Xbox B only applies another temporary hold. A keyboard/controller player cannot resume using that control and needs the mouse time button. | A fresh time-hold press releases the deliberate hold while continuing to freeze time for the duration of that press. Release resumes flight. Preserve boundary protection and the neutral-input guard when leaving menus. | Repaired; old-release keyboard and synthetic Xbox failures reproduced; current review/release checks recorded below |

### Interaction and layout decisions

- Navigation remains advisory. The bearing uses the same physical subject and position; it never turns or moves the probe. Derive the rotated projected ellipse from the spherical tangent cone, then place the complete label beyond a supporting tangent. Saturn retains its conservative outer-ring sphere; this is an instrument footprint, not a new physical ring model.
- Prefer the current valid direction to avoid jumps. Try short leaders first; additional clearance makes room around contextual text when only a narrow limb is visible. The visible anchor must remain in the viewport. A world filling the entire picture retains its margin label, and unresolved/occluded/offscreen targets retain their instrument markers. Ordinary views stop after the first valid candidate rather than allocating all candidate placements every frame.
- Actual time rate and its human-readable equivalent remain the main readout. Selected-rate feedback stays beside the control; near-body limits persist, and a held clock states Press Space/B to resume. Holding the key/button states Release Space/B to resume. The text status reserves its height, fits above the viewport edge and has a polite live status for accessibility. No new buttons, typefaces or runtime assets are introduced.
- A boundary is specific to local exploration. Explicit continuation ends that constraint. Deliberate time holds remain active through continuation until resumed. Space/B cannot override an encounter boundary. Menu activation and the controller press that closes a panel keep their existing input isolation.

### 0.37 verification

- The independently extracted v36 release reproduces detached corner bearings, conflicting selected-time feedback, the boundary-to-passage time-button failure, and the inability to resume reviewed flight with Space or Xbox B.
- Two new geometry regressions independently verify spherical tangent rays and a diagonal label's clearance from the footprint. All 88 unit checks pass. Browser comparisons cover four corners at three desktop sizes in each engine, with visible leaders checked against physical spherical tangent rays.
- Current browser reports retain matching camera positions and screenshots, hold/resume states, synthetic Xbox input, native menu activation, boundary protection, ordinary planetary bearing cases and all relevant errors. Synthetic input does not constitute a physical-controller test.

- Chrome, Firefox and WebKit pass all 36 corner/viewport bearing cases and nine time-readout layouts. Every corner retains a visible limb leader outside the projected body and clear of interface text. The 21 standard planetary cases also pass, alongside occluded, offscreen and screen-filling subjects.
- All three engines pass review-to-Space/B recovery, unchanged position/velocity/fuel while held, native Space activation in menus, controller Back isolation and boundary protection. Requested-rate feedback, near-body limits, deliberate holds through departure and the passage time button pass in each engine.
- Contextual science, interrupted reading, hidden-interface behaviour and partial-world photography pass in all three engines. Chrome menu navigation and the complete physical/historical-flight regression pass: six encounter boundaries, five passages, weak finite thrust, momentum-preserving time holds, chart selection and passage save/restore. No browser errors are recorded.
- Nine of the 81 cached runtime files change. Physical integration, ephemerides, rendering, image assets and audio retain their v36 hashes. No runtime media are added.

### 0.37 delivery verification

- The independently extracted release runs offline with all 81 runtime hashes matching. Physical flight, settings, charts, passage save/restore, photographs, journal, recorded lenses, Titan exploration and lunar detail pass with no external requests or browser errors. Four unchanged stereo scores decode and loop; archive-video seeking passes.
- A real v36 → v37 upgrade preserves physical state, non-default preferences, photograph bytes, science-note IDs and review history. The current 34° lens and earliest recorded 58° lens retain their roles. Offline reload, obsolete-cache cleanup and isolation from a late stale cache pass.
- The nine runtime changes add 2,367 bytes together. Image assets, audio, ephemerides, rendering and physical integration retain their v36 bytes. No media assets are added.
- Final archive entries are hash-verified. Runtime and launcher bytes match the independently tested extraction. The release review records 98 observed findings, four repairs in this pass and six remaining findings across five broader areas.


## Twenty-sixth implementation pass — 0.38

| ID | Observed issue | Repair / improvement | Current status |
|---|---|---|---|
| U32 | At 800 × 600, historical-passage progress overlaps the reading column. Independent column widths leave both elements in the same space. | Reserve separate horizontal regions for passage reading and progress; include the progress area in bearing avoidance. | Repaired; old-release overlap reproduced and current layout checks recorded below |

### Interface decisions

- Continue the broader U03 refinement: remove the persistent photographic and departure buttons from the science column. Put continuation beneath the chapter/date and photography alongside Flight review and Journal. Keep clear text actions, a consistent target height and the existing offline Barlow/Sometype fonts. The scene retains the primary visual emphasis.
- The reading area now contains only an invitation, view-specific science or an optional held observation. When those are absent, hide the entire area, including its background shading. Science still follows the visible subject, retains its dwell/read rules and enters Field notes. Body copy remains 17 px in the tested desktop layouts; removing actions supplies the space.
- Photography stays directly accessible with pointer, Enter on its focused control, P and Xbox left-stick click. Continuation remains optional and immediately available. Repositioning these controls does not add a task gate, steering aid or forced observation. Footer actions share their size, baseline and restrained hover treatment.
- Increase compact date-line room so UTC is no longer stranded on its own line in the departure view. Separate passage text and progress at compact widths. Preserve historical dates and physical distance readouts.
- Update U30 placement to account for the real chapter/menu/reading/receipt/progress bounds. Instead of a fixed clearance list, advance a label to the exit of each blocking rectangle along a silhouette normal, clipped to the viewport. Reject leaders that cross interface text. If coarse directions cannot use a narrow gap, search finer directions once and retain the valid direction for later frames. Normal views keep the direct coarse placement.
- Design reference: [Apple Human Interface Guidelines — Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), especially visual hierarchy and consistent button sizing. These are applied to a space-view interface through alignment, grouping and interaction feedback. No platform-specific glass treatment or new font/media asset is introduced.

### 0.38 verification

- The independently extracted v37 comparison records the original combined column and the 800 × 600 passage overlap. Current captures use matching scenes and window sizes. In the three Chrome viewport comparisons, the combined column's bounding area falls by approximately 40–50% for the invitation and 30–42% for the science note. These are layout rectangles, not a claim about total pixel occlusion or user preference. The quiet reading area disappears entirely.
- Two additional geometry checks cover viewport entry, clearance around a reading block, a narrow visible-limb gap and leader segments that avoid text. All 90 unit checks pass.

- Chrome, Firefox and WebKit pass 72 layout cases: eight scene/interface states at three desktop sizes in each engine. Every visible button remains inside the viewport with at least a 44 px target; reading, tools, heading, flight hint and passage progress remain separate. Photography and continuation work through the relocated controls.
- All 36 corner cases retain a limb leader checked against independent spherical tangent rays. Sampled leader segments and complete label rectangles avoid the current interface bounds. The 21 ordinary planetary bearing cases, offscreen/occluded targets and screen-filling worlds also pass.
- Contextual science, interrupted reading, hidden-HUD behaviour, partial-world photography and retained Field notes pass in all three engines. Review-to-Space/B recovery, native menu activation and controller Back isolation pass; Chrome keyboard/synthetic Xbox menu controls pass. No browser errors are recorded. Physical-controller validation remains open.
- Only five cached interface files change. Physical integration, historical playback, imagery, rendering and audio preserve their v37 hashes. No font or media file is added.

### 0.38 delivery verification

- The independently extracted package runs offline with all 81 runtime hashes matching. Physical flight, settings, star charts, passage save/restore, photographs, journal, recorded lenses, Titan exploration and lunar detail pass without external requests or browser errors. All four unchanged stereo scores decode and loop; archive-video seeking remains functional.
- A real v37 → v38 upgrade preserves physical state, non-default preferences, photograph bytes, science-note IDs and review history. The current 34° lens and earliest recorded 58° view retain their respective lenses. Offline reload, obsolete-cache cleanup and late-stale-cache isolation pass.
- The five interface changes add 2,138 runtime bytes together. No imagery, font, sound, rendering, physics or historical-playback file changes. Every final archive entry is hash-verified; runtime and launcher bytes match the independently tested extraction. The release review records 99 observed findings and six remaining findings across five broader areas.


## Twenty-seventh implementation pass — 0.39

| ID | Finding | Repair | State |
|---|---|---|---|
| E21 | Fixed 4° lens steps become disproportionately large when zoomed in. | Equal focal-length ratios, smooth lens transitions, a live lens slider and narrower-lens turn sensitivity. | Verified in three engines |
| E22 | A moving world slips out of a magnified view during a coast. | Optional camera following, eased acquisition, immediate manual release and persistent tracking identity. | Physical independence and interaction checks pass |
| C11 | Historical browser tests/reports accumulate in a long, release-specific package allowlist. | A category-based packer includes runtime, licenses, essential documentation and unit checks. Historical QA stays in the development workspace. | Delivery verification below |
| C12 | Dead advice and cinematic-intro code survive after their gameplay was replaced. | Remove both dormant behaviours, remove the obsolete advice-only test, and merge the retained formatter into observation ownership. | 89 active unit checks pass |

### Behaviour and ownership

- The existing camera entry opens a narrow live-view panel with Probe / Chase, one lens range and the local worlds. Xbox uses Menu → Camera; L follows/releases the selected bearing on keyboard. No persistent HUD button is added.
- Camera following changes only the relative viewing quaternion. It preserves the probe attitude and all physical integration inputs. Turning releases following into free look; V / right-stick click returns to steering. The feature is an explicitly simulated camera convenience.
- Smooth zoom applies only to flight zoom commands. Chapter starts, review and the live slider own their immediate lenses. Opening a panel stops a pending zoom at the displayed field of view. Held, acquired following reuses an unchanged frame.
- `ObservationCamera` owns camera behaviour, `src/ui/camera.js` owns presentation, and `main.js` routes commands. Camera-position switching is shared by the shortcut and panel. No new imagery, fonts, audio, rendering buffers or dependencies are added.
- Existing asset/shader quality remains the open V02/V18 work. This pass makes details easier to inspect; it does not claim new measured surface detail or photographic equivalence.
- The repair list contains 103 findings. Six remain open across the same five broader areas. Project instructions and `docs/ARCHITECTURE.md` now make concise ownership, removal of obsolete paths, reusable tests and a bounded delivery scope explicit.

### 0.39 verification

- `tests/observation-camera.mjs` passes in Chrome, Firefox and Playwright WebKit: nine camera layouts, monotonic equal-ratio zoom transitions, direct-lens override, keyboard release, synthetic Xbox panel/range/release, saved following, chase-view photographs and cleared tracking at passage entry.
- Each engine advances the actual encounter solver for 240 steps with and without camera following. Position, momentum, attitude, fuel and elapsed simulated time match exactly. Acquired following stays within 2.11e-8 radians of Saturn in this calculation; the untracked view moves by about 0.181 radians. This measures camera/solver behaviour, not physical controller hardware or sustained frame rate.
- A held, acquired view performs no extra world renders during the check. The selected lens and follow state survive save/reload. Camera controls fit 1440 × 900, 1024 × 640 and 800 × 600 with 44 px minimum targets.
- The reusable menu check passes keyboard, synthetic Xbox, range controls, compact Pause and flight-review cancellation. The 89 active unit checks pass in both the workspace and the independently extracted release.
- Eight existing runtime files change, two camera modules are added and the obsolete director module is removed; 72 runtime files retain their v38 hashes. Renderer shaders, source imagery, sounds, gravity/thrust integration and historical trajectory data are unchanged.

### 0.39 delivery verification

- The independently extracted ZIP verifies all 82 offline runtime hashes, camera following/lens controls, physical flight, settings, chart, photographs, journal, recorded lenses and media playback/seek. It makes no external requests and records no browser errors.
- A real v38 → v39 service-worker update preserves physical flight, preferences, photographs, science and recorded lenses, including offline recovery and stale-cache isolation.
- The playable archive contains 121 files, down from 529. Runtime grows by 8,092 bytes (about 0.04%); the smaller ZIP comes from leaving historical QA in the development workspace, with all active media retained. The final exact archive bytes and SHA are recorded in `dist/package-verification.json` and `dist/release-review.json`.
- `AGENTS.md` and `docs/ARCHITECTURE.md` record module ownership and the requirement to remove obsolete paths, reuse checks and keep the archive focused. Material realism and the other open areas remain tracked; the full improvement goal is active.


## Revision 0.40 — measured polar detail through existing exploration

| ID | Finding | Repair | State |
|---|---|---|---|
| V19 | Saturn's north cap contains smooth concentric bands without a recognizable jet boundary or smaller cloud storms. | Reproject Cassini PIA21611 natural-colour polar imagery into the existing map; offer a north-polar start through the existing study menu and explain visible features through the existing guide. | Six paired views and the exploration flow pass in three engines; registration and mixed-epoch limitations documented |

### Visual detail and scope

- The 2013 left panel supplies real cloud structure. Registration uses the published jet latitude because the composite lacks a georeferencing label. A broad azimuthal brightness term is removed before blending. This is an approximate visual composite, not a calibrated reflectance retrieval or reconstructed 1980 weather. Source hashes and processing are recorded in `docs/saturn-polar-source.json`.
- The north-cap texture remains 4096 × 2048, AVIF quality 88, with no procedural weather. It grows by 55,628 bytes. No shader, geometry, draw-call count, texture dimensions, dependency or runtime module is added. Existing lower-latitude pixels are identical before encoding; the re-encoded lower-latitude mean absolute channel difference is 0.476/255 and the 99th percentile is 2/255.
- The new optional start is data in the existing study catalogue. Body-local framing is handled by the same initialization path; the existing physical controller, camera, guide, journal and flight history continue to own their behaviours. An unused cinematic-start boolean is removed from the chapter signature and all callers.
- The polar science note requires the northern cap to be in the picture. Looking away clears it; hiding guidance suppresses it; reading retains the source-date distinction in Field notes. No completion gate or extra permanent HUD control is added.

### Verification

- `tests/saturn-polar.mjs` compares encounter, north, magnified north, side, south and ring-plane views in Chrome, Firefox and Playwright WebKit. Paired views retain identical draw calls and triangle counts. Actual Saturn encounter Sun elevation is about 3.8695° above the equator.
- All three engines pass the actual study entry, three menu sizes, held physical-state preservation, science display/retention, gravity-based coasting, manual turning, recorded-view restoration, save/reload and explicit onward passage. Source asset checks are recorded in `tests/saturn-polar-asset-results.json`.
- The 90 unit checks pass. Journal coverage now verifies that introducing another science note does not reveal it in an older saved journal before discovery.
- The repair list now tracks 104 observed findings. U03, V02, V03, V18, A01 and D03 remain open; physical Xbox, actual Safari application, subjective listening and sustained exhibition-hardware performance are not claimed by these checks.

### 0.40 delivery verification

- The independently extracted release passes all 90 unit checks and all 82 offline runtime hashes. The complete offline check covers the new polar study, photography, journal, study restoration, flight review, chart and local audio/video seek and playback, with no external requests or browser errors.
- A real v39 → v40 offline update retains previous physical flight, preferences, photographs, science and recorded lenses; the new polar study works after upgrading. Old-cache activation and stale-cache isolation checks pass.
- Seven runtime files change; 75 retain their prior hashes. There are no added runtime files or dependencies. Runtime JavaScript increases by 1,926 bytes, and the Saturn image by 55,628 bytes. The archive contains 122 entries; the extra entry is the polar-science unit check. Exact archive bytes and SHA are in `dist/package-verification.json` and `dist/release-review.json`.


## Revision 0.41 — one capture flow and less dormant runtime

| ID | Finding | Repair | State |
|---|---|---|---|
| C13 | The runtime retains the superseded linear-velocity helper, old time limiter, logarithmic voyage chart, hidden legacy HUD/panels, duplicate photograph array and unused checkpoint state. Hidden signal telemetry still reads the Earth ephemeris every passage frame. | Remove the dormant implementations, state, DOM and writes. Keep current physical integration, curved coast forecasts, linear solar chart and instrument readings. Retire three tests that exercise only removed helpers. | Six before/after HUD captures match exactly; hidden ephemeris lookups fall from 30 to zero over 30 animation frames |
| D11 | Optional mission/exploration captures bypass the independent shutter's persistence checks. A failed capture is already marked discovered; a failed database write reports success without exporting the image. Mission photos lack capture timestamps. | Route all three capture types through one shutter/storage/receipt function. Commit discoveries after image capture, coalesce cross-entry requests, timestamp every frame and retain the established session/download fallback. | Old failures reproduced; current retry eligibility, cross-entry coalescing, late-write isolation and fallback verified |

### Scope and ownership

- `savePhotograph` coordinates capture, the pending shutter, persistence, fallback and receipt. The three entry points supply their metadata. Observation bookkeeping runs after capture succeeds and before awaiting storage; a write completing after a scene switch only updates storage and never changes the new encounter's task or camera.
- `ObservationArchive` remains the sole storage owner. The duplicate in-game photograph array and obsolete checkpoint copies are removed; current save fields, bounded flight history, previous discoveries and actual images retain their established owners.
- Explicit capture state is passed directly to the existing renderer capture method. Suggested observations use two scene renders for capture/restore instead of first rendering the same scene again. No shader, imagery, geometry, audio, propulsion or trajectory data changes.
- Thirty-two permanently hidden DOM elements are removed. Photographic confirmation uses the existing receipt, which now serves held observations too. The visible HUD retains the same layout; Earth, Jupiter and polar-study captures at 1280 × 800 and 1024 × 640 match the released v40 pixels exactly.
- The three retired unit checks verified unused linear integration/time-limit helpers. The remaining 87 checks cover live code, including physical orbital energy, finite thrust, historical velocity, time hold, projected scale, navigation and science. No implementation-mirroring tests are added.
- `tests/photograph-flow.mjs` is the reusable replacement for the former version-named photography entry point. `tests/runtime-cleanup.mjs` reproduces the old storage/capture defects and measures hidden DOM/ephemeris work against an independently extracted v40.
- The ledger now contains 107 observed findings. U03, V02, V03, V18, A01 and D03 remain open. This pass improves capture reliability and code ownership; it does not establish photographic equivalence or complete the overall improvement goal.

### 0.41 interaction verification

- The current three-engine photograph check passes independent keyboard/synthetic-Xbox capture, mission capture, an actual held lunar-composition exposure, photo viewing/export, cross-entry pending-command coalescing, session/download fallback for every route, capture-failure recovery, timestamps and late-write isolation. Suggested capture performs two scene updates for capture/restore.
- The current physical-experience check passes manual thrust, held-time attitude control, optional science, bounded exploration in all six nodes, all five historical passages, navigation/chart selection, save/restore and synthetic Xbox time/camera controls. The 87 active unit checks pass.
- Eight runtime files change and 74 retain their v40 hashes. Runtime shrinks by 6,081 bytes with no added file or dependency. Asset, shader, geometry, propulsion and trajectory files retain their v40 hashes.

- Delivery retains the complete current issue list and essential scientific documentation. The 162 KB historical measurement ledger now stays in the development workspace with its referenced browser reports; release notes no longer accumulate inside every playable archive.


| ID | Finding | Repair | State |
|---|---|---|---|
| D12 | The compact package's credits link to a development-only music history file that is no longer shipped. | Identify the development location as plain text; make packaging reject unresolved local Markdown links. Keep source credits and the complete music license in the delivered files. | Every clickable relative documentation link resolves in the final archive |

### 0.41 delivery verification

- The independent offline runtime passes all 82 file hashes, held-observation receipt/timestamp checks, ordinary photographs, journal, camera controls, flight review, charts, study restore and local audio/video playback, with no external requests or browser errors. The extracted unit suite passes all 87 active checks.
- The real v40 → v41 update retains prior physical state, preferences, photographs, science and recorded lenses, including offline reload and stale-cache isolation. The new shared capture path continues to use the existing archive schema.
- The playable archive retains all runtime assets and current issue/scientific documentation while leaving the measurement history in the workspace. Final bytes, file inventory and SHA are recorded in `dist/package-verification.json` and `dist/release-review.json`.


## Revision 0.42 — wavelength-aware air and cloud depth

| ID | Finding | Repair | State |
|---|---|---|---|
| V20 | Earth atmospheric transmission collapses RGB extinction to one alpha and retains a 6% transmission floor. Clouds receive extinction/scattering from air behind them down to the ground. | Multiply scene radiance by RGB transmission, add in-scattering, and transport cloud radiance only through air in front of its opacity-weighted depth. Opaque clouds cover the clear-air contribution behind them. | Verified in three engines and independent optical/cloud-depth comparisons; broader atmospheric realism remains under V02 |
| C14 | The separate-resolution cloud compositor builds shader variants by matching and replacing source strings. | Generate explicit shader variants from one transport implementation; keep composition and resolution in CloudLayer. | No runtime shader-text replacement, new dependency, image, lookup texture or render target |

### Scope and ownership

- `shaders.js` owns the shared atmosphere integration, the clear-air/transmission/composite variants and straight/premultiplied cloud output. `scene-factory.js` owns material setup and draw ordering; `CloudLayer` owns resolution and composition. The existing renderer coordinates their visibility.
- The view transport is wavelength-dependent. Ground rays retain twelve Gaussian samples, grazing rays twenty; elevated endpoints above the lowest aerosol layer use six Gaussian samples. The transmission-only pass compiles out sunlight lookups and scattering.
- The extra transmission draw reuses atmosphere geometry and uniforms. Cloud transport uses the opacity-weighted position already accumulated during the existing cloud march. There are no new runtime modules, images, dependencies, framebuffers or generated lookup tables.
- Clouds retain an inferred vertical profile and representative depth. This corrects a specific layering error; full multiple scattering, measured cloud heights and photographic equivalence remain outside the established evidence. Existing imagery, physical motion, camera control, exploration, UI and sound are unchanged.
- Frozen v41 shaders/compositor are development fixtures only. The reusable `tests/earth-transmission.mjs` owns before/after views, linear HDR transport measurements, composition-route checks, optional cloud-depth reference and paired GPU timing.

### 0.42 numerical and rendering verification

- Chrome, Firefox and Playwright WebKit each pass seven matched before/after views, coloured-background HDR readback, and five drawing routes: merged, adaptive, four-sample antialiasing, direct and capture. No browser/shader errors are recorded. The HDR reference independently integrates 8,192 density samples on five rays to each of three endpoints (ground, 3 km and 9 km). Maximum absolute RGB-transmission error is 0.009395; the former scalar composition reaches 0.3420 on the same ground rays. Isolated channel cross-talk and superposition errors are zero at the measured framebuffer precision.
- The representative-cloud-depth approximation is compared with evaluating air transport at every occupied cloud segment. At 800 × 500, average RGB differences are 0.00977 / 0.00665 / 0.01713 of a 255-step channel for day / terminator / close views; 99th percentiles are 0 / 0 / 1 and maxima 2 / 3 / 2. This tests depth approximation within the existing single-scattering model; it is not a reference for measured cloud geometry or multiple scattering.
- Merged and split composition have a mean difference below 0.0028/255. At most 119 of 7,500,000 channels differ by more than one step; the maximum is 48 at the existing analytic-versus-mesh cloud-shell coverage edge. Both paths preserve their established coverage handling.
- Final paired ABBA full-frame GPU windows at 1000 × 625 average the two window medians: day 11.484 → 12.533 ms; close 15.672 → 15.204 ms. The close result is treated as measurement variation, not a speedup claim. The initial twelve-sample cloud-front candidate incurred roughly 3 ms; six samples at elevated endpoints reduce the added work while retaining the numerical bounds. Warmed geometry/texture counts remain 6 / 14 for both variants; one draw is added when Earth air is rendered. These short windows do not establish sustained target-hardware FPS.
- All 87 active unit checks pass in both the workspace and independently extracted archive. The extracted game verifies all 82 offline runtime hashes and completes exploration, camera, flight review, charts, photography, journal, settings, and local audio/video playback with no external requests or browser errors.
- The audit now contains 109 findings. U03, V02, V03, V18, A01 and D03 remain open. No physical Xbox, actual Safari application or new subjective audio validation is claimed.

### 0.42 delivery verification

- A real v41 → v42 update retains physical flight, preferences, photographs, science notes and recorded lenses. The upgraded game reloads offline; prior-cache removal and late stale-cache isolation pass.
- Final composition differences beyond one channel step remain within a quarter pixel of the physical cloud-shell edge in all three engines.
- The final 121-entry archive is 17,016,931 bytes, 2,097 bytes larger than v41. All 82 runtime files match the independently tested extraction and the primary localhost:4173 preview. Four rendering files change; the other 78 retain their prior hashes. Runtime source grows by 2,936 bytes. Exact hashes and measurements are recorded in `dist/package-verification.json`, `dist/release-review.json` and `tests/revision-v42-source-hashes.json`.


## Revision 0.43 — direct bearings and reliable flight focus

| ID | Finding | Repair | State |
|---|---|---|---|
| E23 | The persistent bearing is a pointer-inert, accessibility-hidden div. A lost player must find the camera menu or know L to look toward the displayed world. | Make the existing bearing a labelled toggle for the existing camera-follow function. Preserve manual physical control, expose follow state and keep the historical-passage direction marker read-only. | Pointer and keyboard activation, acquisition, release and unchanged physical flight verified in three engines |
| U33 | Space on a focused flight button is swallowed by the flight-input handler. On Photograph it resumes held time without taking a picture. Returning from a menu can leave focus on a HUD button, making the next key ambiguous. | Native buttons own Space while focused; pointer HUD actions, clicking the scene and returning to flight put focus on the canvas. Keyboard Enter/Space retain normal activation while the user is navigating buttons. | Original failure reproduced; current native activation and resumed-flight keys verified |

### Interaction and structure

- The existing bearing becomes the interaction target; no additional toolbar, menu, mode, icon or instruction block is introduced. It retains the body/limb placement, edge arrow, instrument distance and guidance toggle. Hover/focus underlines its name, while a 44-pixel minimum target and explicit accessible label expose its action.
- `ObservationCamera.toggleFollowing` is the single toggle used by the bearing, camera menu and L shortcut. Following still changes only independent camera orientation. A direct bearing activation can switch from a different tracked world; L releases whichever subject is currently tracked. Turning releases following into free look as before.
- `FlightInput` keeps native Space events out of flight state when a button is focused. The application returns focus to the existing canvas after pointer HUD actions and panel closure. The canvas is programmatically focusable and remains outside the Tab order. The landing screen retains its prior focus restoration.
- Toast clearing is shared and clears stale control-mode feedback when following is selected. Existing DOM-write ownership now also avoids repeating unchanged bearing accessibility/title writes.
- The existing camera and menu checks are extended. Two version-named navigation checks are renamed for reuse rather than copied. No imagery, shader, geometry, physics, voyage data, audio, dependency or runtime module is added.

### 0.43 verification

- The previous release is verified to expose a pointer-inert, aria-hidden DIV for the bearing. Space on a deliberately focused Photograph button saves zero photographs and changes `timePaused` from true to false. The observed baseline is retained in `tests/flight-affordances-before.json`.
- Chrome, Firefox and Playwright WebKit pass offscreen acquisition through the actual bearing, a minimum 44-pixel hit area, labelled pressed state, Space release, Enter reacquisition, switching from a different tracked world, and disabled passage interaction. Position, velocity, spacecraft attitude, fuel and encounter time remain bit-for-bit equal before/after acquisition. The existing 240-step tracked/manual physical comparison, smooth lenses, manual release, save/restore, chase photography and synthetic Xbox paths also pass.
- The reusable menu check now runs in all three engines. It verifies a Space-activated photograph with the held clock preserved, keyboard camera activation, return-to-flight focus, the subsequent Space time command, pointer HUD/scene focus, menu traversal, paused-shortcut isolation, native ranges/selects, synthetic Xbox activation and compact pause layouts. No new toolbar or menu item is required.
- Twelve corner/viewport cases per engine retain valid limb leaders and avoid existing interface obstacles. Seven body/study scenes per engine plus partial, offscreen, occulted and screen-filling cases retain correct marker types and visible placement. The larger button target stays within the 1024 × 640 compact viewport.
- The audit tracks 111 findings. U03, V02, V03, V18, A01 and D03 remain open. These checks establish the described interactions; physical Xbox hardware and the actual Safari application remain unverified.

### 0.43 delivery verification

- The independently extracted archive passes all 87 unit checks and verifies all 82 runtime hashes offline. The new direct bearing preserves physical state offline; Space on Photograph records an image while time remains held. Existing exploration, lens, review, chart, journal, settings and local media checks also pass without external requests or browser errors.
- A real v42 → v43 update retains physical state, preferences, photographs, science notes and recorded lenses. Offline reload, previous-cache cleanup and late stale-cache isolation pass.
- The 121-entry archive is 17,018,152 bytes, 1,221 bytes larger than v42. Nine interface/input/camera-coordination files change; 73 runtime files retain their prior hashes. Runtime source grows by 1,438 bytes. No runtime files are added. Rendering imagery, shaders, geometry, sound, physical integration and historical trajectories are unchanged. Final archive and preview verification are recorded in `dist/release-review.json`.


## Revision 0.44 — consistent surface sunlight and shared optics

| ID | Finding | Repair | State |
|---|---|---|---|
| V21 | Earth clouds account for atmospheric extinction of incoming sunlight, but ground diffuse light and ocean glint receive unattenuated sunlight. Near-horizon surface illumination therefore disagrees with the surrounding air. | Apply RGB sunlight transmission from the existing optical-column lookup to both surface reflection components, using the atmosphere's normalized optical coordinates. Keep the existing tiny radiance floor separate. | Numerical transmission, matched-view and unrelated-world regression checks pass; broader material realism remains V02 |
| C15 | The cloud and air shaders repeat the lookup coordinates and extinction coefficients. Adding surface extinction would introduce a third independent implementation. | Share one GLSL optical lookup and transmission helper, and one lookup uniform across Earth materials. Reuse the current verification entry point and retain only a frozen prior surface for comparisons. | Two runtime files change; net source growth is 444 bytes, with no extra assets, passes, textures, geometry, framebuffer or dependency |

- `earthOptics` owns Earth optical coefficients, lookup coordinates and exponential transmission. The surface, clear air, cloud illumination and cloud-front transport use it. `scene-factory.js` binds the already allocated lookup; all geometry, source imagery, input, physical flight, historical passages and sound retain their prior files.
- Surface sunlight uses the same flattened optical coordinates as the atmosphere. Diffuse ground and ocean glint both attenuate spectrally before the existing camera-path transmission. The cloud reconstruction and indirect-light approximation retain their limitations; no claim of spacecraft-photograph equivalence follows from this correction.
- `tests/earth-transmission.mjs` extends the existing runner. Five paired Earth views isolate the surface change with unchanged exposure/imagery/clouds. Twelve HDR material cases cover diffuse/water reflection at solar zenith angles 0, 30, 60, 75, 85 and 89 degrees, compared against independent 8,192-step solar columns. The shared shader is also checked for Moon, Jupiter and Saturn views, allowing only sparse one-step 8-bit rounding differences. Existing RGB-view transport and all five drawing-route checks remain.
- The renderer creates no new asset or draw pass. The two modified runtime sources together grow by 444 bytes. No test fixture or screenshot enters the playable archive.

### 0.44 measured cost and validation

- Chrome's twelve isolated sunlight cases have a maximum absolute transmittance error of 0.000573 against independent integration. Five matched Earth views retain the same draw count and warmed resource counts. The selected night view is identical.
- At 1000 × 625, paired ABBA GPU windows average 12.786 ms (prior surface) versus 12.413 ms (corrected surface) for daylight, and 14.227 versus 13.638 ms for the close view. Each window has 120 measured frames after warm-up. These overlapping short measurements show no observed slowdown in this run; they do not establish a speedup or sustained exhibition performance. Both variants use seven draws in these views.
- All 87 unit checks pass. The repair list now tracks 113 findings; U03, V02, V03, V18, A01 and D03 remain open.

- Chrome, Firefox and Playwright WebKit pass the extended atmospheric suite. Maximum direct-sun transmittance error remains below 0.0006 in each engine. Jupiter and Saturn comparisons are pixel-identical; the lunar view is identical in Chrome/WebKit and differs only in seven of 1,875,000 8-bit channels by one step in Firefox. The current view-path maximum error remains below 0.0094. Composition, layered/adaptive/direct/capture routes and actual chase rendering pass.

### 0.44 delivery verification

- The independently extracted package passes all 87 unit checks and every offline runtime hash. Exploration, direct bearing/physical independence, native Space photography, lenses, flight review, charts, journal, settings and local media pass without external requests or browser errors.
- A real v43 → v44 upgrade retains physical state, options, photographs, science and recorded lenses, including offline reload and stale-cache isolation.
- All 121 archive entries and their hashes match the tested extraction. The 82 runtime files match the primary preview. Two runtime sources change; 80 retain their v43 hashes. Runtime is 19,962,340 bytes (+444); ZIP is 17,019,082 bytes (+930), SHA-256 `5603e468e75468570487cd1118390cee452751f63e651d6a89c99508946bb8ff`. Final verification is recorded in `dist/release-review.json`.


## Revision 0.45 — resolved cloud shadow paths

| ID | Finding | Repair | State |
|---|---|---|---|
| V22 | Four fixed sunlight segments can cross multiple resolved weather texels in a near-horizon view, skipping intervening clouds and producing isolated bright ridges and unstable shadow detail. | Choose four to six quadratic segments from the existing weather footprint. Use the existing short-path coordinate expansion, with a conservative polar/long-path fallback. Compile the small bounded loop without a dynamic break and share the pixel's mip footprint. | Dense-reference, full-column and camera-motion checks recorded below; source-image detail remains V02/V18 |

- One shader module changes. The same cloud field, height reconstruction, optical profile, view integration, atmospheric response, geometry and render passes remain. Texture dimensions come from the bound cloud map, replacing repeated 8K constants. There is no new image, renderer, setting or dependency.
- The first eight-segment candidate improves low-Sun shadows but adds substantial cost in the fixed-Ultra grazing view. Explicit loop expansion removes unnecessary common-view loop overhead. The selected six-segment limit bounds the remaining cost while retaining the useful shadow correction. Uniform redistribution of the original four samples was also checked; it increases linear radiance error across all twelve tested views, so the quadratic placement is retained.
- Reuse `tests/cloud-light.mjs` and `tests/cloud-cost.mjs` rather than adding another release-numbered runner. Retain only the necessary prior shader fixture; all browser comparison media stays outside the playable archive.

### 0.45 numerical and performance verification

- Chrome, Firefox and Playwright WebKit each pass twelve matched views, two camera-motion comparisons and nine independent full-Sun-column cases. The near-horizon close view's mean premultiplied linear radiance error falls by approximately 48%; terminator and polar errors fall by approximately 26% and 21%. Small-turn temporal error falls by approximately 37%. The dense 128-segment result confirms convergence against the 64-segment reference. These are numerical measurements inside the reconstructed cloud model.
- The GPU Sun-loop diagnostic covers 1.5 / 4 / 7 km altitude and solar cosines 0.7 / 0.1 / 0.02. Maximum relative optical-depth error is 0.743% against independent 8,192-step density integration. The test checks that the complete sunlight path is retained. One source constant supplies the segment cap and loop bound; replacing the two literals with that constant leaves both generated shader variants byte-identical.
- At fixed 1280 × 800 Ultra, final paired ABBA median-window averages are 40.573 → 42.122 ms (+3.8%) for the ordinary close view and 41.804 → 47.266 ms (+13.1%) for the near-horizon close view. Both use seven draws and identical geometry. This is an explicit quality/cost tradeoff on the measured host, with adaptive resolution and held-frame caching excluded. It establishes neither a global speedup nor exhibition-hardware FPS; V03 remains open.
- Runtime source grows by 667 bytes in one file. No asset, dependency, frame buffer, drawing pass or runtime file is added. Input, camera control, manual physics, historical passages and sound retain their v44 source files. The audit now tracks 114 findings; U03, V02, V03, V18, A01 and D03 remain open.

- The existing atmospheric suite also passes in all three engines: RGB transmission, isolated surface illumination, merged/split composition, adaptive cloud resolution, multisampling, direct drawing, capture and chase views. All 87 source unit checks pass. Source-image resolution and the remaining cloud-height/scattering approximation remain open under V02/V18.

### 0.45 delivery verification

- The independently extracted archive passes all 87 unit checks and all 82 offline runtime hashes. Exploration, bearing/camera independence, held-time native photography, flight review, lenses, charts, journal, settings and local media pass without external requests or browser errors.
- A real v44 → v45 upgrade preserves physical state, options, science notes, photographs and recorded lenses. Offline reload, old-cache cleanup and stale-cache isolation pass.
- Every archive entry matches its manifest and the tested extraction. Runtime files match the primary preview. One runtime file changes; 81 retain their v44 hashes. Runtime is 19,963,007 bytes (+667); ZIP is 17,019,976 bytes (+894), with 121 entries. SHA-256: `0c7eb7dafcb11334208105f71025a54b2f15bd2f6c7755b156906c4e5498c0c4`. See `dist/release-review.json` for measured scope and remaining findings.


## Revision 0.46 — reuse atmospheric columns

| ID | Finding | Repair | State |
|---|---|---|---|
| C16 | The clear-air transmission pass reintegrates density at 6–20 points per pixel although the existing solar lookup already stores the same atmospheric columns. | Obtain the bounded view column from outward lookup differences, splitting tangent-crossing paths into two outward halves. Skip zero columns at the atmosphere top, reuse existing optical data and ray bounds, and retain the scattering integration. | Independent ray integration and matched-view checks recorded below; sustained performance remains V03 |

- Only `src/rendering/shaders.js` changes in the playable runtime. The transmission branch uses at most two table reads, or three for a tangent-crossing ray. Known zero columns at the clipped atmosphere top skip their lookup, leaving one read for ordinary exterior rays. Positive-direction columns avoid interpolation across the lookup's ground horizon. Ground intersections and partial endpoints keep the existing physical clipping.
- The existing optical helper remains the single owner of lookup coordinates and extinction coefficients. This adds no texture, asset, geometry, framebuffer, drawing pass, dependency, setting or runtime file. Cloud shading, manual control, physics, historical voyage, camera, interface and audio retain their previous implementations. Runtime source grows by 629 bytes.
- The reusable `tests/earth-transmission.mjs` now includes seven v45/current paired views and 147 independent full/bounded rays per engine. Origins range from 100 m altitude to one Earth radius above the surface; cases cover approaching/leaving/crossing the tangent, rays missing the air, and endpoints at one-quarter/three-quarters of the segment. The reference directly integrates density with 8,192 samples. The prior transmission shader remains only as a development fixture.
- Initial Chrome checks reduce the existing coloured-background maximum error from 0.009395 to 0.001177. Across the wider 147-ray check, the maximum absolute transmission error is 0.002731, versus 0.009459 for the previous method. The seven displayed image pairs differ by at most one 8-bit channel step and have mean differences below 0.0003 steps; draw counts and warmed geometry/texture counts are unchanged.
- Initial 1000 × 625 paired ABBA measurements give 12.381 → 12.861 ms for daylight (+3.9%) and 15.719 → 14.513 ms for the close view (−7.7%). The overlapping short windows support a close-view improvement in that run, not a general speedup. A per-object query experiment was discarded because this host's deferred GPU execution prevented clean attribution to individual passes.

- A repeated first-candidate timing run again showed no stable daylight improvement. The final candidate skips the mathematically zero outward columns at clipped top-of-atmosphere endpoints; ordinary exterior rays now need one lookup. The bounded/inside-air cases retain the appropriate column differences. Final comparisons below refer to that version.

### 0.46 final rendering verification

- Chrome, Firefox and Playwright WebKit pass 147 independent rays each (441 total), 21 paired displayed views, the existing coloured-background checks, surface-sunlight checks, unrelated worlds and all composition routes. Maximum independent transmission error is 0.002731; the coloured-background maximum is 0.001177. Every matched view differs from v45 by at most one 8-bit channel step, with mean difference below 0.001 steps.
- The final fixed 1000 × 625 ABBA run gives 13.514 → 12.625 ms for daylight (−6.6%) and 17.819 → 15.689 ms for the close view (−12.0%). Each variant is warmed for 120 frames, then measured in two 120-frame windows. Both keep seven draws, 20 warmed geometries and 27 textures. Low-power mode is configured on the host; window variation and the short duration limit these results to the measured scenes. Sustained/hardware performance remains V03.
- Removing the disabled transmission branch leaves the other ten exported shader programs token-identical to v45. The one optical table, renderer ownership and all source assets remain in place. All 87 source and independently extracted unit checks pass. The audit now tracks 115 findings; U03, V02, V03, V18, A01 and D03 remain open.

### 0.46 delivery verification

- The final independently extracted archive passes all 87 unit checks and every one of the 82 offline runtime hashes. Exploration, physical flight, camera/bearing independence, held-time photography, lenses, review, charts, journal, settings and local media pass without external requests or browser errors.
- A real v45 → v46 upgrade retains physical state, options, photographs, science notes and recorded lenses. Offline reload, old-cache cleanup and late stale-cache isolation pass.
- All 121 archive entries match their manifest, the current workspace and the tested extraction. Runtime and service-worker files match the primary preview. One runtime source changes; 81 retain their v45 hashes. Runtime is 19,963,636 bytes (+629); ZIP is 17,020,662 bytes (+686), SHA-256 `161c901b197af7d84ac18c581419b180dd72bd6a6e9b450911de5e49f19a0d42`. Final scope and measurements are recorded in `dist/release-review.json`.


## Revision 0.47 — consistent cloud shadows on the surface

| ID | Finding | Repair | State |
|---|---|---|---|
| V23 | Ground clouds use a flat UV offset, a height inferred beneath the shaded point, and a solar-elevation floor of 0.08. Their shadows and blocked ocean reflection therefore disagree with the visible cloud volume, especially near the terminator. | Trace the surface-to-Sun ray through the existing cloud density field in normalized optical coordinates. Integrate its vertical profile and allocate 6–24 samples by resolved lateral weather distance; reuse the short-path coordinate expansion, with exact mapping near poles and along long paths. | Numerical, dense-reference, performance and browser checks recorded below |
| C17 | Surface, view and sunlight paths repeat cloud-top and optical-depth parameters, and the surface keeps a separate shadow model. | Share cloud-column mapping, the scalar density integral and sunlight-coordinate helper in `earthCloudDensity`; replace the surface offset formula. Keep geometry, shading ownership and resources in their existing modules. | One runtime file changes; no asset, dependency, setting, render target or draw pass is added |

- NASA/Don Pettit's orbital cloud photograph (SVS 31347, Earth's Day-Night Shadow) was inspected alongside the game. It emphasizes fine cloud structure, multiple cloud levels and long shadow paths. This revision corrects the inconsistent ground path; source-map resolution, inferred height structure and broader photographic realism remain open under V02/V18. The reference remains outside the runtime.
- The prior surface shader is retained only as a development fixture. The current atmospheric runner adds seven matched full views, isolated-surface 128/256-segment comparisons and 24 independently integrated uniform-cloud columns. A near-noon seam view has only one-step 8-bit differences, so it has a non-regression bound rather than the stronger improvement threshold used for the affected low-Sun views.
- Existing short-path map and cloud-light checks are reused after moving their unchanged coordinate implementation into shared ownership. Historical QA files remain outside the playable archive.

### 0.47 sampling and cost selection

- The first 8–32-segment candidate passes the numerical checks but adds approximately 12% daylight and 19% close-view cost in the fixed-quality run. A 4–16 experiment loses too much terminator detail against the dense reference and is rejected. The selected 6–24 budget retains the full geometric ray while bounding sampling work.
- Chrome's seven isolated surface comparisons reduce mean error by approximately 85% (day), 79% (terminator), 73% (close), 95% (low Sun), 53% (glint), 95% (pole) and 29% (seam) against 128 segments. The 256-segment reference checks convergence. These measure agreement with the reconstructed density model, not with a photograph.
- Across 24 independent uniform-cloud columns, maximum absolute transmission error is 0.000725 versus 0.317376 for the old approximation. Cases span coverage 0.1–1 and solar zenith angles 0–89.9°. The production surface shader supplies the measured shadow, before radiance/tone mapping can hide tiny low-Sun contributions.
- Final selected-budget ABBA window averages at 1000 × 625 are 12.708 → 13.725 ms for daylight (+8.0%) and 13.437 → 15.049 ms for the close view (+12.0%). Each variant is warmed for 120 frames and measured in two 120-frame windows. Both retain seven draws and the same warmed geometry/texture counts. This is a measured quality/cost tradeoff; V03 remains open.

- The final source gives the ground sample cap and compiled loop bound one shared constant, following the existing cloud-Sun convention. All eleven generated shader programs remain byte-identical to the fully checked 6–24 implementation after this source-only cleanup. Runtime grows by 1,565 bytes in one file; no runtime file is added.

### 0.47 final regression and delivery verification

- Chrome, Firefox and Playwright WebKit pass 21 ground-shadow view comparisons and 72 independent shadow columns, with maximum absolute transmission error 0.000725. Existing atmospheric transport, surface sunlight, composition, capture/chase routes and unrelated-world checks also pass.
- The shared coordinate helper passes 49,152 GPU samples across the three engines, including poles, seams and long paths; maximum error is 0.00414 of an 8K source texel. Cloud lighting passes 36 matched views, 27 independent sunlight columns and six motion comparisons. Eight other shader exports are byte-identical to v46.
- The independently extracted final archive passes all 87 unit checks and every one of its 82 offline runtime hashes. Exploration, manual flight, bearing/camera independence, held-time photography, lens/review, charts, journal, settings and local media pass without external requests or browser errors.
- A real v46 → v47 upgrade preserves physical state, flight options, photographs, science notes and recorded lenses. Offline reload, old-cache cleanup and stale-cache isolation pass.
- All 121 archive entries match their manifest, the workspace and the tested extraction; runtime and service-worker bytes match the primary preview. One runtime file changes; 81 retain their v46 hashes. Runtime is 19,965,201 bytes (+1,565); ZIP is 17,022,188 bytes (+1,526), SHA-256 `e87f579917aa7f8af0e448ecd7e05ce4756fc55f3bedd3906da6614ca97be484`. See `dist/release-review.json` for the exact measured scope.
- The audit tracks 117 findings. U03, V02, V03, V18, A01 and D03 remain open. This correction establishes consistent shadows within the current reconstruction; photographic equivalence, subjective listening, physical Xbox and sustained exhibition-hardware performance are not established.


## Revision 0.48 — bounded spacecraft reflection updates

| ID | Finding | Repair | State |
|---|---|---|---|
| C18 | Every nonzero displacement invalidates the chase-view environment map, causing a six-face capture and reflection prefilter every 0.8 seconds even when the reflected scene barely changes. Held-frame settling duplicates that exact-position condition. | Share one invalidation method in CosmosWorld. Bound movement using the existing cube-map resolution and distance to the nearest outer mesh; derive bounds from geometry rather than repeating ring/atmosphere sizes. Keep explicit epoch/context invalidation and retain per-pose direct sunlight/shadows. | Three engines pass 162 image pairs and matching coast checks; exhibition performance remains V03 |

- Two shader experiments were rejected: expanding the ground-shadow loop and specializing the Earth material. Fixed-scene windows did not establish a stable overall improvement. Both were removed; all material equations are byte-identical to the delivered v47 source.
- The accepted change uses the existing 64-pixel cube target, PMREM owner, cached position and dirty flag. A movement budget of nearest-surface clearance divided by four times cube width bounds reflection reuse. Nearby motion exhausts that budget sooner; distant stars/geometry do not force the same update rate. This is a bounded approximation to indirect light, not exact pixel caching. The direct frame, physical integration and shadow updates remain independent.
- `tests/held-view.mjs` replaces its v23 predecessor and updates obsolete settings/reading-time assumptions. It retains held-time rendering, steering, camera, sound and science checks. Nine studies compare forced and reused maps along six offsets just below the threshold, check threshold crossings and physical-state independence, and count actual environment captures over matching 12.96-second linear coasts.
- `tests/endurance.mjs` absorbs the v32 runner. It now counts actual scene draws and advancing simulation time as well as animation intervals, checks one playing score and stable warmed resources, and visits nine studies in both camera modes. The duplicate v32 source is removed; historical reports remain outside the playable package.

### 0.48 reflection verification

- Chrome, Firefox and Playwright WebKit pass 54 cached/forced-refresh image pairs each across nine studies (162 total). Maximum displayed-channel difference is one 8-bit step; all physical-state and threshold-crossing checks pass. At the tested offsets, Earth and ring-plane captures were also visually inspected.
- Each engine records the same change over nine matching 12.96-second coasts: 144 former environment captures become 25. Per study: Earth 16 → 4, Moon 16 → 5, Io/Titan 16 → 8 each, and Jupiter/Saturn/ring-plane/distant encounters 16 → 0. Initial captures are excluded on both sides. This counts removed work, not measured FPS improvement.
- Held frames retain identical pixels; steering, lens changes, exposure and resize redraw promptly. Music and view-dependent science continue while time is held. Actual coasting keeps rendering, and pending reflection changes settle before held-frame reuse.

- The development guide now describes current ownership, reusable checks and reproduction inputs. Duplicate chronological release prose is removed from that guide; the evidence ledger retains history. The playable archive keeps the concise guide and current issue list.

### 0.48 sustained-run investigation

- The first six-minute run failed: the first Moon chase visit recorded an approximately eight-second frame and only 0.05 simulated seconds, followed by one observed graphics-context loss. Rendering resumed. The full failed samples remain in `tests/endurance-first-v48-results.json`. This result is retained rather than represented as a successful endurance run.
- The consolidated runner now reads the tested server's version, supports selecting studies and retaining named reports, and writes completed failed runs before asserting. A focused Earth/Moon/Jupiter comparison uses the independently extracted v47 release and the current runtime.

- Matching focused repeats pass on the separately extracted v47 and current v48: four rounds through Earth/Moon/Jupiter (about 120 seconds each), both camera modes, no context loss, one score and stable warmed resources. Every sampled animation tick also renders and physical time advances. These repeats do not explain the earlier six-minute failure. V03 now explicitly records that unresolved stall/reset; no sustained-reliability or FPS improvement is claimed.

### 0.48 delivery verification

- All 87 source and independently extracted unit checks pass. The extracted package passes every one of its 82 offline runtime hashes, exploration/flight, camera independence, native held-time photography, review/lenses, charts, journal, settings and local media. No external requests or browser errors are observed.
- A real v47 → v48 cache/save upgrade retains physical flight, options, photographs, science notes and recorded lenses. Offline reload, old-cache removal and stale-cache isolation pass. The Chrome atmospheric regression also passes; the shader source remains identical to v47.
- All 121 archive entries match the manifest, current workspace and tested extraction. Runtime and worker files match the primary preview. Two runtime sources change and 80 retain their prior hashes. Runtime is 19,965,974 bytes (+773); ZIP is 17,019,867 bytes (2,321 fewer than v47), SHA-256 `964a5c72685271329805c2e2c91c5af6d16cb58b3e3c5846b826f872b17218d5`. No runtime file, asset, dependency or render target is added.
- The audit retains 118 findings, with U03, V02, V03, V18, A01 and D03 open. The failed six-minute graphics run remains in the release evidence alongside successful focused repeats; its cause is unresolved. Further work prioritizes the complete exploration experience, visual/audio coherence and clear optional guidance while retaining the small architecture.


## Revision 0.49 — orienting the voyage

| ID | Finding | Repair | State |
|---|---|---|---|
| E24 | During passage, Voyage opens the chapter list before the spatial chart. That chart shows only the travelled trail, so the remaining route and next arrival position are absent. Map tabs can also carry the wrong context into a new encounter. | Open nearby exploration for an encounter, the solar chart for passage and chapters from the title screen. Show solid travelled and dashed remaining portions of the same historical curve, distinguish the future Voyager arrival from current planet markers, fit the upcoming leg and retain manual scale choices. | Three engines pass 45 passage views, nine layouts and the Moon-to-Jupiter UI flow; delivery verification below |

- A fresh UI playthrough covered opening Earth flight, manual turning, the nearby atlas, Moon exploration, the camera panel and departure. It reproduced the chapter-list detour and missing spatial continuation. The refinement uses the existing atlas and controls; it adds no gameplay mode, flight controller or asset.
- `solar-chart-state.js` owns the read-only route. One bounded `voyagePath(records,start,end)` replaces the former past-only helper. Playback and route display share the existing trajectory samples/interpolation. The future marker is a Voyager position at the next node, not a planet shifted away from its current date.
- The existing label owner handles the arrival marker; the same ResizeObserver lifecycle handles responsive type and collisions. The chart markup is separated into named presentation sections rather than extending one uninterrupted template. Five runtime files change; no runtime file or dependency is added.
- Automatic fitting preserves the selected object's margin and lets the route reach the chart's physical edge. It avoids fitting a roughly 34 AU projected leg to 100 AU solely because padding would exceed 35 AU. Explicit scale selections and body inspection remain available.
- The browser runner is promoted from `transit-chart-v28.mjs` to `transit-chart.mjs` with current-version reports. Historical results retain their source labels.

### 0.49 experience and chart verification

- Chrome, Firefox and Playwright WebKit each pass fifteen dates across all five passages. The remaining path joins the current Voyager marker and ends at the distinct arrival marker; the full leg fits automatically. Current Earth distance/light time and the historical/projected dates agree with the flight state. Visible chart labels do not overlap.
- Each engine passes 1440 × 900, 1024 × 640 and 720 × 640 layouts with the return action available. Screenshots were inspected at desktop and compact sizes. Automatic fitting retains a useful 35 AU view of the Pale Blue Dot leg instead of needlessly selecting 100 AU; manual zoom remains authoritative.
- The UI-only Moon-to-Jupiter flow passes in all three engines: select the nearby Moon study, take a photograph, depart, inspect the route, accelerate calendar playback, arrive at Jupiter and open nearby Io exploration. The photograph remains in the journal. Chart inspection leaves held physical state unchanged.
- Existing keyboard/native-button/synthetic-Xbox navigation checks pass in all three engines. All 88 source unit checks pass, including bounded path endpoints and an already-arrived one-point interval. These checks do not claim physical Xbox validation or resolve the earlier sustained graphics reset in V03.

### 0.49 delivery verification

- The independently extracted final archive passes all 88 unit checks and all 82 offline runtime hashes. The remaining-route and arrival markers render offline. Flight, photography, charts, recorded lenses/review, settings, local media and native bearing controls pass without external requests or browser errors.
- A real v48 → v49 cache/save upgrade preserves physical flight, options, photographs, science notes and historical lenses. Offline reload, old-cache removal and stale-cache isolation pass.
- All 121 archive entries match the manifest, workspace and tested extraction; runtime and worker files match the primary preview. Five runtime sources change and 77 retain their v48 hashes. Runtime is 19,969,243 bytes (+3,269); ZIP is 17,021,997 bytes (+2,130), SHA-256 `09628527b5b8f9d34ef248b89d1722d54f4a25da0300d1916215638a0a0f1c45`. Existing assets, renderer, physical integration, audio and trajectory data remain unchanged.
- The audit now records 119 findings; U03, V02, V03, V18, A01 and D03 remain open. This pass improves voyage orientation and exploration continuity. It does not claim photographic equivalence, resolve the sustained graphics reset, or establish physical-controller/listening verification.


## Revision 0.50 — preserving flight through graphics recovery

| ID | Finding | Repair | State |
|---|---|---|---|
| D13 | The renderer restores a lost graphics context, but active flight keeps advancing while the picture is unavailable. A held or already-paused recovery check misses the resulting invisible motion. | Pause through the existing application lifecycle, skip input/physics/render work while the context is lost, block premature resumption and rearm controls on restoration. Preserve an existing panel or review preview and require an explicit resume. | Three engines pass 18 recovery scenarios, preserved state, explicit resumption and held-input checks; the driver-reset cause remains V03 |

- An injected loss in delivered v49 reproduces the defect: during 800 ms without the picture, the Moon flight remains in play, advances 10.041 simulated seconds and attempts 49 renders. The original result is retained in `tests/context-recovery-before-v50-results.json`.
- Only `src/main.js` changes among the 82 runtime files. Its lifecycle reuses the existing pause menu, input rearming, frame policy, photograph guard and renderer restoration. No module, dependency, asset, render pass, physics rule or parallel recovery state machine is added. Runtime growth is 824 bytes.
- `tests/context-recovery.mjs` replaces the old v32 source. Historical reports remain development evidence. Current checks cover moving local flight, historical passage, held time, paused panels and an existing review preview; synthetic held input must be released before it can steer or consume fuel again.

### 0.50 recovery verification

- Chrome, Firefox and Playwright WebKit pass all six scenarios each (18 total). Position, velocity, attitude, propellant, physical/passage time, selected time rate, held-time state, lens, look and review/history state remain exact throughout the interruption and restoration. There are zero render attempts while the context is unavailable; recovered paused pictures settle to zero further draws.
- The restored image contains visible scene pixels in every case, including the sparse passage starfield. Full-resolution checks retain small stars that would disappear when downsampled. The recovery and restored Moon menus were visually inspected at 1000 × 625; both use the existing layout.
- The lost-context shutter retains the existing photograph count. An attempted Escape cannot resume while the view is unavailable. Restoration clears stale keys and blocks held synthetic controller axes/triggers; explicit resume advances physical or passage time, while a pre-existing time hold stays held. Fresh input responds again after release.
- All 88 source unit checks pass. These injected faults verify interruption handling, not the cause of the earlier sustained driver reset. V03 remains open; this revision does not claim a fresh endurance pass.

### 0.50 delivery verification

- Existing keyboard/native-button and synthetic Xbox menu checks pass in Chrome, Firefox and Playwright WebKit. Both source and independently extracted unit suites pass all 88 checks.
- The independently extracted ZIP passes every one of its 82 offline runtime hashes. Flight, photography, historical charts and arrival markers, lenses/review, settings and local media work without external requests or browser errors. A real v49 → v50 upgrade preserves physical state, options, photographs, science notes and historical lenses; offline reload and cache isolation pass.
- All 121 archive entries match the workspace and tested extraction. Runtime and worker bytes match the primary preview. Only one runtime file changes; the other 81, including all imagery, shaders, physical integration, audio and trajectory data, retain their v49 hashes. Runtime is 19,970,067 bytes (+824); ZIP is 17,022,801 bytes (+804), SHA-256 `4aa734a213d7f01ff2b410bf545243c80aebea1c110ba1218e9ad865b1931105`.
- `dist/release-review.json` records current checks and their source/report hashes. The audit has 120 observed findings; U03, V02, V03, V18, A01 and D03 remain open. Simulated recovery safety is repaired; the earlier sustained graphics-reset cause remains unresolved.


## Revision 0.51 — protecting the view and clarifying camera following

| ID | Finding | Repair | State |
|---|---|---|---|
| U34 | The resolved-world bearing avoids a few interface panels but ignores other visible bodies and the flight hint. In the Moon study it covers distant Earth, undermining the paired-world composition; its leader can also cross the opening controls. | Supply other projected local-world/Sun bounds and the existing flight-control bounds to the shared label/leader solver. Reuse physical silhouette geometry and stable placement, and ignore empty interface rectangles. | Repaired; three engines pass 144 paired views and 36 corner views, including control clearance and physical-state checks; broader refinement remains U03 |

- A normal opening-to-Moon review found that the opening Earth coasts out of the frame, while the existing clickable bearing reads as passive telemetry. Its available action now reads Follow Earth (or the current subject); acquisition retains the existing following state. This refines the E23 control instead of adding another button or tutorial. Camera behavior and physical flight are unchanged.
- The old Moon-study overlap is retained in `tests/bearing-pair-before-v51-results.json` and its screenshot. At 1440 × 900 the Earth disc spans x 945.6–973.0, y 452.7–479.0; the Moon label spans x 954.6–1038.4, y 425.5–474.5. The label covers the world the invitation asks the player to observe.
- Two existing runtime files change: `src/ui/flight-hud.js` and `src/ui/bearing-layout.js`. Interface rectangles still refresh through ResizeObserver; moving body bounds reuse `discFraming`. The existing solver owns stable placement and leader clearance. In a compact corner view, a straight leader can meet telemetry even when its label fits; one bounded bend is available only after straight placement fails, while a valid previous side remains stable. Every segment stays outside the body and clear of protected rectangles. No controller, state machine, image, dependency, render pass or physical rule is added. Runtime source growth is 2,226 bytes.
- The existing `bearing-scenes.mjs` gains paired-world coverage and current engine/version metadata. `observation-camera.mjs` checks the visible action and acquired state alongside its existing physical-independence and input checks. No release-specific runner is added.

### 0.51 visual and navigation verification

- Chrome, Firefox and Playwright WebKit pass 48 paired-world views each (144 total): Moon/Earth and Io/Jupiter, 1440 × 900 / 1024 × 640 / 800 × 600, 58° / 40° lenses and four rolls. The other world remains visible; labels and every sampled leader segment clear its projected bounds and current interface text. Physical position, velocity, attitude, fuel and local time stay exact.
- All 36 clipped-corner views retain a visible limb leader. Independent silhouette sampling verifies its seven-pixel gap, while the corresponding physical ray remains tangent to Earth. Every straight or bent segment clears current interface bounds. Held-time selection, limited time flow, passage departure, temporary holds, compact controls and synthetic Xbox timing also pass in all three engines.
- A compact 800 × 600 regression exposed an overlarge footer exclusion. Reserving the actual telemetry and tool groups restores the useful middle space; a single bounded bend handles the remaining case where a visible limb lies beneath telemetry. The existing layout solver owns both paths. Its unit regression checks the entire path stays outside the body and protected rectangles, retains its side and returns to a straight path where space permits. The full source suite passes 89 checks.
- Final Moon/Earth, compact Io/Jupiter and compact corner captures were visually inspected. The earlier v50 overlap remains retained as baseline evidence. These changes improve annotation and optional camera control, not material realism; U03, V02, V03, V18, A01 and D03 remain open.

### 0.51 interaction and delivery verification

- The existing camera suite passes in all three engines: visible Follow action and acquired state, pointer/keyboard activation, held-view reuse, release and reacquisition, independent physical coast, saved tracking, synthetic Xbox control, camera panel/lenses, chase photographs and read-only passage bearings.
- A separate fresh Chrome walkthrough enters the voyage, coasts until Earth leaves the frame, activates the moving Follow Earth bearing, verifies the tracked world returns near the camera centre, enters Moon exploration, opens the camera and continues to the historical passage/chart. Its eight states and actual captures are retained under `/private/tmp/cosmos-exploration-v51/`. The moving-button review clicks its current hit area rather than waiting for the target to stop moving. Normal Moon/followed-Earth images and unchanged menu/date pixels were visually checked, including enlarged crops.
- The source and independently extracted package each pass all 89 unit checks. The extracted archive matches all 82 offline runtime hashes and passes exploration, manual flight, camera/bearing independence, photography, lenses/review, historical charts/arrival markers, journal, settings and local media without external requests or browser errors.
- A real v50 → v51 upgrade preserves physical flight, options, photographs, science notes and recorded lenses. Offline reload, obsolete-cache cleanup and stale-cache isolation pass.
- Every archive entry matches its manifest, the workspace and the tested extraction. Runtime and worker bytes match the primary preview. Two runtime files change; the other 80, including render materials/assets, physics, camera control, audio and trajectory data, retain their v50 hashes. Runtime is 19,972,293 bytes (+2,226); ZIP is 17,024,679 bytes (+1,878), SHA-256 `da900ef03502e30651ce945c79f7c0f8b5ec9a03979c54e4c7aab5a5f013a716`.
- The audit tracks 121 findings. U34 is repaired, E23's visible action is refined, and U03, V02, V03, V18, A01 and D03 remain open. No sustained-performance, photographic-equivalence, physical-controller or subjective-listening claim is added by this interface pass.


## Revision 0.52 — daytime sky illumination of clouds

| ID | Finding | Repair | State |
|---|---|---|---|
| V24 | Daytime cloud light includes reddened direct sunlight but omits incident sky scattering, contributing to a warm cast. | Add a bounded single-Rayleigh-scattered sky irradiance integral using existing air columns, evaluated at the existing representative cloud depth with approximate cloud shielding. | Daytime component added; numerical and browser evidence below. Curved twilight and coupled multiple scattering remain part of V02 |

- One runtime source changes: `src/rendering/shaders.js`, +1,629 bytes. There is no new texture, target, pass, asset, dependency or runtime module. Direct light, cloud density/coverage, view-path air, tone mapping and exposure retain their existing implementation. Physical flight and interface code are unchanged.
- This is a plane-parallel daytime approximation, integrated with six Gaussian elevations and exact azimuth averaging. It reuses the density columns already owned by the atmosphere. The light is zero when the Sun is below the local horizontal horizon. It does not model curved twilight, diffuse ground lighting, cloud/air feedback or higher scattering orders. The existing inferred cloud density and representative-depth approximation remain. V02 and V18 stay open.
- Existing `cloud-light.mjs` isolates the sky term when comparing historical sunlight integrators, then separately checks the complete shipping cloud shader and 45 irradiance cases against independent 8,192-elevation integration. `cloud-cost.mjs` accepts a supplied prior shader instead of copying a new timing program. No historical fixture is rewritten.
- Pre-release Chrome timing compares the delivered v51 cloud shader with the final shader identified by SHA-256 in `tests/cloud-cost-results.json`. At 1280 × 800, Ultra, low-power mode enabled, ABBA medians average 32.04 → 32.74 ms for day (+2.2%), 30.27 → 31.88 ms for close clouds (+5.3%), and 35.19 → 36.04 ms for grazing (+2.4%). Each window contains 120 GPU samples after warm-up. Draw calls and triangles are unchanged. These fixed-scene costs do not establish sustained exhibition performance; the earlier context-reset cause remains V03.

### 0.52 light verification

- Chrome, Firefox and Playwright WebKit pass twelve cloud scenes each (36 total), including day, terminator, crescent/night, close, grazing, small camera rotations, resolved cloud/limb, pole and texture seam. Complete illuminated frames preserve exact opacity, add finite nonnegative radiance and retain the validated direct-light integrator. The 27 independent Sun-column cases also pass.
- All 135 sky-irradiance cases pass. Maximum absolute error against the independent plane-parallel quadrature is below 0.00009 of incident solar flux. Below-horizon results are exactly zero. This verifies numerical implementation within the stated approximation, not complete real atmospheric transport.
- Day, close and terminator captures were inspected. Relative to matched unmodified-light frames, bright warm pixels retain smaller red–blue channel differences; geographic texture, cloud coverage, shadow placement and existing exposure remain. The NASA/Don Pettit reference was reviewed for qualitative cloud/illumination context; it is not a matched camera/geography validation. All 89 source unit checks pass.

- The existing atmospheric suite passes in all three engines, including merged/split cloud composition, adaptive resolution, multisampling, capture and chase routes; bounded/full optical columns, background RGB transport, ground shadows and unchanged Moon/Jupiter/Saturn surface comparisons also pass. The new sky term is included in the production composition paths. Existing material fixtures remain unchanged.

- A fresh normal-UI walkthrough enters the opening flight, coasts, follows Earth, opens Moon exploration, changes camera view and continues into the historical passage/chart. Eight recorded states are retained in `/private/tmp/cosmos-exploration-v52/`. The followed-Earth capture was visually inspected at 1440 × 900. This shader pass adds no interface actions or flight rules.

### 0.52 delivery verification

- Source and independently extracted unit suites pass 89 checks each. The extracted archive passes all 82 runtime hashes, manual flight, optional following, photography, recorded lenses/review, charts, journal, settings and local media, with no external requests or browser errors.
- A real v51 → v52 update preserves physical state, flight options, photographs, science notes and recorded lenses; offline reload and obsolete/stale-cache isolation pass.
- All 121 archive entries match the manifest, source workspace and tested extraction. Runtime and worker files match the primary preview. One runtime file changes; 81 retain their prior hashes. Runtime is 19,973,922 bytes (+1,629); ZIP is 17,026,130 bytes (+1,451), SHA-256 `d96ecffb031b949e716a95e438e56f470a41d15af3a4f1b78d58a37407747568`. Final checks and source/report hashes are recorded in `dist/release-review.json`.
- The audit now tracks 122 findings. The daytime component addresses V24 within its documented approximation; U03, V02, V03, V18, A01 and D03 remain open. No photographic-equivalence, sustained-run, installed-Safari, physical-controller or subjective-listening claim is added.


## Revision 0.53 — direct viewpoint choices and one bearing state

| ID | Finding | Repair | State |
|---|---|---|---|
| U35 | At 800 × 600, the encounter chart occupies the first screen while every viewpoint is below the fold. A second composition list repeats the same scenes but only changes a bearing; selecting a named scene can appear to do nothing. | Put explicit viewpoint starts first in DOM/focus order and wide/compact layouts. Use each study's scene title once, retain the separate-pass/journal explanation, and remove the duplicate composition list. Keep bearings, coast forecasts and continuation available. | First-screen layout and actual six-study activation checked below; broader U03 remains open |
| C19 | The removed route/suggestion interfaces leave inert route indices, path arrays and suggestion flags in initialization, saves, restores and review. A composition selection duplicates the existing destination bearing state. | Remove the dead fields, handlers, labels and styles. Restore old composition choices once into `destination`; new saves use only that explicit bearing field. Keep opportunity recognition and optional held observation independently functional. | Runtime source shrinks; old-save migration and current interaction evidence recorded below |

- The v52 baseline was reproduced through the normal voyage menu in three encounter chapters and three window sizes. Its captures and control rectangles are retained in `tests/encounter-menu-before-v53-results.json` and `tests/screenshots/encounter-menu-before-v53.png`. At 800 × 600, Saturn's three study actions are all below the visible body of the menu.
- `STUDIES` remains the single owner of viewpoint titles and starting states. Repeated short menu labels and unused opportunity hints are removed. Native buttons retain the existing typography, line treatment and keyboard/controller focus. The six studies, their dates, physical start states and all scene assets remain intact.
- Eight existing runtime files change, with a net reduction of 3,003 bytes before any delivery documentation. No runtime module, asset, dependency, state machine or visual effect is added. The old route/suggestion handlers and save fields are removed rather than layered beneath new menu behavior.

### 0.53 menu and control verification

- Chrome, Firefox and Playwright WebKit pass nine first-entry layouts each (27 total): Earth, Jupiter and Saturn at 1440 × 900, 1024 × 640 and 800 × 600. Every current chapter's study action is visible above the fixed footer without scrolling; targets are at least 44 pixels tall, and the first encounter action is a viewpoint. Duplicate composition/suggestion controls are absent. The Earth wide menu and Saturn compact/wide menus were visually inspected.
- Each engine activates all six study entries through the actual menu (18 visits), using keyboard Enter, native Space and synthetic Xbox A. Correct scene titles, historical epochs/times and existing journal photographs are retained. An active study explicitly reads Restart and carries a current-location marker. Selecting another subject preserves exact position, velocity and fuel.
- Existing native-button Space, pointer focus, menu return, keyboard arrows/Tab, controller selection/ranges, review cancellation and compact pause checks pass. All 89 source unit checks pass. Physical Xbox hardware remains D03.

- All three engines pass the existing photograph suite: independent shutter, deliberately held observations, exploration records, pending-command coalescing, physical-state preservation, receipt/viewer navigation, explicit export, storage fallback, failure/retry and late writes during study changes. Removing the old suggestion flag does not remove player-triggered held observation or opportunity recognition.

- The existing flight-menu entry now reads Explore beside local worlds and Voyage in historical passage/distant chapters. The existing menu action and routing own both names; no additional control is introduced. Final menu checks include the visible label and transition to the passage's solar chart.

### 0.53 delivery verification

- Source and final independently extracted unit suites pass 89 checks each. The final extracted archive passes all 82 runtime hashes and its offline flight, optional following, photography, review/lenses, charts, journal, settings and local-media checks, with no external requests or browser errors. The contextual Explore/Voyage label is covered by the final three-engine menu run and the final offline package.
- The v52 → v53 worker upgrade and offline reload preserve physical flight, options, photographs, science notes and historical lenses. A legacy-save fixture selects the ring-edge composition while retaining a different explicit destination; the restored bearing correctly becomes Saturn, with the old hidden-guidance preference preserved. Re-enabling guidance shows Follow Saturn. The four retired fields are absent from live state and the rewritten save. The fixture is installed at new-document creation because the old page's ordinary beforeunload save otherwise overwrites an earlier storage-only injection.
- Every archive entry matches its manifest, the workspace and the tested extraction. Runtime and worker files match the primary preview. Eight runtime files change; 74 retain their prior hashes, including all render materials/assets, physical integration, camera behavior, audio and trajectory data. Runtime is 19,970,919 bytes (3,003 fewer); the 121-entry ZIP is 17,026,465 bytes (+335 including updated delivery documentation), SHA-256 `ed6d59ac22349b6e585c60113eb426beaade9cf403dbd6e9e6b73d9f6eb713f1`.
- `dist/release-review.json` records final scope, checks and hashes. The audit tracks 124 findings; U35 and C19 are addressed, while U03, V02, V03, V18, A01 and D03 remain open. This interface/cleanup pass adds no sustained-performance, physical-controller, installed-Safari, subjective-listening or photographic-equivalence claim.


## 0.54 — prepare the actual rendering paths before play

The existing six-minute check skips two seconds after each transition. Repeating that check on unchanged 0.53 passes all 36 coasting samples without a context loss or growing warmed resources (`tests/endurance-before-v54-results.json`); the earlier v48 reset remains unexplained. Extending the existing encounter-performance runner to include the transition reveals a separate, reproducible first-chase stall.

- The first broad baseline records a 599 ms first chase frame. Focused profiling attributes 461 ms to the first environment capture and 81 ms to the spacecraft draw. Texture upload accounts for most of the remaining capture cost after correcting compilation; shader preparation alone does not resolve it.
- `CosmosWorld.load` now uploads its existing maps and spacecraft-material textures while loading. It prepares the existing reflection target, compiles scene/sky/cloud/spacecraft materials for their actual linear drawing target and compiles the final resolve for the screen. First chase still captures its real surroundings. The former screen-target variants are replaced, not kept beside another pipeline.
- Only `src/world.js` changes in the runtime: +843 bytes, one existing owner, no added module, asset, dependency, framebuffer or per-flight preparation state. All visual equations, image assets, physical integration, camera control and audio remain unchanged. More of the existing GPU allocation happens during loading; warmed allocation is checked separately.
- The final controlled baseline uses the exact v53 world module against the otherwise unchanged application. The report's package version identifies its host; `worldSha256` identifies the source actually tested. Startup takes 898 ms and the first chase takes 561 ms. Final candidate loading takes 2,563 ms and its first chase takes 56 ms; an earlier candidate repeat records 86 ms. These are local Chrome/Metal measurements at 1600 × 1000, DPR 2, with low-power mode configured. The change moves preparation before play and reduces unused compiled programs from 35 to 21; it does not claim faster total startup or universal frame rates.
- The final candidate passes 36 three-second transition windows: all nine local starts in both cameras, repeated cold/warm. Flight advances, the current score plays, and no context loss or browser error occurs. An initial adaptive-resolution frame still reaches 150 ms, so the broader performance item V03 remains open. Startup preparation does not establish a cause or fix for the historical driver reset.
- The first draft of this development check incorrectly required one playing music element after three seconds. The score deliberately crossfades for 7.5 seconds; that assertion was corrected to require the selected score. The sustained check retains its post-fade retirement assertion. This harness correction changes no game audio.

Further verification and final delivery are recorded below.

### 0.54 cross-engine verification

Chrome, Firefox and Playwright WebKit pass the existing held-view suite: unchanged held pixels, responsive turn input, lens/exposure/resize refresh, settling chase views, continuing science/music and physical coasting. The 162 bounded-reflection pairs remain within one 8-bit channel step of forced refresh, with exact physical-state independence. Earth and Saturn chase captures were inspected. All three engines also pass 18 injected graphics-loss/recovery scenarios, including active flight, historical passage and flight-review preview. All 89 source unit checks pass. These checks establish recovery behavior and preserved image/control contracts; the cause of the earlier spontaneous reset remains V03.

### 0.54 sustained run

The final six-minute Chrome/Metal run completes in 360.551 seconds. All 36 eight-second flight samples continue simulating/rendering, keep one score after the crossfade window, retain bounded history and report zero context losses or browser errors. After both cameras visit the full sequence, resources stay at 20 geometries, 31 textures and 21 programs. The v53 baseline also retains 20 geometries and 31 textures, with 35 programs. This run does not reproduce or explain the earlier v48 reset. Both transition comparisons use High adaptive quality and retain their actual drawing-buffer dimensions; those first-use experience timings are distinct from a fixed-resolution GPU benchmark.

### 0.54 delivery verification

- Source and independently extracted unit suites pass all 89 checks. The final extracted package verifies all 82 offline runtime hashes and passes flight, following, photography, review/lenses, charts, settings, journal and local-media checks without external requests or browser errors.
- The v53 to v54 service-worker upgrade preserves saved physical flight, options, photographs, science notes and review history, then reloads offline. Existing legacy-bearing migration and stale-cache isolation checks also pass.
- Every archive entry matches its manifest, the workspace and the tested extraction; current runtime and worker files match the primary preview. Only `src/world.js` changes among 82 runtime files. Runtime is 19,971,762 bytes (+843). The 121-entry ZIP is 17,027,323 bytes (+858 including documentation), SHA-256 `aca7803d53877de744a3eeb637e0af584a8004ce0cd22ce7bdb9a03a29009ad6`. Historical browser programs and reports remain outside the archive.
- `dist/release-review.json` records source/report hashes and verification scope. The audit now tracks 125 findings; V25 is addressed. U03, V02, V03, V18, A01 and D03 remain open. Physical Xbox hardware, the installed Safari application, subjective listening and photographic equivalence are not established by this loading revision.


## 0.55 — keep an observation through camera changes

A normal opening-flight check exposes a camera-control discontinuity: follow Earth through a 7.3° lens, hold physical time, then press C. Version 0.54 turns the picture by 21.778° and clears both tracking and independent-look mode. Selecting the already active camera from its menu has the same reset behavior. The retained before-state is in `tests/camera-switch-before-v55-results.json`.

- `ObservationCamera.setView` remains the single owner of camera-position changes. It preserves the target, control mode, lens and current turn input. Independent look is expressed relative to the new camera's initial spacecraft frame; this also preserves the visible direction when the old chase camera is still easing toward the spacecraft heading. Selecting the current view returns immediately.
- The existing camera menu derives each Follow/Release indicator from the retained target. No new control, mode, state field, controller or animation path is added. Two runtime files change by a combined 436 bytes; the renderer, assets, physical solver, audio and trajectory are unchanged.
- Chrome, Firefox and Playwright WebKit pass 13 switch cases each (39 total): menu changes and current-view reselection, C, synthetic Xbox Y, independent yaw/roll, continued turn input, and a lagging chase-to-probe change. State is recorded at command dispatch to distinguish the change from ordinary easing before a key event. Held-view differences remain below the 1e-5-radian tolerance (reported zero in this run); physical state, turn state, lens, target and control mode are preserved.
- The same reusable camera suite retains its checks for coast/follow physical independence, manual release, keyboard/controller menus, three menu sizes, photographing a chase view and restoring a followed view. The three-engine held-frame suite also passes, including 162 cached-versus-forced reflection pairs. The actual opening-flight before/after captures were inspected. All 89 source unit checks pass.
- This change uses the existing input and rendering paths. The 0.54 rendering/performance evidence remains associated with that unchanged renderer; no new sustained-performance or physical-Xbox claim is made here.

### 0.55 delivery verification

- Source and independently extracted unit suites pass all 89 checks. The final offline package verifies all 82 runtime hashes and passes flight, camera/following, photography, review/lenses, charts, settings, journal and local-media checks, with no external requests or browser errors.
- The v54 to v55 worker upgrade retains saved flight, options, photographs, science notes and review history, then reloads offline. Legacy bearing migration and late stale-cache isolation remain verified.
- Every archive entry matches its manifest, the workspace and the tested extraction. Runtime and worker files match the primary preview. Two runtime files change; 80 retain their prior hashes. Runtime is 19,972,198 bytes (+436). The 121-entry ZIP is 17,027,999 bytes (+676 including documentation), SHA-256 `d3f546d1ef6815e1c01c904584fe1efd84e1e2c9de675009df4cbdffc54e328c`.
- `dist/release-review.json` records verification scope and source/report hashes. E25 is addressed; the audit now tracks 126 findings, with U03, V02, V03, V18, A01 and D03 still open. The renderer and all assets remain unchanged from 0.54. This revision adds no new sustained-performance, installed-Safari, physical-controller or photographic-equivalence claim.


## Revision 0.56 — cohesive Earth shader ownership

The 594-line shader entry file interleaved surface, atmospheric and cloud equations. Earth optics, cloud density, atmospheric transport and cloud shaders now live together in `src/rendering/earth-shaders.js`; `shaders.js` imports the two shared optical definitions for ground shading and re-exports the public Earth shaders. This is an acyclic module move, with no new controller, state, effect, dependency or asset. The entry file is 275 lines and the Earth module 323 lines. Combined source grows by 355 bytes of module declarations and ownership comments. All eleven exported shader strings are byte-identical to 0.55, recorded in `tests/shader-module-equivalence-results.json`.

A preceding trial merged camera and sunlight segment integration into one vector-return helper. It saved 569 source bytes, but the day-scene ABBA GPU medians increased from 32.44 ms to 37.35 ms (+15.1%). That candidate was rejected and completely removed. Its cost record is explicitly labelled rejected in `tests/cloud-refactor-rejected-results.json`; the experimental sources remain under `/private/tmp/cosmos-cloud-refactor-rejected-v56*`. They are not runtime or release evidence. Specialized scalar and centroid paths remain in the current model.

Close cloud realism remains V02/V18. The existing cloud map and the NASA Blue Marble overview show matching large cloud structures. The available 2048-pixel NASA preview is not an improvement over the current 8192-pixel map; the older original TIFF endpoint timed out, so no new high-resolution source was verified or adopted. No texture or optical-model change is claimed. NASA source overview: https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/ .

Final validation: Chrome 158.0.8127.37, Firefox 153.0 and Playwright WebKit 26.5 pass the existing held-view/refresh suite, including 162 cached/forced reflection pairs with a maximum one-channel-step difference. Workspace and extracted archive each pass 89 unit checks. The separately extracted package has 83 matching offline runtime hashes, zero external requests and zero reported browser errors. The 0.55 → 0.56 upgrade retains flight options, history/lenses, photographs and science notes, and passes stale-cache isolation plus offline reload. No new endurance, physical-controller or subjective-listening result is claimed.

The final runtime is 19,972,553 bytes (+355) across 83 files. The ZIP is 17,029,685 bytes (+1,686 including documentation), 122 entries, SHA-256 `dc362de285d743834a2ee37f904da2df5f0b014449ba7f9cd9d95a6446ab40d6`. Preview, final archive, workspace and tested extraction hashes match. V02/V18 remain open; this revision improves code ownership and makes no new realism claim.


## Revision 0.57 — atmosphere-aware exploration

Actual UI review found the Titan bearing lying across its atmospheric rim. The layout used the solid radius, with a separate hardcoded exception for Saturn's rings. `flight-hud.js` now passes the existing cached outer geometry bound (already used for reflections) to the same silhouette and label solver. No second atmospheric/ring dimension, solver or interaction is introduced. The before check samples 77 camera rays through each label rectangle against the actual transformed Titan shell: all twelve tested view combinations intersected it, totalling 310 sampled rays. The baseline is `tests/bearing-atmosphere-before-v57-results.json`.

Magnifying the rim exposed a related observation defect: a 4° view, yawed 18.3° from Titan's centre, visibly contained orange/blue haze while the solid disc was outside the frame. Its photograph was labelled “Jupiter · Crescent” and its science caption stayed empty. The before capture/report are `/private/tmp/cosmos-titan-haze-only.png` and `tests/atmosphere-context-before-v57-results.json`. That diagnostic used the bearing-only candidate; its photography/guide source was unchanged from 0.56.

`CosmosWorld.observationRadius` now gives photography and science the same envelope from existing solid geometry and atmosphere. Physical ranges, altitude reference, dates and flight state remain separate. Ring framing retains the previous physical-body limitation; the planar rings are not treated as a filled sphere for photo attribution. This revision adds 446 runtime bytes across four existing files, with no asset, module, dependency or rendering change. The former version-specific context test is moved to reusable `tests/context-framing.mjs`, with its report version read from the project.

Final 0.57 validation: Chrome 158.0.8127.37, Firefox 153.0 and Playwright WebKit 26.5 pass both reusable suites. All 36 atmospheric-clearance views have zero sampled label/shell intersections; 144 paired-world views retain clear labels/leaders. Each engine identifies the haze-only photograph as “Titan · Crescent”, shows the Titan science note and clears the note/attribution beyond the atmosphere (“Deep space”). Existing interrupted/hidden-caption, partial-Earth, journal and held-flight checks pass. Workspace and extracted archive each pass 89 unit checks. Independent offline playback verifies 83 runtime hashes with zero external requests/errors; 0.56 → 0.57 retains saved flight, options, history/lenses, photographs and science notes, and passes stale-cache isolation/offline reload.

The final runtime is 19,972,999 bytes (+446), with no additional runtime files. ZIP: 17,030,458 bytes (+773 including documentation), 122 entries, SHA-256 `029c23deb7db82ab7e17d6b5c0c323e3d02f0ca91edd8aa12550b3c8d3a04ae0`. Workspace, preview, final ZIP and independent extraction match. Shader equations, scene geometry, physical integration, music and trajectory data remain unchanged; no new material-realism or endurance claim is made. E26 is repaired and U07 refined; the six broader open findings remain.

Further experience-review leads: the remaining body-only treatment of planar ring photographs warrants a rendered reproduction. Several science captions still contain poetic filler (for example “Some worlds reveal themselves by what they keep hidden”); review that copy for specific information tied to the current view.


## Revision 0.58 — ring-only observations

A reproduced Saturn close-up filled much of the viewport with rings while excluding the solid planet. Version 0.57 named its photograph “Deep space” and offered no science note. The control view pointed away from the ring plane, still inside its enclosing sphere, and correctly remained deep space. Both observations are retained in `tests/ring-context-before-v58-results.json`.

Photography and science now call the same `CosmosWorld.observationFraming` method. Existing body/atmosphere framing remains the fast path. A ring-only candidate uses the existing mesh dimensions and orientation, then clips its actual planar annulus against the camera cone. This distinguishes the ring, central hole, outer sky and camera-backward regions without treating the outer bound as filled material. Ring-only photographs use “Saturn · Rings”; captions select the existing ring explanation. The shared pure geometry remains in `view-framing.js`; the scene factory exposes its existing ring mesh. No new controller, state, module, asset, interface control or dependency is introduced. Seven existing runtime files change by a combined +3,210 bytes; main coordination and UI guide code shrink.

Several science captions lose generic emotional flourishes. The remaining copy describes visible atmosphere, volcanic activity, radio observations and light travel time. Existing scientific content and source references remain. This is a copy refinement within U03, not a new science or rendering claim.

Workspace unit checks pass 93/93, including independent ray/plane comparisons across 96 tilted and rolled configurations, scale invariance and ring-only science selection. Chrome 158.0.8127.37, Firefox 153.0 and Playwright WebKit 26.5 pass the reusable context suite. Each engine verifies four ring/off-plane view pairs across two viewport sizes, two lens angles and a quarter roll: ring photographs and science are correct, empty views stay “Deep space”, and capture preserves held physical state. Existing atmosphere-only, clipped-Earth, hidden/interrupted-note and journal checks also pass. The final Chrome ring capture was inspected. E27 is repaired; 128 findings are recorded and the existing six broader findings remain open.

Delivery verification: the workspace and independent extraction each pass 93 unit checks. The offline game verifies all 83 runtime hashes, with zero external requests and browser errors. The 0.57 → 0.58 upgrade retains saved physical flight, options, photographs, science notes and review history/lenses, then passes offline reload and stale-cache isolation. Final archive, tested extraction, workspace and primary preview hashes match. A duplicated test-description paragraph was removed from the development guide; the final archive and extraction contain the same corrected documentation.

Runtime: 19,976,209 bytes (+3,210), 83 files. ZIP: 17,032,917 bytes (+2,459), 122 entries, SHA-256 `fccb5b6b389ad64f7ad45115da94ed26ead07bd7165729c5cdd289e0ad135848`. Existing scene geometry, shader equations, physics, music and trajectory data remain unchanged. This release makes no new material-realism, endurance, installed-Safari, physical-controller or subjective-listening claim. Current verification scope and source/report hashes are recorded in `dist/release-review.json`.


## Revision 0.59 — reference-based ring colour without more runtime work

Magnified ring-only views revealed narrow red/green fringes already present in the inherited source texture. NASA/JPL/Space Science Institute's natural-colour Cassini mosaic PIA11142 provides a greyer C ring and predominantly sandy/tan B/A bands for comparison. Reference: https://science.nasa.gov/photojournal/a-full-sweep-of-saturns-rings/ . The source remains a camera colour composite at its 2008 geometry, not measured reflectance or 1980 conditions.

`docs/build-ring-colour.py` uses the annotated mosaic's labelled lower-edge radius ticks to register a 17-row strip. A 65-pixel window (roughly 400 km) supplies broad chromaticity; this intentionally makes no claim of fine colour alignment. It retains the existing material's linear albedo luminance, including the former gains and ceiling, and every optical-depth alpha byte. Gamut compression preserves luminance before 8-bit encoding. Maximum resulting linear-albedo luminance error is 0.004361; mean error is 0.000991. The existing F-ring constant is retained. The asset is regenerated byte-identically from the recorded inputs; source, prior/output hashes, calibration anchors and limitations are in `docs/ring-colour-source.json`.

The direct ring material and ringshine integrator now read the same revised RGB profile without their old independent channel gains/blue clamp. The existing 8,192 × 1 texture shrinks from 9,002 to 8,322 bytes. The two runtime source files shrink by 160 bytes together. Total runtime change: −840 bytes across three existing files; no added texture, sample, pass, geometry, state, control, module or dependency. Geometry, optical-depth alpha, radial detail, sunlight direction, viewing equations, physical flight and sound remain unchanged.

The historical `rings-v16.mjs` runner is replaced by reusable `ring-appearance.mjs`. It loads a source-identified baseline for all three changed files and compares encounter, 8° and 4° ring close-ups, low sunlit/unlit views, night-side ringshine, chase and an Earth control. Chrome 158.0.8127.37, Firefox 153.0 and Playwright WebKit 26.5 pass all 24 view pairs. Draw calls, triangles, texture/geometry counts and image dimensions match in every pair. Held physical state is preserved. The six close-up comparisons reduce the inherited green-fringe counts from 6,811–9,096 pixels to zero, with image luminance sums within 10%; the default Chrome close-up changes by 3.68%. This metric checks the identified fringe, not overall photographic accuracy. Earth pixels remain identical in all three engines. Final ring close-up, full Saturn and night-side captures were inspected.

The initial Firefox control compared PNG container hashes, which differed despite byte-identical decoded pixels. The corrected control hashes actual canvas pixels; no game change was needed. Workspace and extracted unit suites pass 94 checks, including neutral reflected/transmitted colour without fixed tint. The checks continue to cover existing ring integration, cameras, navigation and physics.

Final delivery: the independently extracted game passes offline flight, photography, charts, review/lenses, settings and local audio/video checks with all 83 runtime hashes matching, zero external requests and zero browser errors. The 0.58 → 0.59 upgrade retains physical flight, options, photographs, science notes and history, then passes offline reload and stale-cache isolation. Workspace, preview, final archive and tested extraction hashes match. Runtime is 19,975,369 bytes (−840). The 122-entry ZIP is 17,033,210 bytes (+293 including documentation and the added unit check), SHA-256 `b13aed9c27f2400525bae902a2f978882320d663e08e45567b50dcfda1503375`. `dist/release-review.json` records verification scope and source/report hashes. This revision adds no new endurance, physical-controller, installed-Safari or subjective-listening evidence.

V26 is addressed and V02 refined; 129 findings are tracked, with U03, V02, V03, V18, A01 and D03 still open.


## Revision 0.60 — watch the historical passage in the existing chart

An actual Moon-to-passage walkthrough exposed a disconnect: the spacecraft view can advance calendar time, but the spatial chart implicitly freezes it. The retained 0.59 before-state shows an unchanged Julian date and Voyager marker over 1.4 seconds, with no playback action. `tests/chart-playback-before-v60-results.json` records that observation.

| E28 | Opening the solar chart pauses passage time, so the player cannot see the probe and planets move along the historical route while inspecting distance and dates. | Add explicit Play/Pause and time flow to the existing chart footer. Reuse the transit clock, keep manual chart choices, hold on interruptions and return to normal exploration at arrival. | Implemented; live interaction and offline verification recorded with 0.60 |

The existing Solar system footer now has Play/Pause and the shared time-flow adjustment. Opening it still holds time until deliberate playback. Date, current planetary positions, Voyager, travelled/remaining paths, remaining distance and light time advance together. Explicit Pause holds flight time after returning. Scale and body changes retain playback; changing tabs holds the chart until Play is chosen again. Arrival returns to the normal encounter and rearms input. Blur, document hiding, controller disconnection and graphics loss hold playback.

This uses the existing transit clock and trajectory with neutral flight input; no new physical model, app mode, persistent field or dependency is introduced. Static and live charts share one presentation model, while the existing atlas layout owns labels. Existing DOM nodes refresh at up to 20 Hz so focus survives. Hidden 3D scenery is reused during chart playback. The time-flow formatter moves unchanged from HUD to trajectory ownership and is shared by both views. No image, texture, render pass, asset or runtime file is added.

Chrome 158.0.8127.37, Firefox 153.0 and Playwright WebKit 26.5 pass the extended reusable transit-chart runner: 45 dated passage views, nine viewport layouts and one live-playback/arrival flow per engine. The checks verify date and marker advancement, position/velocity equal to the existing trajectory, exact pause readouts, unchanged heading/fuel, no scene drawing behind the chart, retained button/marker nodes and focus, scale/body/rate selection, native keyboard and synthetic Xbox activation, blur, tab changes and graphics recovery. Actual Moon → photograph → passage playback → Jupiter → nearby Io exploration passes in all three engines; a held menu key produces no thrust on arrival. There are no recorded browser errors. The 720-pixel Chrome, 1024-pixel WebKit and Firefox playback captures were inspected.

All 94 workspace unit checks pass. Six existing runtime files change by a combined 4,228 bytes; the runtime remains 83 files. Physical integration, the transit controller, trajectory data, rendering, image assets and music are unchanged. The existing formatter was moved without changing its behavior. The audit now records 130 findings; E28 is addressed and the six broader open findings remain.

Final delivery: the independently extracted game passes 94 unit checks and offline flight, chart playback/pause, photography, settings, recorded review and local-media checks. All 83 runtime hashes match; there are no external requests or recorded browser errors. The 0.59 → 0.60 upgrade retains physical flight, options, photographs, science notes and review history, then plays the updated chart offline and passes stale-cache isolation. Workspace, primary preview, final archive and tested extraction hashes match.

Runtime: 19,979,597 bytes (+4,228), 83 files. ZIP: 17,035,065 bytes (+1,855), 122 entries, SHA-256 `debcf3b22a16aee728cc83a68b0938d9f1f2c1660718806215c9ecf26399116c`. `dist/release-review.json` records source/report hashes and verification scope. This revision adds no new endurance, physical-controller, installed-Safari, subjective-listening or photographic-equivalence evidence.


## Revision 0.61 — clean Jupiter source detail and retire unused rendering paths

A fresh Jupiter/Io review found a fixed blue point in the 18° cloud close-up. Disabling Earth, stars and every body except Jupiter preserved it; removing the surface map removed it. The NASA PIA07782 TIFF also contains the isolated outlier. Its source value at (1328, 1024) is (162, 212, 253), surrounded by the brown cloud band. `docs/build-jupiter-map.py` replaces that one pixel with the eight-neighbour median (162, 144, 125). All other pre-encoding source pixels remain untouched. Source: https://science.nasa.gov/photojournal/cassinis-best-maps-of-jupiter-cylindrical-map/ . NASA's Cassini portrait PIA04866 and the existing PIA02873 reference were also consulted; they do not establish a calibrated material or historical cloud reconstruction.

| V27 | A fixed blue point appears in magnified Jupiter cloud views; it is an isolated outlier in the original Cassini mosaic rather than a star or another body. | Replace that one source pixel with its eight-neighbour median, then encode the same resolution with full chroma. Preserve all other source pixels and retain the current map and lighting model. | Corrected; six three-engine close-view comparisons remove the blue outlier, with a smaller texture and lower aggregate encoding error |
| C20 | The renderer retains a superseded generic atmosphere glow, unused tint/strength data, an inactive opaque haze branch and a render-radius uniform written every frame but never read. | Keep the dedicated Earth/Titan atmosphere paths and remove the inactive shader, metadata and writes. | Removed; paired controls retain exact pixels, physical state and graphics allocations in three engines |

Five offline encoding candidates were compared with the repaired source. The selected AVIF uses quality 85, 4:4:4 chroma, speed 4 and four threads. The 3601 × 1801 dimensions are unchanged. Size drops from 516,468 to 478,456 bytes (−38,012). Mean absolute 8-bit channel error drops from 1.085875 to 1.066816; RMS drops from 1.466538 to 1.438698. These are aggregate encoding measurements, not a claim that every pixel or cloud feature improves. The source remains a mixed-filter 2000 mosaic; no artificial fine detail is generated. Source/asset hashes and the exact correction are in `docs/jupiter-map-source.json`.

The generic rim-glow shader has no active body: Earth and Titan already use dedicated atmosphere integration. Remove it, its tint/strength parameters and colour-only metadata, the inactive opaque-surface haze branch, and the unread render-radius uniform and per-frame write. Ten exported shader programs remain; all retained strings are identical except for the removed inactive surface code. The four source files shrink by 971 bytes. With the texture, runtime shrinks by 38,983 bytes across five existing files. No runtime module, asset, pass, dependency or control is added.

The obsolete `visual-review.mjs` flow is replaced in place with a reusable source-identified comparison. Chrome 158.0.8127.37, Firefox 153.0 and Playwright WebKit 26.5 pass 36 paired scene captures. Eight control scenes per engine retain identical pixels, totaling 24 exact pairs. Io also includes Jupiter and therefore uses the revised map in its background. Twelve scenes per engine preserve physical state, draw calls, triangles, textures, geometries and output dimensions. Six 18°/8° Jupiter close-ups reproduce blue-channel excess of 41–57 before, and −8 to −24 afterward at the projected outlier. All runs record zero browser errors. The final Chrome close-up and enlarged before/after crop were visually inspected.

Workspace unit checks pass 94/94. V27 and C20 are addressed; 132 findings are tracked and the six broader open findings remain. This refinement does not claim photographic equivalence or new endurance/listening/controller evidence.

Final delivery: source and independently extracted unit suites both pass 94 checks. The extracted game passes offline flight, charts/playback, photography, settings, recorded review and local-media checks with all 83 runtime hashes matching, no external requests and no recorded browser errors. The 0.60 → 0.61 upgrade retains saved physical flight, options, photographs, science notes and history/lenses, then passes offline reload, chart playback and stale-cache isolation. The Jupiter asset and reconstruction report rebuild byte-identically from the recorded input.

Runtime: 19,940,614 bytes (−38,983), 83 files. ZIP: 16,997,604 bytes (−37,461), 122 entries, SHA-256 `58f436a9af58656ac84b13dd00b0989b82e9ce92b25783d3b9f79dd611fca76f`. Workspace, main preview, final archive and tested extraction hashes match; `dist/release-review.json` records the evidence and its scope. The overall improvement goal remains active.


## Revision 0.62 — preserve the displayed chase view through flight review

A keyboard turn with an 18° Saturn view reproduces a 2.145285° jump on opening review in 0.61. The physical flight stays unchanged: review resets the renderer's easing base to spacecraft attitude. Existing history records physical attitude, independent look and lens, but cannot reconstruct the displayed chase base or the corresponding spacecraft pose.

| E29 | Flight review snaps a still-easing chase view and cannot preserve that observed view through history, cancellation or reload. | Record the displayed chase base after drawing, restore it through the renderer, and retain the present while previewing. Reuse one timestep for camera-settling checks and rendering. | Repaired; current checks described below |

The existing renderer now owns reading/restoring the lens and optional chase base. A chase snapshot adds one `follow` quaternion with four components; physical `attitude` and independent `look` remain separate. History is recorded after drawing, so it receives the camera actually used for that frame. The existing limits remain 480 in-memory and 120 persisted samples. Loading validates and clones the optional base; old records without it use their original attitude-based fallback. No new camera controller, runtime module, dependency, asset or UI control is introduced.

Review retains one present camera. Cancelling restores it; applying a past record restores physical state through history and camera state through the renderer. Saves during preview read that retained present. Reload can restore its chase base before ordinary live easing resumes. Autosave now has one frame-level clock shared by encounter and historical passage, replacing the two update-flight paths. Camera-settling checks and drawing share the same timestep, allowing held review frames to settle without repeated drawing. The interface markup and styles are unchanged.

The historical v33 browser entry point is promoted to the reusable `tests/flight-review.mjs` instead of copying a new release-specific runner. Chrome 158.0.8127.37, Firefox 153.0 and Playwright WebKit 26.5 pass actual keyboard-turn recording, review entry, historical selection, cancellation, preview save/reload, recorded physical/camera restoration and independent-look checks. Recorded bases equal the renderer's base at capture. Measured entry differences are 0–0.000002415° with 2.74–2.91° of live camera lag; the residual is quaternion-angle numerical precision. Held previews draw no additional frames in the settled observation window. Existing lens, pointer, keyboard, synthetic Xbox, legacy-history and empty-history checks pass. Twelve layouts across 720–1280 pixels fit the controls. Chrome 1280 × 800 and 720 × 640 captures were visually inspected.

The first strengthened recovery check captured an initial preview before its first draw; its only mismatch was the renderer's initialization flag. The runner now waits for the selected picture, and its chase case selects a recorded base after actual turning. A separate stable-frame assertion observes the application frame owner after synchronous pose inspection. These timing changes distinguish pending presentation from a settled image without weakening physical or camera preservation checks.

Workspace and independently extracted unit suites pass 95 checks. The added case checks camera/physical independence, copied state, persistence, invalid bases and legacy fallback. Four existing runtime files increase by a combined 1,013 bytes; the runtime remains 83 files. Physics, trajectory, materials, assets, music, interface markup and styles retain their previous implementation. The audit now contains 133 findings; E29 is addressed and six broader findings remain open.

The strengthened graphics-recovery runner passes 21 deliberate loss/restoration scenarios across the same three engines, including recorded chase review after turning. Physical state, rendered camera/base, lens and history remain exact through loss and restoration. No frame work occurs while lost; the restored image settles and awaits explicit resumption. Stale keyboard/controller input cannot propel the probe on resume. The restored WebKit chase-review image was inspected. These checks verify recovery behavior, not the cause of the older spontaneous driver reset.

Final delivery: the independent 0.62 extraction passes offline physical flight, charts/playback, photography, settings, local media and chase review cancellation, preview reload and recorded-camera restoration. All 83 offline runtime hashes match, with no external requests or recorded browser errors. The 0.61 → 0.62 upgrade preserves physical state, flight options, photographs, science notes and review history/lenses, accepts old chase records without a base, and passes offline chart playback and stale-cache isolation. Workspace, primary preview, final archive and tested extraction hashes match.

Runtime: 19,941,627 bytes (+1,013), 83 files. ZIP: 16,999,042 bytes (+1,438), 122 entries, SHA-256 `6f23418fae08344534eccfdbd90e9953f2e9602b99fac00a428b51efed0f570b`. `dist/release-review.json` records source/report hashes and scope. This revision adds no new endurance, physical Xbox, installed Safari, subjective-listening or photographic-equivalence evidence. The overall improvement goal remains active.


## Revision 0.63 — prepare adaptive drawing and simplify output resizing

A fresh 0.62 Earth transition at 1600 × 1000, DPR 2 records a 173.8 ms frame and 139 ms maximum draw-call CPU time in the first eight seconds. Canvas resizing writes width/height twice through `setPixelRatio` followed by `setSize`; its two observed calls cost 46.7 and 62.5 ms. The existing encounter runner now records resize timestamps, dimension writes and slow-frame CPU stages, and accepts a longer observation window.

| V28 | The first adaptive cloud-path change still stalls after shader compilation. | Draw one offscreen pixel through the compiled scene/cloud paths during loading, using the existing target, then restore its viewport. | Preparation moved before play; measured results below |
| C21 | Canvas dimensions are written twice per resize; the linear target rounds dimensions while the output canvas floors them. | Set dimensions and ratio together, skip unchanged dimensions, and derive target size from the actual output canvas. | Three-engine output-grid, picture and capture checks pass |

An intermediate resize-only candidate still records 132.1 ms inside its first adaptive draw, of which 131.1 ms belongs to the cloud drawing stage at cloud scale 0.875. This distinguishes the compiled-but-not-yet-drawn path from canvas resize work. The final renderer draws the already compiled scene, sky and cloud scenes into one offscreen pixel during loading, reusing its existing linear target and restoring the full viewport afterward. The corresponding eight-second first Earth window has maximum draw-call CPU time of 1.0 ms. Startup in these focused runs changes from 2,693 to 2,787 ms. This is a measured local preparation shift, not a universal frame-rate guarantee.

A canvas-resize frame still reaches 119.8 ms in that focused candidate, and the adaptive ratios differ between windows. The broader V03 performance issue therefore remains open. No claim is made that all hitches or the historical spontaneous graphics reset are fixed. Ordinary frame processing, physical advancement and adaptive thresholds keep their existing behavior.

`CosmosWorld.resize` now uses the renderer's combined drawing-buffer setter and calls it only when logical dimensions or pixel ratio change. It keeps the linear scene target aligned with the actual output dimensions, avoiding a one-pixel mismatch at fractional scale on odd-sized windows. Camera aspect and star pixel size update through the same method; full-resolution photographs restore the original flight scale afterward. No framebuffer pool, runtime module, asset, dependency or drawing pass during flight is added. Only `src/world.js` changes in the runtime: +473 bytes. Physical integration, camera controls, shaders, images, UI and audio retain their prior source.

The historical v4 `render-performance.mjs` is replaced in place by source-identified output verification. Chrome 158.0.8127.37, Firefox 153.0 and Playwright WebKit 26.5 each cover DPR 1 and 2, four Earth/Moon/Saturn probe/chase scenes and four quality settings. The 96 previous/current resize pairs retain draw counts, graphics allocations and physical state. Ninety-five pairs have identical decoded pixels. One Chrome pair has mean channel difference 0.0001651 on the 8-bit scale; the separately repeated legacy resize control reaches 0.0002672. The first strict image-hash comparison exposed these sparse cloud-pixel changes; repeating the same legacy function also reproduces variation. The runner retains both the control and candidate measurements, checks a small explicit envelope, and continues to require exact pixel retention when resizing an unchanged canvas without drawing.

Thirty-six fractional-grid checks use a 1001 × 627 viewport and six scale choices across both pixel densities and three engines. Linear target dimensions equal actual output dimensions in every case; a changed output writes dimensions once, and an unchanged output writes none. Six full-resolution photo captures restore the original resolution and physical state. The Chrome high-density capture-restoration view and the enlarged cloud-pixel difference were inspected. This checks output integrity, not photographic equivalence.

All 95 workspace unit checks pass. The audit now tracks 135 findings, with V28/C21 addressed and U03, V02, V03, V18, A01 and D03 remaining open. Final transition, sustained-flight and delivery evidence follows.

The full final-source transition check passes 36 three-second scene/camera windows across all nine local starts, repeated cold/warm. The first adaptive Earth draw remains at 1.0 ms CPU time, but canvas resizing takes 126.6 ms and the containing frame reaches 163.7 ms. This is the only frame over 100 ms in that run; first chase drawing reaches 63.6 ms. Rendering, physical time and the selected score continue in all windows, with no context loss or browser error. These measurements isolate the remaining output-buffer resize cost; they do not establish a large reduction in total worst-frame latency.

The final Chrome/Metal endurance run completes in 360.608 seconds. All 36 eight-second samples across nine scenes and both camera modes advance physical time, render at least 90% of sampled animation ticks, retain bounded history and finish with one playing score. No context loss or browser error is recorded. After both cameras visit every scene, resources remain at 20 geometries, 31 textures and 21 programs, matching the previously warmed allocation counts. This run verifies its six-minute window and does not establish the cause or resolution of the historical driver reset.

Final delivery: the independently extracted package passes all 95 unit checks and offline flight, following, charts/playback, photographs, review, settings and local media. All 83 runtime hashes match, with no external requests or recorded browser errors. The 0.62 → 0.63 upgrade preserves physical flight, options, photographs, science notes and recorded views, then passes offline reload, chart playback and stale-cache isolation. Workspace, primary preview, final archive and tested extraction hashes match.

Runtime: 19,942,100 bytes (+473), 83 files. ZIP: 17,000,121 bytes (+1,079), 122 entries, SHA-256 `299e08e0487e01730772cc45165d6d6318404f24dab7b220b76a6946386ef496`. `dist/release-review.json` records scope and source/report hashes. Physical Xbox hardware, installed Safari, subjective listening and photographic equivalence remain unverified. The improvement goal remains active.

Next performance investigation: the measured remaining hitch is output-canvas resizing during High adaptive quality. A candidate can keep the display canvas stable while adjusting the existing internal scene target. Measure final-resolve GPU cost, image interpolation, fractional sizing, star/glare scale, capture restoration and retained memory before adopting it; avoiding a resize alone does not prove better overall frame time. Preserve one resolution owner and avoid a framebuffer pool unless measured evidence justifies its cost.


## Revision 0.64 — stable display during adaptive quality

The remaining first Earth hitch was reproduced against the saved 0.63 renderer: resizing the display took 121.6 ms and its containing animation interval reached 156.4 ms; actual drawing stayed at 1.2 ms or less. The candidate changes High quality to resize only the existing linear scene target. The display remains at native density capped at 2. The final resolve already reads that target and now resamples it before tone mapping. Stars, Sun glare and the cloud integration use scene density. Other quality modes keep matched output/scene dimensions. Full-resolution photography still uses the same target and restores the prior flight scale.

The focused eight-second Earth comparison records a 0.2 ms resize, zero canvas dimension writes and a 69.2 ms maximum animation interval; the median changes from 19.5 to 20.6 ms. This is a measured removal of the canvas-resize stall, not a claim that all frames become faster. The first chase preparation and the historical unexplained context reset remain separate concerns under V03.

Only `src/world.js` changes in the runtime, +89 bytes. There are no new runtime files, assets, dependencies, framebuffer objects, drawing passes or controllers. `CosmosWorld.resize` remains the single resolution owner. High retains the larger native display buffer after internal quality decreases, so its output resolve fills more pixels; the internal scene buffer still shrinks. Peak display dimensions are unchanged from native High. Texture/object counts are checked independently of that pixel-storage tradeoff.

The old `profile-renderer.mjs` contained obsolete cloud-helper assumptions; it is replaced in place with a source-identified full-frame comparison. At 1280 × 800, DPR 2, fixed scene ratio 1.25 and cloud scale .75, each scene warms both pipelines then runs two ABBA sets, 120 GPU queries per window. Median-of-window-medians: Earth probe 11.927 → 11.800 ms; Saturn chase 5.410 → 5.729 ms (+0.319 ms, about 5.9%). Drawing and allocation counts match. An earlier shorter run contained a noisy 8.95 ms Saturn window; it is retained separately as `tests/profile-renderer-trial-v64-results.json`, not silently discarded. The repeated result documents the modest sustained resolve cost accepted for avoiding the much larger adaptive resize hitch.

The existing resolution runner now compares linear HDR scene pixels on equal internal grids, with repeated previous draws as an independent variation control. It separately checks display dimensions, star/glare/cloud scale, exact no-op image retention, unchanged physical state, fractional viewport sizing and full-resolution photo restoration. Output previews of Earth probe/chase, Moon and Saturn chase were inspected side by side. They preserve detail and composition; this is not a claim of photographic equivalence.

The 95 dependency-free unit checks pass. The repair list tracks 136 findings; V29 addresses adaptive display resizing. U03, V02, V03, V18, A01 and D03 remain open. Final multi-engine, sustained-flight and package evidence follows.

Chrome 158.0.8127.37, Firefox 153.0 and Playwright WebKit 26.5 pass all 96 final-source HDR comparisons across DPR 1/2 and four quality settings. Ninety-five pairs are identical. The remaining pair has mean linear-component difference 0.000000997, maximum 0.06494, affecting 0.1095% of components, within the explicit control envelope. Drawing/allocation counts, scene dimensions and star/glare/cloud scales match. Thirty-six fractional-size checks retain zero canvas writes during High adaptation; all six full-resolution photographs preserve flight state and restore the prior scene resolution without resizing the display.

The same three engines pass 21 deliberate context-loss/restoration scenarios at DPR 2 with a reduced scene grid. Physical pose, velocity, fuel, time, lens, camera base, review preview/history and both scene/display dimensions are preserved. Lost graphics block stale keyboard/controller input and capture; restoration redraws and settles, and explicit resumption advances the appropriate clock. This validates recovery behavior without claiming to reproduce the historical spontaneous reset.

All 36 final-source scene/camera transition windows pass with zero display dimension writes. The first Earth adaptation again takes 0.2 ms, with a 54.9 ms maximum interval in that three-second window. One separate first chase frame reaches 111.5 ms: drawing takes 95.1 ms, including 92.4 ms in the spacecraft pass, while reflection update takes 0.6 ms. The remaining 34 windows peak below 20 ms. Physical time, visible rendering and the selected score continue in every window without context loss or browser errors. This isolates a remaining spacecraft first-use preparation cost, rather than attributing it to the repaired canvas resizing.

Source-ownership check: the 47 application JavaScript files total 286,514 bytes. Their static relative imports contain no cycles and no module imports the application coordinator. This supplements the runtime delta/ownership review; it does not claim a full semantic dependency analysis. Historical browser programs, outputs and screenshots remain excluded from the 122-entry playable archive.

The final Chrome/Metal endurance run completes in 360.596 seconds. All 36 samples advance physical flight and render all 17,223 sampled animation ticks, with bounded history, one playing score after each crossfade and no context loss or browser errors. After both camera modes visit every scene, retained resources remain at 20 geometries, 31 textures and 21 programs. This six-minute result leaves the historical spontaneous driver-reset cause unresolved.

Final delivery: the independently extracted 0.64 archive passes 95 unit checks and the existing offline exploration, following, live chart, photograph, flight-review, settings and local-media checks. All 83 offline runtime hashes match, with no external requests or browser errors. The 0.63 → 0.64 upgrade preserves physical flight, options, old photographs, science notes and history; offline reload, passage playback and cache isolation pass. The finalizer verifies workspace, main preview, archive and tested extraction hashes.

Runtime: 19,942,189 bytes (+89), 83 files. ZIP: 17,000,772 bytes (+651), 122 entries, SHA-256 `c95f168e0957b48a4e235fb1693c02de40d4119121d8977e9e7a235a0c3a9ec8`. `dist/release-review.json` records the source/report hashes, GPU cost and retained-display tradeoff. Physical Xbox hardware, installed Safari, subjective listening and photographic equivalence remain unverified. The improvement goal remains active.

Next bounded investigation: the remaining first chase hitch is concentrated in the spacecraft draw (92.4 ms in the final transition trace), while reflection costs only 0.6 ms. Check deferred spacecraft/shadow driver preparation through the existing loading path, preserving initial reflection correctness, native resource ownership and code size. Measure startup and first-chase latency before adopting another change; shader compilation alone has already proved insufficient for some first-use paths.


## Revision 0.65 — prepare the first spacecraft draw during loading

The 0.64 first-chase hitch was reproduced with its saved world source: the first draw took 76.7 ms CPU, including 74.2 ms in the spacecraft pass; the containing interval reached 89.9 ms. The reflection update took 0.6 ms. Inspection of the bundled renderer confirmed that material compilation does not render the depth shadow map, and a light with both automatic and requested shadow updates disabled skips that work.

The existing loading block now requests one shadow update, clears depth and draws the already compiled spacecraft to its existing one-pixel scene viewport. It prepares the spacecraft/depth pipelines before play. The original physical shadow-pose sentinel remains invalid; the first actual chase frame still recomputes sunlight/shadow and the real environment reflection. The viewport is restored in the existing finally block. No extra framebuffer, runtime asset, module, controller or flight-time drawing pass is introduced. The same shadow map and spacecraft geometry are allocated earlier; warmed resource counts must still match the prior implementation.

The focused candidate records 3.2 ms maximum draw CPU during its first chase window, with 0.6 ms in the initial spacecraft pass and a 28.3 ms maximum frame interval. Load readiness changes from 2,494 to 2,506 ms in this local comparison. These timings establish the observed benefit on this machine, not a universal loading/FPS guarantee. The runtime change is confined to `src/world.js`, +127 bytes.

The existing visual-review runner now starts with a first chase frame in a fresh renderer and covers six chase environments, including Earth shadow and Titan, alongside the original planetary scenes. It compares complete loaded previous/current sources, physical state, draw/allocation/program counts, exact decoded pixels, physical shadow direction, refreshed reflection position and full viewport restoration. The historical Jupiter-outlier check is conditional on different source maps; equal maps require unchanged pixels. Chrome's 17 paired scenes pass, and the Earth, shadow and Titan pairs were inspected side by side. The 95 unit checks pass. Final three-engine, transition and delivery evidence follows.

Chrome 158.0.8127.37, Firefox 153.0 and Playwright WebKit 26.5 pass all 51 final-source previous/current image pairs. Every decoded image hash matches exactly, including all 18 chase cases; physical state, drawing/allocation/program counts and restored viewport dimensions match. Each chase case refreshes the real shadow and reflection rather than retaining the loading placeholder. Full scenes were loaded independently for the two implementations, so this comparison includes loading-side effects.

The final-source 36-window transition run passes with no intervals over 100 ms. The worst measured interval across all starts/views is 52.3 ms. First chase drawing again peaks at 3.2 ms CPU, including 0.7 ms in the spacecraft pass; its first visible frame arrives in 16.1 ms, and the maximum interval in that window is 37.7 ms. Readiness is 2,528 ms. All sampled flights render, advance physical time and retain the selected score, with zero display writes, context losses or browser errors.

The focused continuous-flight check completes in 80.138 seconds across Earth and Saturn, four alternating probe/chase rounds. All eight windows advance physical time, render, retain bounded history and finish with one playing score. Warmed resource counts remain at 20 geometries, 26 textures and 21 programs for this two-scene set. No context loss or browser error occurs. This is an 80-second targeted check; the previous 0.64 six-minute all-scene report is retained as `tests/endurance-before-v65-results.json` and is not presented as a new 0.65 run. The historical spontaneous reset remains unresolved under V03.

Final delivery: the independently extracted 0.65 archive passes all 95 unit checks and the existing offline flight, following, chart playback, photograph, review, settings and local-media checks. All 83 runtime hashes match, with no external requests or browser errors. The 0.64 → 0.65 upgrade preserves physical flight, options, photographs, science notes and history, and passes offline reload, passage playback and cache isolation. The finalizer verifies workspace, main preview, ZIP and tested extraction hashes.

Runtime: 19,942,316 bytes (+127), 83 files. ZIP: 17,001,123 bytes (+351), 122 entries, SHA-256 `ad4108a9f49ca368b32dc5cf8e31d097c87aa8184e6943b50ad3d301e4a33f5d`. `dist/release-review.json` retains scope and source/report hashes. The repair list now tracks 137 findings; V30 is addressed, and U03, V02, V03, V18, A01 and D03 remain open. The improvement goal remains active.

Next experiential review: after the measured startup/transition work, revisit the actual free-exploration flow and HUD readability. The unchanged in-flight interface places upper-right camera/exploration actions over a bright Earth limb in the offline opening screenshot. Check legibility across changing compositions and compact windows before choosing a restrained treatment; also verify how a newcomer discovers nearby studies through Explore. These are investigation targets under U03, not a demonstrated interaction failure or an instruction to add more UI.

A final full-screenshot inspection initially suggested missing HUD text. Direct pixel inspection disproved it: the title, bearing and science regions in the original 0.64/0.65 offline PNGs are byte-identical and visibly complete in extracted crops. Fresh previous/current startup checks at immediate, 250 ms and settled states show loaded fonts, visible HUD and complete chapter text; every header crop contains the same 1,953 bright pixels. This was an image-preview inspection error, not an observed application defect. No UI workaround was added. Diagnostic evidence is in `/private/tmp/cosmos-startup-diagnostic.json` and `/private/tmp/cosmos-v65-interface-crops.png`.


## Revision 0.66 — preserve the intended HUD text treatment

An interface review of the freely moving scene found that camera, exploration, time and photograph buttons lose the shadow already defined on their HUD region. In the live Chrome computed styles the region has `0 1px 3px black`, while the native button resolves to `none`. Close lunar terrain makes the labels hard to distinguish. The text layout and controls themselves remain useful: nearby studies precede bearings and the coast chart, and all six are reachable without a new entry surface.

The existing shared button rule now inherits its regional text shadow. The existing pause SVG receives the matching drop shadow, since text shadow does not paint SVG strokes. This is a 55-byte change to `src/ui/flight.css`; no JavaScript, DOM elements, state, dependencies, fonts or assets change. It also lets existing photograph-toolbar shadows reach their buttons. The planet canvas and exported photographs remain independent of interface styling.

The [Xbox contrast guideline](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/102) informed the review: labels and symbols need separation from changing game backgrounds. The retained treatment uses the existing local shadows. A stronger edge-backdrop prototype visibly darkened the planet and was not adopted; a heavier text treatment was also unnecessary once native button inheritance was fixed. This is a targeted legibility improvement, not an assertion that every HUD element meets a numeric accessibility threshold.

Chrome 158.0.8127.37, Firefox 153.0 and Playwright WebKit 26.5 pass the existing menu/navigation checks. These cover native Space, restored flight focus, paused-state isolation, keyboard and synthetic Xbox controls, 27 compact/wide encounter layouts, all six local studies per engine, retained photographs and body bearings that preserve physical flight. All 95 existing unit checks pass. No new application controller or test program is added to the development tree; the temporary paint-review renderer generates visual comparisons for the changed presentation.

The temporary comparison renderer was refined to wait for the existing 160 ms button color transition after switching stylesheets. An initial screenshot set caught intermediate colors and was unsuitable for a pure paint comparison. The replacement captures settled styles and records color and opacity alongside bounds, text, canvas and flight state. The inspected lunar crop now isolates the small shadow change with equal text colors; the earlier transient screenshots are superseded. No runtime workaround was added.

Final settled-style review: 24 before/current compositions across Chrome, Firefox and Playwright WebKit preserve scene canvas pixels, physical state, button bounds, text, color, opacity and count. All seven sampled native buttons inherit the existing regional shadow, and the pause symbol receives its matching paint treatment. Browser error lists are empty. The close lunar scene was visually inspected at its original scale. The shared menu checks cover 27 layouts and 18 local-study visits. This is a targeted HUD improvement; the broader interface finding U03 remains open.

The independently extracted 0.66 package passes all 95 unit checks and the existing offline exploration, photograph, review, chart playback, settings and local-media checks. All 83 runtime hashes match, with no external requests or browser errors. The 0.65 → 0.66 upgrade retains physical flight, photographs, science notes, history and flight settings, and passes offline reload and passage playback. Workspace, primary preview, ZIP and tested extraction match. No new performance or endurance run was needed for the paint-only change, and older measurements are not presented as this revision's results.

Runtime: 19,942,371 bytes (+55), 83 files. ZIP: 17,001,401 bytes (+278), 122 entries; SHA-256 `475989d08aa12f3450e32ccc474ef04d72795296d6d87063310e918ab9186473`. Only `src/ui/flight.css` changes among runtime files. No assets, dependencies, DOM nodes, application state, controllers or persistent test programs are added. The repair ledger tracks 138 findings: U36 is addressed; U03, V02, V03, V18, A01 and D03 remain open. `dist/release-review.json` records scope and report hashes. The two isolated QA servers were stopped after checking their working directories; the main preview remains running. The broader improvement goal remains active.


## Revision 0.67 — retain unread science after revisiting a scene

The previous goal turn made verified progress: 0.66 repaired the existing HUD shadow inheritance and passed final package reconciliation. This pass reviewed the six nearby exploration starts through their actual menu actions. All present their authored invitation and visible target; the review found a reading lifecycle problem rather than a need for another exploration controller.

Reproduction in 0.66: an Earth note becomes visible at encounter time 14.95 seconds, with no notes read. Immediately choosing Explore → Revisit encounter restores the welcome invitation. Five seconds later that invitation is still visible, but the hidden science note has accumulated 5.07 seconds and `0:0` is in `experience.seen`. The same-chapter guide retained its active note, and only new-note creation checked the twelve-second welcome interval. `tests/science-reentry-before-v67.json` retains the observed before/after state.

The existing active-note invalidation now includes the invitation interval. It clears the interrupted reading clock without marking the note read; after the invitation the same guide can show it again. Already-read notes remain read. There is no new state, timing controller, panel or interaction. The existing unit suite has one regression covering the interrupted note, its return, visible reading and an already-read revisit; it fails against the previous guide and passes after the fix.

While reviewing ownership, unused presenter arguments (`input`, `placeMarker`) and obsolete command/speed/lens fields were removed. The measured subject is local to its update rather than retained between frames. Main passes only `dt` to the presenter; marker placement is now private to the existing HUD. The guide/presenter/HUD/application retain their established responsibilities. Runtime source shrinks by 259 bytes overall across four existing files; assets, shaders, flight integration, inputs and audio are unchanged. All 96 unit checks pass. Final browser and delivery verification follows.

The final-source menu/navigation run passes in Chrome 158.0.8127.37, Firefox 153.0 and Playwright WebKit 26.5. Each engine starts an unread Earth caption, activates Revisit encounter through Explore, observes the invitation for 4.5 seconds with no note marked read, then confirms the same caption returns and becomes read only after visible dwell. Position, velocity, fuel and local physical time remain exact during that held reading. The same run passes all 27 encounter layouts, 18 local-study visits, keyboard/pointer focus, native Space and synthetic Xbox navigation. This replaces the earlier pre-cleanup run as the final-source evidence. The workspace and independent extraction each pass 96 unit checks.

The independent offline archive passes the existing flight, camera following, nearby-study entry, photograph, review, chart playback, settings and local-media smoke checks. All 83 cached runtime hashes match the frozen source, with no external requests or browser errors. The runtime remains 83 files and 19,942,112 bytes (259 fewer); archive documentation and the added regression make the ZIP 17,002,100 bytes (699 more), still approximately 17 MB. These two measurements distinguish leaner runtime source from the small delivery-evidence addition.

Final delivery reconciliation passes: the main preview, frozen runtime, ZIP and tested extraction match. The 0.66 → 0.67 upgrade preserves photographs, science notes, physical flight, settings and history, and passes offline reload and passage playback. ZIP SHA-256: `e5d22fd8177a2fcdca1efb4586110309bbdbec6af849d9c740330ceecb838df6`; 122 entries. `dist/release-review.json` records final evidence/source hashes and scope. E30 and C22 are addressed, bringing the ledger to 140 observed findings. U03, V02, V03, V18, A01 and D03 remain open. No new visual-material, performance, endurance, physical-controller or subjective listening claim is made for this reading/ownership change. The two isolated QA servers were stopped after verifying their directories; the main preview remains running. The improvement goal remains active.


## Revision 0.68 — connect visible rotation to encounter time

The previous goal turn made verified progress: 0.67 preserves unread science on scene re-entry and removes unused presenter coupling. The next visual/flight review found that rendering already accepts a `time` option but ignores it: Earth, Jupiter and Saturn all produce byte-identical fixed-view images at zero and 7,200 simulated seconds. `tests/rotation-before-v68.json` records the static phases. This removes an observable consequence of changing time flow.

The existing time option now carries elapsed encounter seconds from main, or the selected snapshot's existing seconds during flight review. `BODY_DATA` owns map offsets and reference rotation periods; `surfaceRotation` evaluates the bounded prograde texture offset. NASA NSSDCA gives Earth 23.9345 hours, Jupiter 9.9250 hours (System III 1965.0) and Saturn 10.656 hours (Saturnian System III). References: https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html ; https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html ; https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html . Initial map longitudes remain authored; giant-planet wind differences, weather evolution and historical prime-meridian reconstruction are outside this model.

The existing Earth rotation uniform remains shared by its surface/water/cloud/shadow paths. FramePolicy retains the scene time alongside the physical view; a held clock reuses the image. Photograph capture receives the same time. Review previews carry the sample's existing seconds, with no new persisted state. The probe reflection budget considers apparent motion from rotation using its existing target and interval; a zero-step review/capture refreshes a changed reflection immediately. No texture, mesh, shader, rendering pass, interface control, dependency or animation controller is added.

The existing scientific-experience runner now covers three engines and preserves its physical thrust/time, bounds, historical passage, milestone, save and synthetic-controller checks. Nine fixed-view cases show different quarter-turn images and exactly repeated full-turn images while preserving physical state, draw counts and graphics allocations. Real flight, held-frame caching, photographs, chase reflection time, past/present review, restoration and reload pass in Chrome, Firefox and Playwright WebKit. The three before/quarter-turn pictures were inspected; the Sun-fixed illumination and rings retain their geometry while mapped features rotate. All 98 unit checks pass, including prograde direction, periodicity and time-aware frame invalidation.

The final-source transition run covers twelve immediate-selection windows: Earth, Jupiter and Saturn, probe/chase, cold and repeated visits. It passes with zero display-canvas writes, graphics-context losses or browser errors. Maximum measured frame interval is 89.9 ms on this host. Drawing/resource ownership is retained; this is a targeted transition check, not a claim of universal or improved frame rate. A separate 100×-time endurance run exercises sustained rotation and its bounded reflection updates.

The continuous-flight run passes in 120.221 seconds over Earth/Jupiter/Saturn and four alternating probe/chase rounds (twelve windows). Time selection is 100×; the existing near-body limiter remains active, so actual advancement can be lower. All windows render, advance simulated time, retain a live graphics context and settle to one playing score. Warmed allocations remain at 20 geometries, 27 textures and 21 programs. No browser error or context loss occurs. This targeted two-minute run does not resolve the historical unexplained reset under V03.

The independent offline package passes all 98 unit checks and the existing offline exploration, camera, photograph, history, chart, settings and local-media flows. The added disconnected check advances the held Earth clock to 7,200 seconds, verifies its reference map phase, and confirms a newly stored photograph uses that same time. All 83 cached runtime hashes match the frozen source. No external request or browser error occurs.

Final reconciliation passes for the frozen runtime, main preview, ZIP and tested extraction. The 0.67 → 0.68 upgrade retains flight, settings, photographs, science notes and history. Its restored elapsed seconds now produce the correct Saturn reference phase; offline reload and passage playback also pass. No new saved-time field or migration is required.

Runtime: 19,943,464 bytes (+1,352), 83 files. ZIP: 17,004,145 bytes (+2,045), 122 entries; SHA-256 `965dd0b11ded4f28f8a02cf20f5c46fdc2bc5296d8b4f46f26f0336ecfef788a`. Five existing runtime owners change. `dist/release-review.json` records evidence and source hashes. V31 is addressed, bringing the audit to 141 findings; U03, V02, V03, V18, A01 and D03 remain open. The two temporary QA servers were stopped after checking their directories; the primary preview remains running. This release adds a meaningful time-dependent visual behavior while retaining the original physical-control model and restrained interface. The full improvement goal remains active.


## Revision 0.69 — display the time actually explored

The previous goal turn made verified progress: 0.68 connects visible reference rotation to elapsed encounter time. This pass found that the heading, instruments and new photograph metadata still used the starting instant after hours of simulated flight. A regression against the previous formatter fails for an Earth study advanced by 7,200 seconds.

`encounterDate` now combines the existing elapsed seconds with the loaded scene UTC anchor. It preserves the historical precision: seconds for the measured flyby anchors, minutes for Pale Blue Dot, and a day for the heliopause. Titan retains its independent earlier anchor; the final milestone retains its predicted qualifier. Voyage selection keeps historical milestone dates, and the fixed-position solar chart explicitly formats zero elapsed time with a reference-epoch label. No orbital-motion model is implied by advancing the local study clock.

The existing HUD writer updates the date during flight without rewriting unchanged text. Instruments and all three capture paths use the same formatter. The shutter captures image and metadata synchronously before persistence, preserving the time of exposure. Saved photographs retain their original dates. Flight review already hides the flight HUD and presents recorded elapsed time; cancel or restore updates the returned heading from physical state. There is no new timer, controller, persisted field or migration. A preliminary separate date-update callback was removed once the existing panel/HUD visibility boundary was confirmed.

Five existing runtime modules change: encounter context, mission data, solar-chart state, the HUD and main coordination. The six studies no longer duplicate date/time strings, the encounter context no longer copies obsolete date/time fields, and six unused milestone scene labels are removed. There are no new files, assets or dependencies. The 47 application JavaScript modules retain an acyclic static relative-import graph; no module imports main. Both workspace and independent extraction pass 99 unit checks, including UTC midnight, fractional seconds, source precision and fixed chart epochs.

The existing scientific-experience runner passes in Chrome, Firefox and Playwright WebKit. Eighteen explicit date cases cover Earth, Saturn midnight, Titan, Pale Blue Dot, heliopause and predicted light-day time. New photograph metadata matches the held Jupiter heading and the visible photo description. Review uses its existing elapsed-time display, cancellation preserves physical state, reload retains the present clock, and resuming from the first sample restores the original date. Existing thrust, boundaries, historical passages, rotation, held-frame reuse and synthetic Xbox checks also pass. The verification was adjusted to close the photo viewer through its existing Journal return path and wait for the first rendered HUD update after rewind; no application workaround was added for test timing.

Final-source menu/navigation checks pass in all three engines, covering 18 study visits and 27 compact/wide encounter layouts, native keyboard actions, focus restoration and synthetic Xbox mapping. Final science and menu runs have empty browser-error lists. The Saturn HUD capture was inspected and the existing heading/date layout remains legible.

The independently extracted offline package passes all 99 unit checks and the existing exploration, photo/viewer, camera, review, chart, settings and media checks. All 83 offline runtime hashes match, with zero external requests or browser errors. At 7,200 elapsed seconds the Earth heading and new photograph both read 20:00:00 UTC. The 0.68 → 0.69 upgrade preserves old photo bytes and metadata, physical flight, options, science notes and history; restored Titan time reads 05:41:12 UTC for 12.02665 elapsed seconds. Offline reload and passage playback pass. A test-only textContent invocation error was corrected and the upgrade was rerun from a fresh 0.68 extraction; the runtime did not change.

Final reconciliation passes for the frozen source, primary preview, ZIP and tested extraction. Runtime: 19,943,813 bytes (+349), 83 files. ZIP: 17,005,317 bytes (+1,172), 122 entries; SHA-256 `d346b97f5cac8d2a9e44b4c875bf5b099bee857f96c41300b1fa6b93294c5f7a`. The obsolete date copies account for 495 bytes removed from the preliminary implementation. No module, asset, dependency, control, saved field or persistent test program is added. `dist/release-review.json` records final scope and evidence hashes. E31 is addressed, bringing the ledger to 142 findings; U03, V02, V03, V18, A01 and D03 remain open. This presentation/data-cleanup pass makes no new performance, endurance, physical-controller or subjective-listening claim. Temporary QA servers were stopped after verifying their directories; the primary preview remains running. The improvement goal remains active.


## Cloud-density investigation after 0.69 — not shipped

The previous goal turn made verified progress: 0.69 aligns local dates and removes duplicate metadata. This pass returned to the open V18/V02 close-cloud issue. Fixed 4° grazing views show regular stripes that disappear in a 400/800-step reference using the same weather field and lighting equations. Redistributing the existing 64-step budget changes the resolved-limb display RMSE only from 1.1681 to 1.1580. A two-tap ray prefilter reaches 1.1557. Neither is a sufficient visual benefit to justify adoption.

Separate density integration within each lighting segment improves the result substantially. A four-subsegment prototype brings the resolved-limb RMSE to 0.5748, but substantially increases drawing cost. Reusing short-path coordinate expansion does not cure that cost. The final investigated prototype reuses the two existing weather reads for near/far density columns at resolved grazing views. It analytically combines optical depth and its first moment, keeps one lighting evaluation, and smoothly returns to the pixel filter by angle/footprint. Polar and long spans retain the original mapping. No asset, pass, texture, application state or controller is required.

Chrome, Firefox and Playwright WebKit each pass eleven numerical/composition cases: ordinary day/night/close views, resolved clouds, three neighbouring limb views, horizon, closer limb, pole and longitude seam. In Chrome, the resolved-limb display RMSE falls from 1.1681 to 0.6316; the horizon falls from 1.3289 to 0.7847. Linear camera-motion error falls from 0.0099533 to 0.0038524. Geometry, draw counts and physical state stay equal. The before, candidate and dense images were inspected. Source-map blurring and remaining integration artifacts are still visible; these results are not photographic equivalence. The volume-rendering background consulted was https://pbr-book.org/4ed/Light_Transport_II_Volume_Rendering/Further_Reading .

The quality gain fails the performance gate. In the final fixed-Ultra ABBA run, averages of each pair of GPU-window medians are: day 21.745 → 35.803 ms; ordinary close 19.708 → 33.789 ms; grazing 33.397 → 38.453 ms; resolved limb 12.507 → 31.281 ms. Low Power Mode is configured on the host and absolute timings vary, so they are not universal frame-rate estimates. Increased cost also reaches ordinary views where the visual difference is negligible. The specific GPU compiler/register cause has not been isolated. Keeping this implementation would conflict with the user's performance and simplicity requirements.

The candidate nevertheless completes 120.233 seconds of actual High-quality flight, twelve Earth/Earth-limb windows and both cameras. Time advances, resources stabilize at twenty geometries/twenty-six textures/twenty-one programs, one score remains playing after transitions, and no browser error or context loss occurs. Adaptive resolution can sustain flight, but that is not a reason to accept avoidable rendering cost. The trial is rejected and its seven changed runtime/package-document files are restored from the verified 0.69 archive. Version 0.70 is not released.

Retained development evidence is `tests/cloud-density-trial-results.json`; `tests/fixtures/cloud-density-trial.glsl` preserves the rejected shader specifically for reproducible quality/cost comparisons. The existing `cloud-reference-v36.mjs` entry point now compares the current lighting model against 400/800 complete segments and accepts `COSMOS_CLOUD_PREVIOUS` and optional `COSMOS_CLOUD_CANDIDATE`. With identical inputs it requires identical results; with a changed candidate it checks improvement and motion. Use `COSMOS_CLOUD_CANDIDATE=tests/fixtures/cloud-density-trial.glsl` to reproduce this trial. `cloud-cost.mjs` records its shader-source hash and accepts the same optional candidate override, so rejected shaders can be measured without reinstalling them in the game. The existing endurance runner can select `Earth limb`; no new persistent test program is added. These fixtures, reports and browser programs remain excluded from the playable archive.

Restoration verification passes: all packaged source matches the 0.69 archive, all 83 live runtime hashes and the service worker match, 99 unit checks pass, and eleven Chrome identity-control scenes produce equal outputs. `tests/cloud-density-restoration.json` records the result. Runtime and ZIP growth are zero for this investigation. ZIP remains 17,005,317 bytes; SHA-256 `d346b97f5cac8d2a9e44b4c875bf5b099bee857f96c41300b1fa6b93294c5f7a`. No temporary server was created; the main preview remains running. The next visual approach must preserve the ordinary-view cost before it can replace the current renderer. The full improvement goal remains active; V18/V02 remain open.

## Revision 0.70 — bound close-cloud detail to the view that needs it

The rejected post-0.69 experiment improved grazing clouds but increased ordinary-view cost. This revision retains its two-column density integration only for near-Earth, magnified grazing views. `CloudLayer` derives a continuous weight from camera distance, lens and the visible grazing band. The density shader also retains its footprint, ray-angle, pole and long-span limits. Both existing composition paths share the same uniforms and textures; two additional material programs are prepared during loading. Low-resolution probe reflections use the original program.

`cloudShader` generates both variants from one vertical-profile implementation. All seven ordinary Earth shader exports remain byte-identical to 0.69. The first implementation used GLSL conditionals; explicit source generation makes ordinary program identity directly verifiable. No runtime shader-text replacement, draw pass, framebuffer, image, geometry, dependency, interface control, saved field or gameplay controller is added. Three existing runtime files change by 4,179 bytes in total. The 47-module relative-import graph remains acyclic and no module imports main.

Chrome, Firefox and Playwright WebKit pass 33 numerical-reference views and 66 actual camera/quality selection cases. The latter include Ultra and High, full-to-narrow lenses, nadir, near-distance fade and return to the ordinary view. All selected variants are already compiled, physical state is preserved, and the detailed program at zero weight differs from the base by at most one 8-bit channel value. In Chrome, displayed grazing-limb RMSE against the 400-segment reference falls from 1.1681 to 0.6316; horizon RMSE falls from 1.3289 to 0.7847. Linear camera-motion error falls from 0.0099533 to 0.0038524. These compare integration of the same inferred cloud field; source-map blurring and residual artifacts remain. The numerical run began before the version-label increment and reports 0.69, with its Earth-source hash matching final 0.70.

Fixed-Ultra ABBA GPU measurements confirm the exact same compiled cloud program for old/new ordinary day, close and grazing views. Their timing averages vary in both directions on this Low-Power-Mode host; no ordinary frame-rate improvement is claimed. The resolved limb averages 33.228 → 39.395 ms across paired window medians. That added cost is confined to the view receiving the detail improvement. The 51 paired full-scene comparisons across the three engines remain pixel-identical, with unchanged draws, textures and geometry; the only program-count increase is the two prepared cloud variants. Final sustained-flight and offline reconciliation follow below.

The 120.201-second High-quality run passes twelve Earth/Earth-limb windows across both cameras. Physical time advances, one score remains playing, warmed allocations stay at 20 geometries / 26 textures / 23 programs, and no browser error or graphics-context loss occurs. The historical V03 reset remains unresolved. Workspace and independently extracted unit suites each pass all 99 checks.

The independently extracted offline package passes its existing exploration, camera, chart, photograph, review, settings and media checks, plus the magnified cloud path and full-resolution capture. The capture preserves physical state, restores target dimensions and uses prepared programs. All 83 cached runtime hashes match, with no external request or browser error. The 0.69 → 0.70 upgrade retains flight, options, history, science notes and original photograph bytes/metadata, then passes offline reload and passage playback.

Final source, primary preview, ZIP and tested extraction reconcile. Runtime remains 83 files at 19,947,992 bytes (+4,179); ZIP is 17,006,858 bytes (+1,541), 122 entries, SHA-256 `b79a03b00b9f34377ddaf2740c57e0522ea7960553d02ae7b394432e087ca672`. `dist/release-review.json` records source/evidence hashes and scope. Existing verification entry points were extended; no new persistent test program was added. The audit remains at 142 findings, with V18 improved and U03, V02, V03, V18, A01 and D03 open. The full improvement goal remains active.

## Revision 0.71 — coherent scene transitions and fewer competing messages

The previous goal turn made verified progress: 0.70 confines detailed cloud integration to resolved grazing views. This pass inspected the actual entry → nearby study → photograph → passage → solar chart sequence. Entering the Moon study adds a toast repeating the heading and invitation. Continuing immediately retains that old notice over the new historical passage; a recent photograph receipt also survives departure. The existing opacity-only clear allows a short footer ghost when a panel opens. The extended transit-chart runner reproduces the redundant study notice against 0.70 before the changes.

Study and bearing selection now rely on the existing heading, invitation and bearing marker. Departure clears the previous notice and photograph receipt while retaining the journal image. Explicit notice clearing hides the element and removes its old text immediately; ordinary timed expiry retains its fade. No new notification controller or UI control is introduced.

The old `updateObjective` function still wrote task names/captions and toggled observation/departure controls during setup, bearing selection and photo completion, before the current presenter overwrote them. That writer and its calls are removed, as are fourteen unused task captions and three unused HUD arguments. Encounter reading remains with the existing science presenter; the transit controller owns passage narration. The application no longer replaces its already-current transit copy with a second introduction. Remaining mission exports are unchanged apart from the retired captions, including historical metadata, scientific text, observation eligibility and saved identifiers.

Only main coordination and mission data change. Runtime source shrinks by 1,852 bytes; all 47 modules retain an acyclic relative-import graph with no imports of main. No asset, dependency, persisted field, camera controller, flight model or rendering path is added. Both workspace and independent-extraction unit suites pass all 99 checks. Final workflow and package reconciliation follow below.

Final-source transit checks pass in Chrome, Firefox and Playwright WebKit: 45 passage views, live chart playback/holds, keyboard and synthetic Xbox actions, graphics recovery, and the complete Moon-photo-to-Jupiter flow. Each engine verifies the study's existing invitation, immediate clearing of old camera notices and photo receipts on departure, and the current passage caption. The clean-departure capture was inspected. Menu checks pass 18 local-study visits and 27 layouts; bearing selection preserves physical flight and uses the visible marker without an extra notice. Science remains unread while its invitation covers it and returns afterward.

The independent offline archive passes flight, camera, picture capture, review, chart, settings and local-media flows, including the retained close-cloud path. All 83 cached runtime hashes match; no external request or browser error is recorded. The 0.70 → 0.71 upgrade preserves the original photograph bytes/metadata, physical flight, settings, history and science notes, with offline reload and passage playback passing. Final runtime, primary preview, ZIP and tested extraction reconcile.

Runtime is 19,946,140 bytes (1,852 fewer); ZIP is 17,006,693 bytes (165 fewer), 122 entries, SHA-256 `bdef060f000e94e0dc35c38624778e09ac21ee2e128a0164835b10b25518495f`. `dist/release-review.json` records the final hashes and scope. U37 and C23 are addressed, bringing the ledger to 144 findings. U03, V02, V03, V18, A01 and D03 remain open. In the reviewed Chase passage capture, the spacecraft still overlaps the left caption/telemetry region; that is a concrete remaining composition issue under U03 for the next pass. This cleanup makes no new rendering-performance, endurance, physical-controller or subjective-listening claim. The full improvement goal remains active.

## Revision 0.72 — clear neutral chase composition

U38 addresses the spacecraft/antenna overlap observed in the preceding Chase passage capture. The 0.71 source reproduces an intersection with the reading area at 1440 × 900 and a 70-degree lens. One fixed spacecraft-camera offset changes from `(8, 7, 22)` to `(-10, -2.5, 26)`, moving the silhouette above the reading/time areas and slightly farther from the camera. World optics and independent look remain shared; this adds no dynamic HUD avoidance, physical movement or camera controller. Only `src/world.js` changes at runtime. Its 159 additional bytes are the offset and two explanatory comment lines. All 47 modules retain an acyclic relative-import graph with no imports of main; runtime files remain 83.

The existing observation-camera runner checks actual projected triangles against visible interface rectangles: 360 cases across three engines, three viewport sizes, five lenses, Earth/Saturn encounters and passage, neutral pose and representative steering lag. Wide neutral views retain the whole model; every sampled case preserves physical flight and shared lens values. This is a bounded composition check, not a guarantee for arbitrary manual looking. Four compact Earth/Saturn encounter/passage captures and large Earth/Jupiter captures were visually reviewed. Existing tracking, 39 camera switches, manual release, photography and save/reload checks pass. WebKit's first post-reload synthetic 100 ms button pulse failed to open the menu; the test now waits for observed pressed/released samples, and the repeated WebKit run passes. No runtime input code changes.

The prior/current visual comparison passes 51 paired scenes: all 33 Probe views remain pixel-identical, and all 18 Chase views change composition. Draw/triangle counts, geometry, textures, programs, physical state, shadow freshness and reflection position remain equal. Both workspace and independent-extraction suites pass all 99 unit checks. No new reusable test program, asset, dependency, setting, persisted field, drawing pass or render target is added.

The independently extracted package passes offline flight, cameras, photographs, review, charts, settings and local media, including the retained close-cloud detail path. All 83 offline hashes match with no external requests or browser errors. The 0.71 → 0.72 upgrade retains physical flight, settings, history, science notes and original photograph bytes/dates, then passes offline reload and passage playback. Final source, main preview, ZIP and tested extraction reconcile.

Runtime is 19,946,299 bytes (+159); ZIP is 17,007,194 bytes (+501 including documentation), 122 entries, SHA-256 `cd2143956c6589654b23b0009815f44e4de614b3614af8ab85fea03b645d3252`. The ledger now tracks 145 findings, with U38 addressed. Broader U03, V02, V03, V18, A01 and D03 remain open. This composition change makes no new rendering-performance, endurance, physical-controller or subjective-listening claim. The full improvement goal remains active.

## Revision 0.73 — stable ring shadows in magnified exploration

The live ring-plane study exposed a regular crosshatch in the shadow cast onto Saturn, especially at 12° and 4° fields of view. Increasing only the pixel quadrature did not remove the narrow-view pattern; resolving the solar footprint did. V32 records this concrete visual defect. The shadow cutoff also ended at the reconstructed F ring's centre (2.320 equatorial radii); it now follows the visible geometry to 2.323, retaining both halves of that thin band.

The existing ring optical model now generates one padded, 8,192-sample R16F transmission profile at the current epoch's solar elevation. Its mip chain averages transmitted light after extinction. The shader uses 2 × 2 pixel quadrature and nine filtered solar samples (36 lookups, formerly 45 point lookups), preserving the current approximate Gaussian finite-Sun model. The profile reuses one texture across epoch changes, with no per-frame generation or upload. Base data is 16,384 bytes; the complete one-dimensional mip chain contains 32,766 bytes of texels before driver alignment. No asset, dependency, module, render target or draw pass is added. `ringshine.js` owns optical calculations, the material factory allocates the resource, and the renderer updates it at epoch changes. The direct ring material, existing ringshine cache, physics, cameras, interface and audio retain their existing behavior.

The extended ring-appearance runner passes 33 paired scenes across Chrome, Firefox and Playwright WebKit, plus 11 Chrome pairs at DPR 2. It checks the ordinary view, magnified ring plane, lit/unlit low elevations, night side, chase view and an unchanged Earth control. References integrate the native optical profile with 7 × 7 pixel samples and 61 solar samples; a 121-sample comparison establishes reference convergence. At DPR 1, 12° mean image error falls from about 0.0631 to 0.0161 display-channel levels, and 4° error from about 0.2323 to 0.0325. These are sampled-model comparisons, not comparisons with photographs. The ordinary 58° reference difference remains small; its original 3 × 3 pixel quadrature can be more accurate at some unresolved edges. Compact and magnified captures were inspected. Some subpixel dotted segments remain in the direct thin outer-ring image; the new shadow reconstruction does not change direct ring rasterization, and broader material realism remains V02.

Epoch sequences 2 → 3 → 0 → 2 reuse the same texture and restore the original profile without allocation growth; repeating the same epoch retains its data/version. Three simulated graphics-loss checks restore the magnified held ring image pixel-for-pixel and preserve flight state. The broader visual runner passes 51 old/new pairs: 36 unaffected images remain exact, while Saturn views and affected spacecraft reflections change. Draw counts, triangle counts, geometry and program counts stay equal; the generated shadow lookup is the single added texture.

The renamed existing cost entry point, `ring-shadow-cost.mjs`, measures fixed 1280 × 800 Ultra draws in ABBA windows. Completed-draw medians (update plus gl.finish) are approximately 0.65 → 0.55 ms at 58°, 0.50 → 0.45 ms at 12°, and 0.45 → 0.40 ms at 4° on this host. These short, timer-quantized measurements do not establish a sustained frame-rate gain or resolve V03. The runner retains source hashes and separate window results.

Both workspace and independent-extraction suites pass all 100 unit checks. The offline archive passes flight, cameras, photography, review, charts, settings and local media, including new ring-shadow photography and the retained close-cloud path. All 83 offline runtime hashes match with no external request or browser error. The 0.72 → 0.73 upgrade preserves physical flight, settings, history, science notes and original photograph bytes/dates, followed by offline reload and passage playback. Final source, main preview, ZIP and tested extraction reconcile.

Four existing runtime files change, adding 1,512 bytes; all 47 modules retain an acyclic import graph with no imports of main. Runtime is 19,947,811 bytes. The ZIP is 17,009,135 bytes (+1,941 including documentation and unit verification), 122 entries, SHA-256 `dfffc4e88c95aa28b6ea476e8da95fd05d5f3ee3a800dd6168f9a4a72273865c`. `dist/release-review.json` identifies the final source and evidence. V32 is addressed and 146 observed findings are tracked. U03, V02, V03, V18, A01 and D03 remain open; physical Xbox hardware, the installed Safari application and subjective listening were not newly assessed. The full improvement goal remains active.

## Revision 0.74 — continuous thin rings without another rendering system

The preceding pass delivered verified shadow improvements. Its remaining direct F-ring image showed dotted bright segments in ordinary ring-plane exploration. V33 records this concrete continuation. Nine pixel-centred samples can all miss the existing narrow Gaussian profile. The direct material now integrates sixteen samples anchored to that profile when it is unresolved, weighting radiance and opacity by the square pixel's linearized radial footprint. A smooth transition retains ordinary sampling when resolved. One shared optical-response helper replaces the repeated reflection/transmission equations. Physical radius, optical-depth width, colour, mesh extent, shadow lookup and ringshine are unchanged. No asset, texture, render target, drawing pass, module, setting, dependency or persisted state is added.

The modernized `ring-motion.mjs` replaces the historical v16 runner. Five configurations per engine cover the ordinary ring plane at 58°, 12° and 4°, and lit/unlit low elevations. Across sixteen small camera rotations, isolated F-ring linear-HDR brightness variation falls by approximately 32–84%. The broad-ring control remains pixel-identical. Sixteen profile samples differ from 128 by at most 0.113% in integrated absolute red-channel difference; 64-to-128 differences are below 0.015%. This establishes quadrature convergence within the reconstructed model, not independent photographic accuracy. The old sparse sampler's mean is retained in the report rather than used as an accuracy reference: mean differences range from roughly −2% to +6%. Finite mesh coverage and grazing-angle linearization remain approximations under V02.

All three engines pass 33 paired ring scenes; Chrome adds eleven DPR-2 pairs. Ordinary and magnified before/after frames, including the DPR-2 close frame, were inspected. The general visual comparison passes 51 pairs: 36 images remain exact, while Saturn scenes and affected spacecraft reflections change. Drawing, geometry, texture and program counts remain equal. All three simulated graphics-recovery checks restore the held magnified ring image exactly. Physical flight remains unchanged throughout these checks.

The existing cost runner is now `ring-cost.mjs`, selecting the direct material or the planet-shadow shader rather than adding a separate program. Fixed 1280 × 800 Ultra ABBA windows record completed-draw medians of approximately 0.30 → 0.25 ms at 58°, 0.20 → 0.30 ms at 12°, and 0.25 → 0.30 ms at 4°. These short, timer-quantized observations establish neither a sustained performance improvement nor exhibition-machine performance. V03 remains open. The runtime change stays confined to one existing shader module, adding 1,006 bytes; all 47 modules retain acyclic imports with no imports of main. Two historical verification entry points are replaced by reusable runners, keeping their count unchanged.

Both workspace and independent-extraction suites pass all 100 unit checks. The offline archive passes flight, cameras, photographs, review, charts, settings and local media, including ring and close-cloud photographs. All 83 cached runtime hashes match with no external request or browser error. The 0.73 → 0.74 upgrade retains physical flight, options, history, science notes and original photograph bytes/dates, followed by offline reload and passage playback. Final runtime, main preview, ZIP and tested extraction reconcile.

Runtime is 19,948,817 bytes. The ZIP is 17,010,129 bytes (+994 including documentation), 122 entries, SHA-256 `78c3cc6783bd2393aabe40e3afddccac8d3570e19aefc3239efda660b1bca3d8`. The final scope and source/evidence hashes are in `dist/release-review.json`. The ledger tracks 147 findings; V33 is addressed. U03, V02, V03, V18, A01 and D03 remain open. Physical Xbox hardware, the installed Safari application and subjective listening were not newly assessed. The user reinforced scientific scale alongside playability during this pass; physical dimensions, flight equations, historical dates and time-flow travel are preserved. The full improvement goal remains active.


## Revision 0.75 — a quieter opening, physical time and native world edges

The preceding revision delivered verified direct-ring improvements. The user then identified three experience failures: confusing information overload on arrival, playback-rate-dependent descriptions of flight time, and soft celestial edges. This pass addresses U39, E32 and V34 together, using the existing guide, flight clock and renderer owners.

A fresh voyage now starts at 1×. The existing guide first establishes that the player is Voyager 1 and already coasting, then introduces looking, time flow and exploration tools in successive short phases. Existing interface groups become visible as those phases progress. Looking and rate changes can advance the introduction; idle fallbacks keep it moving. Help, pause, keyboard/controller shortcuts and menu access remain available throughout. Entering a study or passage retires the introduction. Continue preserves the established full interface. Science reading is deferred while the introduction occupies its reading area, so covered notes are not marked read. This adds no persistent tutorial state, required task, control gate, controller, interface button or module.

Visible-frame elapsed time now drives physical advancement independently of the bounded control-smoothing interval. Previously, a frame longer than 50 ms lost physical time. Manual flight and passages now receive the full interval, while existing lifecycle pauses still stop time when hidden or inactive. Passages accumulate elapsed seconds before deriving Julian date and route progress, avoiding repeated addition of tiny fractions to a large Julian date. Arrival requires the full physical duration instead of an early progress epsilon. Remaining-flight captions report objective physical duration and historical arrival, without dividing by playback rate. UTC labels include seconds and round to milliseconds before formatting recorded instants. Thrust, gravity and trajectory data retain their existing definitions.

High quality now keeps whole-world geometry and edges at native display density, capped at DPR 2. The obsolete whole-scene adaptive-resolution budget and per-encounter resolution cache are removed. The existing separate cloud-layer adaptation remains. Balanced and Performance still provide explicit lower-resolution options. There is no sharpening filter, new detail texture, drawing pass, render target or material change.

Both workspace and independently extracted packages pass 102 unit checks. The scientific-experience runner passes in Chrome, Firefox and Playwright WebKit, comparing 1× at 50 ms and 100 ms frames with 1000× at 50 ms frames across three passages. Sixty physical seconds agree within 0.1 ms in Julian date and five metres in position; physical-duration captions match. Nine rate-independent endpoint pairs reach the same historical arrival and zero local elapsed time. Local 1× flight also advances ten seconds equally at 50/100 ms intervals, with positions within one metre. Existing physics, dates, bounds, held views, photography and synthetic Xbox checks remain passing.

All three engines pass progressive-opening and menu checks, including the initial 1× state, reduced first screen, manual-looking reveal, time selection, early menu access, controller wording, covered-note retention and immediate retirement on study entry. Opening captures were visually inspected. The render runner passes 96 paired fixed-grid views and twelve injected pacing cases. Under the paced DPR-2 cases the previous scene fell to 1001 × 627 while the current scene stays at 2002 × 1254. Moon, Jupiter and Saturn match the native Ultra reference exactly in these cases; Earth retains native geometry but adaptive cloud sampling differs. These are clarity measurements, not a frame-rate claim.

Sixteen live Chrome/Metal High-quality windows at 1600 × 1000 and DPR 2 cover Earth, Moon, Jupiter and Saturn in both cameras over two rounds. Earth median frame intervals range from 25.5 to 41.7 ms, with a maximum observed interval of 105 ms; the other worlds are approximately 16.7 ms. Earth cloud cost remains a practical limitation. A separate 160.377-second run covers sixteen flight windows over four rounds; resources stabilize after camera warmup, physical time advances, the score continues playing and no context loss occurs. No sustained frame-rate gain is claimed.

Forty-five passage/chart views and three held-ring graphics-recovery checks pass across the three engines. An earlier injected-loss WebKit chart run logged two foreign-context deletion warnings. Its isolated recheck and the final full three-engine run pass. The intermittent cause remains unproven and belongs to broader V03; this revision does not claim to repair it.

The independent offline package passes flight, cameras, photographs, review, charts, settings and local-media checks. All 83 cached runtime hashes match with no external requests or browser errors. The 0.74 → 0.75 upgrade preserves flight, options, history, science notes and original photograph bytes/dates, then passes offline reload, stale-cache isolation and passage playback. Final source, primary preview, ZIP and tested extraction reconcile.

The scientific-dimensions review also records E33: the flattened Earth globe currently uses the 6371 km mean radius as its equatorial dimension. NASA's Earth fact sheet gives equatorial radius 6378.137 km and polar radius 6356.752 km (https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html). Correcting the approximately 0.11% equatorial discrepancy requires changing the coupled globe axes and atmospheric optical units together. That work remains open; no radius edit is included in this revision.

Eight existing runtime files change by a net 685 bytes. The 47-module static relative-import graph remains acyclic with no imports of main. There are no new assets, dependencies, modules, controls or persisted fields. Existing reusable verification entry points are extended. Runtime is 19,949,502 bytes across 83 files. The ZIP is 17,011,992 bytes, 122 entries; SHA-256 `408694aba245f0e5644c589890a6e9c23c2850205a5bf83c267badbf9aced165`. Final scope and evidence hashes are recorded in `dist/release-review.json`. The ledger tracks 151 findings: E32, U39 and V34 are addressed; E33, U03, V02, V03, V18, A01 and D03 remain open. Physical Xbox hardware, the installed Safari application and subjective listening were not newly assessed. The broader improvement goal remains active.


## Revision 0.76 — consistent Earth axes and optical kilometre units

The previous goal turn made verified progress on the opening, physical clock and native world resolution. This continuation closes the concrete E33 discrepancy recorded there: the Earth globe used the 6,371 km mean radius as its equatorial axis, while atmosphere, clouds, coverage decisions and menu/observation compositions repeated that constant independently.

Earth now uses a 6,378.137 km equatorial radius and a polar/equatorial ratio derived from 6,356.752 km, verified against NASA's Earth fact sheet: https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html . The existing BODY_DATA entry remains the owner. The shader optical definitions generate one compile-time kilometre conversion from that value; the CPU optical-depth table reads the same metadata. The cloud material shares the body's existing uniform object, removing its independent flattening value. Menu compositions, observation ranges and cloud coverage also read the body radius. The existing mean-radius science sentence remains accurate and unchanged. No new uniform, module, asset, texture, render target, draw pass, control, dependency or saved field is introduced.

The scientific-experience runner now checks dimensions through the live vertex shader, geometry and scaled-space transform. Equatorial and polar views at 30,000 km and 8,000,000 km cover both distance-mapping branches. Across Chrome, Firefox and Playwright WebKit, twelve silhouettes differ from independent analytic projection by at most 0.452 pixels. Sixty optical-table samples are compared with independent 8,192-step kilometre integrals. Another 150 bounded rays exercise the production transmission shader at 0.1–300 km altitude, including inward, outward and tangent directions; maximum RGB-channel transmission error is 0.000871. The shared flattening identity is checked for the ground, clouds, clear-air scattering and transmission materials. These validate dimensional consistency within the existing oblate-normalized atmosphere; inferred cloud heights and full atmospheric realism remain broader V02/V18 limitations.

The same three-engine science run retains gravity/thrust, manual freedom, bounds, physical-clock comparisons, rate-independent arrivals, rotation, photography, review, save/reload, chart and synthetic Xbox checks. Both workspace and independent extraction pass 103 unit checks. The physical-dimension unit check distinguishes equatorial, polar and volumetric-mean radii instead of accepting the old mean-radius substitution.

The paired visual runner passes seventeen scenes in each of the three engines: 51 old/new pairs. Earth-system views may change because the globe and optical units changed; all other-world controls retain exact pixels. Drawing, triangle, geometry, texture and program counts remain equal, and rendering preserves physical flight state. Ordinary Earth, shadow and chase captures were visually inspected. This is a subtle dimensional correction, not a claim of photographic equivalence or a new sustained frame-rate gain. Historical atmospheric comparison fixtures retain their old dimensional convention; the development guide explicitly identifies the current science runner for current-axis verification until those historical comparisons are normalized.

The independent offline archive passes flight, cameras, photography, review, charts, settings and local-media checks, including ring and close-cloud captures. All 83 cached runtime hashes match with no external requests or browser errors. The 0.75 → 0.76 upgrade retains the existing Titan-based photograph/history/options checks and now also restores an actual old Earth flight. Earth position, velocity, fuel and elapsed seconds remain exact; its history remains available while the rendered globe uses the corrected radius. Offline reload, late stale-cache isolation and passage playback pass. Final source, primary preview, ZIP and tested extraction reconcile.

Seven existing runtime files change by a net 482 bytes. All 47 JavaScript modules retain an acyclic graph of 109 relative import edges, with no imports of main. Runtime is 19,949,984 bytes across 83 files. The ZIP is 17,012,750 bytes, 122 entries; SHA-256 a75b4b9aff277e263982458e8bac1899782cc66e781f816396e45aa74f146e40. Final source/evidence hashes are in dist/release-review.json. The ledger retains 151 observed findings; E33 is addressed, while U03, V02, V03, V18, A01 and D03 remain open. Physical Xbox hardware, the installed Safari application and subjective listening were not newly assessed. The broader improvement goal remains active.


## Revision 0.77 — optional opening guidance with a usable way back

The previous goal turn made verified progress on scientific dimensions. This continuation reviewed the actual first-player sequence against the user's request for gentle guidance and independent exploration. Three concrete shortcomings remained in the 0.75 introduction: the short control hint expired while hidden, leaving thrust unexplained (U40); the first-look CSS also hid the bearing when the player faced empty space (E34); and Explore stayed hidden until the last phase, making immediate pointer-led exploration unnecessarily indirect (U41).

The existing presenter now introduces looking, small thrust/coasting, time flow and exploration tools in four brief phases. The new thrust caption explains gradual motion and continued coasting after release. Its accepted-thrust flag reads existing physical feedback; it never commands thrust. The time caption now explains slowing as well as speeding time, with keyboard and Xbox wording. Each phase retains an idle fallback, so no prescribed input is required. Science reading remains deferred while these captions occupy its reading area.

Explore, Help and Pause remain visible from the first frame. Choosing an existing study immediately ends the introduction. The initial frame still hides advanced tools, telemetry and onward travel; speed appears with thrust guidance, time controls in the following phase, then photography/review/camera tools. The first-look CSS keeps an offscreen bearing visible, and the caption names its indicated subject and explains turning toward it or selecting the existing camera-follow action. A resolved bearing stays quiet during that initial look. This reuses the existing arrow, camera owner and menu entries, with no new button, forced flight, automatic physical steering or persisted tutorial field.

Chrome, Firefox and Playwright WebKit pass the extended menu runner. Each engine enters a Moon study through Explore before completing the first introduction phase, resets to a fresh voyage, looks away, recovers Earth through the visible bearing and verifies that held position, velocity, physical attitude, fuel and local time remain exact. Actual keyboard thrust consumes model propellant and produces positive accepted impulse; release returns its feedback to coasting. Device-specific captions switch through the existing input modality path. An idle pass traverses all four phases and retires without any acknowledgement or flight command. Covered science remains unread.

Thirty-six phase/viewport combinations cover 1440 × 900, 1024 × 640 and 800 × 600. The final check explicitly accounts for CSS visibility, rather than treating layout boxes of hidden controls as visible. Every initial case contains exactly Explore, Help and Pause; later visibility and minimum control heights are checked independently. New initial, lost-world, thrust and compact flight/time captures were inspected. Existing native Space handling, pointer focus return, synthetic Xbox menus, science retention, eighteen study visits and twenty-seven study-menu layouts remain passing. Physical Xbox hardware and the installed Safari application remain unverified.

Both workspace and independent extraction pass 103 unit checks. The independently extracted offline package passes the existing flight, camera, photograph, review, chart, settings, local-media and cached-resource checks. All 83 cached runtime hashes match with no external request or browser error. The 0.76 → 0.77 upgrade retains Earth and Titan physical flights, saved history/options/science, original photograph bytes/dates, offline reload and passage playback. The new runtime, primary preview, ZIP and tested extraction reconcile.

Only the existing experience presenter and flight stylesheet change, by a net 634 bytes. Physics, rendering, audio, image assets and the document structure are unchanged. All 47 modules retain the same acyclic graph of 109 relative import edges, with no imports of main. Runtime is 19,950,618 bytes across 83 files. The ZIP is 17,013,655 bytes, 122 entries; SHA-256 ff9a637872c8f190e2983e4db199ccd51e286c0a09f9147fe1ad03f736091d81. Final source/evidence hashes are recorded in dist/release-review.json. The ledger now tracks 154 findings; E34, U40 and U41 are addressed. Broader U03, V02, V03, V18, A01 and D03 remain open. This pass makes no new photographic-realism, sustained-performance or subjective-listening claim. The full improvement goal remains active.


## Revision 0.78 — opening feedback follows the player

A player could use time, hold or camera shortcuts while their corresponding instruments stayed hidden by the timed introduction. The existing presenter now reveals the appropriate stage immediately; thrust also brings its feedback into view. Progress stays forward when the player returns time to 1×. The final invitation identifies the existing Continue to Jupiter action and leaves nearby exploration optional. There are no new controls, saved fields, assets or modules. Two runtime files add 440 bytes; the 47-module / 109-edge import graph remains acyclic.

The existing menu runner passed in Chrome, Firefox and Playwright WebKit, including early time/thrust/hold/camera input, the visible onward action, 36 introductory layouts, early Explore access, offscreen recovery, idle completion and prior menu/science checks. The opening and compact final-stage captures were inspected. The 103 unit checks also pass. Independent offline/upgrade evidence and exact archive verification are recorded by `dist/release-review.json`; the UI change carries no new rendering or performance claim.


### Post-0.78 cloud investigation — candidates rejected

The previous opening turn made verified progress. This continuation tested two performance candidates without changing the shipped runtime. A bounded sunlight loop showed no consistent wide-view benefit; a readback-witnessed ABBA check measured day medians of 19.8/17.2 ms for the current shader and 19.4/18.4 ms for the candidate, and close-view medians of 16.5/17.9 versus 21.8/18.1 ms. A shared subpixel weather-column lookup failed the dense-reference check: day linear RMSE increased from 0.001057 to 0.002146, with direct displayed differences up to 20 channel levels. Neither candidate is adopted. Candidate hashes, reproducible patches and evidence are retained in `tests/cloud-investigation-results.json`.

Cloud comparison and timing runners now use the live equatorial radius rather than 6,371 km. `COSMOS_CLOUD_FIDELITY_ONLY=1` retains the numerical non-regression bound without requiring a performance-only experiment to improve the prior density algorithm; direct before/after pixel differences are reported. Current production clouds passed 33 views and 66 detail-selection checks in Chrome, Firefox and Playwright WebKit against 400/800-step references. Magnified cloud crests remain visible even in the 800-step image; field reconstruction remains an open V18/V02 issue.

The obsolete `gpu-profile-v19.mjs` was replaced by `gpu-profile.mjs` for native High dimensions and the current composition paths. Per-pass timer-query trials gave non-additive intervals, and finish-only intervals did not witness completed drawing. The retained diagnostic uses one-pixel readback: 60 whole-frame and 60 serialized-stage draws for each of four Earth/Titan camera views, with 30 warmups, unchanged physical state and zero graphics errors. It measures synchronization-inclusive draw cost, not live FPS. Earth cloud volume costs about 10.1–11.2 ms and its separate cloud/air composition about 5.1–5.6 ms in these serialized windows; whole-frame completed draws average 22.0–22.9 ms.

NASA MODIS separates infrared cloud-top retrievals from visible/near-infrared optical properties: https://modis.gsfc.nasa.gov/data/dataprod/mod06.php . This supports investigating height separately from coverage; it does not turn the existing visual map into measured height. The next experiment should address the shared density-field reconstruction consistently across visible clouds, sunlight and ground shadows. No asset, runtime file or archive was changed; the verified 0.78 package remains current.

## Revision 0.79 — source detail and cloud-height reconstruction

Earth uses the NASA September 2004 BMNG source at 16,384 × 8,192; Moon uses the December 2025 NASA CGI Moon Kit at 8,192 × 4,096. Each has four times the previous delivery pixels. Basis ETC1S quality 255 and the local Three KTX2 decoder keep the tested BC7 mip allocation near the former RGBA maps (170.7 and 42.7 MiB). Original AVIF images remain offline fallbacks for lower texture-size limits. Firefox's 8K cap retains the exact former Earth image; its Moon uses the higher-resolution BC1 path. The increased download is real; no generated microtexture or artificial sharpening is added. Source provenance and reproduction live in `surface-detail-source.json` and `build-surface-detail.py`.

`surface-detail.mjs` checks six actual GPU-sampled source crops across Chrome, Firefox and WebKit. All supported higher-resolution paths lower colour and first-difference RMSE relative to NASA crops; fallback Earth pixels match the original. Chrome colour-error reductions range from approximately 14% to 33% across these crops. This is measured image-detail retention, not scene photographic equivalence. `visual-review.mjs` passes 51 complete paired views, preserving physical state and geometry/draw counts. Other planets retain their images.

Cloud optical coverage no longer directly sets fine-scale cloud-top height. Loading packs unchanged fine coverage into R and a 4 × 4 averaged/bilinearly reconstructed height proxy into G. All view, sunlight and ground-shadow paths read the same packed field. This removes large inferred-height spires without a second lookup per ray segment. The extra RG8 channel adds 42.7 MiB at 8K. Inferred heights remain explicitly approximate. The initial live second-fetch implementation was rejected for its grazing-view cost.

The packed field passes three-engine 400/800-step reference convergence (33 views), detail-selection/transition checks and 32,768 original-versus-packed coverage samples per engine; measured coverage differences are zero. A complete-field readback ABBA comparison switches both cloud/ground shaders and the old R8 versus new RG8 upload. Old/new window medians were 18.6–19.0/18.9–19.9 ms (day), 18.1/18.1–18.3 ms (close), 23.2–23.5/23.6–23.9 ms (grazing), and 23.0–23.6/23.1–23.5 ms (magnified limb). These measurements predate the surface-map upgrade and are not a frame-rate guarantee.

Graphics-context recovery passes held Earth and flying Moon across three engines with physical state, input safety and explicit resumption preserved. The final-source encounter run measures Earth/Moon at 1600 × 1000, DPR 2, in probe/chase views over two rounds; report `encounter-performance-results.json` retains loading and frame-interval observations. The dependency-free suite passes 103 checks. Runtime architecture remains 47 application modules and 109 relative imports without cycles. Maximum-zoom source limits, cloud scattering and other-body source detail remain open.

## Revision 0.80 — lunar surface relief clarity

| ID | Observed issue | Repair / improvement | Current status |
|---|---|---|---|
| V37 | Lunar colour has fine detail, but the 1440 × 720 slope/height fields blur crater walls and sparse sunlight samples miss small ridges. | Replace the lighting fields with NASA LOLA's native 5760 × 2880 data, encode unexaggerated slopes in two channels, and increase sunlight samples from 14 to 48 over the same physical range. | Source-field and dense-reference checks pass in three engines; finite shadow sampling and extreme/polar source limits remain under V02 |

The relief builder uses the source's half-metre height units and 1737.4 km reference sphere, preserving the existing silhouette mesh and physical scale. Central differences use cell-centre latitude and half-turn continuation at the poles. Native height is retained as lossless R8; rounding adds at most 41.18 metres. Normals use upper-hemisphere octahedral RG8 at AVIF quality 95. The two lighting assets total 9,290,036 bytes. They replace the prior assets rather than adding a material system or dependency. Application modules remain 47 with 109 relative imports and no cycle.

Development comparison rejected ordinary RGB ETC1S because slope error was larger, and UASTC because it required 16.9 MB for the normal map alone. The selected normal map is 5.50 MB. Height plus normal mip storage is approximately 63.3 MiB, about 56.7 MiB above the old fields; this is an explicit memory/download trade for measured surface detail. Colour-map GPU compression and texture-limit fallbacks remain from 0.79.

The reference uses the same source in uncompressed XYZ normals and Float32 height, with 128/256 sunlight samples. Across three engines, 32,768 sampled locations per engine retain typical slope error below one degree mean and two degrees at the 95th percentile; height mean error is below 16 m. Five full, close, crescent and polar compositions retain flight state. Source-reconstruction convergence establishes numerical fidelity, not photographic equivalence. Very steep/polar interpolated normals retain large isolated angular errors, and the polar colour fill visibly limits extreme close-ups. These remain documented limitations.

Final source review: fifteen compositions across Chrome, Firefox and Playwright WebKit reduce displayed-image RMSE against the dense source reference by 72.0–83.1 percent compared with 0.79. This measures agreement with the source-based renderer, not agreement with a camera photograph. Fifty-one paired material views preserve drawing allocations and physical flight; all non-Moon controls remain pixel-identical.

The focused live Moon check uses a 1600 × 1000 viewport at DPR 2, rendering 3200 × 2000 pixels. Loading completed in 3897 ms. Four five-second probe/chase windows over two rounds measured approximately 16.7 ms median and 18.1–18.3 ms at the 95th percentile, with no >100 ms interval, context loss or stalled physical clock. This focused observation is separate from sustained exhibition-hardware validation.

Delivery verification: workspace and independent extraction each pass 103 unit checks. The extracted package verifies all 92 offline runtime hashes, with zero external requests or browser errors. The 0.79 → 0.80 upgrade preserves flight, options, photographs, history and passage playback through offline reload. Six moving/review Moon graphics-recovery cases pass in three engines. Final archive, extraction, workspace and primary preview files match. ZIP: 42,108,981 bytes, SHA-256 `7f0279f2500fe11e1a7f0f7d2c2e85a901d9a6bee61c100abb9dc143cc15cee2`. Runtime: 45,491,672 bytes in 92 files. The release remains an incremental material improvement; broad photographic realism and exhibition-hardware validation stay open.

## Revision 0.81 — continuous close-view optics

| ID | Observed issue | Repair / improvement | Current status |
|---|---|---|---|
| V38 | Lens animation rounds every frame to 0.1°, causing repeated holds and sudden changes at high magnification. Zoom also places repeated notices over the scene. | Retain optical precision through logarithmic lens easing and settle by relative image scale. Round only displayed angles through one shared formatter. Let the picture show zoom feedback; keep the camera menu, instruments and photograph metadata. | Old discontinuities reproduce; focused precision, lifecycle and full camera verification recorded with this revision |
| D14 | Regenerating the current issue list from the historical ledger drops 27 findings maintained only in the current list. | Keep current rows authoritative and import new IDs from history. Validate row shape and uniqueness; normalize formatting without overwriting later status. | All 158 pre-existing rows preserved verbatim by ID; repeated generation is idempotent |

The old 4.8° lens animation differs from a continuous optical reference by up to 7.52 CSS pixels for a feature initially 540 pixels from the view centre. At 30/60/120 Hz it repeats the same intermediate view 10/24/54 times while visible movement remains. The revised animation preserves full camera precision and uses a relative-scale stopping threshold; the same comparison stays below 0.01 pixel with no intermediate holds. These deterministic rates test timestep independence, not measured frame rate.

The existing ObservationCamera remains the sole lens-animation owner. Display formatting is shared by the camera panel, instruments, photographs and flight review; saved/history lenses retain their full numerical values. Manual flight, target following, image sources, geometry and physical scales retain their existing implementations. Six runtime source files change by a net 301 bytes, with no new application module or asset.

Verification: Chrome, Firefox and Playwright WebKit each pass nine old/current optical traces, 120 chase-view compositions, thirteen camera-switch cases, follow acquisition/release, live wheel input, simulated Xbox controls and exact fractional-lens save/reload. The largest current projection error is 0.00608 CSS pixel in the deterministic 30/60/120 Hz checks. Every held-flight comparison preserves physical position, attitude, velocity, fuel and mission time; settled lenses stop requesting new scene frames. Camera readouts fit 1440 × 900, 1024 × 640 and 800 × 600, while photographs and review present a concise angle. These are browser and synthetic-controller checks; physical-controller validation remains open.

Delivery: both workspace and independent extraction pass 103 unit checks. The extracted offline game verifies 92 runtime hashes with zero external requests or browser errors. The 0.80 → 0.81 upgrade preserves saved flight, photos, review history, options and passage playback, including offline reload. All final runtime hashes match the primary preview and delivered archive. ZIP: 42,109,892 bytes, only 911 bytes above 0.80; SHA-256 `b0bc49e5c9ba04e7d10cdbba8448dc05beb3a28f58164c3f61fe17d8971067df`. Runtime: 45,491,973 bytes, 47 application modules and 111 acyclic relative imports. The main preview remains running.


## Revision 0.82 — lunar polar clarity

Reproduced radial smearing in the lunar poles under magnification. Two stereographic caps reproject the existing LROC colour and LOLA-derived slope field, with linear-light colour filtering and a fixed hemisphere normal frame. Latitude and far-view blending retain the global maps elsewhere. Terrain-shadow origins now use spherical surface coordinates instead of distorted interpolated polar UVs. Three existing runtime modules change, adding 1,671 source bytes; two maps add 822,332 bytes. No physical, camera, control or interface code changes.

`lunar-poles-results.json` records six views and six small-motion sequences in each of Chrome, Firefox and WebKit. Against the lossless reprojected source reference, the magnified north-pole case reduces image RMSE by 53.5–56.8%. This reference verifies encoding and filtering, not an independent terrain reconstruction; mixed-map transition views are not converged across render resolutions. `lunar-poles-source.json` records the original source hashes, deterministic reprojection, and compression error (1.10-degree mean normal error, 2.29-degree 95th percentile, colour RMSE 1.11/255). Source resolution still limits extreme close views.

Chrome's seventeen paired scene controls preserve other-world pixels and physical state, with two accounted-for textures and no added draws or geometry. Active Moon and review-preview graphics recovery pass. Four eight-second Moon flight samples at 1600 × 1000 CSS pixels, DPR 2, render at native 3200 × 2000: median intervals 16.6–16.7 ms, 95th percentile 18.3–18.6 ms. These are short local observations, not sustained or exhibition-hardware guarantees. Current delivery/offline/upgrade evidence is recorded in `dist/release-review.json`.


## Revision 0.83 — one lunar height field for lighting and shape

The silhouette retained an old four-samples/degree terrain file and a 256 × 144 mesh. It now derives a 512 × 288 mesh from the existing native LOLA height image: texel-centred bilinear samples, longitude wrapping, averaged pole heights, and an origin-centred observing/reflection bound. The obsolete 74,530-byte terrain file/fetch is removed. Two runtime modules change, net +1,220 source bytes; no module, texture, rendering pass or dependency is added. The denser mesh adds 220,672 triangles per lunar draw and approximately 6.33 MiB of vertex/index storage; the temporary image read occurs only during loading.

`lunar-geometry-results.json` records three-engine checks against independent interpolation of the native Float32 elevation. Old vertex-height mean/p95 errors were 196.0/715.7 m; the new sampled vertices give 12.0/29.2 m, maximum 41.16 m, within the R8 height representation. These are vertex-sample errors, not a bound on the entire interpolated surface. All longitudes join and pole vertices share a height. Across six magnified limb views, mean silhouette error falls from 1.086 pixels to 0.528 pixels against a 2048 × 1152 native-source mesh; the 1024 × 576 convergence control gives 0.224 pixels.

Four eight-second Moon flight windows at native 3200 × 2000 retain 16.7 ms median frame intervals and 17.5–18.4 ms p95. One 121 ms interval occurs; these short measurements do not establish sustained or exhibition-hardware performance. The existing V03 remains open. Current paired-scene, recovery, independent-package and save-upgrade evidence is recorded in the final delivery report.

The paired scene counters also expose remaining vertex work below visible resolution: a distant Moon can still contribute a full mesh draw during a 64-pixel spacecraft cube-map capture (for example, the Jupiter chase case gains exactly 220,672 submitted triangles). Other-world pixels remain identical. A future screen-footprint geometry budget should account for the main camera and reflection cameras separately; this is performance work under V03, not evidence that distant worlds should be visually enlarged.


## Revision 0.84 — preserve visible detail while reducing distant geometry work

| ID | Observed issue | Repair / improvement | Current status |
|---|---|---|---|
| C24 | Unresolvable distant worlds submit full surface meshes to the main view and spacecraft reflections. | Share one coarse nested mesh per original geometry, retain full geometry for potentially resolved worlds, and bound visible projected displacement to 0.04 render pixels across the main view and all reflection faces. Select once per frame and prepare buffers while loading. | Three-engine image, independent spatial/projection, distance-sweep and full-resolution photography checks pass; forced reflection-refresh cost is reduced locally |

Only `world.js` and the new `geometry-detail.js` change runtime implementation. No surface image, shader, physical state, controls or camera behavior changes. Two shared 32 × 18 geometries add approximately 52 KiB of vertex/index storage. Main and reflection cameras share the current origin; uniform body scales and conservative diagonal-view bounds govern selection. Original bounds retain culling and observation behavior. This replaces the candidate per-camera/three-level approach with one selection per frame and one coarse mesh per original.

Chrome, Firefox and WebKit each pass sixteen paired scenes, seventeen small-Moon distance samples and a full-resolution photo/restore check. Independent interior interpolation remains within the stored mesh-error bound; visible projected samples remain within 0.04 pixels. Tested scene images match within repeated-render variation. In Chrome's Earth probe case the same 21/255 isolated maximum difference also occurs between repeated reference frames; it is not a measured geometry regression.

GPU measurements use 64 interleaved ABBA groups on consecutive animation ticks after warm-up, with four chunks of 32 samples per variant. Every chase frame deliberately refreshes reflection. Median-of-chunk medians for the whole frame: Earth 34.102 → 34.339 ms, Jupiter 3.122 → 2.830 ms, Saturn 4.262 → 3.874 ms. The Earth control is effectively level; the two chase cases improve by about 9%. Isolated six-face rendering measures Jupiter 1.029 → 0.528 ms and Saturn 1.114 → 0.588 ms. Submitted chase triangles fall from 1,274,484 to 621,044 and 1,063,028 to 553,844 respectively. These local refresh-cost measurements do not establish ordinary flight FPS or sustained hardware performance; V03 remains open. Earlier long-window timings were inconsistent, prompting the interleaved protocol rather than a performance claim from triangle counts alone.

Current material controls, graphics recovery, live flight, offline package and upgrade verification are recorded in `dist/release-review.json`.


## Revision 0.85 — Voyager-era Jupiter surface detail

| ID | Observed issue | Repair / improvement | Current status |
|---|---|---|---|
| V41 | Magnified Jupiter views exhaust a 3601 × 1801 Cassini weather map from 2000. | Replace the surface slot with an attributed 7200 × 3600 map from Voyager 1's 27 February 1979 observations. Match its planetographic latitude to the oblate geometry and retain the existing rotation, physical flight and renderer. | Source sampling, projection, browser and delivery checks recorded with this revision; synthetic colour, polar gaps and maximum-magnification limits remain V02 |

The selected source is Björn Jónsson's 2025 colour reconstruction. It uses the actual Voyager observations and includes documented colour synthesis, seam blending and smooth fill where polar data is missing. The map slightly oversamples the observations; four times as many delivered pixels is not a claim of four times the measured information. Cloud patterns also evolved between the source date and the 5 March encounter. Credits, the existing science note and in-game source list identify this provenance.

Native 7200 × 3600 AVIF at quality 85 and full chroma replaces the existing map, adding 2,821,433 asset bytes. GPU upload remains the existing image-texture path, with device-limit resizing handled by Three.js. Full-size RGBA mip storage is approximately 131.8 MiB, about 98.9 MiB above the old map; this is a measured-dimension memory trade for detail. No runtime module, asset slot, decoder, draw pass, control or physical behavior is added. Only the shared surface shader/material mapping, mission source copy and this image change.

ETC1S at maximum quality, with and without endpoint/selector rate reduction, failed the same-source half-resolution detail control in the four sampled regions. A 16.6 MB UASTC candidate also failed the first region and was rejected. A lossless PNG diagnostic reproduced source pixels exactly, isolating encoding loss from the sampling/test path. The selected AVIF reduces source colour and first-difference errors against the 3600-wide control without generated detail or sharpening. The 3600-wide control remains development-only and is not the older Cassini map, which depicts different weather.

The reusable surface runner reads actual texture upload dimensions and tests a constrained 4096-pixel device path. Twenty-one forward-constructed ellipsoid samples check the actual shader's latitude and longitude; the reference constructs points from a known planetographic normal instead of repeating the inverse shader calculation. Current results, material controls, graphics recovery, live flight, independent offline and upgrade checks are recorded in `dist/release-review.json`.

The 4096-pixel capability test exposed a pre-existing one-row ring-profile failure: generic proportional resizing requested 4096 × 0 storage, and the derived CPU/shadow profile retained an oversized source. The loader now fits that one-row image before upload and all existing ring consumers share it. Normal-capacity output is unchanged. The constrained test rejects every oversized or zero-sized 2D allocation instead of relying on the real GPU's larger capacity.

| ID | Observed issue | Repair / improvement | Current status |
|---|---|---|---|
| V42 | A one-row 8192-pixel ring image scales to zero height on a 4096-pixel device; derived profiles can exceed its capacity. | Fit oversized single-row images before upload, preserve one row and share the result with ring appearance, indirect light and shadow lookup. | Reproduced invalid texture allocation; constrained-device regression and unchanged normal-capacity scene controls recorded with 0.85 |


## Transport execution investigation after 0.85

A lunar sunlight-loop early exit was tried only in a temporary comparison. It did not produce a stable completed-draw improvement and was rejected. Earth ablation then confirmed that clouds and atmospheric composition dominate the high-density departure view. Per-pass Metal GPU timer values overlap and are unsuitable for summing component costs; animation intervals and whole-frame comparisons were retained separately.

The shared Earth transport loop was temporarily expanded at compilation, preserving its 6/12/20 samples. A first temporary script accidentally padded unrelated six-node sky tables, invalidating its cloud shader; its apparent 33-to-17 ms improvement is discarded. The corrected full-image test passes 19 composition/view combinations in Chrome with maximum display difference of one code value and mean below 0.0001, but valid ABBA runs retain roughly 33 ms day and 67 ms grazing intervals. The unrolling trial does not establish a playback improvement and slightly increases the grazing GPU diagnostic. The production shader is restored byte-for-byte to 0.85.

The reusable `atmosphere-review.mjs` now replaces its obsolete screenshot-only predecessor. It records repeated controls, display and HDR errors, resource/physical-state invariants, and optional separately identified GPU/frame timing. All trial scripts and original experiment reports remain outside the playable package. These experiments do not establish a runtime performance improvement.


## Revision 0.86 — Source-derived Io surface detail

| ID | Observed issue | Repair / improvement | Current status |
|---|---|---|---|
| V43 | Io uses a softer 4K model texture, losing mapped volcanic terrain and retaining its older colour treatment. | Replace its existing surface slot with an 8K, georeferenced USGS merged Galileo–Voyager mosaic. Preserve full-resolution RGB channels during encoding, published source detail and physical flight. | Source-crop, projection-orientation, browser and delivery evidence recorded with this revision; multi-date colour ratios and 1–10 km source limits remain V02 |

The 11,445 × 5,723 GeoTIFF has a one-kilometre simple-cylindrical grid. Its easting/northing bounds are resampled in linear light instead of stretching the padded raster extent. The single exterior NoData row is extended from the next row; longitude filtering wraps. Existing known feature orientation and the NASA map's overall registration are preserved. The USGS product combines Galileo colour ratios with higher-resolution Galileo/Voyager monochrome data, uses mixed dates, and retains incomplete polar detail. Credits and the existing science detail identify those limitations.

ETC1S at maximum quality failed the same-source 4K detail control. Ordinary 8-bit YUV AVIF, even at quality 94, retained a small colour-conversion/gradient error in the smooth Pele region. The chosen libavif/AOM encoder stores full-resolution RGB with an identity matrix at quality 87; all four representative source regions must improve against the same-source 4K control. Encoding tools and full-resolution source files remain development-only. No sharpening, generated geology or palette adjustment is used.

The delivery keeps the existing `io.avif` slot, surface shader and loader. No application module, dependency, texture slot, render pass or control is added. Full-size RGBA mip storage increases by approximately 128 MiB (42.7 to 170.7 MiB); smaller texture-limit devices use the loader's existing resizing. This is a deliberate memory trade for retained surface detail, not a claim of a memory or frame-rate improvement. Runtime, restricted-capacity, restoration and local-flight results are recorded in the release review. The general performance and photographic-realism findings remain open.


## Revision 0.87 — Clearer adaptive cloud reconstruction

| ID | Observed issue | Repair / improvement | Current status |
|---|---|---|---|
| V44 | High mode enlarges its reduced cloud field with bilinear interpolation, softening visible cloud structure. | Reconstruct premultiplied radiance and opacity with bounded cubic interpolation inside the cloud disc; retain linear coverage near the physical limb and on native grids. Share the sampler between merged and split composition. | Paired full-resolution, native-grid, photography, browser and delivery evidence recorded with 0.87; source-map and physical-cloud limitations remain V02 and V18 |

High-mode cloud scattering already runs on a reduced grid. Ordinary bilinear enlargement softens the resulting field even when the source map and numerical integration retain useful structure. The existing merged and split materials now share bounded Catmull–Rom reconstruction of premultiplied radiance and opacity. Nine bilinear taps form the cubic result; four nearby texels constrain its range. The physical shell discriminant fades to the original linear coverage near the limb. Matching native grids return the original sample immediately; direct photographs retain the full-resolution cloud path.

An initial unrestricted cubic sampler improved most compositions but increased crescent error by about 6%. Restricting reconstruction to the resolved interior removes that regression. At 1000 × 625, DPR 2, two adaptive budgets, the pre-installation full-resolution comparison reduces daylight display RMSE by about 9–13% and close-view RMSE by 23–27%. Error is measured against the same volume model at full display resolution; no new meteorological information is invented. The source cloud map, 8+12 minimum integration samples and historical/physical state are unchanged. A separate 4+6-sample trial increased day-view error roughly threefold and was rejected.

The same-helper Chrome Metal ABBA trial at 1600 × 1000, DPR 2, records day animation medians around 33.3 ms for both versions and grazing medians around 66.6 ms. Whole-frame GPU query diagnostics rise by approximately 1% and 3.4%, respectively; they are retained separately from frame intervals. This is a small accepted reconstruction cost, not a frame-rate improvement or sustained hardware guarantee. Trial details are retained in `tests/cloud-reconstruction-trial-results.json`; final source-identified browser and delivery results are recorded with the release.

The change stays in two existing rendering modules. It adds no texture, image, render pass, control or application module. The v36 composite runner is replaced by the reusable `cloud-composite.mjs`, including repeated controls and separate native-grid contexts. The broader material, cloud-source, hardware, interface and listening findings remain open.

## Revision 0.88 — preserve lunar surface detail

Re-encode the same 5,760 × 2,880 LOLA-derived slope field using identity RGB AVIF. This removes the extra luminance/chroma conversion from two independent normal-data channels. No sharpening, synthetic craters, changed slope strength or shader work is introduced. The file falls from 5,504,410 to 5,214,645 bytes; the height image remains byte-identical. The existing lunar relief review now has an encoding-only comparison against the exact lossless octahedral field. General scene comparisons retain unchanged worlds as pixel controls.

The close Earth cloud view still exposes limited source detail and inferred vertical structure. The official legacy NASA 8K cloud download failed with a TLS connection error during this review; two migrated asset addresses returned 404. No unverified or upscaled cloud source was substituted. This remains an open source-quality task.

## Revision 0.89 — preserve source cloud texture

The original 8,192 × 4,096 Solar System Scope image was reacquired and its hash matches the removed original recorded in `asset-cleanup.json`. Direct red-channel comparison identifies compression error before the volume renderer: source RMSE falls from 4.300 to 2.739 code values with quality-70 monochrome AVIF. The source image, orientation, dimensions, height-proxy filter, volume model and GPU formats are retained. The file grows from 4,447,745 to 6,177,861 bytes. Quality 90 reduces source error further but adds 5.27 MB; quality-65 speed-2/4 alternatives preserve less detail. These trials are recorded separately from final browser and delivery evidence.

The existing lossless-source comparison still shows soft extreme close-ups. Compression is one contributor, not the entire cause: the finite source grid and inferred vertical cloud structure remain material limits. An initial held-image test reproduced a repeat mismatch (Chrome maximum 17; WebKit maximum 22 code values). Warming and direct framebuffer readback did not eliminate every post-switch difference. The review therefore measures repeat controls for both variants and the reference, and requires each image/gradient improvement to exceed their combined observed error (including the reference twice). Consecutive same-texture controls are retained separately. This distinguishes the quality improvement from comparison variability; no flight-renderer correction is claimed.

A separate 64K NASA-derived cloud atlas from Gaia Sky was downloaded for source evaluation. Native tile crops preserve more detail than that atlas's 8K level, but its polar cloud coverage differs markedly from the current composite. Its stated dimensions alone do not establish measured resolution or reconstruction quality. The atlas remains development-only until its coverage, registration and processing are understood; no gaps are hidden with generated weather.

## Revision 0.90 — retain finer cloud coverage

The native 16K non-polar NASA-derived atlas grid replaces the 8K coverage limit. Registration preserves the existing source placement; the 50–60° blend retains Solar System Scope polar coverage where the atlas has gaps. Fine coverage and the fixed 2K regional-height proxy now use separate R8 maps. One shared CPU-derived LOD offset matches their physical footprints after device resizing. Runtime packing is removed: the three changed rendering files shrink from 927 to 908 lines, with the same 48 application modules and 112 relative imports. No flight, camera, time or guidance state changes.

The reproduced 16K AVIF and regional PNG match the candidate byte-for-byte. Native 16K cloud assets total 13,826,371 bytes, an increase of 7,648,510 bytes. Full mip storage grows about 88 MiB; the larger download and short local frame-cost increase are explicit quality trades. Prior ABBA observations found about 5–9% higher warm frame intervals; the final release also receives its own short live-flight check. These are local observations, not an exhibition-hardware endurance result.

Chrome and WebKit compare nine views at two qualities with the same-source lossless 8K control and exact 16K reference. Near-field image and gradient errors improve beyond measured repeat variation; the High close view's image RMSE decreases from about 6.706 to 2.597. This is a model-reference error reduction, not a percentage increase in perceived sharpness. The High day image error increases by about 0.0043 display codes, and polar gradient error increases despite lower overall image error. These exceptions remain visible in the reports. Firefox's full application limits textures to 8K and receives compatibility checks instead of an unsupported native-reference claim. Source-crop tests now record actual GPU upload dimensions separately from image dimensions.

Fresh browser contexts avoid keeping several large source fields resident. The exact R8 reference streams over local HTTP; earlier large automation-intercept payloads closed the browser. Their precise failure mechanism remains unproven. Constrained 4K, photography, context recovery, unchanged-world material controls, independent offline and old-save upgrade reports accompany the release. Finite source resolution, inferred vertical structure and photographic equivalence remain open under V02/V18.

Final delivery: 56,905,196 bytes; SHA-256 `8ea07d27fe3d1713964afc86ff2239d246c60ba770f3f33a7631bf31f3cb2d14`. All 134 manifest entries match the workspace and independent extraction; 95 runtime files also match the live preview. Workspace and extracted-package suites each pass 103 checks. Two native engines pass 36 source-reference views; Firefox passes 18 native-limit views; three engines pass 18 explicitly constrained 4K views, 24 source-crop checks, 51 paired material views, six context restorations and three full-resolution photo/persistence checks. All 33 unrelated material views remain pixel-identical. The independent offline flow and 0.89 → 0.90 saved-flight/photo/options upgrade pass. Final short native-DPR-2 Earth observations report warm median frame intervals around 44/47.4 ms for probe/chase; no sustained performance improvement is claimed. Visual inspection still shows soft/column-like structure in extreme close and transition-latitude magnification; this remains an open fidelity limit.
