// Input and menus continue to update on animation frames. Static overlays only
// redraw the 3D view when opened, resized, or when a picture setting changes.
export class FramePolicy {
  needsFrame(mode, exposure, dirty, hidden) {
    if (hidden) return false;
    return mode==='play' || mode==='landing' || dirty ||
      mode!==this.mode || exposure!==this.exposure;
  }
  didRender(mode, exposure) {
    this.mode=mode;
    this.exposure=exposure;
  }
  measuresFlight(mode) {
    return (mode==='play' || mode==='landing') && mode===this.mode;
  }
}
