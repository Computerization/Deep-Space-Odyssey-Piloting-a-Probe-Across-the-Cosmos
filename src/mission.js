export const CHAPTERS = [
  {id:'earth',title:'Leaving home',eyebrow:'EARTH DEPARTURE',date:'5 September 1977',epoch:0,body:'earth',start:[.28,.16,1.77],music:'departure',au:1,
   intro:'One small spacecraft. An ocean of distance.',
   tasks:[
    {name:'Look back at Earth',target:'earth',point:[.40,.20,2.6],zone:.65,fact:'A thin atmosphere',text:'The blue rim is sunlight scattered by Earth’s atmosphere. Almost all of the air we breathe lies in a layer remarkably thin beside the planet.',detail:'Earth’s mean radius is 6,371 km. The atmospheric rim is rendered as a thin scattering layer; the globe is a modern imagery mosaic, rather than a reconstruction of the weather on launch day.'},
    {name:'Follow the blue horizon',target:'earth',point:[1.15,.2,1.15],aim:[0,.8,.6],zone:.3,fact:'A gradual boundary',text:'Earth’s atmosphere fades gradually into space. From nearby, this narrow layer stretches across the horizon.',detail:'The visible limb is produced by light scattering through a long path in the atmosphere. Its apparent thickness depends on wavelength, illumination and exposure.'},
    {name:'Open the distance',target:'earth',point:[1.05,.35,6.1],zone:1.2,fact:'Size is a matter of distance',text:'Earth stays the same size. Its angle in your field of view shrinks as the distance grows.',detail:'All planetary angular sizes are calculated from physical radius and your simulated position. Navigation markers are interface symbols, not visible objects in space.'}
   ]},
  {id:'jupiter',title:'A world of weather',eyebrow:'JUPITER ENCOUNTER',date:'5 March 1979',epoch:1,body:'jupiter',start:[.4,.17,1.9],music:'encounter',au:5.2,
   intro:'The largest planet, seen from a small machine.',
   tasks:[
    {name:'Approach the cloud world',target:'jupiter',point:[.75,.25,2.75],zone:.55,fact:'A deep atmosphere',text:'These bands are cloud systems moving through a deep atmosphere. Jupiter has no solid surface on which a spacecraft could land.',detail:'Jupiter’s equatorial radius is 71,492 km. Its polar radius is smaller, so the globe is visibly oblate. This map uses Voyager 1 images from 27 February 1979. Clouds moved before the 5 March encounter; colour is reconstructed and polar coverage is limited.'},
    {name:'Cross the terminator',target:'jupiter',point:[-1.3,.3,2.7],zone:.75,fact:'The edge of daylight',text:'The terminator is the boundary between day and night. Its position follows the direction of the Sun, not your camera.',detail:'Sun direction is calculated from the historical heliocentric geometry. Planetary shadows stay tied to that direction as you manoeuvre.'},
    {name:'Listen to Jupiter',target:'jupiter',point:null,zone:Infinity,mode:'signal',recording:'jupiter',fact:'Lightning beyond Earth',text:'Voyager detected radio bursts associated with lightning in Jupiter’s atmosphere. This recording is radio data played as sound.',detail:'This is an archived Voyager radio recording published by NASA. It is an electrical measurement played as audio, rather than pressure waves travelling through empty space.'},
    {name:'An encounter with Io',target:'io',frameBody:'io',point:[.3,.2,7],zone:2,fact:'Active volcanoes',text:'Voyager images revealed active volcanism on Io.',detail:'Io’s position comes from the same historical JPL snapshot as Jupiter. Its globe combines Galileo colour ratios with higher-resolution Voyager/Galileo imagery from USGS. The mosaic spans multiple dates and does not reconstruct Io’s exact 1979 surface. The close observation position is an exploratory reconstruction, rather than Voyager’s exact flyby trajectory.'}
   ]},
  {id:'saturn',title:'Light through the rings',eyebrow:'SATURN ENCOUNTER',date:'12 November 1980',epoch:2,body:'saturn',start:[.59,1.05,3.0],music:'rings',au:9.5,
   intro:'A planet. A plane of ice. A different kind of scale.',
   tasks:[
    {name:'Approach Saturn',target:'saturn',point:[.6,1.05,3.55],zone:.65,fact:'A system of countless orbits',text:'Saturn’s rings are made of orbiting particles, mostly water ice. From a distance, they appear to form a continuous surface.',detail:'Ring radii are tied to Saturn’s physical radius. The radial opacity map preserves the main bands and Cassini Division. Fine particle-scale structure is unresolved in this route.'},
    {name:'Along the ring plane',target:'saturn',point:[1.8,.45,2.65],zone:.7,fact:'Wide, yet extraordinarily thin',text:'Changing your height changes the rings from a broad ellipse to a narrow line. Their apparent shape comes from perspective.',detail:'The rings are a thin plane in the 3D scene. Sunlight is blocked by the globe, and the rings cast a corresponding shadow onto Saturn.'},
    {name:'Beneath Titan’s haze',target:'titan',frameBody:'titan',point:[.4,.25,6.5],zone:2,fact:'A world concealed',text:'Titan’s thick haze hid its surface from Voyager’s visible-light cameras.',detail:'Voyager 1 passed Titan before its closest approach to Saturn. This chapter lets you revisit the system in a free order. Titan’s haze is a physical approximation; later surface discoveries belong to Cassini–Huygens.'}
   ]},
  {id:'pale',title:'A pale blue dot',eyebrow:'THE FAMILY PORTRAIT',date:'14 February 1990',epoch:4,body:'voyager',music:'distance',au:40.5,
   intro:'Turn around. Home is somewhere in this darkness.',
   tasks:[
    {name:'Find Earth’s bearing',target:'earth',point:null,zone:Infinity,fact:'Our distant home',text:'From billions of kilometres away, Earth occupied less than a pixel in Voyager’s narrow-angle image.',detail:'The historic Pale Blue Dot is shown in the archive after you observe. It was made with the narrow-angle camera and coloured filters. The simulated camera does not enlarge Earth into a visible globe.',archive:true}
   ]},
  {id:'interstellar',title:'Beyond the solar wind',eyebrow:'INTERSTELLAR SPACE',date:'25 August 2012',epoch:5,body:'voyager',music:'distance',au:121.7,
   intro:'The boundary is measured, rather than seen.',
   tasks:[
    {name:'Listen to the instruments',mode:'signal',recording:'plasma',target:'sun',point:null,zone:Infinity,fact:'A different environment',text:'Voyager 1 crossed the heliopause in 2012. Changes in particles and plasma revealed its arrival in interstellar space.',detail:'The heliopause is a plasma boundary, not a visible wall. This scene uses a historical position and an interpretive instrument display. Voyager’s imaging cameras had been switched off in 1990; this is an external simulated view.'},
    {name:'One last look toward home',mode:'signal',target:'earth',point:null,zone:Infinity,fact:'Beyond the heliopause',text:'The planets are behind you. The Sun’s gravitational domain extends much farther than the heliopause.',detail:'Entering interstellar space does not mean leaving every definition of the Solar System. The distant Oort Cloud lies far beyond this chapter. Signal delay here is calculated from the simulated distance to Earth.'}
   ]},
  {id:'lightday',title:'One light-day from Earth',eyebrow:'THE LIGHT-DAY MILESTONE',date:'18 November 2026',epoch:6,body:'voyager',music:'distance',au:173,predicted:true,
   intro:'A signal takes a day to cross the distance home.',
   tasks:[
    {name:'Earth, one light-day away',mode:'signal',target:'earth',point:null,zone:Infinity,fact:'Twenty-four hours one way',text:'At the projected milestone, Voyager 1 is about 25.9 billion kilometres from Earth. A radio signal takes approximately 24 hours to travel one way.',detail:'NASA’s 10 November 2026 announcement places the one-light-day milestone on 18 November. Its mission-status page gives 10:16:07 UTC. This future node is a published prediction as of 14 November 2026, rather than a confirmed event. The distance is measured from Earth. The visible scene is simulated; Voyager’s cameras were powered off in 1990.'}
   ]}

];
export const MILESTONES=[
 {name:'Earth',label:'Launch',utc:'1977-09-05T12:56:01Z',precision:'second'},
 {name:'Jupiter',label:'Closest approach',utc:'1979-03-05T12:05:26Z',precision:'second'},
 {name:'Saturn',label:'Closest approach',utc:'1980-11-12T23:46:30Z',precision:'second'},
 {name:'Pale Blue Dot',label:'Earth images',utc:'1990-02-14T04:48:00Z',precision:'minute'},
 {name:'Interstellar space',label:'Heliopause crossing',utc:'2012-08-25T00:00:00Z',precision:'day'},
 {name:'One light-day',label:'NASA projection',utc:'2026-11-18T10:16:07Z',precision:'second'}
];
// Titan shares Saturn's chapter data but is a separate stop on the main flight.
export const VOYAGE_STOPS=MILESTONES.flatMap((m,chapter)=>{
 const entry={id:String(chapter),chapter,study:null,name:m.name,date:CHAPTERS[chapter].date,label:m.label,time:milestoneTime(chapter)};
 return chapter===2?[{...entry,id:'titan',study:'titan',name:'Titan',label:'Closest approach',time:'05:41 UTC'},entry]:[entry];
});
export const nextEncounterName=i=>MILESTONES[i+1]?.name||'the voyage';
export function milestoneTime(i){const m=MILESTONES[i];return m.precision==='day'?'Date established; exact time unspecified':m.utc.slice(11,m.precision==='minute'?16:19)+' UTC';}
export const BODY_DATA={
 sun:{radius:695700,name:'Sun',color:0xfff4df},
 earth:{radius:6378.137,name:'Earth',map:'earth.ktx2',mapPhase:.12,rotationPeriod:23.9345*3600,flatten:6356.752/6378.137,atmosphere:true,pole:[0,1,0]},
 moon:{radius:1737.4,name:'Moon',map:'moon.ktx2',flatten:1},
 jupiter:{radius:71492,name:'Jupiter',map:'jupiter.avif',mapPhase:.32,rotationPeriod:9.925*3600,flatten:.9351,poleRA:268.06,poleDec:64.5},
 io:{radius:1821.6,name:'Io',map:'io.avif',flatten:1},
 saturn:{radius:60268,name:'Saturn',map:'saturn.avif',mapPhase:.25,rotationPeriod:10.656*3600,flatten:.902,poleRA:40.589,poleDec:83.537,rings:true},
 titan:{radius:2574.7,name:'Titan',flatten:1,haze:true,atmosphere:true,poleRA:39.4827,poleDec:83.4279,hazeLayer:350}
};
// Reference sidereal/System III periods in seconds; map phases are authored.
// Increasing physical longitude moves opposite to the sampled texture offset.
export function surfaceRotation(body,seconds=0){
 return (body.mapPhase||0)-(body.rotationPeriod?seconds%body.rotationPeriod/body.rotationPeriod:0);
}
export const SOURCES=[
 ['Earth dimensions','NASA NSSDCA — equatorial and polar reference radii','https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html'],
 ['Planetary rotation','NASA NSSDCA fact sheets — Earth sidereal and giant-planet System III periods','https://nssdc.gsfc.nasa.gov/planetary/factsheet/'],
 ['Saturn by ringshine','NASA/JPL/Space Science Institute — Cassini night-side observations','https://science.nasa.gov/resource/saturn-by-ringshine/'],
 ['One-light-day forecast','NASA mission status and 10 November 2026 announcement; forecast retrieved 14 November 2026','https://www.nasa.gov/news-release/nasa-invites-media-public-to-join-voyager-1-one-light-day-activities/'],
 ['Historical closest-approach times','NASA NSSDCA; spacecraft UTC','https://nssdc.gsfc.nasa.gov/planetary/voyager-periapse-old.html'],
 ['Voyager 1 launch photograph','NASA archive · 5 September 1977','https://www.nasa.gov/technology/45-years-ago-voyager-1-begins-its-epic-journey-to-the-outer-planets-and-beyond/'],
 ['Voyager mission history','NASA / JPL','https://science.nasa.gov/mission/voyager/voyager-1/'],
 ['Historic positions','JPL Horizons — ICRF heliocentric vectors','https://ssd.jpl.nasa.gov/horizons/'],
 ['Voyager spacecraft model','NASA 3D Resources','https://science.nasa.gov/resource/voyager-3d-model/'],
 ['Planetary maps','Solar System Scope / INOVE, CC BY 4.0; based on NASA imagery','https://www.solarsystemscope.com/textures/'],
 ['Moon imagery and terrain','NASA SVS / Ernie Wright · LRO Camera and LOLA teams · 2025 colour mosaic and measured topography','https://svs.gsfc.nasa.gov/4720/'],
 ['Jupiter cloud map','Voyager 1 · NASA/JPL/Björn Jónsson · 27 February 1979','https://bjj.mmedia.is/data/jupiter_vgr1/index.html'],
 ['Saturn polar clouds','NASA/JPL-Caltech/Space Science Institute/Hampton University · Cassini, 25 June 2013','https://science.nasa.gov/photojournal/saturns-hexagon-as-summer-solstice-approaches/'],
 ['Saturn northern cloud structure','NASA/ESA Hubble · OPAL, Amy Simon · June 2019 · CC BY 4.0','https://archive.stsci.edu/hlsp/opal/opal-saturn-cycle-26'],
 ['Pale Blue Dot, 2020 reprocessing','NASA / JPL-Caltech, Kevin M. Gill','https://science.nasa.gov/photojournal/pale-blue-dot-revisited/'],
 ['Bright-star catalogue','D3 Celestial / XHIP catalogue','https://github.com/ofrohn/d3-celestial'],
 ['Io surface mosaic','NASA / JPL / USGS · merged Galileo and Voyager imagery','https://astrogeology.usgs.gov/search/map/io_galileo_ssi_global_color_merge_mosaic_1km'],
 ['Voyager instrument recordings','NASA / University of Iowa · historical radio and plasma measurements','https://space.physics.uiowa.edu/space-audio/'],
 ['Music','Original Cosmos chamber score · acoustic samples from VSCO 2 Community Edition, Versilian Studios / Sam Gossner and Ivy Audio / Simon Dalzell · CC0','https://versilian-studios.com/vsco-community/'],
 ['Voyager propulsion','NASA Voyager Backgrounder, 1980; single-jet thrust','https://ntrs.nasa.gov/citations/19810001583'],
 ['Voyager mass','NASA Voyager FAQ; approximate launch configuration','https://science.nasa.gov/mission/voyager/frequently-asked-questions/'],
 ['Barlow Semi Condensed','Jeremy Tribby · SIL Open Font License 1.1','https://github.com/google/fonts/tree/main/ofl/barlowsemicondensed'],
 ['Sometype Mono','Ryoichi Tsunekawa / Dharma Type · SIL Open Font License 1.1','https://github.com/dharmatype/Sometype-Mono'],
 ['Rendering','Three.js, MIT License','https://threejs.org/']
];
