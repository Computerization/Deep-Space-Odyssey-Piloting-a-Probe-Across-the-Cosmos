import {BODY_DATA} from '../mission.js';
import {formatFieldOfView} from '../flight.js';

export function openCameraView({game,world,camera,ui,openPanel,closePanel,save}){
 camera.stopLens();
 const subjects=camera.subjects();
 openPanel('camera','Camera',`<div class="camera-content"><nav class="reference-tabs" aria-label="Camera position"><button id="camera-probe" aria-pressed="${game.view==='probe'}">Probe</button><button id="camera-chase" aria-pressed="${game.view==='chase'}">Chase</button></nav>
 <label class="setting setting-range" for="camera-lens"><span>Lens</span><output id="camera-lens-value" for="camera-lens" aria-hidden="true"></output><input id="camera-lens" type="range" min="0" max="100" step="1" aria-label="Camera magnification"></label><p class="camera-lens-ends"><span>Wide</span><span>Detail</span></p>
 ${subjects.length?`<section class="camera-follow"><h3>Follow a world</h3><p>Keep it in view while you coast. Turn to release.</p>${subjects.map(id=>`<button data-follow="${id}" aria-pressed="${game.tracking===id}"><span>${BODY_DATA[id].name}</span><span>${game.tracking===id?'Release':'Follow →'}</span></button>`).join('')}</section>`:''}</div><footer class="camera-footer"><button class="primary" data-action="resume">Return to flight <span aria-hidden="true">→</span></button></footer>`);
 const wide=Math.tan(70*Math.PI/360),narrow=Math.tan(4*Math.PI/360),lens=ui('camera-lens');
 lens.value=100*Math.log(Math.tan(world.camera.fov*Math.PI/360)/wide)/Math.log(narrow/wide);
 function readout(){const text=`${formatFieldOfView(world.camera.fov)} field of view`;ui('camera-lens-value').textContent=text;lens.setAttribute('aria-valuetext',text);lens.style.setProperty('--range-fill',`${lens.value}%`);}
 lens.oninput=()=>{world.setFov(2*Math.atan(wide*(narrow/wide)**(Number(lens.value)/100))*180/Math.PI);readout();save();};readout();
 for(const view of ['probe','chase'])ui(`camera-${view}`).onclick=()=>{
  camera.setView(view);
  for(const v of ['probe','chase'])ui(`camera-${v}`).setAttribute('aria-pressed',String(v===view));
  for(const button of ui('panel-content').querySelectorAll('[data-follow]')){const following=game.tracking===button.dataset.follow;button.setAttribute('aria-pressed',String(following));button.lastElementChild.textContent=following?'Release':'Follow →';}
  save();
 };
 for(const button of ui('panel-content').querySelectorAll('[data-follow]'))button.onclick=()=>{
  camera.toggleFollowing(button.dataset.follow);
  closePanel();save();
 };
 ui(`camera-${game.view}`).focus();
}
