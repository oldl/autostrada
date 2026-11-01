import { audioConfig as config } from './audioConfig.js';
export const clamp = (v, min=0, max=1) => Math.max(min, Math.min(max,v));
// The same 3D cross-section controls feed rendering and sound.
export {geometrySignal as geometrySample} from '../scene/motion.js';
import {geometrySignal as geometrySample} from '../scene/motion.js';
export function mapAudio(state) {
  const velocity=Math.abs(clamp(state.velocity,-1,1));
  const twist=Math.abs(clamp(state.twist,-1,1));
  const contraction=clamp(state.contraction);
  return {
    gains: {infinito:config.layers.infinito, accelerazione:config.layers.accelerazione*velocity,
      fusilli:config.layers.fusilli*twist, alDente:config.layers.alDente*contraction*.85, digestione:config.layers.digestione},
    ambientFrequency:1500+clamp(state.progress)*900,
    accelerationFrequency:400+velocity*7600,
    compressionFrequency:4200-contraction*3700,
    bass:contraction*2, pan:clamp(state.twist,-1,1)*.7,
  };
}
export class TunnelAudioAdapter {
  constructor(){this.pendingPixels=0;this.velocity=0;this.twist=0;this.lastRotation=null;}
  input(pixels){this.pendingPixels+=pixels;}
  update(dt,visual){
    const sample=visual.geometry || geometrySample(visual);
    if(dt<=0)return {progress:(Math.sin(visual.flow*.04)+1)/2,velocity:this.velocity,twist:this.twist,contraction:sample.contraction};
    // Accumulated deltas / elapsed frame time gives pixels per second, not events per frame.
    const rate=this.pendingPixels/dt;this.pendingPixels=0;
    this.velocity*=Math.exp(-dt/config.velocityDecay);
    const alpha=1-Math.exp(-dt/config.smoothing);
    this.velocity+=(clamp(rate/config.velocityPixelsPerSecond,-1,1)-this.velocity)*alpha;
    // Signed rendered rotation: positive means clockwise in the camera view.
    const angularVelocity=this.lastRotation===null?0:(sample.rotation-this.lastRotation)/dt;
    this.lastRotation=sample.rotation;
    this.twist+=(clamp(angularVelocity*2.5,-1,1)-this.twist)*alpha;
    return {progress:(Math.sin(visual.flow*.04)+1)/2,velocity:this.velocity,twist:this.twist,
      contraction:visual.paused?0:sample.contraction};
  }
  reset(){this.pendingPixels=0;this.velocity=0;this.lastRotation=null;this.twist=0;}
}
