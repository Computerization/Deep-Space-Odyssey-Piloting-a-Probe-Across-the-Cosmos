# 0.39 — deliberate observation and a smaller delivery

- Add optional camera following during manual coasting; turning releases it, and steering remains separate. Keep following state in saved flight and recorded views.
- Replace fixed-degree zoom jumps with consistent magnification steps and a smooth transition. Add a live lens range beside the view; scale turns to the actual lens.
- Consolidate camera ownership, remove dormant advice/intro code and its obsolete test, and document the architecture and simplicity rules.
- Replace the growing historical package allowlist with a concise runtime-driven selection. Keep editable runtime, licenses, essential docs and unit checks in the playable ZIP; retain old browser evidence in the development workspace.
- Three-engine camera and delivery verification is recorded in the evidence ledger. The 89 active unit checks pass. Material detail, sustained hardware performance, subjective listening and physical-controller validation remain open.

# 0.38 — scene reading and controls with distinct roles

- Move continuation to the chapter heading and photography to the footer tools. Keep a compact reading area for invitations, science and optional held observations; remove its shading entirely when empty.
- Keep 17 px science copy and 44 px control targets. Unify photographic/review/journal sizing and feedback, give compact dates enough room, and separate passage text from progress.
- Place bearings using actual interface clearance, including narrow visible-limb gaps. Keep labels and their leaders clear of the reading region, headings and progress instrument.
- The repair list tracks 99 observed findings. Six remain open across five broader areas. Current visual, browser and delivery evidence is recorded in the detailed ledger.

- All 90 unit checks pass. Three engines pass 72 layout cases, 36 corner bearings, 21 ordinary planetary bearing cases, contextual science/photography and time recovery. Keyboard/synthetic Xbox menu checks also pass.

- Independent offline delivery verifies all 81 runtime files and the exploration/media flows. A real v37 → v38 upgrade retains flight, preferences, photographs, notes and recorded lenses. Five interface files change, adding 2,138 runtime bytes; no media or font assets are added.

# 0.37 — clearer bearings and recoverable time controls

- Keep partial-world bearings attached to a visible limb, including screen corners and narrow gaps beside interface text. Use the projected spherical silhouette and stable placement rather than a detached default label.
- Put selected time flow next to the actual rate, retain near-body limit explanations and show the relevant resume action. Keep the status line comfortably inside the viewport; remove the central time-selection toast.
- Clear local boundary flags when explicitly beginning historical passage. Preserve deliberate holds, and let Space/Xbox B resume a held clock after review while retaining normal press-and-hold behaviour and boundary protection.
- The repair list tracks 98 observed findings, with six findings across five broader areas still open. All 88 unit checks pass; current browser and delivery evidence is recorded in the detailed ledger.

- Chrome, Firefox and WebKit pass 36 corner bearings, nine time-readout layouts, 21 ordinary planetary bearing cases and time recovery after review. Contextual science and photography pass in all three engines; Chrome menus, six exploration boundaries, five passages and flight/save regressions pass.

- Independent offline extraction verifies all 81 runtime files, exploration/media flows and recorded views. A real v36 → v37 upgrade preserves flight, settings, photographs, notes and review history. The nine runtime changes add 2,367 bytes; no media are added.

# 0.36 — less repeated cloud-light work

- Share short-path sunlight coordinates and precompute view-step lengths. Preserve the existing sample budget, weather, cloud profile and lighting model; use exact coordinates for long paths and near the poles.
- Three engines pass 54 matched image comparisons, including the closest allowed exploration radius. The largest complete-frame mean difference is 0.001948 / 255, with a maximum channel difference of 2 / 255.
- Each engine checks 16,384 source-map coordinates across short, long, polar and seam-crossing paths; observed error remains below 0.00414 of an 8K source texel. All 86 unit checks pass.
- The repair list now tracks 94 observed findings. Six findings remain open across five broader areas, including magnified-cloud performance and limited weather-map detail.

- In paired fixed-Ultra GPU timing on the low-power host, ordinary daylight costs 5.3% less and the magnified limb 9.0% less than v35. Close/low-Sun differences are only 1–2%; sustained and exhibition-hardware performance remain open.

- The independent offline package verifies all 81 runtime hashes and complete exploration/media flows. A real v35 → v36 upgrade retains physical flight, preferences, photographs, notes and recorded lenses. Only the cloud shader implementation changes; runtime size grows by 1,580 bytes.

# 0.35 — smoother close clouds and steadier motion

