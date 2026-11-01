'use strict';
import {interactiveAudio} from './audio/interactiveAudio.js';
import {TunnelScene} from './scene/TunnelScene.js';
import {PlateScene} from './scene/PlateScene.js';
import {odometer} from './scene/motion.js';
const $ = id => document.getElementById(id);
const canvas=$('tunnel'), reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches, flow=0, speed=1, targetSpeed=1, torsion=0, twistImpulse=0, shape=2, pointer=[0,0], look=[0,0], previous=0, scene, plate;
try{scene=new TunnelScene(canvas);$('fallback').hidden=true;}catch(error){console.error(error);$('fallback').hidden=false;}
try{plate=new PlateScene($('plate'));}catch(error){$('plate').hidden=true;}
addEventListener('resize',()=>scene?.resize());
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();$('fallback').hidden=false;});
canvas.addEventListener('webglcontextrestored',()=>{$('fallback').hidden=true;});
addEventListener('pagehide',event=>{if(!event.persisted){scene?.dispose();plate?.dispose();}});
function accelerate(delta){targetSpeed=Math.max(.15,Math.min(4,targetSpeed+delta));}
addEventListener('wheel',e=>{if(e.ctrlKey||!$('audio-entry').hidden||e.target.closest('#audio-debug'))return;e.preventDefault();accelerate(e.deltaY*(e.deltaMode===1?.025:e.deltaMode===2?.5:.002));interactiveAudio.input(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1));},{passive:false});
let drag=null;
canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};twistImpulse=Math.min(3,twistImpulse+1.3);canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{pointer=[(e.clientX/innerWidth-.5)*2,-(e.clientY/innerHeight-.5)*2];if(drag){accelerate((drag.y-e.clientY)*.006);interactiveAudio.input((drag.y-e.clientY)*3);twistImpulse=Math.max(-3,Math.min(3,twistImpulse+(e.clientX-drag.x)*.012));drag={x:e.clientX,y:e.clientY};}});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
function syncPause(){$('pause').textContent=paused?'▶ PLAY':'Ⅱ PAUSE';$('pause').setAttribute('aria-pressed',String(paused));}
$('pause').onclick=()=>{paused=!paused;syncPause();};syncPause();
reduced.addEventListener('change',e=>{paused=e.matches;syncPause();});
$('help').onclick=()=>{const open=$('instructions').hidden;$('instructions').hidden=!open;$('help').setAttribute('aria-expanded',String(open));};
addEventListener('keydown',e=>{if(!$('audio-entry').hidden)return;if(e.code==='Escape'){$('instructions').hidden=true;$('help').setAttribute('aria-expanded','false');}if(e.target.closest('button,a,input'))return;if(e.code==='Space'){e.preventDefault();$('pause').click();}if(e.code==='ArrowDown'||e.code==='ArrowUp'){e.preventDefault();accelerate(e.code==='ArrowDown'?.25:-.25);interactiveAudio.input(e.code==='ArrowDown'?120:-120);}if(e.code==='KeyM')$('sound').click();});
document.addEventListener('visibilitychange',()=>{previous=0;});
function frame(time){
const dt=previous?Math.min((time-previous)/1000,.05):0;previous=time;
if(!paused&&$('audio-entry').hidden){
 speed+=(targetSpeed-speed)*(1-Math.exp(-dt*3));
 targetSpeed+=(1-targetSpeed)*(1-Math.exp(-dt*.12));
 flow+=dt*speed;
 twistImpulse*=Math.exp(-dt*.65);torsion+=(twistImpulse-torsion)*(1-Math.exp(-dt*3));
 look=look.map((v,i)=>v+(pointer[i]-v)*(1-Math.exp(-dt*3)));
}
const geometry=scene?.render({flow,shape,torsion},look,dt);
interactiveAudio.update(dt,{flow,shape,torsion,paused,geometry},time/1000);
const {meters,plates,fill}=odometer(flow);
$('distance').textContent=meters.toFixed(2).padStart(6,'0');
$('plates').textContent=String(plates).padStart(3,'0');
plate?.render(fill,plates,dt,!paused);
requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
