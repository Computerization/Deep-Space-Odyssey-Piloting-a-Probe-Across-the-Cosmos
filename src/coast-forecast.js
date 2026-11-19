import {integratePhysicalFlight, GM} from './propulsion.js';

// An on-demand, unpowered forecast using the same fixed-centre gravity as flight.
// It describes a possible coast, not an autopilot or a promised observation path.
export function coastForecast({position, velocity, centres, anchor, radius, boundary, seconds = 7200, maxSteps = 240}) {
  let p = [...position], v = [...velocity], elapsed = 0;
  const points = [{position: p, seconds: 0}];
  for (let i = 0; i < maxSteps && elapsed < seconds; i++) {
    let step = Math.min(300, seconds - elapsed);
    for (const [id, mu] of Object.entries(GM)) {
      if (!centres[id]) continue;
      const range = Math.hypot(...p.map((x, k) => x - centres[id][k]));
      step = Math.min(step, Math.sqrt(range ** 3 / mu) * .025, range / (Math.max(.001, Math.hypot(...v)) * 50));
    }
    if (step < .001) break;
    const next = integratePhysicalFlight(p, v, [0, 0, 0], 0, step, centres, anchor);
    if (Object.entries(radius).some(([id, r]) => centres[id] && Math.hypot(...next.position.map((x, k) => x - centres[id][k])) < r * 1.035)) break;
    if (boundary && Math.hypot(...next.position.map((x, k) => x - boundary.center[k])) > boundary.radius) break;
    p = next.position; v = next.velocity; elapsed += step;
    points.push({position: p, seconds: elapsed});
  }
  return points;
}