- Integrate partial cloud segments and evaluate sunlight at their density centroid, reducing visible contour bands. Give long resolved slant rays additional bounded samples to reduce stripes near the magnified limb.
- Preserve all source imagery, physical flight, interface and sound. No new runtime textures or graphics buffers are added; ray counts increase only where the resolved weather field needs them.
- Compare with an independent 320-sample reference, verify selected views at 640 samples, and check small camera turns, maximum zoom, all planetary scenes and cloud/air composition in three engines.
- Three engines pass 48 numerical-reference views, 21 convergence comparisons, six camera-motion groups, 21 planetary scenes and 24 composition checks. All 86 unit checks pass.
- Fixed-Ultra ordinary views cost 6.5–8.4% more in the paired low-power-host run. The resolved 4° limb costs substantially more (13.78 → 33.56 ms) and remains an explicit V03 optimization target.
- The repair list tracks 93 observed findings. Six findings remain open across the same five broader areas; V18 records residual cloud sampling and source-detail limitations explicitly.
- The independently extracted package verifies all 81 offline runtime files. A real v34 → v35 upgrade preserves physical flight, preferences, photographs, science notes and recorded lenses; offline exploration and media checks pass.

# 0.34 — measured Earth geography and balanced light

- Replace the enhanced Earth colour map with NASA's September 2004 Blue Marble Next Generation base composite at the same 8K resolution. Preserve the source palette and separate its epoch from the 1977 voyage.
- Drive ocean and lake reflection from geographic water coverage, including fractional coastlines. Correct Earth diffuse, reflection and air radiance to a consistent brightness convention; remove the excessive blue veil.
- The two surface assets save 465,586 bytes together. The new scalar coverage adds nominally 10.67 MiB of graphics storage; paired timing and full-scene checks record the practical cost.
- All 86 unit checks pass. Three engines verify 18 matched Earth views, 24 material locations, 21 planetary scenes and 24 composition cases. Sixteen additional antialiased/adaptive cases retain exact composition. Paired warmed GPU medians increase by approximately 0.04 ms in the two measured views. The repair list now tracks 92 findings; close-cloud texture detail and the five broader refinement areas remain open.

- The independently extracted package verifies 81 offline runtime files, existing exploration/media flows and recorded views. A real v33 → v34 upgrade retains saved physical state, preferences, photographs, science and historical lenses.

# 0.33 — faithful flight review and visible controller selection

- Keep the latest composition when opening review after turning with time held. Record and restore the lens as well as the physical state; cancellation and refresh preserve the present.
- Map the review track to elapsed time. Step between recorded moments with keyboard arrows or Xbox left/right, and keep the single-frame return action reachable.
- Use the existing thin-line range styling with a small focus mark at the scrubber. Retain historical samples from older saves using their current lens.
- Keep Tab and Shift–Tab in the visible control order on every browser, including landing-screen entry.
- Make controller-selected menu items visible after mouse interaction. Reuse the keyboard focus styles and return to native feedback when the mouse or keyboard takes over.
- All 86 unit checks pass. Three engines pass review/lens restoration, legacy saves, pointer/keyboard/synthetic Xbox focus and nine review layouts; existing menus and live settings pass.
- The independent offline package verifies all 80 runtime files and lens-review operations. A real v32 → v33 upgrade preserves physical flight, photographs, notes, preferences and legacy review history.
- The [repair list](REPAIR-STATUS.md) tracks 89 observed findings. Interface/material refinement, extended hardware performance, subjective listening and physical-controller checks remain open.

# 0.32 — clearer cloud sampling

- Refine distant cloud sampling using the pixel footprint's principal axes. Keep two texture reads and blend into the existing near-view method. Skip density calculations above each cloud column's top.
- Keep the existing measured imagery, cloud-light model, 20 view steps and four sunlight segments. Change one runtime shader file; add no media or graphics buffers.
- Three-engine reference checks reduce daylight sampling error about 10–12% and terminator error about 6–12%. The tested small camera turns also improve; close-view sampling is retained. These measurements describe the existing reconstruction, not photographic equivalence.
- Record the small measured GPU cost: approximately +0.05 ms for daylight and +0.34 ms for grazing at fixed 1280 × 800 ultra quality. The six-minute, nine-scene / two-camera run keeps warmed resources stable and reports no context losses. Occasional slower Earth frames remain.
- All 83 unit checks, 33 empty-work views, 30 spatial-reference views, 24 composition views, 21 scene/engine views and two simulated graphics-recovery cases pass. The [repair list](REPAIR-STATUS.md) tracks 84 observed findings; the same five broader areas remain open.
- The independent offline delivery verifies all 80 runtime files, media playback and existing exploration flows. A real v31 → v32 upgrade retains physical flight, preferences, photographs, science and review history.

# 0.31 — reachable flight controls and concise settings

- Separate Sound, Picture and Flight into short pages with a persistent footer and horizontal keyboard/D-pad navigation. Keep the spacecraft view visible.
- Reach Fine control, Flight interface, Route guidance and Flight instruments through the Xbox pause menu. Save the same preferences used by keyboard shortcuts; Menu / Escape remains available with the interface hidden.
- Show current instrument values beside the view. Back returns to the settings entry that opened them; the I shortcut returns directly to flight.
- Three engines pass 27 settings layouts, nine instrument layouts, saved preferences, hidden-interface recovery, real fine/standard thrust and unchanged paused physics/science. Live exposure, sound/quality/sensitivity, fullscreen where exposed and static-frame reuse pass. All 83 unit checks pass.
- Correct the README's old fixed-passage-chart description and list all five distance scales.
- The [repair list](REPAIR-STATUS.md) now tracks 82 observed findings. The five broader areas remain open: interface refinement, material realism, sustained/hardware performance, subjective listening and physical-controller validation.
- An independently extracted offline package verifies all 80 runtime files. A real v30 → v31 upgrade preserves old flights, non-default control/interface preferences, photos, science notes and review history.

