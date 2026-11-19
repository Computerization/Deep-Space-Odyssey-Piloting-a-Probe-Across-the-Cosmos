import * as THREE from 'three';
import {studyTime} from '../flight-history.js';
import {formatFieldOfView} from '../flight.js';
export function createFlightReview({game, world, history, ui, openPanel, closePanel, save}) {
  let selection = 0, present = {fov: 58};
  function cameraState() { return game.reviewPreview ? present : world.cameraState(game.view); }
  function preview(index) {
    selection = Math.max(0, Math.min(history.samples.length - 1, index));
    const s = history.samples[selection], fov = s.fov ?? present.fov;
    game.reviewPreview = {
      seconds: s.seconds,
      position: new THREE.Vector3(...s.position), velocity: new THREE.Vector3(...s.velocity),
      quaternion: new THREE.Quaternion(...s.attitude), look: new THREE.Quaternion(...s.look), view: s.view
    };
    world.restoreCameraState({fov, follow: s.follow});
    const range = ui('review-range'), first = history.samples[0].seconds, last = history.samples.at(-1).seconds;
    range.value = String(s.seconds);
    range.setAttribute('aria-valuetext', `${studyTime(s.seconds)} since arrival${selection === history.samples.length - 1 ? ', present' : ''}`);
    range.style.setProperty('--range-fill', `${last > first ? (s.seconds - first) / (last - first) * 100 : 100}%`);
    ui('review-time').textContent = studyTime(s.seconds);
    ui('review-speed').textContent = `${s.view==='chase'?'Chase view':'Probe view'} · ${formatFieldOfView(fov)} field of view`;
    ui('review-apply').disabled = selection === history.samples.length - 1;
  }
  function nudge(direction) { preview(selection + direction); }
  function open() {
    clear();
    history.record(game, 0, true);
    if (!history.samples.length) history.reset(game);
    present = world.cameraState(game.view);
    const last = history.samples.length - 1, firstTime = history.samples[0].seconds, endTime = history.samples[last].seconds;
    openPanel('review', 'Flight review', `<p class="review-intro">Revisit a moment from this encounter.</p><div class="review-track"><label for="review-range">Time since arrival <strong id="review-time"></strong></label><input id="review-range" aria-label="Review recorded flight time" type="range" min="${firstTime}" max="${last ? endTime : firstTime + 1}" step="any" value="${endTime}" ${last?'':'disabled'}><div class="review-ends"><span>${studyTime(firstTime)}</span><span>Present · ${studyTime(endTime)}</span></div></div><div class="review-footer"><span id="review-speed"></span><button id="review-apply" class="primary" disabled>Resume from here <span>→</span></button><button class="text-button" data-action="resume">Return to present</button></div><p class="small-note">Resuming here restores your position and momentum. Your journal keeps its notes and photographs.</p>`);
    const range = ui('review-range');
    range.addEventListener('input', e => preview(history.indexAt(Number(e.target.value))));
    range.addEventListener('keydown', e => {
      const direction = {ArrowLeft:-1, ArrowDown:-1, ArrowRight:1, ArrowUp:1, PageDown:-10, PageUp:10}[e.key];
      if (direction !== undefined || e.key === 'Home' || e.key === 'End') {
        e.preventDefault(); e.stopPropagation();
        preview(e.key === 'Home' ? 0 : e.key === 'End' ? history.samples.length - 1 : selection + direction);
      }
    });
    ui('review-apply').onclick = () => {
      const state = history.samples[selection], camera = {fov: state?.fov ?? present.fov, follow: state?.follow};
      if (!history.restore(game, selection)) return;
      closePanel(); world.restoreCameraState(camera); save();
    };
    preview(last);
    if (last) range.focus(); else ui('panel-content').querySelector('[data-action=resume]').focus();
  }
  function clear() {
    if (!game.reviewPreview) return;
    game.reviewPreview = null; world.restoreCameraState(present);
  }
  return {open, clear, nudge, cameraState};
}
