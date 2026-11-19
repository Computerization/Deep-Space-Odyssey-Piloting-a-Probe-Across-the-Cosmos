// A short, optional look at the result. Capturing never opens a panel or
// downloads a file unless persistent browser storage has failed.
export function createPhotoReceipt({ui,open}){
 const button=ui('photo-receipt'),image=ui('photo-receipt-image');
 let timer=null,frame=null;
 function clear(){clearTimeout(timer);timer=null;frame=null;button.hidden=true;image.removeAttribute('src');}
 function expire(){
  // Keep an actionable item in place while someone is using it.
  if(button.matches(':hover,:focus-within')){timer=setTimeout(expire,500);return;}
  clear();
 }
 function show(next,persisted){
  clear();frame=next;image.src=next.photo;
  ui('photo-receipt-status').textContent=persisted?'Saved to journal':'Saved for this session';
  button.setAttribute('aria-label',`View ${next.title}, the photograph you just took`);
  button.hidden=false;timer=setTimeout(expire,6500);
 }
 function view(){const id=frame?.id;if(id){clear();open(id);}}
 button.addEventListener('click',view);
 return {show,clear,open:view};
}
