import {opportunityCandidate,sightlines} from './opportunities.js';
import {CHAPTERS, BODY_DATA} from './mission.js';
import {encounterContext, STUDIES} from './encounter-context.js';
import {PERSPECTIVES, perspective, observationAvailable, regionStatus} from './exploration.js';
import {formatDistance} from './flight.js';


export class ExplorationController {
  constructor(game, world) { this.game = game; this.world = world; this.candidate = null; this.chartScale='pass'; }

  sample() {
    const g=this.game, w=this.world, p=g.player, c=CHAPTERS[g.chapter];
    const sight=sightlines(g,w),threshold=Math.min(.15,w.camera.fov*Math.PI/180*.3);
    const measure=(id,aim)=>{
      const m=sight.frame(id);
      return {range:m.range,phase:m.phase,visible:m.visible,aligned:(aim&&aim!==w.bodyPositions[id]?sight.angleTo(aim):m.angle)<threshold};
    };
    const local=encounterContext(g).region.worlds.map(id=>({id,...measure(id),angle:sight.frame(id).diameter}));
    this.localSubjects=local;
    this.subject=local.filter(m=>m.visible&&m.aligned&&m.angle>.0035).sort((a,b)=>b.angle-a.angle)[0]||null;
    const candidates=[],event=opportunityCandidate(g,w,sight);
    if(event)candidates.push(event);
    // The selected suggestion gets priority, but it never blocks another view.
    const indices=[g.task,...c.tasks.map((_,i)=>i).filter(i=>i!==g.task)];
    for (const i of indices) {
      const t=c.tasks[i]; if(!t || g.discovered.includes(`${c.id}-${i}`)) continue;
      const aim=t.aim?w.fromFrame(w.getFrame(t.target),t.aim,BODY_DATA[t.target].radius):w.bodyPositions[t.target];
      const m=measure(t.target,aim);
      if(m.aligned && (m.visible || t.mode==='signal' || t.archive) && observationAvailable(g.chapter,i,m.range,m.phase)) {
        candidates.push({kind:'mission',body:t.target,aim,index:i,id:`${c.id}-${i}`,title:t.name,duration:t.mode==='signal'?4:2.8,...m});
      }
    }
    for (const m of local) {
      const id=m.id,view=perspective(m.phase), key=`explore-${id}-${view}`;
      if(!m.aligned || !m.visible || g.explored.includes(key) ||
        m.angle<.0035) continue;
      candidates.push({kind:'field',id:key,body:id,view,title:`${BODY_DATA[id].name} · ${PERSPECTIVES[view]}`,duration:2.8,...m});
    }
    // A valid exposure keeps its subject if a higher-priority view enters frame.
    this.candidate=(g.observing>0&&candidates.find(c=>c.id===g.observation?.id))||candidates[0]||null;
    return this.candidate;
  }

  region() {
    const region=encounterContext(this.game).region;
    return regionStatus(this.game.chapter,this.game.player.position.toArray(),region?this.world.bodyPositions[region.body].toArray():null,region);
  }

  // Bearings locate real bodies. They do not promise a reachable waypoint.
  destination() {
    const g = this.game, w = this.world, c = CHAPTERS[g.chapter];
    if (!g.guidance) return null;
    if(g.routeTarget&&!g.destination){
      const route=g.routeTarget;
      // Once the suggested sightline reaches a world, it is a body bearing.
      // Keep its label off the surface just as for a manually selected world.
      return route.marker?route:{...route,visible:this.localSubjects?.some(s=>s.id===route.id&&s.visible)};
    }
    const body=encounterContext(g).body;
    const id = g.destination || (body === 'voyager' ? c.tasks[g.task]?.target || 'earth' : body);
    return {id, point: w.bodyPositions[id], radius: BODY_DATA[id].radius, visible:this.localSubjects?.find(s=>s.id===id)?.visible??false,
      title: `${BODY_DATA[id].name} · bearing`, instrument: true,
      automatic: !g.destination,
      hint: 'A subject bearing. Your momentum determines the flight path.'};
  }

