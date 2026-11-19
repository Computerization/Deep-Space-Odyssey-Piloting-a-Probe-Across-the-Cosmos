// Individual observations tolerate a brief reframing, but only eligible,
// steady frames count toward an exposure. Moving surveys have their own rules.
export function advanceExposure(state, candidate, held, steady, dt) {
  if (!held) state.observationLatched=false;
  const previous=state.observation;
  const continuing=state.observing>0 && previous;
  const same=candidate?.id===previous?.id;
  const valid=!!candidate && (!continuing || same);
  state.exposurePaused=false;

  if (continuing && held && !state.observationLatched && (!valid || !steady)) {
    state.exposureGap=(state.exposureGap||0)+dt;
    if (state.exposureGap<=.5) {
      state.canObserve=valid;
      state.exposurePaused=true;
      return null;
    }
  } else state.exposureGap=0;

  if (!same) state.observing=0;
  state.observation=candidate;
  state.canObserve=!!candidate;
  if (held && !state.observationLatched && candidate && steady) {
    state.observing+=dt;
    state.exposureGap=0;
    if (state.observing>=candidate.duration) {
      state.observationLatched=true;
      return candidate;
    }
  } else state.observing=Math.max(0,state.observing-dt*2);
  return null;
}
