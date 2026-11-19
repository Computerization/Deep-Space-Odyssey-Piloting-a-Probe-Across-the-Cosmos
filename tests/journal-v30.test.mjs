import test from 'node:test';import assert from 'node:assert/strict';
import {CHAPTERS} from '../src/mission.js';import {SCIENCE_NOTES} from '../src/experience-guide.js';import {journalNotes,journalContent} from '../src/ui/journal.js';
test('legacy discoveries retain every mission text, detail, archive and recording in the new field notes',()=>{
 const ids=CHAPTERS.flatMap(c=>c.tasks.map((_,i)=>`${c.id}-${i}`)),notes=journalNotes({seen:['moon','saturn-ringshine']},ids);
 assert.equal(notes.length,ids.length+2);
 for(const n of SCIENCE_NOTES){
  const expected=/^\d+:\d+$/.test(n.id)||['moon','saturn-ringshine'].includes(n.id);
  assert.equal(notes.some(x=>x.id===n.id&&x.text===n.text&&x.detail===n.detail),expected);
 }
 const html=journalContent({frames:[],notes,tab:'notes'});assert.match(html,/pale-blue-dot\.jpg/);
 for(const task of CHAPTERS.flatMap(c=>c.tasks))if(task.recording)assert.ok(html.includes(`data-value="${task.recording}"`));
});
test('photo-specific science survives the new journal and repeated photo text appears once',()=>{
 const text='A preserved photographic observation.',frames=[{id:'one',title:'Io',text,chapter:'Jupiter'},{id:'two',title:'Io again',text,chapter:'Jupiter'}];
 const notes=journalNotes({seen:['moon']},[],frames);assert.equal(notes.length,2);assert.equal(notes[1].text,text);assert.equal(notes[1].label,'Jupiter');
 assert.equal(frames.length,2);
});
test('a freely discovered recording remains playable after the suggestion moves on',()=>{
 const notes=journalNotes({seen:['trail-jupiter-night']},[]);
 const html=journalContent({frames:[],notes,tab:'notes'});
 assert.match(html,/data-action="recording" data-value="jupiter"/);
});