# 0.30 — a quieter journal and useful control reference

- Browse complete photographs in a contact sheet. Open an image for export/removal; return to the same image after browsing. Keyboard and Xbox directions follow the actual grid.
- Read contextual science in Field notes, retaining old task discoveries, photograph-specific text, instrument recordings and the original Pale Blue Dot image.
- Show keyboard or Xbox controls on demand, with a compact layout for short screens and a persistent return action. The scene stays visible on larger displays.
- Recover the latest removed photograph with session Undo. Failed database deletion preserves the original image and reports the failure.
- Three engines pass the journal/control flows, including nine viewport/engine combinations, persisted Undo, storage failure and unchanged paused flight. All 83 unit checks pass.
- Independent offline delivery verifies 79 runtime files. A real v29 → v30 upgrade retains the old flight, photographs, notes and review history.
- The [repair list](REPAIR-STATUS.md) tracks 79 observed findings. Broader interface/material refinement, sustained hardware performance, listening and physical Xbox validation remain open.

# 0.29 — more consistent cloud illumination

- Integrate sunlight through each cloud segment's vertical density profile, preserving the four weather samples and the source imagery. Reuse segment endpoint heights.
- Three engines pass eight numerical-reference views each, including close/grazing views and small camera turns. The largest improvements are in daylight and ordinary close views; near-horizontal and photograph-level realism remain open.
- Record complete-frame old/new GPU timings at the same resolution, plus cloud-composite and delivery checks. No new runtime assets or graphics buffers are added.
- All 81 unit checks, 24 cloud-reference views, 24 composite views and 21 standard scene/engine cases pass. Independent offline delivery verifies 77 runtime hashes; a real v28 → v29 upgrade retains flight, photos, science and review history.
- The [repair list](REPAIR-STATUS.md) tracks 75 observed findings. Interface refinement, material realism, sustained/hardware performance, subjective listening and physical-controller validation remain open.

# 0.28 — a solar atlas that follows the voyage date

- Use the actual passage date for planets, Voyager, chart readouts and Earth's one-way light time. Preserve the existing encounter reference snapshots and physical flight.
- Add a 405 KB offline planetary ephemeris from JPL; 312 independent sampled comparisons are below 800 km at solar-system scale. Keep full source/query records and a reproducible packer.
- Draw Voyager's historical trail up to the current date. Fit newly selected offscreen subjects, add a 100 AU extent and retain explicit manual scale choices.
- Correct the title-screen chart context after returning from a later encounter; passage instruments show passage context instead of stale local-study information.
- 81 unit checks pass. Three browser engines verify passage charts, labels and controls; physical Xbox remains untested.
- Independent offline delivery verifies 77 runtime files, including the 2001 passage atlas. A real v27 → v28 upgrade retains old flight, photographs, science notes and review history.
- The [repair list](REPAIR-STATUS.md) tracks 74 observed findings. Broader interface/material refinement, hardware endurance and listening review remain open.

# 0.27 — an atlas that keeps exploration within reach

- Fit the encounter chart to the screen and keep continuation, review and encounter return in a persistent footer.
- Distinguish setting a subject bearing from beginning a separate viewpoint; mark the active bearing and shorten repeated copy.
- Keep body names at 14 screen pixels and chart scale labels at 11, with scale-aware collision avoidance. Preserve physical distances and positions.
- The six-node voyage fits at 1024 × 640. Narrow layouts retain a scrollable body and visible footer; keyboard and controller focus reaches expanded compositions.
- Three engines pass 72 desktop layout cases and 36 solar label cases. All 77 unit checks and keyboard/synthetic Xbox menu checks pass.
- Independent offline delivery verifies 74 runtime files. A real v26 → v27 update retains flight, review history, photos and science notes.
- The [repair list](REPAIR-STATUS.md) now tracks 72 observed findings. Broader interface/material refinement, hardware endurance and listening review remain open.

# 0.26 — consistent lunar shadows and updated surface imagery

- Remove the illuminated-limb black streak by sampling a defined terrain mip level inside the lunar shadow branch. Preserve the fourteen-sample ray, measured relief and normal maps.
- Adopt NASA's December 2025 4K lunar colour mosaic after five matched-view comparisons. Preserve the published palette and existing surface gain; the texture is 80,908 bytes smaller.
- Compare the retained old shader and corrected version with a 128-sample numerical reference, including small camera turns and close/crescent/polar views.
- The retained shadow artifact disappears in all three engines, including five small camera turns. Seven standard scenes, menus, historical flight and all 77 unit checks pass.
- Independent offline delivery verifies 73 runtime files and the actual lunar correction. A real v25 → v26 upgrade preserves saved flight, review history, photos and science notes.
- The [repair list](REPAIR-STATUS.md) now tracks 70 observed findings. Broader material realism and hardware/listening review remain open.

