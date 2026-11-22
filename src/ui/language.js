import {chinese} from './zh-cn.js';
export const chooseLanguage=(saved,system='en')=>['en','zh-CN'].includes(saved)?saved:/^zh\b/i.test(system)?'zh-CN':'en';
const months='January February March April May June July August September October November December'.split(' ');
const monthNumber=new Map(months.flatMap((m,i)=>[[m,i+1],[m.slice(0,3),i+1]]));monthNumber.set('Sept',9);
function phrase(s){
 if(chinese.has(s))return chinese.get(s);
 if(!/[A-Za-z]/.test(s))return s;
 const date=s.replace(/\b(\d{1,2}) ([A-Z][a-z]+) (\d{4})\b/g,(all,d,m,y)=>monthNumber.has(m)?`${y} 年 ${monthNumber.get(m)} 月 ${Number(d)} 日`:all);if(date!==s)return phrase(date);
 if(/^Start .+ and replace your saved position/.test(s)){const m=/^(Start .+) and replace your saved (position(?: and fieldwork progress)?)\.$/.exec(s);if(m)return `${phrase(m[1])}，并替换已保存的${m[2]==='position'?'位置':'位置与观测进度'}。`;}
 if(!s.startsWith('FIG. ')&&s.includes('. '))return s.split(/(?<=\.) /).map(phrase).join(' ');
 if(s.includes(' · '))return s.split(' · ').map(phrase).join(' · ');
 if(s.endsWith(' →'))return phrase(s.slice(0,-2))+' →';
 let m;
 for(const [re,f] of patterns)if((m=re.exec(s)))return f(...m.slice(1));
 return s;
}
const patterns=[
 [/^([\d.]+) Earth widths$/,x=>x+' 个地球直径'],
 [/^(\d+) days? (\d+) h$/,(d,h)=>`${d} 天 ${h} 小时`],[/^(\d+) h (\d+) min$/,(h,m)=>`${h} 小时 ${m} 分钟`],[/^(\d+) min (\d+) s$/,(m,s)=>`${m} 分 ${s} 秒`],[/^FIG\. (\d+) \/ (\d+)$/,(a,b)=>`图 ${a} / ${b}`],
 [/^Continue to (.+)$/,x=>'继续前往'+phrase(x)],[/^Return to (Earth|Jupiter|Saturn)$/,x=>'返回'+phrase(x)],[/^(\d+) years?, (\d+) days?$/,(y,d)=>`${y} 年 ${d} 天`],[/^(.+) from Sun$/,x=>'距太阳 '+phrase(x)],[/^(.+) from centre to edge\.$/,x=>'从中心到边缘 '+phrase(x)],
 [/^Towards (.+)$/,x=>'飞向'+phrase(x)],[/^Arriving at (.+)$/,x=>'即将抵达'+phrase(x)],[/^En route to (.+)$/,x=>'正在前往'+phrase(x)],[/^Start at (.+)$/,x=>'从'+phrase(x)+'开始'],
 [/^(.+) km across$/,x=>'直径 '+x+' 千米'],[/^(.+) km altitude$/,x=>'高度 '+x+' 千米'],[/^([\d.,]+) km$/,x=>x+' 千米'],[/^([\d.,]+) h$/,x=>x+' 小时'],[/^(\d+) hours since transmission$/,x=>'发射后 '+x+' 小时'],[/^(.+) remaining along the track$/,x=>'沿航迹剩余 '+phrase(x)],
 [/^(.+) field of view$/,x=>'视场角 '+x],[/^Look towards (.+)$/,x=>'望向'+phrase(x)],[/^(.+) · bearing$/,x=>phrase(x)+'方位'],[/^Hold (\S+) to slow your approach\.$/,x=>`按住 ${x} 减慢接近速度。`],[/^Release (\S+)\.$/,x=>`松开 ${x}。`],[/^Locate (.+)$/,x=>'定位'+phrase(x)],[/^Follow (.+) in the camera$/,x=>'用镜头跟随'+phrase(x)],[/^Stop following (.+) in the camera$/,x=>'停止跟随'+phrase(x)],[/^View (.+)$/,x=>'查看'+phrase(x)],[/^(.+) (years?|days?|hours?)$/,(n,u)=>n+({y:' 年',d:' 天',h:' 小时'}[u[0]])]
];
export function translate(s,locale){return locale==='zh-CN'?String(s).replace(/\S[\s\S]*\S|\S/,phrase):String(s);}

// Existing panels mix HTML templates, SVG labels and live text nodes. Localize
// only presentation leaves, retaining their source for an in-place switch back.
// Ignore style/geometry mutations; English flight needs no DOM observer at all.
const attributes=['title','alt','aria-label','aria-valuetext'];
const original=new WeakMap();
export function alreadyTranslated(el,key,source){
 const node=key==='textContent'?el.firstChild:el,attr=key==='ariaLabel'?'aria-label':key,entry=original.get(node)?.[attr];
 return !!entry&&entry.source===source&&entry.shown===(key==='textContent'?node.data:el.getAttribute(attr));
}
export function installLanguage(doc,initial){
 let locale='en';const observer=new MutationObserver(records=>{
  for(const r of records){if(r.type==='childList'){for(const n of r.addedNodes)visit(n);}
   else if(r.type==='characterData')visit(r.target);else apply(r.target,r.attributeName);}
 });
 function apply(node,key){
  const isText=key==='textContent',value=isText?node.data:node.getAttribute(key);if(!value)return;
  const record=original.get(node),prev=record?.[key];if(prev?.locale===locale&&prev.shown===value)return;
  const source=prev?.shown===value?prev.source:value;
  const shown=translate(source,locale);if(shown===value)return;
  if(!record)original.set(node,{});original.get(node)[key]={source,shown,locale};
  if(isText)node.data=shown;else node.setAttribute(key,shown);
 }
 function visit(n){
  if(n.nodeType===3){if(!n.parentElement?.closest('script,style,textarea,[translate=no]'))apply(n,'textContent');return;}
  if(n.nodeType!==1||n.matches('script,style,textarea,[translate=no]'))return;
  for(const key of attributes)if(n.hasAttribute(key))apply(n,key);
  for(const child of n.childNodes)visit(child);
 }
 function set(value){observer.disconnect();locale=chooseLanguage(value);doc.documentElement.lang=locale;
  visit(doc.body);doc.title=locale==='en'?'Cosmos — Voyager 1':'Cosmos — 旅行者 1 号';
  if(locale!=='en')observer.observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
 }
 if(initial!=='en')set(initial);return {set};
}
