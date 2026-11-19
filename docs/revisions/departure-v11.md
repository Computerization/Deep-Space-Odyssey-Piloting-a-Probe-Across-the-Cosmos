# First-flight and interface rebuild — v0.11.0

The previous opening put a framed Earth in front of the player without a meaningful reason to move. It also put several competing messages and controls over the scene. This revision changes the first playable sequence and its visual hierarchy.

## Playing

A new voyage begins near Earth’s limb with the probe visible. The suggested bearing sits outside the planet and the first prompt explains the immediate action. Progress requires a real heading, a useful outgoing velocity, a roughly 9,000 km passage, braking, turning back and a steady photographic exposure. Navigation reads the same manual flight state used everywhere else; it supplies no steering or thrust. Time compression is taught during the long coast. Missed approaches retain a return bearing and explain how to cancel drift.

The sequence is optional. Explore freely and hiding guidance preserve the current pose and velocity and release normal observation play. Voyage destinations and local flybys also release the guide. The completion screen offers the lunar traverse, the Jupiter crossing and continued exploration directly. First-flight progression is saved with the existing flight state, and replay is available in Pause.

## Interface

The title now states what the player will do. The opening frames a close Earth horizon beside a quiet left margin. A single current action replaces the centred objective stack; instruments stay at the bottom edge. Serif headings, lighter navigation, straight controls and shorter copy replace the previous heavy type. Offscreen arrows indicate the actual turn direction. Completion choices work with keyboard and synthetic Xbox input, without stealing Observe during ordinary flight.

The appearance uses system serif/sans families and the existing local Sometype Mono instrument face. Karrik is removed from the runtime bundle. No new image or audio downloads are required. Existing planetary rendering and music remain intact.

## Validation

`tests/departure.mjs` flies the entire opening with actual keyboard events, including turning back and recording, rather than changing the probe pose. It checks idle observation, time compression, save/reload in mid-coast, immediate lunar continuation, 1024 × 640 layout, free exploration and completion-menu controller navigation. Its report records the measured travel distance and play time for that test run; these are not first-time player usability measurements.

Four new unit checks cover progression requirements, invalid exposure time, stationary waiting and save restoration. Existing observation, menu, photographic browsing, complete-voyage and free-exploration checks are rerun. Offline verification uses an independently extracted ZIP and compares every runtime asset against the source. Current results are in the matching JSON files under `tests/`.

The route is a designed teaching flight with enhanced probe propulsion and compressed time. It retains physical world scales, but is not a reconstruction of Voyager’s exact Earth-departure trajectory. Chrome on this machine is the tested runtime; the controller checks use synthetic standard-mapping input.