# 0.25 — science attached to the visible view

- Match science and independent-photo subjects to the rectangular camera view, including vertical edges, corners and a visible limb whose centre is outside the image.
- Clear a science caption when its subject leaves. Preserve interrupted notes for a later visit; add notes to the journal after four visible seconds. Hiding the HUD suspends discovery and clears transient feedback.
- Position bearings just beyond the actual projected limb when a planet is only partly visible.
- 77 unit checks pass. Context, photography and bearing flows pass in Chrome, Firefox and WebKit; keyboard/synthetic Xbox menus and historical-flight regressions pass.
- Independent offline extraction verifies 73 runtime files. A real v24 → v25 update retains physical flight, review samples, photographs and science notes.
- Keep the existing scene, physics, sound and image assets. The [repair list](REPAIR-STATUS.md) tracks 68 observed findings; broader realism and hardware review remain open.

# 0.24 — direct photography and a full-frame viewer

- Put Photograph directly in the flight view, with P and Xbox left-stick click. Preserve optional held exposures while keeping ordinary exploration free of capture gates.
- Keep successful photographs in the journal. A short actual-image receipt offers immediate review; deliberate export remains in the viewer and journal. Normal captures no longer force browser downloads.
- Fit the complete recorded image to the viewport, with edge controls and capture-date metadata. Add space occupied by the receipt to bearing-label avoidance.
- Correct historical-passage photographs to use the playback date and solar-distance reference. Catch unavailable storage, retain the session image, and guard overlapping or failed captures.
- 71 unit checks pass. Chrome, Firefox and WebKit pass the full photography flow and seven rendered scenes. Compact layouts, bearings, keyboard/synthetic Xbox menus, six historical nodes and five passages pass.
- Independent offline extraction verifies all 72 runtime files, the visible shutter and journal/viewer flow without forced downloads. A real v23 → v24 update preserves physical flight, review history and a saved photograph byte for byte.
- The [repair list](REPAIR-STATUS.md) now tracks 64 observed findings. Rendering assets, music and physical-flight sources remain unchanged; broader interface, material and hardware review continues.

# 0.23 — held-view efficiency and simpler Earth composition

- Cache an exactly unchanged held view while keeping input, science and audio active. Released steering now reaches a stable orientation; chase interpolation and pending reflections finish before the image is cached.
- Combine cloud and atmospheric composition into one full-resolution pass on high-density displays at the full cloud budget. Preserve original edge coverage on ordinary-density screens and reduced adaptive cloud budgets. Full-budget high-density layered Earth views submit one fewer draw and 73,216 fewer triangles; photography keeps the original full-resolution path.
- Eight fixed view comparisons pass in Chrome, Firefox and WebKit. Mean differences remain below 0.004035 / 255; photographs are identical. Full images and native-resolution limb crops were reviewed.
- Low-power mode constrained the host's browser cadence, including empty pages. This revision claims reduced redundant rendering work, without claiming a measured FPS or battery-life gain.
- 71 unit checks, three-engine held-view and scene checks, graphics recovery, menus and historical passages pass.
- Independent offline extraction verifies all 71 runtime files, including held-view caching. A real v22 → v23 upgrade preserves physical flight and review history.
- The [current repair list](REPAIR-STATUS.md) tracks 60 observed findings, including the two performance repairs. Broader interface, photographic realism, listening and hardware validation remain open.

# 0.22 — perceptible small thrust and steadier ring shadows

- Show real thrust acceleration and delivered Δv only while commanding the probe, followed by a brief coasting readout. Time hold, exhausted model propellant, fine control and analogue triggers have distinct, accurate feedback.
- Add thrust to the short opening control reference. Clear old burn feedback when changing encounters or restoring a flight review.
- Integrate Saturn's ring shadows over the pixel footprint separately from the finite-Sun penumbra. Filter transmitted light after the optical-depth calculation, preserving narrow ring divisions.
- Three diagnostic views reduce shadow-image RMS error by 62–70% against 4× renders. Short alternating rendering windows retain the same median / p95 frame interval. See the [repair ledger](revisions/experience-audit-v13.md) for method and limits.
- The [current repair list](REPAIR-STATUS.md) now tracks 58 observed findings. 68 unit checks, seven rendered scenes and physical thrust feedback pass across Chrome, Firefox and WebKit. Six historical nodes and five passages retain their physical-time behaviour. Independent extraction verifies all 71 runtime files, including the new thrust feedback. The v21 → v22 upgrade preserves physical flight and review history.

# 0.21 — audio-clock transitions and interruption recovery

