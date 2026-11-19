import * as THREE from 'three';
import {encounterContext} from './encounter-context.js';

// Equal focal-length ratios give equal perceived zoom steps at every lens.
export function steppedLens(fov, direction) {
 const angle = 2 * Math.atan(Math.tan(fov * Math.PI / 360) * 1.2 ** -direction);
 return Math.max(4, Math.min(70, angle * 180 / Math.PI));
}

// Optional simulated camera motion. Physical flight remains owned by the
// flight controller: this class changes no attitude, momentum, thrust or time.
export class ObservationCamera {
 constructor(game, world) {
  this.game = game;
  this.world = world;
  this.lens = null;
  this.acquired = false;
  this.forward = new THREE.Vector3();
  this.direction = new THREE.Vector3();
  this.orientation = new THREE.Quaternion();
  this.rotation = new THREE.Quaternion();
  this.base = new THREE.Quaternion();
  this.previous = new THREE.Quaternion();
  this.lastLook = new THREE.Quaternion();
  this.lastBase = new THREE.Quaternion();
  this.lastPosition = new THREE.Vector3();
  this.lastTarget = new THREE.Vector3();
 }
 subjects() {
  if(this.game.stage!=='encounter')return [];
  const worlds=encounterContext(this.game).region?.worlds||[];return worlds.length?worlds:['earth','sun'];
 }
 follow(id) {
  if (!this.subjects().includes(id)) return false;
  this.game.tracking = id;
  this.game.freeLook = true;
  this.game.angular.set(0, 0, 0);
  this.acquired = false;
  return true;
 }
 toggleFollowing(id) {
  if (id === this.game.tracking) this.release();
  else this.follow(id);
 }
 release() {
  this.game.tracking = null;
  this.acquired = false;
 }
 setView(view) {
  const game = this.game, world = this.world;
  if (view === game.view) return;
  // Rebase an independent view onto the new camera's initial spacecraft
  // frame. Keep the same sightline, following target and control mode.
  if (game.freeLook) {
   this.orientation.copy(game.view === 'chase' && world.followReady ? world.follow : game.player.quaternion).multiply(game.look);
   game.look.copy(game.player.quaternion).invert().multiply(this.orientation).normalize();
  }
  game.view = view;
  world.followReady = false;
 }
 toggleFreeLook() {
  this.release();
  this.game.angular.set(0, 0, 0);
  this.game.freeLook = !this.game.freeLook;
  if (!this.game.freeLook) this.game.look.identity();
 }
 zoom(direction) {
  const current = this.world.camera.fov;
  const target = steppedLens(this.lens?.target ?? current, direction);
  this.lens = {value: current, last: current, target};
  return target;
 }
 stopLens() { this.lens = null; }
 updateLens(dt) {
  const lens = this.lens;
  if (!lens) return;
  // Review, chapter starts and a direct lens setting own their immediate view.
  if (this.world.camera.fov !== lens.last) { this.stopLens(); return; }
  const a = Math.tan(lens.value * Math.PI / 360);
  const b = Math.tan(lens.target * Math.PI / 360);
  const scale = Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * (1 - Math.exp(-dt * 15)));
  lens.value = 2 * Math.atan(scale) * 180 / Math.PI;
  // Stop below a hundredth of a pixel at a 1000-pixel image radius. Keep
  // optical precision through the animation; round only the displayed text.
  if (Math.abs(scale / b - 1) < .00001) {
   lens.value = lens.target;
   this.lens = null;
  }
  if (lens.value !== this.world.camera.fov) this.world.setFov(lens.value);
  lens.last = lens.value;
 }
 beforeInput(sample) {
  if (this.game.tracking && (sample.pitch || sample.yaw || sample.roll)) this.release();
 }
 updateTracking(dt) {
  const game = this.game, world = this.world, id = game.tracking;
  if (!id) return;
  if (!this.subjects().includes(id) || !game.freeLook) { this.release(); return; }
  // A restored view can be partway through acquisition. Ease from that exact
  // recorded frame rather than snapping because an earlier follow had settled.
  if (!game.look.equals(this.lastLook)) this.acquired = false;
  this.base.copy(game.view === 'chase' && world.followReady ? world.follow : game.player.quaternion);
  if (this.acquired && game.player.position.equals(this.lastPosition) && this.base.equals(this.lastBase) && world.bodyPositions[id].equals(this.lastTarget)) return;
  this.lastBase.copy(this.base);
  this.lastPosition.copy(game.player.position);
  this.lastTarget.copy(world.bodyPositions[id]);
  this.previous.copy(game.look);
  this.direction.copy(world.bodyPositions[id]).sub(game.player.position).normalize();
  this.orientation.copy(this.base).multiply(game.look);
  this.forward.set(0, 0, -1).applyQuaternion(this.orientation);
  this.rotation.setFromUnitVectors(this.forward, this.direction);
  this.orientation.premultiply(this.rotation);
  game.look.copy(this.base).invert().multiply(this.orientation).normalize();
  if (!this.acquired) {
   const angle = this.previous.angleTo(game.look);
   if (angle < .003) this.acquired = true;
   else game.look.copy(this.previous.slerp(game.look, Math.min(1 - Math.exp(-dt * 7), dt * 1.8 / angle)));
  }
  this.lastLook.copy(game.look);
 }
}
