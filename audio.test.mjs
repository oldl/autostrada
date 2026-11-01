import test from 'node:test';
import assert from 'node:assert/strict';
import {mapAudio,TunnelAudioAdapter} from './dist/audio/audioMapping.js';
import {seamlessBuffer} from './dist/audio/AudioEngine.js';
test('stationary state has ambient, silence for acceleration, and safe gain sum',()=>{
 const quiet=mapAudio({progress:0,velocity:0,twist:0,contraction:0});
 assert.equal(quiet.gains.infinito,.25);assert.equal(quiet.gains.accelerazione,0);assert.equal(quiet.gains.digestione,.38);
 const loud=mapAudio({progress:1,velocity:1,twist:1,contraction:1});
 assert.ok(Object.values(loud.gains).reduce((a,b)=>a+b,0)*.65<1);
 assert.ok(loud.compressionFrequency<quiet.compressionFrequency);assert.ok(loud.bass>quiet.bass);
});
test('panning follows signed twist and acceleration follows magnitude',()=>{
 const a=mapAudio({velocity:-.8,twist:-.7,contraction:.5,progress:.2});
 const b=mapAudio({velocity:.8,twist:.7,contraction:.5,progress:.2});
 assert.equal(a.gains.accelerazione,b.gains.accelerazione);assert.equal(a.pan,-b.pan);
});
test('time-normalized input produces comparable results at 30 and 120fps then fades',()=>{
 function simulate(fps){const adapter=new TunnelAudioAdapter();let state;for(let i=0;i<fps;i++){adapter.input(900/fps);state=adapter.update(1/fps,{flow:i/fps,shape:2,torsion:0});}const moving=state.velocity;for(let i=0;i<fps*2;i++)state=adapter.update(1/fps,{flow:1+i/fps,shape:2,torsion:0});assert.ok(Math.abs(state.velocity)<.001);return moving;}
 assert.ok(Math.abs(simulate(30)-simulate(120))<.03);
});
test('twist comes from moving shader parameters without scrolling',()=>{
 const adapter=new TunnelAudioAdapter();let state;for(let i=0;i<120;i++)state=adapter.update(1/60,{flow:i/60,shape:2,torsion:0});
 assert.notEqual(state.twist,0);assert.equal(state.velocity,0);assert.ok(state.contraction>=0&&state.contraction<=1);
});
test('loop overlap closes discontinuity without modifying source',()=>{
 const input=Float32Array.from({length:1000},(_,i)=>i/999);
 const source={sampleRate:1000,numberOfChannels:1,length:1000,getChannelData:()=>input};
 const context={createBuffer:(channels,length)=>{const data=new Float32Array(length);return {getChannelData:()=>data};}};
 const result=seamlessBuffer(source,context,.08).getChannelData(0);
 assert.equal(result.length,920);assert.ok(Math.abs(result[0]-result.at(-1))<.002);assert.equal(input[999],1);
});
