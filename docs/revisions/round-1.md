# Rebuild round 1 — scene and interface

Replaced the complete title, HUD, menu typography and button system. Removed persistent technical labels, small-cap ornament, footer branding, card buttons and multiple explanations competing with the scene. Kept a single contextual objective, readable speed/time readout and a small camera/voyage/pause menu. Settings and controls now have separate screens.

Reframed the title around a near-Earth view and moved encounter entry points closer while preserving real angular sizes. Replaced tone mapping and planetary reflection response. Reworked ring opacity using optical depth and the Sun/view angles, with separate reflected/transmitted-light approximations. Restored the probe's material differences and added self-shadowing. Added a damped third-person chase camera and changed new voyages to start with the spacecraft visible.

Reviewed the title and five chapters in the browser. Shader compilation and runtime errors: zero. Found that a stronger world view alone leaves the repetitive observation loop and travel flow unresolved; these are round 2 priorities. Round 1 screenshots are preserved under tests/screenshots/round-1.
