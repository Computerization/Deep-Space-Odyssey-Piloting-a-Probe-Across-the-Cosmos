# Cosmos

**Deep Space Odyssey: Piloting a Probe Across the Cosmos**  
Information Technology Club × Astronomy Club

An English-language exploration experience following Voyager 1 from launch to one light-day, with a future outlook. Fly around the worlds, discover their appearance from different positions, and continue the voyage whenever you are ready.

## Play

On macOS, double-click **Start Cosmos.command**. On Windows with Python installed, double-click **Start Cosmos.bat**. Keep the launcher window open. Opening the launcher again reuses the running copy so the same browser save remains available. If another application occupies the port, Cosmos uses a free one.

Alternatively, run `python3 server.py --open` or `npm start`, then open **http://127.0.0.1:4173**. WebGL 2 and hardware acceleration are required. All game assets are local, so the launcher works without internet access. Opening `index.html` directly is unsupported by browser module security.

## The voyage

The opening screen is a hands-on spacecraft study. You can inspect the model while the flight data loads. Drag the NASA Voyager model to rotate it, or focus it and use the arrow keys. Scroll or use + / − to zoom; Home resets the view. Select the antenna, cameras, power generators or magnetometer boom for a closer look. **Continue voyage** restores your flight directly.

**Begin voyage** opens with NASA’s archival launch film, followed by a short reconstructed departure from Earth. Flight starts in third person; C switches to first person and back without changing the probe’s motion. Captions sit below the film. The controls then pass to you. On the first approach to Earth, build momentum, release thrust to coast, and brake while you frame the thin blue rim. The guide reads your inward motion; you can steer away or fly onward at any time.

The main route is **Earth → Jupiter → Titan → Saturn → Pale Blue Dot → interstellar space → one light-day → future outlook**. Each stop opens with a nearby horizon and a concrete phenomenon to explore. Discoveries respond to what you see, in any order: hold a revealing view briefly to receive its explanation and a journal note. After reading time, the next suggestion prioritizes something you have not yet seen; X can advance sooner. P photographs any view. The bearing points towards a suggested viewpoint or selected world, including when it is outside the view. These are optional directions; departure is always available.

Approach Earth’s horizon, move between day and night, find Jupiter’s Great Red Spot, circle Titan’s haze, cross Saturn’s ring plane and explore its polar jet. Guidance changes as you turn, approach and look at the world. World labels use just the name; the HUD gives diameter and altitude. The first controls appear gradually. Science captions explain the view you reached, and historical recordings open only when requested. The later chapters include Voyager’s historical Earth photograph and instrument recordings. **Explore** offers the solar-system chart and optional nearby worlds such as the Moon and Io.

**Continue to…** begins a ten-second, time-compressed 3D passage with a short mission note. Leave the current view, cross the intervening years and distance, and arrive beside the next world; N skips the passage. Optional transfers to the Moon and Io use a seven-second continuous curved flight at the same encounter date. Dates identify historical milestones and the passage between them. Local exploration does not advance an invented mission calendar.

In **Pause → Settings → Picture**, set **Passage camera** to **Steady** for a fixed Earth view after the launch film and a chart during transfers. **Follow system** uses this presentation when reduced motion is enabled. Manual flight and image quality stay the same.

During fieldwork the meter counts time spent on the feature. A brief correction holds the meter until you find the same view again; a finished note goes straight to the Journal. Follow the Moon’s terminator to see long crater shadows, or frame Earth just clear of the lunar limb from either side. At Saturn the ring-opening angle changes as you fly. **G** hides the guide for an unobstructed flight.

In the Pale Blue Dot archive, try finding Earth before choosing **Mark Earth**. At one light-day, **X** opens a radio experiment: transmit, then scrub the 48-hour clock or jump to each reception. The experiment models an immediate reply at fixed separation, independently of the flight clock. **N** goes directly to the future outlook.

## Controls

Esc or controller B returns one menu level. If you opened a tool directly from flight, it returns you to flight; if you opened it from Pause, the ship stays paused.

