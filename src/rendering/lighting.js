import {clamp} from '../flight.js';

// Fraction of an apparent solar disc covered by a foreground circular disc.
// All angles use radians. The planar overlap is accurate for small solar discs.
export function discVisibility(sunRadius, occultorRadius, separation) {
  const r = sunRadius, R = occultorRadius, d = Math.max(0, separation);
  if (d >= r + R || r <= 0 || R <= 0) return 1;
  if (d <= Math.abs(R - r)) return R >= r ? 0 : 1 - R * R / (r * r);
  const a = Math.acos(clamp((d*d + r*r - R*R) / (2*d*r), -1, 1));
  const b = Math.acos(clamp((d*d + R*R - r*r) / (2*d*R), -1, 1));
  const area = r*r*a + R*R*b - .5*Math.sqrt(Math.max(0, (-d+r+R)*(d+r-R)*(d-r+R)*(d+r+R)));
  return clamp(1 - area / (Math.PI*r*r), 0, 1);
}

export function solarVisibility(position, bodies, data) {
  const range = position.length(), direction = position.clone().negate().normalize();
  const solarAngle = Math.asin(Math.min(1, data.sun.radius / range));
  let visibility = 1;
  for (const [id, center] of Object.entries(bodies)) {
    if (id === 'sun' || !data[id]) continue;
    const delta = center.clone().sub(position), distance = delta.length();
    if (distance >= range || distance <= data[id].radius) continue;
    visibility = Math.min(visibility, discVisibility(solarAngle,
      Math.asin(Math.min(1, data[id].radius / distance)), direction.angleTo(delta)));
  }
  return visibility;
}
