// Two optional observing instruments. Neither advances the encounter clock.
export function openArchivePlate(openPanel, ui,onFind=()=>{}){
 openPanel('archive','Find Earth',`<div class="archive-layout"><figure class="archive-plate"><img class="historic-earth" width="1440" height="1425" src="assets/archive/pale-blue-dot-display.jpg" alt="Voyager’s Pale Blue Dot photograph. Earth is a tiny point in the narrow sunlit band just right of centre."><i id="earth-locator" hidden aria-hidden="true"></i></figure><div><p class="eyebrow">CAMERA ARCHIVE · 14 FEBRUARY 1990</p><p class="lead">Look along the narrow band of light.</p><p>The band is sunlight scattered inside Voyager’s camera. Earth occupies less than a pixel in the original exposure.</p><button id="locate-earth" aria-pressed="false" aria-controls="earth-locator">Mark Earth</button><p id="plate-reading" role="status">Select the point in the plate or use the locator.</p><p class="small-note">NASA/JPL-Caltech · 2020 reprocessing by Kevin M. Gill. <a href="assets/archive/pale-blue-dot.jpg" download>Save full-resolution plate</a></p><button class="text-button" data-action="resume">Return to flight →</button></div></div>`);
 const mark=ui('earth-locator'),button=ui('locate-earth');
 function locate(found){mark.hidden=!found;button.setAttribute('aria-pressed',String(found));button.textContent=found?'Hide marker':'Mark Earth';ui('plate-reading').textContent=found?'There is Earth, inside the sunlit band.':'Select the point in the plate or use the locator.';if(found)onFind();}
 button.onclick=()=>locate(mark.hidden);
 const plate=mark.parentElement;plate.onclick=e=>{const r=plate.getBoundingClientRect();const dx=(e.clientX-r.left)/r.width-.5946,dy=(e.clientY-r.top)/r.height-.5196;
  if(Math.hypot(dx,dy)<.034)locate(true);else {locate(false);ui('plate-reading').textContent='Try the narrow sunlit band just right of centre.';}
 };
}

export function signalAt(hour){
 const h=Math.max(0,Math.min(48,hour));
 return {fraction:1-Math.abs(h-24)/24,caption:h===0?'Earth transmits a command.':h<24?'The command is still on its way to Voyager.':h===24?'Voyager receives the command and sends a reply.':h<48?'The reply is on its way back to Earth.':'Earth receives Voyager’s reply.'};
}
export function openSignalDesk(openPanel,ui,onReturn=()=>{}){
 openPanel('signal','Send a signal',`<p class="eyebrow">RADIO EXPERIMENT · ONE LIGHT-DAY</p><p class="lead">When can Earth first hear back?</p><p>Send a command, then move the clock. The endpoints stay one light-day apart and Voyager replies immediately in this model.</p><div class="signal-path" aria-hidden="true"><b>Earth</b><b>Voyager 1</b><div><i id="radio-pulse" hidden></i></div></div><p id="radio-state" role="status">Ready at Earth.</p><div class="signal-clock"><label for="radio-hours">Elapsed time</label><output id="radio-time" for="radio-hours">0 h</output><input type="range" id="radio-hours" min="0" max="48" step="1" value="0" disabled></div><div class="panel-actions"><button class="primary" id="radio-step">Transmit command</button><button class="text-button" data-action="resume">Return to flight →</button></div>`);
 const slider=ui('radio-hours'),pulse=ui('radio-pulse'),button=ui('radio-step');
 function display(h){
  const {fraction,caption}=signalAt(h);if(h===48)onReturn();
  slider.value=String(h);slider.setAttribute('aria-valuetext',`${h} hours since transmission`);
  ui('radio-time').textContent=`${h} h`;pulse.style.left=`${fraction*100}%`;
  ui('radio-state').textContent=caption;button.textContent=h<24?'Advance to Voyager reception':h<48?'Advance to Earth reception':'Transmit again';
 }
 button.onclick=()=>{const h=slider.disabled||+slider.value===48?0:+slider.value<24?24:48;slider.disabled=false;pulse.hidden=false;display(h);};
 slider.oninput=()=>display(+slider.value);
}

// The highlighted intervals belong to the historical plate, not to the current
// flight clock. Leave the original time-compressed recording available below.
export function bindPlasmaComparison(ui,onCompare){
 const el=ui('plasma-comparison');
 el.innerHTML=`<div class="spectrum-figure"><video id="historic-media" controls playsinline preload="metadata" poster="assets/archive/plasma-spectrum.jpg" src="assets/archive/interstellar-plasma-compact.mp4" aria-label="Voyager plasma-wave instrument observations"></video><i hidden aria-hidden="true"></i></div><div class="spectrum-controls"><p class="eyebrow">PWS / ARCHIVAL COMPARISON</p><strong>Compare the two bright bands.</strong><div class="band-buttons"><button data-band="early" aria-pressed="false">Oct–Nov 2012</button><button data-band="late" aria-pressed="false">Apr–May 2013</button></div><p class="spectrum-caption" role="status">Select an interval, then compare its pitch with the other.</p><p class="small-note" id="comparison-result" role="status" hidden>Both bands compared · recorded in your field notes.</p></div>`;
 const seen=new Set(),mark=el.querySelector('i');
 for(const button of el.querySelectorAll('[data-band]'))button.onclick=()=>{
  const band=button.dataset.band;seen.add(band);el.dataset.band=band;mark.hidden=false;
  for(const b of el.querySelectorAll('[data-band]'))b.setAttribute('aria-pressed',String(b===button));
  el.querySelector('[role=status]').textContent=band==='early'?'The earlier band lies near 2.1 kHz.':'The later band is higher, near 2.6 kHz: the surrounding electron density was greater.';
  const video=ui('historic-media');video.currentTime=band==='early'?3:19;video.play().catch(()=>{});
  if(seen.size===2&&ui('comparison-result').hidden){ui('comparison-result').hidden=false;onCompare();}
 };
}

// Engraved-groove diagram, deliberately not a facsimile of the record cover.
export const futurePlate=`<figure class="record-plate"><svg viewBox="0 0 180 180" aria-hidden="true"><g fill="none" stroke="currentColor">${Array.from({length:27},(_,i)=>`<circle cx="90" cy="90" r="${25+i*2}"/>`).join('')}<circle cx="90" cy="90" r="2"/></g><path d="M92 16L105 75L119 22Z" fill="currentColor" opacity=".24"/></svg><figcaption><span>VGR 01 / 1977</span><strong>Golden Record</strong><small>Groove diagram · not to scale</small></figcaption></figure><details class="record-sleeve"><summary>How could someone play it?</summary><p>The cover uses diagrams to show how to turn the disc and retrieve its pictures. A cartridge and stylus travel with it. The record does not need a radio link to Earth.</p><p class="small-note">NASA / JPL · Golden Record cover instructions</p></details>`;
