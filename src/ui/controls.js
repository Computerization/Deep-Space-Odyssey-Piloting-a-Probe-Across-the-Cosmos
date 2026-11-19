const groups = {
 keyboard: [
  ['Fly', [['Look / turn', 'Mouse / arrow keys'], ['Forward / backward flight', 'W / S'], ['Sideways / vertical flight', 'A D / R F'], ['Roll', 'Q / E'], ['Faster flight', 'Hold Shift']]],
  ['Flight & camera', [['Brake', 'Hold Space'], ['Take photograph', 'P'], ['Lens', 'Scroll'], ['First / third person; camera menu', 'C / K'], ['Free look', 'V'], ['Follow / release subject', 'L']]],
  ['More controls', [['Fieldwork / discovery', 'X'], ['Fine control', 'Z'], ['Interface / bearings', 'H / G'], ['Explore / journal', 'M / J'], ['Review / recent photo', 'U / O'], ['Instruments', 'I'], ['Exposure', '− / +'], ['Sound', 'B'], ['Continue voyage', 'N'], ['Pause', 'Escape']]]
 ],
 gamepad: [
  ['Fly', [['Turn', 'Right stick'], ['Forward / backward flight', 'RT / LT'], ['Sideways / vertical flight', 'Left stick'], ['Roll', 'LB / RB'], ['Faster flight', 'Hold LB + RB']]],
  ['Flight & camera', [['Brake', 'Hold B'], ['Take photograph', 'Left-stick click'], ['Lens', 'D-pad ← / →'], ['First / third person; free look', 'Y / right-stick click'], ['Follow a world', 'Menu → Camera']]],
  ['More controls', [['Fieldwork / discovery', 'X'], ['Continue voyage', 'D-pad ↑'], ['Record another view', 'Hold A'], ['Voyage', 'View'], ['Fine control & interface', 'Menu → Settings'], ['Flight instruments', 'Menu → Settings'], ['Pause', 'Menu'], ['Select / back in menus', 'A / B']]]
 ]
};
export function openControlsView({device,ui,openPanel}) {
 let selected=device==='gamepad'?'gamepad':'keyboard';
 const table=rows=>`<dl class="controls-list">${rows.map(([label,key])=>`<dt>${label}</dt><dd>${key}</dd>`).join('')}</dl>`;
 const content=()=>groups[selected].map(([title,rows],i)=>i<2?`<section><h3>${title}</h3>${table(rows)}</section>`:`<details class="control-more"><summary>${title}</summary>${table(rows)}</details>`).join('');
 openPanel('guide','Flight controls',`<nav class="reference-tabs" aria-label="Control device"><button type="button" data-device="keyboard">Keyboard & mouse</button><button type="button" data-device="gamepad">Xbox</button></nav><div id="control-reference" class="control-reference"></div><footer class="reference-footer"><p>Release thrust to coast. Space opposes your drift. Tab to move · Enter to select · Esc to go back.</p><button class="primary" data-action="resume">Return to flight <span aria-hidden="true">→</span></button></footer>`);
 function render(){
  ui('control-reference').innerHTML=content();
  for(const button of ui('panel-content').querySelectorAll('[data-device]'))button.setAttribute('aria-pressed',String(button.dataset.device===selected));
 }
 for(const button of ui('panel-content').querySelectorAll('[data-device]'))button.addEventListener('click',()=>{selected=button.dataset.device;render();button.focus();});
 render();
}
