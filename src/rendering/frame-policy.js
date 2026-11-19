// Input, instruments and audio still update on animation frames. A held scene
// redraws only when its physical view, camera, or picture settings change.
const axes=['x','y','z','w'];
function sameComponents(value,pose,offset,length){
  for(let i=0;i<length;i++)if(value[axes[i]]!==pose[offset+i])return false;
  return true;
}
export class FramePolicy {
  viewChanged(player,look,view,transit,time=0) {
    if(!this.pose||view!==this.view||transit!==this.transit||time!==this.time)return true;
    return !sameComponents(player.position,this.pose,0,3)||
      !sameComponents(player.quaternion,this.pose,3,4)||!sameComponents(look,this.pose,7,4);
  }
  needsFrame(mode, exposure, dirty, hidden, changed=true) {
    if (hidden) return false;
    return ((mode==='play' || mode==='landing')&&changed) || dirty ||
      mode!==this.mode || exposure!==this.exposure;
  }
  didRender(mode, exposure, player, look, view, transit, time=0) {
    this.mode=mode;
    this.exposure=exposure;
    this.renderedPreviousFrame=true;
    if(player){
      this.pose??=new Float64Array(11);
      player.position.toArray(this.pose,0);player.quaternion.toArray(this.pose,3);look.toArray(this.pose,7);
      this.view=view;this.transit=transit;this.time=time;
    }
  }
  didSkip(){this.renderedPreviousFrame=false;}
  measuresFlight(mode) {
    return this.renderedPreviousFrame && (mode==='play' || mode==='landing') && mode===this.mode;
  }
}
