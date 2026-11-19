# Rebuild round 3 — sound, continuity and final presentation

Added a Jupiter radio observation, bringing the complete route to 13 observations. NASA's Voyager lightning recording and the University of Iowa's 2012–2013 Voyager plasma-wave presentation are included locally, with explicit archival context. The Jupiter waveform is derived from the actual recording. Playback ducks the score, stops when dismissed and can be reopened from the journal.

Continue now restores the precise position, heading, velocity, camera lens and time-compression setting, including an in-progress crossing and its interpolated planetary positions. The journal retains actual photographs after reload. A new voyage starts a clean discovery list. Closing a discovery leaves the flight display intact.

Refined atmosphere integration with a finite solar disk to remove hard terminator bands. Increased globe tessellation, corrected derivative sampling across ring-shadow boundaries, moderated ring colour and adjusted optical depth. Refined map labels, one-photograph journal composition and the final screen, which now uses photographs from the player's voyage. Opening a panel clears stale flight notifications so they cannot cover its heading.

Added byte-range support for historical video from the offline cache; partial network responses no longer replace complete cached assets. Expanded the offline package and launch MIME mappings for the added media.

Targeted browser checks passed: steady-view exposure guard; photograph persistence; exact encounter and crossing resume; both historical recordings decoding/playing; score ducking/restoration; journal replay; and new-voyage reset. Mouse, independent free look, keyboard navigation, full screen, recovery, JPEG export, music looping and distant angular size also passed. Final route, graphics stability and extracted-package checks are recorded in the accompanying JSON results and main verification record.
