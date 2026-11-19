// Single byte ranges for local media seeking. Unsupported or invalid syntax is
// ignored; a valid but unsatisfiable range receives 416. RFC 9110 §14.
export function byteRange(value,size){
 const match=/^bytes=(\d*)-(\d*)$/i.exec(value?.trim()||'');
 if(!match||(!match[1]&&!match[2]))return null;
 let start,end;
 if(match[1]){start=Number(match[1]);end=match[2]?Number(match[2]):size-1;if(match[2]&&end<start)return null;}
 else{const count=Number(match[2]);if(count===0)return {unsatisfiable:true};start=Math.max(0,size-count);end=size-1;}
 if(size===0||start>=size)return {unsatisfiable:true};
 return {start,end:Math.min(end,size-1)};
}
