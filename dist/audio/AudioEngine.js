import {audioConfig as config} from './audioConfig.js';
import {mapAudio} from './audioMapping.js';
// Bake an 80 ms tail/head overlap into a copy, preserving the supplied MP3 files.
export function seamlessBuffer(source,context,seconds=config.crossfade){
  const n=Math.min(Math.round(seconds*source.sampleRate),Math.floor(source.length/4));
  const length=source.length-n;
  const result=context.createBuffer(source.numberOfChannels,length,source.sampleRate);
  for(let c=0;c<source.numberOfChannels;c++){
    const input=source.getChannelData(c),output=result.getChannelData(c);
    output.set(input.subarray(n,source.length-n));
    for(let i=0;i<n;i++){const t=i/Math.max(1,n-1);output[length-n+i]=input[source.length-n+i]*(1-t)+input[i]*t;}
  }
  return result;
}
export class AudioEngine {
  constructor(){this.layers={};this.errors=[];this.enabled=false;this.disposed=false;this.loading=null;this.lastUpdate=-Infinity;this.gains={};this.suspendTimer=null;}
  async initialize(){
    if(!window.Tone)throw Error('Audio library unavailable');
    await Tone.start(); // Called directly from a user gesture before any asset loading.
    if(this.loading)return this.loading;
    if(this.disposed)throw Error('Audio engine disposed');
    this.loading=this.load().catch(error=>{this.master?.dispose();this.limiter?.dispose();this.master=null;this.loading=null;throw error;});return this.loading;
  }
  async load(){
    this.master=new Tone.Gain(0);this.limiter=new Tone.Limiter(-3).toDestination();this.master.connect(this.limiter);
    await Promise.all(Object.entries(config.files).map(async([key,file])=>{
      try{
        const response=await fetch(new URL(file,import.meta.url),{signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw Error(`HTTP ${response.status}`);
        const raw=await Tone.getContext().rawContext.decodeAudioData(await response.arrayBuffer());
        if(this.disposed)return;
        const buffer=seamlessBuffer(raw,Tone.getContext().rawContext);
        const gain=new Tone.Gain(0),filter=new Tone.Filter(key==='digestione'?config.backgroundFrequency:2200,'lowpass'),pan=new Tone.Panner(0);
        const bass=new Tone.Filter({type:'lowshelf',frequency:180,gain:0});
        const player=new Tone.Player({url:buffer,loop:true,fadeIn:.015,fadeOut:.03});
        player.chain(filter,bass,pan,gain,this.master);
        this.layers[key]={player,gain,filter,pan,bass,duration:buffer.duration};
      }catch(error){this.errors.push(`${file}: ${error.message}`);console.warn('Audio layer unavailable',file,error);}
    }));
    if(this.disposed)return;
    const start=Tone.now()+.1;
    Object.values(this.layers).forEach(layer=>layer.player.start(start));
    if(!Object.keys(this.layers).length)throw Error('No audio files could be loaded');
  }
  async enable(){await this.initialize();if(this.disposed)return;await Tone.start();this.enabled=true;this.master.gain.rampTo(document.hidden?0:config.master,config.fadeIn);if(document.hidden)this.visibility(true);}
  disable(){this.enabled=false;this.master?.gain.rampTo(0,config.fadeOut);}
  update(state,time){
    if(!this.master||this.disposed||document.hidden||time-this.lastUpdate<.04)return;
    this.lastUpdate=time;const mapped=mapAudio(state);this.gains=mapped.gains;
    for(const [key,layer] of Object.entries(this.layers)){
      layer.gain.gain.rampTo(mapped.gains[key],config.smoothing);
      if(key==='infinito')layer.filter.frequency.rampTo(mapped.ambientFrequency,.3);
      if(key==='accelerazione')layer.filter.frequency.rampTo(mapped.accelerationFrequency,.18);
      if(key==='fusilli')layer.pan.pan.rampTo(mapped.pan,.25);
      if(key==='alDente'){layer.filter.frequency.rampTo(mapped.compressionFrequency,.25);layer.bass.gain.rampTo(mapped.bass,.25);}
    }
  }
  visibility(hidden){
    clearTimeout(this.suspendTimer);if(!this.master)return;
    if(hidden){this.master.gain.rampTo(0,.15);this.suspendTimer=setTimeout(()=>{if(document.hidden&&!this.disposed)Tone.getContext().rawContext.suspend();},180);}
    else {Tone.getContext().resume().then(()=>{if(!this.disposed)this.master.gain.rampTo(this.enabled?config.master:0,.4);}).catch(()=>{});}
  }
  get status(){return window.Tone&&this.master?Tone.getContext().state:'not initialized';}
  dispose(){this.disposed=true;clearTimeout(this.suspendTimer);Object.values(this.layers).forEach(layer=>{layer.player.stop();Object.values(layer).forEach(node=>node?.dispose?.());});this.layers={};this.master?.dispose();this.limiter?.dispose();}
}
