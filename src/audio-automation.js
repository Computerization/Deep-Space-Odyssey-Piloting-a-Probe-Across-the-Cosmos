// Snapshot before cancelling: fallback engines may recompute the intrinsic
// value when an in-progress ramp is removed from the automation timeline.
export function holdParameter(parameter,time) {
 const value=parameter.value;
 if(parameter.cancelAndHoldAtTime)parameter.cancelAndHoldAtTime(time);
 else {parameter.cancelScheduledValues(time);parameter.setValueAtTime(value,time);}
 return value;
}

export function fadeParameter(parameter,target,time,duration) {
 const curve=crossfadeCurve(holdParameter(parameter,time),target);
 if(parameter.cancelAndHoldAtTime)parameter.setValueCurveAtTime(curve,time,duration);
 else {
  // The same linearly interpolated control points, expressed as ramps.
  // Firefox can cancel these mid-fade; its already-started value curves
  // can otherwise reject new events even after cancelScheduledValues.
  for(let i=1;i<curve.length;i++)parameter.linearRampToValueAtTime(curve[i],time+duration*i/(curve.length-1));
 }
}

// Sine/cosine power interpolation has finite slopes at a silent endpoint.
// Multiple interrupted channels preserve their combined power throughout.
export function crossfadeCurve(start,target,steps=129) {
 return Float32Array.from({length:steps},(_,i)=>{
  const weight=Math.sin(Math.PI*.5*i/(steps-1))**2;
  return Math.sqrt(start*start*(1-weight)+target*target*weight);
 });
}