- Keep an outgoing score alive until its fade finishes on the audio clock. Device suspension no longer lets a wall-clock timer remove most of the mix before playback resumes.
- Prepare all four silent-gain score channels during the start gesture so WebKit can play later scores automatically.
- Use sine/cosine power fades with gentler silent endpoints and shared parameter-holding logic. Firefox uses equivalent cancellable ramps to avoid errors when a track is reselected mid-fade.
- Chrome, Firefox and WebKit pass suspended-device recovery and interrupted reselection. Rapid selection, saved mute, hidden-tab recovery and actual loop wrap pass. 66 unit checks pass.
- Record a ten-second excerpt of the actual browser mix after the limiter for review, with finite output and no clipping. Original compositions and media sizes are unchanged; subjective listening and physical audio devices remain open.
- Add an inline sound toggle to Settings, with visible mute state and synchronized keyboard/controller controls. Three-engine checks verify persisted mute, live exposure, fullscreen and compact layout; a Firefox initial-gain scheduling defect is repaired. The [56-item repair list](REPAIR-STATUS.md) tracks this and the wider remaining work.

- Independent offline delivery verifies 71 runtime files, the sound toggle, exposure preview, saved flight review, photographs and media seeking. A real v20 → v21 upgrade preserves the physical save and review history.

# 0.20 — settings in the scene and deliberate menu feedback

- Replace the opaque settings page with an unblurred side overlay. Exposure previews against the actual spacecraft view, while numeric slider values and a short quality explanation clarify each adjustment.
- Keep the encounter's physical state paused, save changes immediately and stop rendering after the changed picture settles.
- Give custom controls a press state, consistent row feedback and 44-pixel targets. Separate pause utilities from flight actions and retain the sharp planet behind the menu.
- Distinguish independent photography from recording a suggested view; keep fullscreen labels synchronized with the actual browser state.
- 60 unit checks and Chrome / Firefox / WebKit settings checks pass, including 800 × 600 layout, saved values and native fullscreen. Keyboard and synthetic Xbox menu navigation pass. Physical hardware remains unverified.
- Independent offline validation checks all 70 runtime files, the new exposure preview, saved review, photographs and media. The v19 → v20 upgrade retains the existing physical flight state.
- The [current repair list](REPAIR-STATUS.md) tracks 51 observed findings, with broader interface, material, performance and listening work still open.

# 0.19 — leaner rendering and reliable scene recovery

- Store cloud density and lunar height in their original single channel, reducing nominal GPU texture/mipmap storage by about 132 MiB with identical pixels in Chrome, Firefox and WebKit.
- Reuse spacecraft shadows only while their inputs are exactly unchanged. Remove cloud work that contributes zero density or zero sunlight.
- Improve Earth’s lower-air integration against a dense numerical reference while retaining the established limb sampling.
- Keep separate adaptive-resolution records for encounters, optional studies and historical passages. Restore cached lighting and redraw when a graphics context returns.
- 60 unit checks, five study flows, historical passages, graphics recovery and cross-engine rendering/audio checks pass. A six-minute, nine-scene run retains stable warmed resources; full-density Earth remains a performance target.
- See the [47-item repair ledger](revisions/experience-audit-v13.md) for evidence, current performance limits and final verification.

- Independent offline delivery verifies 69 runtime hashes, media seeking/looping, photographs and persisted flight review. The v18 → v19 update preserves the old physical save and review timeline.

# 0.18 — ring-reflected light and immediate controls

- Saturn’s night side gains geometry-dependent ringshine, using the actual historical Sun direction and the existing optical-depth profile. The day, crescent and north/south night views were compared at fixed exposure.
- Per-epoch illumination maps are prepared while loading; changing viewpoints only binds an existing texture.
- Fresh turns respond on the first frame after resuming. Only controls already held at the transition wait for release; held selection presses cannot start a photograph.
- Added a quiet, view-dependent ringshine science note and corrected a reference-image identifier. Quiet exploration clears repeated context text while navigation, photography and voyage controls remain available.
- 60 unit checks, quiet-context flows and browser input/menu checks pass. Firefox 153 and Playwright WebKit 26.5 pass rendering, controls, audio and offline restore. A nine-scene, two-camera rendering run spans at least 972 seconds with stable warmed resources; Earth and Titan chase still have slower frames. See the [41-item repair ledger](revisions/experience-audit-v13.md) for the retained raw results, corrected warmup assessment and remaining work.

- Independent offline delivery verifies 69 runtime hashes, photos, charts, saved study review, music looping and video seeking. The v17 → v18 upgrade retains physical flight and review history.

# 0.17 — clearer bearings and dependable audio

