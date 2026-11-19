# Encounter, control and sound revision — v0.8

This revision develops free piloting into deliberate photographic exploration. The full voyage, local moving surveys and independent perspectives remain available.

## Five geometric encounters

Voyage → Look for offers Earth beyond the lunar limb, the edge of Earth’s shadow, Io beside Jupiter, Saturn’s ring plane and backlit Titan. These are optional bearings, not scripted camera sequences. The same observations can be found without selecting a bearing. Actual position, field of view, foreground occlusion, phase or ring elevation determines whether a view qualifies. Paired-world studies require both worlds inside the frame. Suggested paired viewpoints favour the available illuminated side without changing the Sun or world positions.

Clearance bearings are inserted when a globe blocks a suggested approach. They never apply thrust, turn the probe or change its position. The existing direct manual controls remain active. A new instrument predicts closest approach from current velocity and time compression, and indicates a surface intercept. It is an advisory based on the game's inertial model, rather than an orbital flight computer.

Z / Pause → Precision manoeuvring selects quarter thrust, 35% turn response and a 10× time-compression cap. Coasting velocity is preserved. Explicit departure or a newly accepted moving survey restores full thrust; precision can be selected again. Compression increases ramp in logarithmic space; safety reductions remain immediate. A recorded independent discovery also establishes a recovery checkpoint.

## Rendering

The Moon's measured LOLA heights now cast local terrain shadows near the terminator. A lossless WebP contains 1440 × 720 scalar heights spanning −10 to +11 km, with at most 41.2 m of height quantisation error before sampling. Fourteen sunlight samples trace over the spherical height field, using solar angular size for penumbra softness. Elevation remains at physical scale. This is an approximate terrain-shadow pass, not a global ray tracer. The existing geometric relief and normal map remain active.

Standard-density render targets use up to four MSAA samples, subject to hardware capability. High-density modes retain the existing adaptive resolution and full-resolution photograph capture. The lunar shadow comparison holds camera and illumination fixed: the test records changed pixels and verifies that the effect darkens shadowed areas rather than adding a new light source.

## Audio

A compact C5 upright-piano sample from the same licensed CC0 VSCO source as the score replaces the default synthetic observation chime. Pitches use the existing D/A/E family. Sparse feedback distinguishes acquisition, completion, precision-mode selection and a close-approach caution. Stereo placement and a short deterministic room impulse provide space. Voices disconnect after playback; caution repeats are limited to once per ten seconds.

The original four acoustic score arrangements retain their notes and crossfades. A separate music bus changes gain and spectral balance gradually for cruise, close exploration, observation and caution. Feedback has its own volume control, including silence. Historical recordings retain score ducking. A gentle output compressor provides peak headroom. All music and interface feedback are non-diegetic. No engine sound is presented as travelling through vacuum.

`build-feedback.py` regenerates the 3.2-second sample from `UR1_C5_pp_RR1.wav`. No new remote asset dependency is introduced. `build-lunar-assets.py` now also generates the compact shadow height field.

## Verification

- 23 unit checks cover existing flight/survey rules plus compression ramps, closest-approach predictions and mix intents.
- `encounter-opportunities.mjs` checks all five viewing geometries, records each through the production observation system and captures rendered screenshots.
- `flight-polish.mjs` checks keyboard precision selection, quarter-thrust acceleration, compression cap, a manually integrated approach to Earth's shadow and the lunar-shadow image difference.
- `adaptive-audio.mjs` measures actual acoustic feedback, silence at zero feedback volume, voice cleanup, scene mix changes, warning cooldown, archival ducking and mute.
- `encounter-performance.mjs` samples High mode at a 1600 × 1000 viewport / DPR 2 in Earth, Moon and Saturn scenes. Its JSON records observed frame rates and resource counts, rather than a performance guarantee for other devices.
- Full journey, moving-survey, free-exploration, controller-mapping and independent offline-package checks accompany the revision.

Browser checks use scripted input and geometric fixtures. Physical Xbox testing and human listening on the exhibition audio system remain separate from these measured checks.
