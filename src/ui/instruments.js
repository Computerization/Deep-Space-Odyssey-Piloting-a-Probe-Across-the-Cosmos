export function openInstrumentsView({readings,fromSettings,openPanel}){
 const fields=[['Distance from the Sun',readings.solarDistance],['Signal travel time to Earth',readings.signalTime],['Field of view',readings.fieldOfView]];
 if(readings.gravity)fields.push(['Local gravitational acceleration',readings.gravity]);
 if(readings.local)fields.push(['Time in this encounter',readings.local.hours],['Model propellant',readings.local.fuel],['Applied thrust acceleration',readings.local.acceleration]);
 openPanel('instruments','Flight instruments',`<p class="instruments-context"></p><dl class="instrument-values">${fields.map(([label])=>`<div><dt>${label}</dt><dd></dd></div>`).join('')}</dl>${readings.gravity?'<p class="small-note">Fixed-epoch, spherical gravity in the local reference frame. Assisted thrust and follow mode are exploration aids.</p><label class="setting setting-range" for="gravity-time"><span>From rest: estimate fall</span><output id="gravity-fall" for="gravity-time"></output><input id="gravity-time" type="range" min="0" max="60" value="30" step="1" aria-label="Free-fall estimate in seconds"></label><p class="small-note">A local estimate assuming constant acceleration and no thrust or boundary; not a trajectory prediction.</p>':''}<footer class="instruments-actions"><button class="primary" data-action="${fromSettings?'flight-settings':'resume'}">${fromSettings?'Back to settings':'Return to flight'} <span aria-hidden="true">→</span></button></footer>`);
 const root=document.getElementById('panel-content');root.querySelector('.instruments-context').textContent=readings.context;
 [...root.querySelectorAll('dd')].forEach((dd,i)=>dd.textContent=fields[i][1]);
 if(readings.gravity){
  const slider=root.querySelector('#gravity-time'),output=root.querySelector('#gravity-fall'),g=Number.parseFloat(readings.gravity);
  const update=()=>{const seconds=Number(slider.value),meters=.5*g*seconds*seconds;output.textContent=`${seconds} s · ${meters>=1000?(meters/1000).toFixed(2)+' km':meters.toFixed(1)+' m'}`;slider.setAttribute('aria-valuetext',output.textContent);};
  slider.addEventListener('input',update);update();
 }

}