- Navigation labels clear the planet and Saturn’s ring footprint; behind-camera arrows, occulted subjects and full-screen worlds retain usable bearings.
- Entering or resuming restores the scene and controls immediately, even when audio readiness is delayed.
- Changed the four score containers from WebM to Ogg after WebKit exposed a missing Web Audio signal path. The original 120-second PCM is unchanged and runtime audio is 135,416 bytes smaller.
- Rechecked actual Chrome loop captures, mute, interrupted transitions and hidden-tab fades. Firefox 153 and Playwright WebKit 26.5 pass seven-scene rendering, controls, chart selection, music output / mute and offline restore. 51 unit checks pass. An independent extraction verifies 68 offline runtime files, photos, media seeking and saved flight; v16 → v17 preserves the physical state and review history.
- See the [37-item repair ledger](revisions/experience-audit-v13.md) for findings, acceptance evidence and remaining work.

# 0.16 — steadier rings and reliable media seeking

- Integrated ring radiance and coverage over each pixel; four-angle reference errors fall 38–68%, and small-motion brightness variation is roughly halved.
- Short alternating tests show about 16.7 ms median / 16.7–16.8 ms p95 for both old and revised ring rendering at 1000 × 625 / DPR 2.
- Fixed media seeking in both local launchers; 16 HTTP range cases and 48 unit checks pass.
- Corrected earlier weak loop checks. All four tracks now have captured actual end-to-start output, with explicit soft-gap measurements and no claim of headphone audition.
- Verified the independently extracted package offline: 67 matching runtime files, actual video seeking and music looping, saved flight review, and no external requests.
- See the [34-item repair ledger](revisions/experience-audit-v13.md) for current evidence and remaining work.

# 0.15 — continuous Titan haze and accessible compositions

- Repaired disappearing / clipped Titan haze at close range, including views from inside the scattering layer and correct foreground occlusion.
- Added optional Earth shadow-edge and Saturn ring-plane starts, completing access to all five suggested compositions.
- Replaced weak southern Saturn coverage with measured Hubble OPAL variation, with documented masks, blending and source-resolution limits.
- Completed a 379-second, seven-scene / two-camera run at DPR 2: stable warmed resources and no context loss. Earth/Titan still have slower frames; exhibition hardware remains unverified.
- Verified 45 unit checks, five study flows, nine haze views, keyboard/synthetic Xbox menus, six nodes/five passages, an actual v14 → v15 save upgrade and 67 independently extracted offline runtime files.
- Current evidence and remaining work are recorded in the [31-item repair ledger](revisions/experience-audit-v13.md).

# 0.14 — accessible close studies and saved flight review

- Added Moon, Io and Titan observation studies with coherent reference frames, gravity, limits, maps, dates and saved state.
- Moved close-study entries into the encounter chart’s first screen; corrected chart-label placement and reduced expanded composition controls.
- Added keyboard menu navigation and checked synthetic Xbox focus, ranges, selection and review cancellation.
- Added bounded persisted flight review and fixed the initial audio gain when resuming a muted session.
- Verified 45 unit checks, three study flows, keyboard/synthetic Xbox menus, audio lifecycle, six historical nodes/five passages, v13 → v14 upgrade and an independently extracted offline package with 67 matching runtime files. See `revisions/experience-audit-v13.md` for the 30-item repair ledger and remaining work.

## Previous pass — 0.13.0

Experience audit and first repair pass: flight review, honest subject bearings, curved coast forecasts, rewritten interface styles, compact voyage chronology, ring transparency/shadow corrections, quieter feedback and remembered mute. The [repair ledger](revisions/experience-audit-v13.md) tracks remaining work; moon encounter accessibility and further visual/audio review are still open.

# Cosmos — verification record

## Previous physical-model revision — 0.12.0

The physical-time and open-exploration revision supersedes the training flow and arcade manoeuvring described below. See [current model and verification](revisions/physical-v12.md), `tests/scientific-experience-results.json` and `tests/package-smoke-results.json`. Earlier entries are a historical change log.

## Delivered scope

**Deep Space Odyssey: Piloting a Probe Across the Cosmos** is the full project name. **Cosmos** is the experience name.

The rebuilt English-language Voyager 1 route follows Earth → Jupiter and Io → Saturn and Titan → Pale Blue Dot → interstellar space. Thirteen observations and four manually controlled crossings connect five chapters. The user’s decisions govern the implementation; the original application form supplies project context.

## Three substantial revision rounds

1. **Scene and interface.** Replaced the title, typography, HUD, menus and button treatment. Removed persistent small technical labels. Enlarged readable controls and kept contextual guidance at the edge of the scene. Reframed Earth and the encounter arrivals, restored the spacecraft’s materials and self-shadows, and introduced a damped chase camera. Reworked planetary lighting and ring optical depth. See [round 1](revisions/round-1.md).
2. **Piloting and exploration.** Added the Earth-limb encounter, damped steering and finer analogue input. Added steady-view photography, actual saved scene images, a persistent photo journal, contextual approach/braking guidance, historical voyage map, crossing-distance display and optional instruments. See [round 2](revisions/round-2.md).
3. **Sound, continuity and finish.** Added genuine historical Jupiter radio and interstellar plasma-wave recordings, score ducking and journal replay. Added exact flight and crossing restoration. Improved atmosphere sampling, globe geometry, ring colour, chart labels and journal composition. Added a personal photographic ending and offline media-range support. See [round 3](revisions/round-3.md).

