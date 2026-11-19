# Cosmos development

## What to preserve

- A main route is one spacecraft’s complete journey. Voyager 1 is the only main route in scope now. Strengthen playable moments inside that voyage before adding another mission.

- Keep Voyager 1’s journey continuous from launch to one light-day and the future outlook. Players fly the probe and can leave each encounter when ready. Give them a phenomenon worth looking for, feedback when they see it, and a clear way onward. Discoveries follow the actual view in any order; guidance and collecting are optional.
- Preserve physical scale and historical milestone dates. Use dates at milestones and during short cinematic passages. Describe assisted local flight as an exploration aid and distinguish predictions, reconstructions and archival material. Credit sources and state their limits.
- Preserve the flight controls in [the README](README.md#controls), including button-free mouse steering, coasting on release and active braking. Camera changes preserve the probe’s physical state. Introduce tools gradually. Every action shown during pointer lock has a working, visible keyboard shortcut; menus support Tab or arrows, Enter and Escape.
- Judge visuals first at the ordinary lens, at rest, while turning and while circling. Keep surfaces and limbs clear there and under magnification; use source imagery for real detail and bound memory use. Keep the interface quiet enough to see the subject and the science text specific enough to explain it. Keep opening captions clear of the archival footage.
- Preserve offline play and existing player saves, photographs and settings. Ask before changing a product commitment above, discarding user data or expanding the supported platforms.

## Where to use judgment

- Within the requested task, choose the implementation that gives the best player or maintenance outcome. Reuse a module, asset or interface when it fits; replace it or add a dependency when the benefit warrants its download size, runtime cost and upkeep. Keep each behaviour’s owner clear. The [architecture map](docs/ARCHITECTURE.md) describes the current layout; update it when ownership moves.
- Desktop Chrome is the acceptance target. Use another browser to investigate a specific issue when useful; that check does not add a support commitment.
- Match verification to the change. Reuse checks where they fit and add a focused test or fixture for a distinct failure mode. Check flight or rendering changes in motion; measure size, memory or performance when the change could affect them. Use the [release checks](docs/DEVELOPMENT.md) for a playable distribution. Keep development artifacts out of that distribution and report what was actually verified.
