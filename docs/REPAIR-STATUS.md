# Cosmos — current delivery status

Revision 0.113 retains earned observation time across a brief correction to the same view. Back from a Pause submenu restores its parent and focus; explicit flight actions still resume. The optional steady passage camera uses the first piloted Earth view after the launch film and an opaque chart during dated or local transfers. Covered passages skip 3D draws. Preferences, checkpoint format and manual flight are independent.

Revision 0.112 lets the opening model appear before flight data is ready. Orthographic framing checks 87 extreme vertices instead of scanning all 27,714 vertices of the inspected mesh; it draws the same reflector and hardware. Local exploration shares visibility and range measurements. Paused passages keep their text and chart still, including on reload; Space resumes the passage. Field notes describe what the pilot can see, and resolved-world labels leave the cloud bands clear.

Revision 0.111 protects saves when browsing the title or reopening the launcher, restores in-progress passage geometry, lists Titan before Saturn in the encounter atlas, uses Titan’s own route endpoint, and preserves flight state after the future outlook. The first Earth hint yields to camera following; on small screens the field guide moves above a low-framed planet.

Revision 0.110 keeps Voyager 1 as the single playable voyage. On the first Earth approach, the guide reads the probe’s inward velocity, thrust, braking and actual view of the limb. It teaches release and coasting before suggesting the brake; guidance never changes the pilot’s motion or gates departure.

Revision 0.109 opens directly on an interactive NASA Voyager spacecraft model: see the whole craft, then inspect the antenna, cameras, generators and magnetometer boom. The inspection copy refines the dish; flight uses the original geometry. Launch and resume remain direct actions.

Revision 0.108 reduces the cost of flying close to Earth. The renderer checks the reconstructed cloud top before reading fine cloud coverage where a segment is already above the deck. It uses the same native pixels, cloud profile, sampling positions and lighting. Unchanged fieldwork buttons, shortcuts and launch captions also keep their text nodes.

## Implemented

- NASA launch film, a compressed orbital departure and the complete Voyager route: Earth → Jupiter → Titan → Saturn → Pale Blue Dot → interstellar space → one light-day → future outlook.
- Mouse steering without dragging; WASD translation, QE roll, RF vertical movement, Shift faster assisted flight, Space counter-thrust and Esc pause. Thrust builds momentum; release preserves coasting.
- Optional viewpoint sequences make changing position meaningful: horizons, crescent phases, cloud bands, ring-plane crossings and nearby moons. Viewing a revealed phenomenon records its explanation; photos remain optional. N remains available without completing discoveries.
- Interplanetary passages show historical dates, elapsed distance and a projected JPL route diagram. Optional Moon/Io transfers follow a continuous curved path at the same encounter date.
- Earth regional imagery increases from 32K to 64K using the original NASA sources; four tiles still form one 4096² patch and the decoded cache remains bounded. Io retains an 11,444 × 5,722 georeferenced source grid. The existing Moon imagery and relief remain.
- Jupiter and Saturn have a reconstructed upper cloud deck with extinction and self-shadow. Cloud structure follows source imagery; inferred height does not add measured image information. Saturn retains its ring lighting and polar imagery.

## Observed verification

- All 132 unit checks pass. Coverage includes the daylight lookup against a dense angular integral, lunar day/night framing, paired-disc separation and the 48-hour radio clock.
- At the ordinary 58° lens, Earth and Moon were captured in six poses each. In a matched Earth globe frame, 18,581 bright near-neutral baseline pixels gained an average of 1.3 red, 3.0 green and 6.1 blue levels (8-bit). This measures a cooler highlight, not colour calibration. In the isolated HDR sky pass, a 0.9-pixel camera pan moved the brightest catalogue star's centroid by 0.88 pixels; integrated green flux varied by less than 0.3%.
- At 1.55 Earth radii, 58° lens, High, Chrome/Metal, the paired whole-frame GPU median was 45.64 → 39.78 ms at 2560 × 1600, and 17.83 → 16.14 ms at 1280 × 800 with 4× MSAA. Each variant contributed 40 samples per grid. The final display buffers matched byte for byte in ten fixed views on each grid. The change adds no textures or render targets. Live presentation is paced separately; the GPU reduction is not a guaranteed frame rate.
- Keyboard tests operate the archive locator, radio slider, both receptions, return to flight and direct onward travel. Moon fixtures exclude an occulted Earth, recognize an Earthrise at six lunar radii and distinguish a visible terminator from pointing away at the same phase. The original archival JPEG remains available offline; its 1440-pixel display derivative reduces nominal RGBA decode size from 103.2 MiB to 7.8 MiB.
- Chrome's complete main voyage passes from launch through the future outlook. Separate opening and free-exploration checks verify actual W/Space input, an opening approach without automatic following, reverse-order discovery, L/D orbit/coast and mouse release, Great Red Spot recognition, sustained approach to the close-pass boundary, polar discovery and optional recordings retained in the journal. Feature placement beyond the opening uses reproducible camera positions; these checks are not a user study.
- The opening/interface checks cover launch captions outside the film at 1440 × 900, 1024 × 640 and 800 × 600, matching flight shortcuts, immediate Tab/Enter menu use, K/C camera actions, journal/review/help and O for the recent photo.
- Revision 0.105: six bodies were captured at the ordinary 58° lens in globe, crescent, near, terminator, backlit and near-limb views: 36 views plus the Sun. The montage and relevant full-size frames were inspected; Chrome reported no errors. These establish rendering coverage, not photographic equivalence.
- The packer verifies included archive hashes and local documentation links. Offline acceptance uses an independently extracted archive and checks runtime hashes, keyboard/software-Xbox input, photo capture, an onward passage, compact-screen layout and media range responses.

## Practical limits

Local movement and braking are assisted exploration controls, not Voyager's propulsion capability. NASA launch footage is followed by a reconstructed orbital departure. The historical journey and freely explored viewpoints serve different purposes.

Available imagery bounds surface detail. Earth and Io retain more genuine source pixels; extreme proximity still exceeds the observations. Gas-cloud height and optical response are reconstructions. Titan's visible-light haze intentionally obscures its ground. Earth cloud colour still has a warm bias in some daylight views; the simplified coupled air/cloud lighting needs further calibration. Photographic identity at every distance has not been achieved.

Xbox mapping is checked in software. Physical controller feel and exhibition-speaker listening still require those devices.
