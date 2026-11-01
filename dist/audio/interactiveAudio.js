import {AudioEngine} from './AudioEngine.js';
import {TunnelAudioAdapter} from './audioMapping.js';
import {audioConfig as config} from './audioConfig.js';
const engine=new AudioEngine(),adapter=new TunnelAudioAdapter();
const toggle=document.getElementById('sound'),entry=document.getElementById('audio-entry');
const status=document.getElementById('audio-status');
let busy=false,debug=null;
function paint(){toggle.textContent=engine.enabled?'SOUND ON ↗':'SOUND OFF ↘';toggle.setAttribute('aria-pressed',String(engine.enabled));toggle.setAttribute('aria-label',engine.enabled?'Turn sound off':'Turn sound on');}
function enter(){entry.hidden=true;document.getElementById('experience').inert=false;toggle.focus();}
async function activate(){
  if(busy)return;busy=true;toggle.setAttribute('aria-busy','true');status.textContent='Loading sound…';
  try{await engine.enable();status.textContent=engine.errors.length?'Some sound layers are unavailable. The journey continues.':'';}
  catch(error){engine.disable();status.textContent='Sound unavailable. You can continue without sound.';console.warn(error);}
  finally{busy=false;toggle.removeAttribute('aria-busy');paint();}
}
toggle.onclick=()=>{if(busy)return;if(engine.enabled){engine.disable();paint();}else activate();};
document.getElementById('enter-sound').onclick=()=>{activate();enter();};
document.getElementById('enter-silent').onclick=enter;
// Plain media element: the entry logo can play before Tone loads. Stays silent once sound is off.
const logoVoice=new Audio(new URL(config.logoVoice.file,import.meta.url));logoVoice.preload='auto';logoVoice.volume=config.logoVoice.volume;
function speak(event){if(event.pointerType==='touch'||!logoVoice.paused||(entry.hidden&&!engine.enabled))return;logoVoice.currentTime=0;logoVoice.play().catch(()=>{});}
document.querySelectorAll('#entry-title,.brand').forEach(logo=>logo.addEventListener('pointerenter',speak));
// Local development only; production hosts cannot activate this panel via query string.
if(['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&new URLSearchParams(location.search).has('audioDebug')){
  import('./debug.js').then(({createDebug})=>{debug=createDebug(engine);});
}
export const interactiveAudio={
  input(pixels){if(entry.hidden)adapter.input(pixels);},
  update(dt,visual,time){if(document.hidden)return;const state=adapter.update(dt,visual);engine.update(debug?.override(state)||state,time);debug?.render(state,time);},
};
document.addEventListener('visibilitychange',()=>{adapter.reset();engine.visibility(document.hidden);});
addEventListener('pagehide',event=>{if(event.persisted)engine.visibility(true);else engine.dispose();});
addEventListener('pageshow',event=>{if(event.persisted)engine.visibility(false);});
paint();document.getElementById('enter-sound').focus();
