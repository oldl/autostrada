export function createDebug(engine){
  const panel=document.createElement('aside');panel.id='audio-debug';panel.setAttribute('aria-label','Audio development controls');
  panel.innerHTML='<strong>AUDIO / LOCAL DEBUG</strong><label><input type="checkbox" id="audio-manual"> Manual mapping</label>';
  const inputs={};
  for(const [key,min,max] of [['progress',0,1],['velocity',-1,1],['twist',-1,1],['contraction',0,1]]){
    const label=document.createElement('label');label.textContent=key;
    const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step='.01';input.value=0;input.setAttribute('aria-label',key);label.append(input);panel.append(label);inputs[key]=input;
  }
  const output=document.createElement('pre');panel.append(output);document.body.append(panel);let last=0;
  return {override(state){return panel.querySelector('#audio-manual').checked?Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,Number(v.value)])):state;},
    render(state,time){if(time-last<.15)return;last=time;const effective=this.override(state);output.textContent=JSON.stringify({state:effective,gains:Object.fromEntries(Object.entries(engine.layers).map(([key,layer])=>[key,layer.gain.gain.value])),targets:engine.gains,context:engine.status,layers:Object.keys(engine.layers),errors:engine.errors},(_,v)=>typeof v==='number'?Number(v.toFixed(3)):v,2);}};
}
