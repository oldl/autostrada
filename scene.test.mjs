import test from 'node:test';
import assert from 'node:assert/strict';
import {createChunk} from './dist/scene/TunnelScene.js';
import {tomatoGeometry,basilGeometry,cheeseGeometry} from './dist/scene/Cosmos.js';
import {tunnelMotion,geometrySignal,odometer,CHUNK_LENGTH,STRAND_UNITS,STRANDS_PER_CHUNK,STRANDS_PER_PLATE,WALL_RADIUS} from './dist/scene/motion.js';
test('batched tubes have volume, finite unit normals and real depth',()=>{
 const g=createChunk(310,48,7),p=g.attributes.position,n=g.attributes.normal;
 assert.ok(p.count>9000);assert.ok(g.index.count>40000);
 let min=Infinity,max=-Infinity;
 for(let i=0;i<p.count;i++){
  min=Math.min(min,p.getZ(i));max=Math.max(max,p.getZ(i));
  assert.ok(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i)));
  assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.001);
 }
 assert.ok(max-min>76);g.dispose();
});
test('floating food has finite geometry with a flat tomato cut',()=>{
 const tomato=tomatoGeometry(),p=tomato.attributes.position;
 let min=Infinity;for(let i=0;i<p.count;i++)min=Math.min(min,p.getY(i));
 assert.equal(+min.toFixed(3),-.07);
 for(const g of [tomato,basilGeometry(),cheeseGeometry()]){
  for(const v of g.attributes.position.array)assert.ok(Number.isFinite(v));
  for(const v of g.attributes.normal.array)assert.ok(Number.isFinite(v));
 }
});
test('counters derive from camera travel: one strand length is 25 cm, one plate is 100 strands',()=>{
 assert.deepEqual(odometer(0),{meters:0,plates:0,fill:0});
 assert.ok(Math.abs(odometer(STRAND_UNITS/3.6).meters-.25)<1e-9);
 const flow=CHUNK_LENGTH/3.6*STRANDS_PER_PLATE/STRANDS_PER_CHUNK;
 assert.equal(odometer(flow*.99).plates,0);assert.equal(odometer(flow*3.01).plates,3);
 const travel=tunnelMotion({flow:37,shape:4,torsion:2}).travel;
 assert.ok(Math.abs(odometer(37).meters-travel/STRAND_UNITS*.25)<1e-9);
});
test('wall stays clear of the widest strand',()=>{
 let widest=0;const p=createChunk(310,48,7).attributes.position;
 for(let i=0;i<p.count;i++)widest=Math.max(widest,Math.hypot(p.getX(i),p.getY(i)));
 assert.ok(WALL_RADIUS>widest+2,`${widest}`);
});
test('clicking twists and amplifies the ripples in either drag direction',()=>{
 const rest=tunnelMotion({flow:5,shape:2,torsion:0}),left=tunnelMotion({flow:5,shape:2,torsion:-1.3}),right=tunnelMotion({flow:5,shape:2,torsion:1.3});
 assert.ok(right.rotation>rest.rotation&&left.rotation<rest.rotation);
 assert.ok(right.bend>rest.bend);assert.equal(left.bend,right.bend);
});
test('camera advances in world units and geometry controls stay continuous',()=>{
 const state={flow:20,shape:3,torsion:.5},a=tunnelMotion(state),b=tunnelMotion({...state,flow:21});
 assert.ok(Math.abs(b.travel-a.travel-3.6)<1e-8);
 const x=geometrySignal(state),y=geometrySignal({...state,flow:20.001});
 assert.ok(Math.abs(x.rotation-y.rotation)<.01);assert.ok(x.contraction>=0&&x.contraction<=1);
});
