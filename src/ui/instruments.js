export function openInstrumentsView({readings,fromSettings,openPanel}){
 const fields=[['Distance from the Sun',readings.solarDistance],['Signal travel time to Earth',readings.signalTime],['Field of view',readings.fieldOfView]];
 if(readings.local)fields.push(['Time in this encounter',readings.local.hours],['Model propellant',readings.local.fuel],['Applied thrust acceleration',readings.local.acceleration]);
 openPanel('instruments','Flight instruments',`<p class="instruments-context"></p><dl class="instrument-values">${fields.map(([label])=>`<div><dt>${label}</dt><dd></dd></div>`).join('')}</dl><footer class="instruments-actions"><button class="primary" data-action="${fromSettings?'flight-settings':'resume'}">${fromSettings?'Back to settings':'Return to flight'} <span aria-hidden="true">→</span></button></footer>`);
 const root=document.getElementById('panel-content');root.querySelector('.instruments-context').textContent=readings.context;
 [...root.querySelectorAll('dd')].forEach((dd,i)=>dd.textContent=fields[i][1]);
}
