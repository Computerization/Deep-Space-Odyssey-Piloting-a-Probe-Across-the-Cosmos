import {futurePlate} from './deep-space.js';
const sides=[
 ['Side A · The needle','On Earth, a needle lifts. In the dark, its twin keeps travelling.','Somewhere in those grooves a foot is falling, and has yet to touch the ground.'],
 ['Side B · The listener','Suppose a hand, unlike your hand, should turn this circle over.','First a scrape. Then rain. For a moment, on a world with other weather, it is raining here.']
];
const echoes=new Map([
 ['trail-earth-horizon','You saw how little blue it takes to hold a sky.'],['trail-moon-earthrise','You moved a little, and Earth rose.'],
 ['trail-jupiter-clouds','You watched a storm too wide to fit inside your world.'],['trail-saturn-rings','You saw daylight leave a shadow on a ring.'],
 ['3:0','You found home in a scratch of sunlight.'],['4:0','You listened to a place the cameras could not see.'],['5:0','You sent a word across a day. Another day brought it home.']
]);
export function voyageEcho(seen){return echoes.get(seen.findLast(id=>echoes.has(id)))||'Even when you took your hands away, the little ship went on.';}
export function openCoda(openPanel,ui,seen,pair,pilotEcho){
 openPanel('ending','Still travelling',`<p class="eyebrow">BEYOND ONE LIGHT-DAY</p><div class="coda-spread"><section><p class="coda-side" id="coda-side"></p><div class="coda-lines" id="coda-lines" aria-live="polite"><p></p><p></p></div><p class="coda-echo" id="coda-echo"></p><button id="turn-record" class="text-button"></button></section><aside>${pair?'<p class="coda-side">Carried from your flight</p><div id="coda-print"></div><details><summary>The Golden Record</summary>'+futurePlate+'</details>':futurePlate}<div class="future-horizon"><strong>About 40,000 years from now</strong><p>Voyager 1’s projected path takes it within about 1.7 light-years of another star.</p></div><p class="small-note"><a href="https://science.nasa.gov/mission/voyager/voyager-1/voyager-1-what-is-a-light-day/" target="_blank" rel="noopener">NASA · Voyager’s distant future</a></p></aside></div><div class="panel-actions"><button class="primary" data-action="resume">Stay with Voyager →</button><button class="text-button" data-action="journal">Your discoveries and photographs</button><button class="text-button" data-action="home">Return to title</button></div>`);
 let side=0;const button=ui('turn-record'),lines=ui('coda-lines').children;
 function read(){const [heading,first,last]=sides[side];ui('coda-side').textContent=heading;lines[0].textContent=first;lines[1].textContent=last;ui('coda-echo').textContent=side?'The rain ends. The groove goes round once more.':pilotEcho||voyageEcho(seen);button.textContent=side?'Read Side A again':'Turn the record over';}
 button.onclick=()=>{side=1-side;read();};read();button.focus({preventScroll:true});
}
