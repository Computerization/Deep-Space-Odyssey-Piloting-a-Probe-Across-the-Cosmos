// Optional fieldwork. Each stop asks for a change of viewpoint, then explains
// the visible result. These data also supply the journal; N never needs a score.
export const ENCOUNTER_TRAILS={
 earth:[
  {id:'earth-horizon',body:'earth',title:'Earth’s atmosphere',radius:1.5,phase:55,maxRange:1.58,limb:true,
   instruction:'Look along the thin blue edge.',
   finding:'The blue rim lies above the clouds. Along the horizon, sunlight crosses a longer path through the air.'},
  {id:'earth-night',body:'earth',title:'Earth at dusk',limb:true,radius:1.85,phase:130,
   instruction:'Circle into night to reveal a crescent.',
   finding:'Half of Earth is in daylight. From this side, only a crescent of that sunlit half is visible.'},
  {id:'earth-moon',body:'earth',title:'The Moon',study:'moon',
   instruction:'Visit the Moon to see Earth rise over its horizon.',
   finding:'Two worlds at very different distances move by different amounts when you change your viewpoint.'}
 ],
 moon:[
  {id:'moon-earthrise',body:'moon',title:'Earthrise',paired:'earthrise',
   instruction:'Move sideways to bring Earth above the lunar horizon.',
   finding:'As you fly sideways, the nearby lunar horizon slips past distant Earth.'},
  {id:'moon-terminator',body:'moon',title:'Crater shadows',radius:2.1,phase:90,terminator:true,
   instruction:'Follow the day–night boundary. Look for crater rims catching the light.',
   finding:'A crater rim catches the low Sun while its floor is still dark. These shadows follow measured lunar relief.'}
 ],
 jupiter:[
  {id:'jupiter-clouds',body:'jupiter',title:'The Great Red Spot',radius:1.8,maxRange:2.4,landmark:[.792,.378],
   instruction:'Find the large oval south of Jupiter’s equator.',
   finding:'In 1979 this storm spanned roughly 23,000 km, almost twice Earth’s diameter.'},
  {id:'jupiter-night',body:'jupiter',title:'Night-side storms',radius:1.85,phase:120,story:'jupiter',
   instruction:'Circle into night to hear Voyager’s lightning recording.',
   finding:'Lightning in Jupiter’s clouds sent radio pulses to Voyager’s antennas. Listen for the short, sharp bursts.'},
  {id:'jupiter-io',body:'jupiter',title:'Io',study:'io',
   instruction:'Visit the volcanic moon beside Jupiter.',
   finding:'Voyager’s discovery of active volcanoes on Io revealed a world heated by tidal forces.'}
 ],
 io:[
  {id:'io-jupiter',body:'io',title:'Io and Jupiter',paired:'io-pair',
   instruction:'Frame Io and Jupiter together.',
   finding:'Fly sideways: Io moves across the face of the sky much faster than distant Jupiter.'}
 ],
 titan:[
  {id:'titan-haze',body:'titan',title:'Titan’s hidden surface',radius:2.3,phase:55,
   instruction:'Look from the orange disc to its hazy edge.',
   finding:'Even at closest approach, Voyager’s cameras saw haze. At visible wavelengths it hid the ground.'},
  {id:'titan-crescent',body:'titan',title:'Light through haze',limb:true,radius:2.5,phase:150,
   instruction:'Circle into night and watch the rim catch sunlight.',
   finding:'Seen from the night side, Titan’s haze scatters sunlight into a bright rim beyond the solid moon.'}
 ],
 saturn:[
  {id:'saturn-rings',body:'saturn',title:'Above the rings',radius:3.2,phase:50,elevation:28,
   instruction:'Look for gaps and Saturn’s shadow across the rings.',
   finding:'The curved dark lanes follow the rings. The shadow that cuts across them is cast by Saturn.'},
  {id:'saturn-edge',body:'saturn',title:'Edge-on rings',radius:3.2,phase:50,elevation:0,
   instruction:'Descend towards the ring plane and watch the rings narrow.',
   finding:'At the ring plane you see the thickness of the rings. Rise a little and their broad faces reappear.'},
  {id:'saturn-shadow',body:'saturn',title:'Reflected light',radius:3.2,phase:135,elevation:24,
   instruction:'Circle into night, above the rings. Look for light on Saturn’s dark side.',
   finding:'Sunlight reflected from the rings faintly lights the hemisphere facing them.'},
  {id:'saturn-hexagon',body:'saturn',title:'Saturn’s hexagon',radius:2.45,maxRange:3.5,phase:70,elevation:70,minElevation:60,
   instruction:'Rise above the north pole to see the six-sided cloud boundary.',
   finding:'A jet stream traces six sides around the north pole. Voyager revealed the pattern; this polar image is from Cassini.'}
 ]
};
export const TRAIL_NOTES=Object.entries(ENCOUNTER_TRAILS).flatMap(([world,stops])=>stops.map(stop=>({id:'trail-'+stop.id,title:stop.title,text:stop.finding,recording:stop.story,label:world[0].toUpperCase()+world.slice(1)+' · fieldwork',detail:''})));

