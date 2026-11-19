# The playing experience — v0.10.0

This pass improves the existing voyage from launch to photographic review. Manual propulsion, inertia, optional bearings, free exploration, scientific scales, scene assets and the current rendering quality remain the foundation.

## Control and continuity

Fine touchpad deltas accumulate before changing the optical field of view, avoiding rapid jumps to the narrowest or widest lens. Mouse, arrow-key and right-stick look sensitivity now follow the same setting, with the existing narrow-lens scaling retained. Browser shortcuts using Command, Control or Alt do not add flight input. Pointer-lock release pauses flight even when it occurs immediately after capture; drag steering remains available if capture fails.

A returning player's Continue voyage action is primary and first in the title's navigation order. The saved chapter and observation count provide context. Enter or controller confirmation without another visible title action selected resumes that flight. Hidden controls restored by browser focus cannot intercept that confirmation. Continue returns directly to the saved view without replaying its title card or introductory control hint. The existing New voyage action remains available.

## Observation and navigation

Individual observations keep partial exposure for up to half a second of reframing or instability, with a brief in-place prompt. Invalid frames never advance the exposure. A different subject cannot inherit that progress; an extended loss cancels it. A valid final frame and the existing steady-view threshold remain required. Individual photographs still require release between captures; moving surveys retain their continuous spatial-coverage rules. The timing logic is isolated in `src/exposure.js` and tested at 30, 60 and 120 fps.

The drift prediction uses the actual selected destination or clearance point, instead of the historical mission suggestion. It reports an arrival estimate, a miss or travel away from the bearing. Long estimates use hours; a quiet hint offers time compression when appropriate. Imminent surface risk retains priority. Target and suggested-view labels suppress redundant overlapping markers. None of these hints changes position, heading, velocity or the player's route.

## Photographs

Journal thumbnails open a large, uncropped image view with previous/next navigation, download and Back to journal. Keyboard left/right and the Xbox D-pad browse the collection; Escape or Xbox B returns to the journal. The gallery's scroll position and selected thumbnail are restored. Flight stays paused through the entire sequence, and the original stored image is used.

A panel revision check prevents a delayed journal load from replacing content after the player has closed it or opened another panel. Photograph-success messages stay with the flight rather than arriving late over a journal image. The viewer is isolated in `src/ui/photo-viewer.js`.

## Verification

`tests/exposure.test.mjs` covers grace, cancellation, subject separation, invalid final frames, release gating and timing at three frame rates. `tests/experience.mjs` exercises accumulated scrolling, keyboard/controller sensitivity, browser modifiers, actual pointer capture/release, interrupted exposure, keyboard/controller photo browsing, delayed-journal cancellation, saved-flight entry and correct Moon-bearing prediction. The current regression results are listed in `docs/PROGRESS.md`.

Controller input is simulated through the browser's standard mapping. Physical Xbox hardware and the exhibition computer remain separate acceptance checks. This revision adds no image, audio or remote runtime dependency.