| Action | Keyboard / mouse | Xbox standard mapping |
|---|---|---|
| Approach / retreat | W / S | RT / LT |
| Circle a followed world | A / D | Left stick sideways |
| Move above / below it | R / F | Left stick vertically |
| Look / steer | Mouse / arrow keys | Right stick |
| Roll | Q / E | LB / RB |
| Brake against current drift | Hold Space | Hold B |
| Faster assisted flight | Hold Shift | Hold LB + RB |
| Record / advance a discovery or open its recording | X | X |
| First / third person; camera menu | C / K | Y / pause menu |
| Follow / release a world | L or its bearing | Pause → Camera |
| Photograph | P | Left-stick click |
| Magnification | Scroll | D-pad left / right |
| Continue the main voyage | N or Continue button | D-pad up |
| Explore / journal | M / J | View / pause menu |
| Flight review / recent photograph | U / O | Pause menu / journal |
| Pause / controls | Escape / ? | Menu |
| Menu navigation | Tab or arrows; Enter; Esc | Left stick; A; B |

Giant worlds take longer to circle than smaller ones: assisted cruise scales sublinearly with radius. Shift provides faster travel. Thrust and Shift acceleration rise progressively; steering preserves mouse travel across frame rates. Thrust builds momentum. Release movement controls to coast under local gravity; hold Space to reduce current drift regardless of camera direction. Turning releases subject following; **L** restores it. While following a world, sideways movement circles it while retaining your distance and coasting speed. Guidance identifies a useful A/D or R/F orbit direction, or W/S when the remaining adjustment is distance. Moving the mouse releases following. Close-pass boundaries keep the flyby within useful imagery coverage: approaching them slows inward movement while sideways and outward control remain available. These boundaries are exploration limits above the worlds, not physical surfaces.

Photographs are stored in this browser’s Journal, where you can view, export or remove them. Continue restores the current local flight or passage. Browsing the title menus leaves your checkpoint untouched. Starting a replacement voyage from the title asks for confirmation; photographs and settings remain. Settings retain sound, picture and control choices.

## Scientific and visual scope

- World sizes, distances, sunlight and angular sizes retain physical scales. Chart symbols and navigation markers are labelled interface aids.
- Local flight is **assisted exploration**, with responsive acceleration, coasting inertia and optional automatic counter-thrust. Fixed-epoch spherical gravity uses JPL gravitational parameters; external bodies act differentially in the local reference frame. The Instruments panel shows the resulting local gravitational acceleration and an adjustable constant-acceleration fall estimate. Follow mode adds a deliberate circling assist, and exploration boundaries are enforced. It does not reproduce Voyager’s acceleration, propulsion, fuel consumption or attainable manoeuvres. No assisted speed is presented as a measured spacecraft speed.
- Historical encounter positions use bundled JPL ephemerides. Long passages compress time; they are not high-speed engine boosts. The light-day endpoint is NASA’s published prediction for 18 November 2026, identified as predicted.
- Earth uses a 16K GPU-compressed overview on supported hardware (8K compressed mip or smaller-device image fallback) and camera-local patches from a 64K atlas built from NASA’s 500 m Blue Marble sources. Only four detailed tiles form the active patch; decoded tiles have a bounded cache. Moon imagery uses up to a 16K source; Io retains an 11,444 × 5,722 georeferenced mosaic. Other worlds retain their credited spacecraft mosaics. High picture quality draws clouds at the same resolution as the worlds during both still viewing and movement. Real image resolution sets the detail limit; arbitrary magnification cannot reveal unrecorded detail.
- Clouds and atmospheres are reconstructions. Titan’s surface remains obscured by its haze in visible light. Its pole follows the JPL/IAU orientation; a roughly 350 km detached haze layer and darker northern hemisphere approximate Voyager-era observations. Maps combine observations from several missions and dates. Earth clouds include a bounded approximation to successive scattering orders. Jupiter and Saturn have reconstructed upper cloud depth, self-shadow and multiple-scattering reflectance; cloud structure follows the source imagery; unresolved detail is not filled with random grain. The launch film is archival footage; the orbital departure and later external cameras are simulated.
- Music accompanies the experience. Labelled radio and plasma recordings are historical instrument data.

Sources: [asset credits](docs/CREDITS.md). Development: [architecture](docs/ARCHITECTURE.md), [current verification](docs/REPAIR-STATUS.md).

## Editing

Editable JavaScript, bundled Three.js and local assets; no build step or application dependencies. `npm test` runs the included unit checks. Browser checks are development tools and require Playwright separately.