## Photographic and compact revision

Version 0.3 replaces Jupiter’s map with NASA Cassini PIA07782, rebuilds cloud and ocean response, adds precomputed atmospheric sunlight columns, refines ring optics, corrects chase-camera free look and raises the High resolution cap. AVIF, WebP, Opus and compact data replace bulky intermediates. See the [revision record](revisions/photographic-v3.md).

## Volume and illumination revision

Version 0.4 replaces the flat cloud shell with a density-integrated cloud layer, adds Titan’s lower and detached upper haze, corrects spacecraft material usage and introduces reflections from surrounding planets. Ring optical depths follow separate physical ranges; finite sunlight determines the shadow edge. A unified linear image buffer preserves transparent-layer illumination. High adapts flight resolution, Ultra keeps the maximum, and saved photographs use the full resolution cap. See the [revision record](revisions/physical-v4.md).

## Music, navigation and interface revision

Version 0.5 replaces all four music tracks with original two-minute chamber arrangements built from CC0 acoustic recordings. Equal-power transitions, lower D/A feedback tones and recording ducking accompany the score. Karrik and Sometype Mono are bundled locally, with original title lettering and fixed rectangular commands. Coasting guidance predicts arrival or miss distance from actual velocity, and independent photographs persist in the journal. Ocean sunglint now uses an isotropic wave-slope distribution. See [music and source](music-v5.md) and the [revision record](revisions/voyage-v5.md).

## Moving-survey revision

Version 0.6 adds optional lunar, Jupiter and Saturn flybys with manual entry and alignment, spatially distributed image coverage, missing-sector return guidance, photographic results, personal bests and resumable partial passes. The Moon now uses 4K LROC imagery and LOLA terrain at its real scale. Narrower 4° camera views have finer controls. See [revision details](revisions/flybys-v6.md).

## Open-exploration revision

Version 0.7 makes mission observations and departure independent. Players choose the order of discoveries and can record from suitable views outside the original waypoint spheres. The local map sets optional bearings without moving the probe. Six worlds offer eighteen phase-based field studies, saved with actual photographs. Guidance can be hidden, and the mapped region uses a range advisory without forced recovery or steering. Manual flight, exploration, optional surveys and rendering now have separate modules. Partial solar occultation produces a continuous probe-lighting transition; star visibility accounts for the illuminated fraction of the world in view. See [revision details](revisions/exploration-v7.md).

## Encounter, control and sound revision

Version 0.8 adds five optional geometric observations, suggested clearance bearings, precision manoeuvring, a closest-approach instrument and smoothly increasing time compression. Real lunar height data supplies local terrain-shadow tracing. Standard-density rendering uses up to four MSAA samples. Acoustic feedback, separate feedback volume and a gradual scene-responsive score mix accompany observations. See [revision details](revisions/encounters-v8.md).

## Existing-experience finishing pass

Version 0.8.1 tightens observation intent, input release at menu boundaries, free-look persistence, unobstructed framing, compact pause navigation and recording volume/mute. It preserves the existing routes and assets. See [revision details](revisions/finish-v8-1.md) and `tests/finish-polish-results.json`.

## Performance and structure revision

Version 0.9.0 separates scene construction, cloud rendering, frame scheduling and flight presentation. Static panels stop repeating 3D renders, unchanged HUD values avoid DOM writes, renderer scratch values are reused, and nearest-world selection uses a single scan. High mode gives clouds an independent resolution budget while photographs retain full cloud detail. See [revision details](revisions/performance-v9.md) and `tests/performance-polish-results.json`.

## Playing-experience revision

Version 0.10.0 refines touchpad zoom, consistent look sensitivity, mouse-capture release, exposure continuity, destination-based drift guidance, navigation-label spacing, saved-flight entry and large photographic browsing. See [revision details](revisions/experience-v10.md) and `tests/experience-results.json`.

## First-flight and interface rebuild

Version 0.11.0 replaces the passive Earth opening with an optional, manually piloted departure. One changing prompt covers heading, thrust, coasting, time compression, braking and turning back for a saved photograph. The completion choices lead directly to the lunar flyby, Jupiter crossing or continued exploration. The title and flight layout use quieter typography and keep goals at the edge. See [revision details](revisions/departure-v11.md) and `tests/departure-results.json`.

## Checks

The browser checks use Chrome on an Apple M4 with 16 GB memory. Physical Xbox hardware has not been connected; controller tests use the standard browser mapping with synthetic input. Audio verification covers decoding, playback, loop transitions and the output graph, rather than a human listening assessment.

