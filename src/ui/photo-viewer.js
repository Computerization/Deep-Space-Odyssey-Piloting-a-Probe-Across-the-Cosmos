// The journal owns the collection; this viewer only changes its presentation.
// Flight remains paused, including when moving between images or returning.
export function createPhotoViewer({ui,openPanel,returnToJournal,removePhoto}) {
  let frames=[],index=0;
  function setFrames(next) { frames=next; }
  function show(id) {
    const found=frames.findIndex(frame=>frame.id===id);
    if(found<0)return;
    index=found;render();
  }
  function render() {
    const frame=frames[index];if(!frame)return;
    openPanel('photograph',frame.title,`<div class="photograph-view"><img id="full-photograph" alt=""><div class="photograph-toolbar"><button data-action="previous-photo" aria-label="Previous photograph" ${index===0?'disabled':''}>←</button><span id="photograph-count">${index+1} / ${frames.length}</span><button data-action="next-photo" aria-label="Next photograph" ${index===frames.length-1?'disabled':''}>→</button><a id="photograph-download">Save photograph</a><button data-action="back-to-journal">Back to journal</button>${['field','exploration'].includes(frame.kind)?'<button id="photograph-remove">Remove</button>':''}</div><p id="photograph-description"></p></div>`);
    const image=ui('full-photograph');image.src=frame.photo;image.alt=frame.title;
    const link=ui('photograph-download');link.href=frame.photo;link.download=`Cosmos-${frame.id}.jpg`;
    const remove=ui('photograph-remove');if(remove){remove.dataset.action='delete-photo';remove.dataset.value=frame.id;remove.onclick=()=>removePhoto(frame.id);}
    ui('photograph-description').textContent=[frame.date||frame.chapter,frame.range,frame.fieldOfView&&`${frame.fieldOfView} lens`].filter(Boolean).join(' · ');
  }
  function move(delta) {
    const next=Math.max(0,Math.min(frames.length-1,index+delta));
    if(next!==index){index=next;render();const action=delta>0?'next-photo':'previous-photo';const button=ui('panel-content').querySelector(`[data-action=${action}]:not(:disabled)`);button?.focus({preventScroll:true});}
  }
  return {setFrames,show,move,frame:id=>frames.find(f=>f.id===id),back:()=>returnToJournal(frames[index]?.id)};
}