// Count only time spent on the actual feature. A small correction pauses the
// clock; a new subject or a sustained loss of framing starts a fresh hold.
export class ObservationHold {
 constructor(){this.reset();}
 reset(){this.subject=-1;this.seconds=0;this.gap=0;this.steady=false;}
 update(found,steady,dt){
  if(found>=0&&found!==this.subject){this.reset();this.subject=found;}
  this.steady=found>=0&&steady;
  if(this.steady){this.seconds+=dt;this.gap=0;}
  else if(this.subject>=0){this.gap+=dt;if(this.gap>.35)this.reset();}
 }
}

// Any order is valid. Suggest another unseen phenomenon before an optional
// transfer; visiting a moon remains a deliberate choice.
export function nextDiscovery(stops,seen,after=-1){
 for(let offset=1;offset<=stops.length;offset++){
  const i=(after+offset)%stops.length;
  if(!stops[i].study&&!seen.includes('trail-'+stops[i].id))return i;
 }
 const detour=stops.findIndex(stop=>stop.study);return detour<0?stops.length:detour;
}

// The whole far disc must clear the foreground limb; the two can be framed
// together from either side of the suggested waypoint. Angles are in radians.
export function pairedLimbGap(separation,nearRadius,farRadius){return separation-nearRadius-farRadius;}

// A discovery belongs to a visible phenomenon, not one exact waypoint.
export function isDiscoveryView(stop,{range,phase,elevation,visible,pairedVisible,terminatorVisible=false,limbVisible=true,landmarkVisible=false}){
 if(!stop||stop.study||!visible||(stop.limb&&!limbVisible))return false;
 if(stop.paired)return !!pairedVisible&&range>=1.02&&range<=12;
 if(range<1.02||range>(stop.maxRange??stop.radius+.5))return false;
 if(stop.terminator&&!terminatorVisible)return false;
 if(stop.landmark)return landmarkVisible;
 if(Math.abs(phase-stop.phase)>25)return false;
 // At close range the visible surface cap is smaller than a hemisphere.
 // Do not reward a crescent viewpoint that actually shows only darkness.
 if(stop.body!=='titan'&&phase>90+Math.acos(1/range)*180/Math.PI-5)return false;
 if(stop.elevation!==undefined){
  if(stop.elevation===0)return Math.abs(elevation)<3;
  if(elevation<(stop.minElevation??12))return false;
 }
 return true;
}

// Read the first Earth pass, never drive it. Range is in Earth radii and
// closing is the inward component (radii per presentation second).
export function departureCue(range,closing,thrust,braking,inView){
 const entry=ENCOUNTER_TRAILS.earth[0].maxRange;
 if(inView){
  if(braking&&closing>.008)return 'braking';
  return closing>.035?'brake':'observe';
 }
 if(range<=entry||range>2.2)return null;
 if(braking)return null;
 if(closing>.018&&(range-entry)/closing<2.5)return thrust>.05?'release':'coast';
 return 'thrust';
}