  chart() {
    const g=this.game, w=this.world, region=encounterContext(g).region;
    if(!region?.worlds.length)return '';
    const frame=w.getFrame(region.body), center=frame.center, local=v=>{
      const d=v.clone().sub(center);return [d.dot(frame.x),d.dot(frame.z)];
    };
    const positions=region.worlds.map(id=>({id,p:local(w.bodyPositions[id])}));
    const player=local(g.player.position), extent=this.chartScale==='system'?Math.max(BODY_DATA[region.body].radius*10,
      ...positions.map(({p})=>Math.hypot(...p)*1.3),Math.hypot(...player)*1.2):Math.max(BODY_DATA[region.body].radius*5,Math.hypot(...player)*1.35);
    const scale=230/extent, point=p=>[320+p[0]*scale,260-p[1]*scale];
    const here=point(player), velocity=g.player.velocity.clone().multiplyScalar(Math.min(20*g.actualRate,extent/Math.max(1,g.player.velocity.length())*.45));
    const drift=point(local(g.player.position.clone().add(velocity)));
    const unit=10**Math.floor(Math.log10(extent/3)), scaleWidth=unit*scale;
    return `<svg class="local-chart" viewBox="0 0 640 535" role="group" aria-label="${region.title}, spacecraft position and current drift. Projected positions use a linear scale; body symbols are enlarged.">
      <defs><clipPath id="forecast-clip"><rect x="40" y="25" width="560" height="460"/></clipPath><marker id="drift-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1L8 5L0 9" fill="none" stroke="#d3dacd"/></marker></defs>
      <path d="M320 35V485M65 260H575" stroke="#ffffff12"/>
      ${positions.filter(({p})=>Math.hypot(...p)<extent*1.1).map(({id,p})=>{const [x,y]=point(p),radius=Math.max(5,BODY_DATA[id].radius*scale),labelX=x+radius+12,labelY=y-12;return `<g data-action="destination" data-value="${id}" tabindex="0" role="button" aria-label="Locate ${BODY_DATA[id].name}"><circle cx="${x}" cy="${y}" r="24" fill="transparent"/><circle cx="${x}" cy="${y}" r="${radius}" fill="${g.destination===id?'#e9e7d5':'#8d9b89'}"/><text x="${labelX}" y="${labelY}">${BODY_DATA[id].name}</text></g>`;}).join('')}
      <path clip-path="url(#forecast-clip)" d="M${here}L${drift}" stroke="#d3dacd55" stroke-width="1" stroke-dasharray="3 5" marker-end="url(#drift-arrow)"/>
      <circle cx="${here[0]}" cy="${here[1]}" r="8" fill="none" stroke="#fff"/><text x="${here[0]+14}" y="${here[1]+23}">Voyager 1</text>
      <path d="M35 500h${scaleWidth}" stroke="#8f9c89"/><text class="chart-scale-label" x="35" y="524">${formatDistance(unit)} · projected distance</text>
    </svg>`;
  }

  studiesMenu() {
    const g=this.game, studies=STUDIES.filter(s=>s.chapter===g.chapter);
    if(!studies.length)return '';
    return `<details class="encounter-studies"><summary>Nearby viewpoints</summary><p class="atlas-instruction">Choose a viewpoint in this encounter.</p>${studies.map(s=>`<button class="study-entry" data-action="study" data-value="${s.id}" aria-label="${g.study===s.id?'Restart':'Begin'} ${s.title}"${g.study===s.id?' aria-current="location"':''}><span>${g.study===s.id?'Restart · ':''}${s.title}</span><span aria-hidden="true">→</span></button>`).join('')}</details>`;
  }

  menu() {
    const g=this.game, region=encounterContext(g).region;if(!region?.worlds.length)return '';
    const selected=this.destination()?.id;
    return `<section class="exploration-map"><div class="encounter-inspector"><section class="encounter-bearings"><h3>Where to look</h3><p class="atlas-instruction">Choose a world to mark its bearing.</p>
      ${region.worlds.map(id=>`<button class="destination-row" data-action="destination" data-value="${id}" aria-pressed="${selected===id}"><strong>${BODY_DATA[id].name}</strong><span>${formatDistance(g.player.position.distanceTo(this.world.bodyPositions[id]))}</span></button>`).join('')}
      <button class="destination-row" data-action="free-flight" aria-pressed="${!g.guidance}"><strong>Hide bearings</strong></button>
    </section>${this.studiesMenu()}</div><div class="encounter-plot"><nav class="chart-toolbar" aria-label="Encounter chart scale"><button data-action="local-scale" data-value="pass" aria-pressed="${this.chartScale==='pass'}">Current pass</button><button data-action="local-scale" data-value="system" aria-pressed="${this.chartScale==='system'}">Whole encounter</button></nav><div class="atlas-plot">${this.chart()}</div><p class="small-note">Your position and direction of movement.<br>One linear scale. Body symbols enlarged.</p></div></section>`;
  }
}
