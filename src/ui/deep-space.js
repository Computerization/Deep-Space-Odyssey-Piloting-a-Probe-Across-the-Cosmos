// Two optional observing instruments. Neither advances the encounter clock.
export function openArchivePlate(openPanel, ui){
 openPanel('archive','Find Earth',`<div class="archive-layout"><figure class="archive-plate"><img class="historic-earth" width="1440" height="1425" src="assets/archive/pale-blue-dot-display.jpg" alt="Voyager’s Pale Blue Dot photograph. Earth is a tiny point in the narrow sunlit band just right of centre."><i id="earth-locator" hidden aria-hidden="true"></i></figure><div><p class="eyebrow">CAMERA ARCHIVE · 14 FEBRUARY 1990</p><p class="lead">Look along the narrow band of light.</p><p>The band is sunlight scattered inside Voyager’s camera. Earth occupies less than a pixel in the original exposure.</p><button id="locate-earth" aria-pressed="false" aria-controls="earth-locator">Mark Earth</button><p class="small-note">NASA/JPL-Caltech · 2020 reprocessing by Kevin M. Gill. <a href="assets/archive/pale-blue-dot.jpg" download>Save full-resolution plate</a></p><button class="text-button" data-action="resume">Return to flight →</button></div></div>`);
 const mark=ui('earth-locator'),button=ui('locate-earth');
 button.onclick=()=>{mark.hidden=!mark.hidden;button.setAttribute('aria-pressed',String(!mark.hidden));button.textContent=mark.hidden?'Mark Earth':'Hide marker';};
}

export function signalAt(hour){
 const h=Math.max(0,Math.min(48,hour));
 return {fraction:1-Math.abs(h-24)/24,caption:h===0?'Earth transmits a command.':h<24?'The command is still on its way to Voyager.':h===24?'Voyager receives the command and sends a reply.':h<48?'The reply is on its way back to Earth.':'Earth receives Voyager’s reply.'};
}
export function openSignalDesk(openPanel,ui){
 openPanel('signal','Send a signal',`<p class="eyebrow">RADIO EXPERIMENT · ONE LIGHT-DAY</p><p class="lead">When can Earth first hear back?</p><p>Send a command, then move the clock. The endpoints stay one light-day apart and Voyager replies immediately in this model.</p><div class="signal-path" aria-hidden="true"><b>Earth</b><b>Voyager 1</b><div><i id="radio-pulse" hidden></i></div></div><p id="radio-state" role="status">Ready at Earth.</p><div class="signal-clock"><label for="radio-hours">Elapsed time</label><output id="radio-time" for="radio-hours">0 h</output><input type="range" id="radio-hours" min="0" max="48" step="1" value="0" disabled></div><div class="panel-actions"><button class="primary" id="radio-step">Transmit command</button><button class="text-button" data-action="resume">Return to flight →</button></div>`);
 const slider=ui('radio-hours'),pulse=ui('radio-pulse'),button=ui('radio-step');
 function display(h){
  const {fraction,caption}=signalAt(h);
  slider.value=String(h);slider.setAttribute('aria-valuetext',`${h} hours since transmission`);
  ui('radio-time').textContent=`${h} h`;pulse.style.left=`${fraction*100}%`;
  ui('radio-state').textContent=caption;button.textContent=h<24?'Advance to Voyager reception':h<48?'Advance to Earth reception':'Transmit again';
 }
 button.onclick=()=>{const h=slider.disabled||+slider.value===48?0:+slider.value<24?24:48;slider.disabled=false;pulse.hidden=false;display(h);};
 slider.oninput=()=>display(+slider.value);
}
