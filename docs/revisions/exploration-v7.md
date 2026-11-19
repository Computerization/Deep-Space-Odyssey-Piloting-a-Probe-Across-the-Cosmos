# Open exploration — v0.7

The player remains the probe pilot. Suggested views can be ignored, hidden, revisited or selected in a different order. A mission observation requires a suitable view and deliberate Observe input; reaching its old waypoint is optional. Departure is available at any point through Voyage or N. During flight, Xbox A is exclusively Observe, including after the last mission observation.

## Exploration

- The local Earth–Moon, Jupiter–Io and Saturn–Titan charts show the probe, projected linear distances and a drift vector. World symbols are enlarged for legibility. Clicking a world selects a suggested bearing without altering position, velocity or attitude. The same actions are available through keyboard-focusable destination rows.
- The mapped regions have radii of 2.5, 5 and 6 million km. A soft advisory appears near their edges. Crossing that limit preserves manual control and inertia; no invisible wall or automatic reset is introduced. The central world's bearing offers a way back.
- Mission observations are independent, with selected suggestions prioritised when several views qualify. The next suggestion always comes from the still-unrecorded observations, including after out-of-order completion.
- Each of six worlds offers three field studies based on actual phase angle. At less than 45° it is classified as sunlit, from 45° to 110° as terminator, and above 110° as crescent. These are broad collection categories, not discrete physical states. Field observations require an aligned, resolved, unobstructed subject. Foreground globes block hidden subjects.
- Photographs, phase, viewing distance and scientific notes are stored in the journal. Repeating a completed perspective remains possible with the independent photograph command. The unobtrusive discovery note leaves the main camera view visible.
- Guidance preference, selected bearing and discovery list survive Continue. Existing v0.6 flight and partial-survey saves remain readable.

## Code structure

| Module | Responsibility |
|---|---|
| `flight.js` | Units, scale, velocity integration, time limits, coast prediction |
| `flight-controller.js` | Player-driven attitude, thrust, braking and displacement; physical clearance |
| `exploration.js` | Region data, observation windows, phase and occlusion geometry |
| `exploration-controller.js` | Contextual observation selection, optional destinations and local chart |
| `surveys.js` | Moving-pass coverage and clearance routes |
| `survey-controller.js` | Optional flyby lifecycle, recording and result display |
| `rendering/shaders.js` | Surface, cloud, atmosphere, ring and image-resolve shaders |
| `rendering/lighting.js` | Apparent solar-disc coverage and continuous penumbra |
| `world.js` | Scene/assets, cameras, renderer and frame updates |
| `main.js` | Application lifecycle, persistence, menus and orchestration |

## Visual changes

Solar occultation uses angular disc overlap instead of an on/off shadow switch. The Sun glare and probe key light fade through penumbra. Planetary surface and atmospheric shaders retain their existing shadow models. The overlap uses spherical occultors and a small-angle solar-disc approximation; it does not model limb darkening or atmospheric refraction. Stars are less suppressed when the world in view presents its dark hemisphere. Planetary sizes, source textures and physical relief scale remain unchanged.

## Validation

Twenty unit checks pass. Browser tests verify unchanged pose when selecting a bearing, free coasting, hidden guidance, an out-of-order observation more than 26,000 km from its original suggested point, independent lunar photography, save restoration, travel beyond the mapped region and departure with zero observations. The full thirteen-observation journey and all four crossings still complete using the production flight integrator. All three optional moving flybys still complete after their controller was separated. Synthetic Xbox input, audio output and offline loading are exercised separately. Rendered moon phases and partial/total solar occultation are checked with screenshots and numerical lighting values.

The route test uses a scripted pilot; it verifies navigation mechanics rather than human enjoyment. Visual fixtures place the camera at known geometric viewpoints. Physical Xbox hardware and exhibition-PC performance require testing on those devices. These limits do not affect the local offline browser delivery.