- Thirty-three unit checks cover scale, inertia, time compression, navigation, coast prediction, spatial survey coverage, return passes, restoration and clearance bearings, out-of-order discoveries, physical viewing conditions, foreground occlusion and continuous solar penumbra.
- The full route test uses the production movement integrator to fly all observation regions and all four crossings. It reaches 13 observations and the ending.
- Keyboard/mouse and synthetic Xbox checks cover thrust, braking, turning, free look, camera changes, zoom, menus and disconnect pause.
- Interaction checks cover full screen, settings, recovery, photo export, music looping and an unresolved distant Earth.
- Rebuild regressions cover the steady-view guard, photo persistence after reload, exact encounter and crossing continuation, historical media playback, music ducking, journal replay and new-voyage reset.
- Screenshots inspect the title, flight HUD, Earth limb, Jupiter, Io, Saturn rings, Titan, journal, voyage map and historical records. Small-screen layout is checked at 1024 × 640; larger views reach 1600 × 1000.
- Offline verification preloads 58 runtime requests, disconnects the browser, reloads, changes chapters and plays cached historical video, including byte-range responses. Optional bearings remain separate from observation eligibility and physical visibility.

Version 0.8.1 interaction and audio-continuity checks are in `finish-polish-results.json`; the full voyage, exploration, photo restoration and resolution, acoustic feedback, geometric encounters and moving surveys were rerun for this pass. The geometric recording, precision/terrain, audio and performance reports introduced in version 0.8 are in `encounter-opportunities-results.json`, `flight-polish-results.json`, `adaptive-audio-results.json` and `encounter-performance-results.json`. Version 0.7 open-flight checks are in `open-exploration-results.json`; actual rendered moon phases and eclipse illumination are in `exploration-visuals-results.json`. Full-route, three-flyby, synthetic controller and offline checks were rerun after the module split. Other JSON files under `tests/` retain the results of their corresponding earlier revisions. Version 0.5 music checks are in `music-v5-results.json`; font, independent-photo and navigation checks are in `voyage-v5-results.json`. Version 0.4 rendering measurements are in `render-performance-results.json`; the continuous run is in `endurance-results.json`. Multi-angle image review and the probe eclipse check are recorded in `lighting-review-results.json`. The independent offline copy is checked in `package-smoke-results.json`, including all runtime file hashes and external-request detection. The high-density observation/journal check is recorded in `photo-resolution-results.json`.

The version 0.8.1 three-minute High run used a 1600 × 1000 viewport at DPR 2. Its twelve samples measured 41.3–60.0 fps. The low sample was an Earth interval; the cloud-heavy Earth scene remains a performance bottleneck. Sampled JavaScript heap was 24.5–35.8 MB, with graphics resources fixed at twenty geometries and twenty-two textures. Every settled crossfade retained one playing score track, and there were no graphics-context losses or browser errors. The isolated return-resolution check is recorded in `return-resolution-results.json`; it also checks full 3200 × 2000 capture and restoration of the live resolution. These are measurements from the local machine under its current workload.

Version 0.9.0 reran the 23 unit checks, full voyage, finishing-pass controls and audio, photograph resolution and journal reload, native-density terrain, all three optional flybys, free exploration, synthetic Xbox and offline checks. The three-minute High run at 1600 × 1000 / DPR 2 sampled 60.0–60.0 fps and 25.4–30.4 MB of JavaScript heap. Graphics resources stayed at 20 geometries and 23 textures. Each settled scene had one score track; no context losses or browser errors were reported. See the current `endurance-results.json`. The paired cloud-rendering comparison, pause redraw count and stationary-HUD mutation count are in `performance-polish-results.json`. These results measure local workload and do not establish exhibition-machine frame rates.

Version 0.10.0 passed the 29 unit checks and reran the complete 13-observation voyage with four crossings, observation/input finishing checks, camera/zoom/recovery/export usability, free exploration, all three moving surveys, partial-survey persistence, photograph resolution/journal reload, synthetic Xbox controls and offline reload/media. `experience-results.json` records the new input, reframing, photographic browsing and continuation checks. No rendering shader or media asset changed in this revision; the v0.9.0 endurance measurements above remain the most recent dedicated three-minute performance run.

Version 0.11.0 passed 33 unit checks, the keyboard-driven opening, its mid-flight reload, optional skip, completion-menu keyboard and synthetic Xbox controls, all thirteen regular observations and four crossings, finishing-pass controls, photographic browsing, free exploration, all three moving surveys, synthetic controller compatibility and offline reload/media. The keyboard opening test travelled 9,368 km and finished in 27.2 active flight seconds with scripted input; this is a functional measurement, not a new-player play-time estimate. The independently extracted delivery verified all 57 runtime files by hash while offline, opened the new guide, browsed a photograph and made zero external requests. Dedicated sustained performance and human audio-listening measurements were not rerun in this interface revision.

## Scientific and delivery boundaries

This is a real-time reconstruction with spacecraft-derived textures, approximate atmospheric/material response and fixed historical ephemeris snapshots. Manoeuvring and time compression are gameplay adaptations. Local hardware samples do not establish performance on the exhibition computer. Chrome is the primary tested browser. Other mission lines remain outside this Voyager demo.

The complete editable source, local assets, launch scripts, credits and verification records are included in the ZIP. The earlier V1 archive is retained separately in `dist/archive/`.
