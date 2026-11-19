# Cosmos chamber score — version 0.5

Four original four-minute pieces share a D–A–E motif. Each has sixteen four-bar phrases at 64 BPM, written voicings, sparse melodic responses, changing dynamics and deliberate rests. The music serves exploration and is non-diegetic.

| Environment | Title | Arrangement |
|---|---|---|
| Earth departure | A World Behind Us | Warm upright piano, low bowed strings, restrained horn entries |
| Jupiter encounter | Worlds in Motion | Lower registers, modal colour, more prominent cello and horn |
| Saturn | The Light Between | High piano responses, open voicings and lighter orchestration |
| Outer voyage | Still Travelling | Widely spaced notes, longer rests, a reduced statement of the theme |

The current score develops the former two-minute chamber pieces into four minutes each. A quieter second half changes phrase order, spacing and register; the ring theme uses a lower melodic register. The four stereo Opus/Ogg tracks remain at 64 kb/s and total about 7.8 MB. The originals are authored compositions; the instrumental recordings are individual CC0 notes, rather than borrowed music.

Acoustic recordings: VSCO 2 Community Edition, Versilian Studios / Sam Gossner and Ivy Audio / Simon Dalzell. Repository: https://github.com/sgossner/VSCO-2-CE, revision `440300901dfe9275fd84e0b7763af1f8443ae62e`. License: CC0 1.0, included in `assets/audio/VSCO-CC0-LICENSE.txt`. Homepage: https://versilian-studios.com/vsco-community/.

## Editable source

`compose-score.py` contains every note and arrangement. It needs Python with NumPy, FFmpeg and only these eight samples from the repository:

- `Keys/Upright Nr1/UR1_C3_pp_RR1.wav`
- `Keys/Upright Nr1/UR1_G3_pp_RR1.wav`
- `Keys/Upright Nr1/UR1_C4_pp_RR1.wav`
- `Keys/Upright Nr1/UR1_G4_pp_RR1.wav`
- `Keys/Upright Nr1/UR1_C5_pp_RR1.wav`
- `Keys/Upright Nr1/UR1_G5_pp_RR1.wav`
- `Strings/Cello Section/susvib/susvib_C3_v1_1.wav`
- `Brass/F Horn/sus/MOHorn_sus_C3_v1_1.wav`

```sh
python3 docs/compose-score.py --samples /path/to/VSCO-2-CE
```

The orchestral recordings label middle C as C3, while the upright labels it C4. The renderer accounts for this octave convention. Source recordings are high-pass filtered at 45 Hz and low-pass filtered at 6.5 kHz. Pitch shifts use nearest piano samples; sampled bow and breath transients are retained. PCM intermediates and editable note-event JSON files go to the temporary work folder, keeping them out of the game distribution.

## Playback and mix

Each track targets −23 LUFS integrated loudness, with its natural dynamic range retained. Circular reflections carry room tails through the loop; a six-millisecond source taper plus a 24-millisecond encoding taper suppress the Opus prediction-start transient across browser decoders. Audio generation reports are in `score-source-analysis.json`.

Track changes use a 7.5-second equal-power crossfade. Interrupting a change starts the next transition from the current channel gains. Superseded asynchronous playback requests cannot stop the active track. Historical radio/plasma recordings reduce score volume to 8%; paused menus use 35%. Observation chimes now use the score's D/A pitch family at lower level.

`tests/music-v5.mjs` checks decoded stereo output, duration, peak and loop boundary, actual audio-graph output during crossfades, rapid track selection, loop playback, mute, pause and recording ducking. These technical checks establish playback behavior; they do not substitute for the user's musical taste or an acoustic test on the exhibition speakers.

## Playback verification correction — 0.16

The v5/v14 loop checks could pass after a failed seek. Their low final playback time did not prove that playback crossed the end. Both launchers now serve byte ranges, and `tests/audio-lifecycle-v16.mjs` requires a successful tail seek. `tests/audio-seams-v16.mjs` captures actual channel output through an AudioWorklet and traces all four tracks crossing their real loop boundary. `docs/analyse-playback.py` measures those PCM captures. This correction does not change the authored music or imply a headphone audition.

## Container compatibility — 0.17

The v17 playback correction moved the four score tracks to Opus in Ogg. WebKit 26.5 sent no WebM media samples through the Web Audio gain/filter chain; Ogg restores that path without re-encoding the music. That historical remux retained the original 120-second decoded PCM. The remux corrected the end granule of those WebM originals. The current composer writes Ogg directly; its decoded tracks are 240 seconds. The short piano sample is decoded directly and retains its WebM container. See `tests/audio-container-v17-results.json` and the current browser/audio reports.

## Transition timing and shape — 0.21

Score transitions now use sine/cosine power interpolation over the same 7.5 seconds. Retargeted fades start from the held channel gains and preserve combined power. Outgoing media are paused only after their fade finishes on the audio clock, so a suspended device cannot cause a wall-clock timer to cut them early. A single retirement check follows AudioContext state changes.

Firefox's automation fallback expresses the same interpolated fade as linear ramp segments that can be cancelled mid-transition. Native automation holding and value curves remain in use where supported. Six focused automation checks cover endpoints, monotonicity, multi-channel power and both holding paths.

`tests/audio-clock-v21.mjs` exercises simulated device suspension and rapid reselection in Chrome, Firefox and WebKit. `tests/audio-output-v21.mjs` captures the actual browser mix after the limiter; the optional `dist/Cosmos-Music-Transition.ogg` excerpt is generated from that capture and is separate from the compact game archive. These checks still leave subjective audition and exhibition-speaker assessment open.

The initial start gesture now prepares all four score media elements at zero gain. Unselected elements pause when preparation finishes. This preserves WebKit playback permission for later automatic encounter changes without loading new music files into the distribution. Selection and retirement remain bounded to four channels.

Restored mute initializes both mix buses at zero. Exponential volume targets start one audio sample after their explicit initial anchors, avoiding Firefox’s same-time target from default gain. Three-engine saved-settings checks retain exact zero music gain after reload.
