const QUALITY_NOTES = {
 ultra: 'Full detail throughout flight, up to 2×. Highest rendering load.',
 high: 'Full-resolution worlds and clouds, including while turning.',
 balanced: 'Fixed resolution, up to 1.25×. Lower rendering load.',
 performance: 'Fixed resolution, up to 0.75×. Lowest rendering load.'
};

const RANGES = {
 volume: {label:'Master volume', min:0, max:1, step:.01, format:v=>`${Math.round(v*100)}%`},
 feedback: {label:'Instrument feedback', min:0, max:1, step:.01, format:v=>`${Math.round(v*100)}%`},
 exposure: {label:'Exposure', min:.35, max:2.5, step:.05, format:v=>`${v.toFixed(2)}×`},
 sensitivity: {label:'Look sensitivity', min:.3, max:2, step:.1, format:v=>`${v.toFixed(1)}×`}
};

const rangeValue=(id,value)=>RANGES[id]?Number(value):value;

const FLIGHT_OPTIONS = {
 precision: {label:'Fine control', note:'Gentler turns and slower exploration movement.', on:'On', off:'Off'},
 showHud: {label:'Flight interface', note:'Menu / Escape still opens Pause.', on:'Visible', off:'Hidden'},
 guidance: {label:'Route guidance', note:'Main direction, suggested viewpoints and science captions.', on:'On', off:'Off'}
};

// All three pages share the same live settings and native inputs. Hidden pages
// stay out of the focus order; changing pages never resumes the physical flight.
export function openSettingsView({settings,flight,fromPause=false,initialTab='sound',ui,openPanel,onChange,onFlightChange,onTabChange}) {
 const range=id=>{
  const r=RANGES[id];
  return `<label class="setting setting-range" for="${id}"><span>${r.label}</span><output id="${id}-value" for="${id}" aria-hidden="true">${r.format(settings[id])}</output><input id="${id}" aria-label="${r.label}" type="range" min="${r.min}" max="${r.max}" step="${r.step}" value="${settings[id]}"></label>`;
 };
 const toggle=(id,r)=>`<div class="setting-toggle"><div><span id="${id}-label">${r.label}</span><p id="${id}-note">${r.note}</p></div><button id="flight-${id}" type="button" data-flight-option="${id}" aria-labelledby="${id}-label" aria-describedby="${id}-note" aria-pressed="${!!flight[id]}">${flight[id]?r.on:r.off}</button></div>`;
 openPanel('settings','Settings',`<nav class="reference-tabs settings-tabs" aria-label="Settings pages">${[['sound','Sound'],['picture','Picture'],['flight','Flight']].map(([id,label])=>`<button id="settings-tab-${id}" type="button" data-settings-tab="${id}">${label}</button>`).join('')}</nav><div class="settings-content">
  <fieldset data-settings-page="sound" aria-labelledby="settings-tab-sound"><div class="setting-toggle setting-playback"><span>Playback</span><button id="settings-sound" type="button" aria-label="Sound" aria-pressed="${!settings.muted}">${settings.muted?'Off':'On'}</button></div>${range('volume')}${range('feedback')}</fieldset>
  <fieldset data-settings-page="picture" aria-labelledby="settings-tab-picture">${range('exposure')}
   <label class="setting setting-quality" for="quality"><span>Quality</span><select id="quality" aria-describedby="quality-note"><option value="ultra">Ultra</option><option value="high">High</option><option value="balanced">Balanced</option><option value="performance">Performance</option></select></label>
   <p id="quality-note" class="small-note"></p>
   <label class="setting" for="passageMotion"><span>Passage camera</span><select id="passageMotion" aria-describedby="motion-note"><option value="system">Follow system</option><option value="steady">Steady</option><option value="cinematic">Cinematic</option></select></label>
   <p id="motion-note" class="small-note">Steady uses a fixed view at departure and a chart between encounters.</p>
  </fieldset>
  <fieldset data-settings-page="flight" aria-labelledby="settings-tab-flight">${range('sensitivity')}${Object.entries(FLIGHT_OPTIONS).map(([id,r])=>toggle(id,r)).join('')}<button class="settings-instruments text-button" data-action="instruments">Flight instruments <span aria-hidden="true">→</span></button></fieldset>
 </div><div class="panel-actions settings-actions"><button class="primary" data-action="${fromPause?'back':'resume'}">${fromPause?'Back to pause':'Done'}</button><button class="text-button" data-action="fullscreen" aria-pressed="${!!document.fullscreenElement}">${document.fullscreenElement?'Exit full screen':'Full screen'}</button></div>`);
 const update=id=>{
  const el=ui(id),range=RANGES[id];
  if(range){
   const text=range.format(settings[id]);
   ui(`${id}-value`).textContent=text;el.setAttribute('aria-valuetext',text);
   el.style.setProperty('--range-fill',`${100*(settings[id]-range.min)/(range.max-range.min)}%`);
  }else if(id==='quality')ui('quality-note').textContent=QUALITY_NOTES[settings.quality];
 };
 const selectTab=id=>{
  const selected=['sound','picture','flight'].includes(id)?id:'sound';
  for(const page of ui('panel-content').querySelectorAll('[data-settings-page]'))page.hidden=page.dataset.settingsPage!==selected;
  for(const button of ui('panel-content').querySelectorAll('[data-settings-tab]'))button.setAttribute('aria-pressed',String(button.dataset.settingsTab===selected));
  ui('panel-content').querySelector('.settings-content').scrollTop=0;onTabChange?.(selected);
 };
 for(const button of ui('panel-content').querySelectorAll('[data-settings-tab]'))button.onclick=()=>selectTab(button.dataset.settingsTab);
 selectTab(initialTab);
 ui('panel-content').querySelector('[data-settings-tab][aria-pressed=true]').focus();
 for(const id of ['quality','passageMotion'])ui(id).value=settings[id];
 ui('settings-sound').onclick=()=>{settings.muted=!settings.muted;onChange('muted');};
 for(const id of [...Object.keys(RANGES),'quality','passageMotion']){
  update(id);ui(id).addEventListener('input',event=>{settings[id]=rangeValue(id,event.target.value);update(id);onChange(id);});
 }
 for(const [id,r] of Object.entries(FLIGHT_OPTIONS))ui(`flight-${id}`).onclick=()=>{
  onFlightChange(id,!flight[id]);const button=ui(`flight-${id}`);button.textContent=flight[id]?r.on:r.off;button.setAttribute('aria-pressed',String(!!flight[id]));
 };
}

// Horizontal pages follow their displayed order for keyboard and D-pad input.
export function navigateSettingsTabs(direction,root){
 const tabs=[...root.querySelectorAll('[data-settings-tab]')],index=tabs.indexOf(document.activeElement);
 if(index<0)return false;
 const next=tabs[(index+(direction==='right'?1:-1)+tabs.length)%tabs.length];
 next.focus();next.click();return true;
}
