# Physical time, open exploration and interface — v0.12.0

The player changes the flow of time to cross distance. This revision removes the former 4–16 km/s² arcade thrust, exponential braking, 55 km/s ceiling, and manually thrust-driven interplanetary crossings. It also retires the five-step departure tutorial and completion gates.

## What changed

The active local integrator uses kilometres and simulated seconds throughout. Gravity and propulsion advance on the same clock. A single equivalent 0.889 N jet starts at approximately 0.001091 m/s² on an 815 kg nominal mass. Diagonal input shares this force budget. A finite 104 kg model fuel load, with a declared generic 220 s hydrazine specific impulse, bounds possible accumulated impulse. The inferred model dry mass is 711 kg; this parameter combination is approximate and does not reconstruct actual remaining mass at any encounter. Real spacecraft had multiple differently oriented thrusters and changing pressure. Free thrust axes, real-time camera/attitude control and a fresh fuel state per encounter are experience adaptations.

Local studies hold body centres at their historical encounter geometry. The integrator includes the central body's gravity and differential external gravity. Initial scenic positions retain the historical flyby's two-body energy while choosing a tangential start direction. They are explicitly alternate exploration conditions. The outer two studies use the historical heliocentric velocity directly. Adaptive substeps constrain integration error; approaching surfaces lowers time flow. Space or Xbox B holds time. Region limits hold time before crossing the limit, preserving momentum. Steering is always manual.

There is no single historically correct universal maximum speed: speed depends on reference frame, distance and gravity assists. Local HUD speed is relative to the encounter's central body; historical passage speed is heliocentric. The Instruments panel exposes applied thrust acceleration, model fuel and elapsed local study time.

Interplanetary passages now follow 648 offline NASA/JPL Horizons records between 1977 and 2026. Cubic Hermite interpolation uses source positions and velocities; its derivative supplies displayed velocity. Calendar playback, physical speed and total approximate path distance are separate. UTC is explicit. The original six-epoch file had sorted output rows incorrectly associated with two unsorted Saturn/Titan request dates; records are now matched to Julian dates. The fetch script preserves this mapping and includes all eight planets for the chart.

Entering and leaving historical passage explicitly switches between a scenic encounter study and the sampled historical track. Outer planets and moons are not rendered from stale encounter positions during passage; the view shows the Sun, stars and spacecraft. The solar-system chart remains labelled with its selected encounter epoch, rather than presenting interpolated planetary positions as a live ephemeris. At each encounter, physical radii and positions retain their angular proportions; nearby moons are legitimately visible.

The chart uses linear AU distances, four scale choices, ecliptic projection, selectable body readouts and light-travel time. Symbols are enlarged and labelled accordingly. Local charts retain nearby-world bearings. The default bearing stays visible, moving to the screen edge when necessary, independently of photography. Contextual science is recorded from viewing conditions, without task completion.

Title, pause and map interfaces use Barlow Semi Condensed and Sometype Mono. Main choices are typographic rows with a simple focus marker. Controls are on demand; time flow has direct controls in the HUD. The title and pause composition were informed by the sources below; no external site assets are shipped.

## Primary references and interpretation

- [NASA Voyager FAQ](https://science.nasa.gov/mission/voyager/frequently-asked-questions/): nominal launch mass and trajectory context.
- [NASA Voyager Backgrounder, 1980](https://ntrs.nasa.gov/citations/19810001583): thruster and hydrazine system specifications. The educational force model uses one equivalent jet, not a reconstruction of the actual firing geometry.
- [NASA hydrazine propulsion reference](https://ntrs.nasa.gov/api/citations/19870006632/downloads/19870006632.pdf): approximately 220 s specific impulse for hydrazine; used as a model assumption, not a Voyager-specific measured value.
- [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html): heliocentric ICRF vectors, km/s and UTC. See the offline JSON and reproducible fetchers.
- [JPL astrodynamic parameters](https://ssd.jpl.nasa.gov/astro_par.html) and [satellite/planet gravity parameters](https://ssd.jpl.nasa.gov/sats/phys_par/sep.html): gravitational parameters for the simplified local integrator.
- [Naughty Dog official interface/accessibility examples](https://www.naughtydog.com/blog/the_last_of_us_part_ii_accessibility_features_detailed): restrained menu rows, visible selection and on-demand controls.
- [Apple MacBook Pro](https://www.apple.com/macbook-pro/): visual hierarchy and selective emphasis, adapted to an immersive scene.
- [Barlow font and OFL](https://github.com/google/fonts/tree/main/ofl/barlowsemicondensed): locally packaged typeface and license.

## Verification

41 unit checks cover physical impulse, fuel exhaustion, time-rate independence, zero-time momentum, circular-orbit energy, ephemeris date matching, trajectory derivatives, scale, exposure and navigation geometry. The browser check covers all six region boundaries and five historical passages, manual viewing during time hold, science without a task gate, photography, passage save/reload, chart selection and a 1024 × 640 pause menu. Xbox checks use synthetic standard mapping; a physical controller was not connected. The independent package check verifies every runtime hash offline and exercises fonts, charts, photographs, saved passages and media decoding/playback. See the two current JSON reports.

The scene remains a reconstruction. These checks establish the implemented model and interactions; they do not establish full spacecraft engineering fidelity or photographic indistinguishability.

## Historical calendar and the one-light-day endpoint

Milestones use published spacecraft UTC: launch on 5 September 1977 at 12:56:01; Jupiter closest approach on 5 March 1979 at 12:05:26; Saturn closest approach on 12 November 1980 at 23:46:30; Pale Blue Dot images on 14 February 1990 at 04:48; heliopause crossing on 25 August 2012 (date precision only). The initial post-launch study samples 18:00 UTC; it does not simulate the launch vehicle. The heliopause data sample uses midnight as a day anchor, not an assertion about its exact crossing second. Local exploration remains tied to each scene's historical geometry; its elapsed study time is separate from mission milestone dates.

NASA's [10 November 2026 announcement](https://www.nasa.gov/news-release/nasa-invites-media-public-to-join-voyager-1-one-light-day-activities/) forecasts the one-light-day milestone on **18 November 2026**. The [mission-status page](https://science.nasa.gov/mission/voyager/where-are-voyager-1-and-voyager-2-now/) specifies **02:16:07 PST / 10:16:07 UTC**. Its distance is **from Earth**, not the Sun. November 17 is the public celebration. Retrieved 14 November 2026; the endpoint is marked predicted in the game. JPL vectors at the published endpoint yield 25,902,068,371 km from Earth, or 24.0000 light-hours.

Historical timing sources: [NASA NSSDCA closest approaches](https://nssdc.gsfc.nasa.gov/planetary/voyager-periapse-old.html), [NASA Pale Blue Dot history](https://science.nasa.gov/mission/voyager/voyager-1s-pale-blue-dot/), and [NASA Voyager 1 chronology](https://science.nasa.gov/mission/voyager/voyager-1/). New queries use `TIME_TYPE=UT` explicitly; no TDB dates are relabelled as UTC.

The timeline menu exposes date precision, and the heliopause row avoids an invented exact time. Six encounters and five passages are supported. The outer chart now reaches 200 AU. Typographic row interactions are shared across title, pause, timeline and exploration; keyboard focus returns to the selected chart control after an update. Pause starts on Resume. Controls use full-sized hit areas, one selection marker and restrained separators.
