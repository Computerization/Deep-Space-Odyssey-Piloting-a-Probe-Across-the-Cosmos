import {CHAPTERS} from '../mission.js';
import {SCIENCE_NOTES} from '../experience-guide.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function journalNotes(experience,discovered,frames=[]){
 const ids=new Set(experience.seen);
 CHAPTERS.forEach((c,index)=>c.tasks.forEach((task,i)=>{if(discovered.includes(`${c.id}-${i}`))ids.add(`${index}:${i}`);}));
 const notes=SCIENCE_NOTES.filter(n=>ids.has(n.id)),texts=new Set(notes.map(n=>n.text));
 for(const f of frames)if(f.text&&!texts.has(f.text)){texts.add(f.text);notes.push({id:`photo:${f.id}`,title:f.title,text:f.text,detail:'',label:f.chapter||f.date||'Photographed view'});}
 return notes;
}
export function journalContent({frames,notes,tab,removed}){
 const tabs=`<nav class="reference-tabs" aria-label="Journal views">${[['photos','Photographs',frames.length],['notes','Field notes',notes.length]].map(([id,label,count])=>`<button data-action="journal-tab" data-value="${id}" aria-pressed="${tab===id}">${label}<span>${count}</span></button>`).join('')}</nav>`;
 let body;
 if(tab==='photos')body=frames.length?`<div class="gallery journal-photos">${frames.map(f=>`<figure><button class="photo-open" data-action="view-photo" data-value="${escape(f.id)}" aria-label="View ${escape(f.title)}"><img loading="lazy" decoding="async" src="${escape(f.photo)}" alt="${escape(f.title)}"><span class="journal-photo-caption"><strong>${escape(f.title)}</strong><span>${escape(f.date||f.chapter||'Voyage photograph')}</span></span></button></figure>`).join('')}</div>`:'<div class="journal-empty"><p class="lead">Your photographs</p><p>Keep any view with Photograph, P, or the Xbox left-stick click.</p></div>';
 else body=notes.length?`<div class="field-notes journal-notes">${notes.map(n=>{const task=/^\d+:\d+$/.test(n.id)?CHAPTERS[n.chapter].tasks[Number(n.id.split(':')[1])]:null;return `<article><p class="eyebrow">${escape(n.label||CHAPTERS[n.chapter].eyebrow)}</p><h3>${escape(n.title)}</h3><p>${escape(n.text)}</p>${n.detail||task?.archive?`<details><summary>Read more</summary><p>${escape(n.detail)}</p>${task?.archive?'<img class="journal-archive" src="assets/archive/pale-blue-dot-display.jpg" alt="Voyager’s original Pale Blue Dot photograph"><p class="small-note">NASA/JPL-Caltech, reprocessed by Kevin M. Gill. <a href="assets/archive/pale-blue-dot.jpg" download>Save full-resolution plate</a></p>':''}</details>`:''}${(n.recording||task?.recording)?`<button class="recording-link" data-action="recording" data-value="${escape(n.recording||task.recording)}">Play instrument recording</button>`:''}</article>`}).join('')}</div>`:'<div class="journal-empty"><p class="lead">Notes from the voyage</p><p>Science you encounter while exploring is kept here.</p></div>';
 return `${tabs}<div id="journal-body" class="journal-body">${body}</div><footer class="journal-footer"><div class="journal-notice" role="status">${removed?`<span>Photograph removed</span><button class="text-button" data-action="undo-photo">Undo</button>`:''}</div><button class="primary" data-action="resume">Return to flight <span aria-hidden="true">→</span></button></footer>`;
}
// Photo navigation follows the actual responsive grid. At its edges, Up/Down
// return to the surrounding navigation; Left/Right never wrap to another row.
export function navigatePhotographs(direction,scope){
 const active=document.activeElement;if(!active?.matches('.journal-photos .photo-open'))return false;
 const items=[...scope.querySelectorAll('.journal-photos .photo-open')],r=active.closest('figure').getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 const horizontal=direction==='left'||direction==='right',sign=direction==='left'||direction==='up'?-1:1;
 const candidates=items.filter(e=>e!==active).map(e=>{const b=e.closest('figure').getBoundingClientRect(),dx=b.left+b.width/2-cx,dy=b.top+b.height/2-cy;return {e,dx,dy};}).filter(p=>horizontal?Math.abs(p.dy)<r.height/2&&p.dx*sign>1:p.dy*sign>1);
 candidates.sort((a,b)=>horizontal?Math.abs(a.dx)-Math.abs(b.dx):Math.abs(a.dy)-Math.abs(b.dy)||Math.abs(a.dx)-Math.abs(b.dx));
 if(candidates.length){candidates[0].e.focus();return true;}
 if(horizontal)return true;
 const target=direction==='up'?scope.querySelector('[data-action=journal-tab][aria-pressed=true]'):scope.querySelector('.journal-footer [data-action=resume]');target?.focus();return true;
}
