# Voyager 1 · release 0.112

The interactive spacecraft now precedes flight readiness. The release retains one route, the same model and planet assets, and the existing save format. The source launcher and independently extracted distribution both run without a build step.

## What changed for the pilot

- Inspect the dish or cameras while mission data loads. The selection survives the handover to a ready flight. The complete model remains on screen at the default lens; only the calculation that fits the studio camera changed.
- Launch footage dissolves into Earth with the captions below the frame. A pilot who already has a planet in view sees the measurement and observing meter, rather than an extra instruction about recording a note. At Saturn the label can move to the margin instead of sitting on the clouds.
- The flight guide, orbital passages and archive panels distinguish the visible phenomenon from the navigation aid. A stored, held passage can continue with Space without losing position.

## Measurement

Chrome on macOS, against separately served 0.111 and 0.112 sources. In each scene `tests/voyage-work.mjs` replayed identical pilot input over 480 updates; timings below are the median of seven runs after two warm-ups. These are CPU update times for the whole batch, excluding drawing, not milliseconds per displayed frame.

| Scene | 0.111 | 0.112 |
|---|---:|---:|
| Earth | 16.8 ms | 4.2 ms |
| Io | 16.1 ms | 4.8 ms |
| Saturn | 13.1 ms | 4.5 ms |
| Earth to Jupiter passage | 27.2 ms | 5.0 ms |

Final ship position, orientation, velocity, displayed date and chart position matched in every applicable replay. The moving passage wrote to its DOM 2,125 times instead of 3,668; the held passage went from 2,880 writes to zero. The 87-point hull replaces per-orbit scans of 27,714 studio vertices; all 512 sampled directional extrema matched exactly. It is not a replacement for the rendered mesh.

At High, 58° and 2560 × 1600, the two versions produced identical RGB pixels in the three fixed Earth, near-Earth and Jupiter comparison images. Clouds retained the same resolution as the scene during turns. The paired live median frame intervals for these scenes were 50.0, 66.6 and 16.7 ms in both builds. Near-Earth p95 was 66.7 vs 83.3 ms in the short paired window. The measured saving is in CPU work; the full-detail Earth view remains GPU-heavy.

## Verification artifacts in the development workspace

- `tests/voyage-work-v111.json`, `tests/voyage-work-v112.json`, `tests/normal-Chrome-v111-paired-results.json`, `tests/normal-Chrome-v112-paired-results.json`
- `tests/continuity-Chrome-results.json`, `tests/interface-Chrome-results.json`, `tests/spacecraft-plate-results.json`, `tests/portraits-Chrome-v112-results.json`
- `dist/package-verification.json`, `tests/package-smoke-results.json` — 718 offline runtime hashes, keyboard and software-mapped Xbox input, photograph, onward passage and archival media range reads
