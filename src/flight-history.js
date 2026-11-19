// Recorded encounter states, not reverse integration. Coarsening keeps the
// beginning and the newest samples while bounding memory over a long visit.
// Optional follow stores the displayed chase base; attitude stays physical.
export function flightSnapshot(game, camera = {}) {
  return {
    seconds: game.localSeconds || 0,
    position: game.player.position.toArray(),
    velocity: game.player.velocity.toArray(),
    attitude: game.player.quaternion.toArray(),
    look: game.look.toArray(), fuel: game.fuel,
    view: game.view, freeLook: !!game.freeLook, tracking: game.tracking || null,
    ...(Number.isFinite(camera.fov) ? {fov: camera.fov} : {}),
    ...(game.view === 'chase' && camera.follow ? {follow: [...camera.follow]} : {})
  };
}
export class FlightHistory {
  constructor(limit = 480, readCamera = () => ({})) { this.limit = limit; this.readCamera = readCamera; this.reset(); }
  snapshot(game) { return flightSnapshot(game, this.readCamera()); }
  reset(game) { this.samples = []; this.clock = 0; if (game) this.samples.push(this.snapshot(game)); }
  record(game, dt, force = false) {
    this.clock += dt;
    const last = this.samples.at(-1), time = game.localSeconds || 0;
    if (last && time <= last.seconds + 1e-8) {
      // Time may be held while the player reframes. Opening review must start
      // at that actual present, without adding duplicate timestamps.
      if (force && time >= last.seconds) this.samples[this.samples.length - 1] = this.snapshot(game);
      return;
    }
    if (!force && this.clock < .75) return;
    this.clock = 0;
    if (this.samples.length >= this.limit) this.samples = this.samples.filter((_, i) => i % 2 === 0);
    this.samples.push(this.snapshot(game));
  }
  indexAt(seconds) {
    if (!this.samples.length || !Number.isFinite(seconds)) return 0;
    let lo = 0, hi = this.samples.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (this.samples[mid].seconds < seconds) lo = mid + 1; else hi = mid;
    }
    return lo > 0 && seconds - this.samples[lo - 1].seconds <= this.samples[lo].seconds - seconds ? lo - 1 : lo;
  }
  serialize(game, limit = 120) {
    const current=this.snapshot(game), states=this.samples.filter(s=>s.seconds<current.seconds);
    states.push(current);
    const count=Math.min(limit,states.length);
    const samples=Array.from({length:count},(_,i)=>states[count===1?0:Math.round(i*(states.length-1)/(count-1))]);
    return {version:1,chapter:game.chapter,study:game.study||null,samples};
  }
  hydrate(value,game) {
    this.reset(game);
    if(value?.version!==1||value.chapter!==game.chapter||(value.study||null)!==(game.study||null)||
       !Array.isArray(value.samples)||!value.samples.length||value.samples.length>120)return false;
    const vector=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
    let previous=-1;
    for(const s of value.samples){
      if(!s||!Number.isFinite(s.seconds)||s.seconds<0||s.seconds<=previous||s.seconds>(game.localSeconds||0)||
         !vector(s.position,3)||!vector(s.velocity,3)||!vector(s.attitude,4)||!vector(s.look,4)||
         (s.tracking!=null&&!['earth','moon','jupiter','io','saturn','titan'].includes(s.tracking))||
         !Number.isFinite(s.fuel)||s.fuel<0||s.fuel>104||!['probe','chase'].includes(s.view)||
         (s.fov!==undefined&&(!Number.isFinite(s.fov)||s.fov<4||s.fov>70))||
         (s.follow!==undefined&&(!vector(s.follow,4)||Math.abs(Math.hypot(...s.follow)-1)>.001))||
         Math.abs(Math.hypot(...s.attitude)-1)>.001||Math.abs(Math.hypot(...s.look)-1)>.001)return false;
      previous=s.seconds;
    }
    const last=value.samples.at(-1),now=this.snapshot(game);
    if(last.seconds!==now.seconds||['position','velocity'].some(key=>last[key].some((n,i)=>Math.abs(n-now[key][i])>1e-6)))return false;
    this.samples=value.samples.map(s=>({...s,position:[...s.position],velocity:[...s.velocity],attitude:[...s.attitude],look:[...s.look],...(s.follow?{follow:[...s.follow]}:{})}));
    return true;
  }
  restore(game, index) {
    const state = this.samples[index];
    if (!state) return false;
    game.player.position.fromArray(state.position);
    game.player.velocity.fromArray(state.velocity);
    game.player.quaternion.fromArray(state.attitude);
    game.look.fromArray(state.look);
    game.fuel = state.fuel; game.localSeconds = state.seconds;
    game.view = state.view; game.freeLook = state.freeLook; game.tracking = state.tracking || null;
    game.timePaused = true; game.boundaryPaused = false; game.proximityLimited = false;
    game.actualRate = 0; game.thrust = 0; game.thrustAcceleration = 0; game.thrustFeedback = null;
    game.angular.set(0, 0, 0); game.observing = 0; game.observation = null;
    game.observationLatched = false; game.exposureGap = 0; game.exposurePaused = false;
    game.flightReadout = null; game.explorationBoundary = null;
    this.samples = this.samples.slice(0, index + 1); this.clock = 0;
    return true;
  }
}
export function studyTime(seconds) {
  if (seconds < 60) return `${Math.floor(seconds)} s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ${Math.floor(seconds % 60)} s`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ${Math.floor(seconds % 3600 / 60)} min`;
  return `${Math.floor(seconds / 86400)} d ${Math.floor(seconds % 86400 / 3600)} h`;
}
