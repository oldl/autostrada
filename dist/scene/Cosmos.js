import * as THREE from '../vendor/three.module.js';
import {TunnelWall} from './TunnelWall.js';
import {centerline} from './motion.js';
const DEPTH=140;
function tint(geometry,colorAt){
 const p=geometry.attributes.position,colors=new Float32Array(p.count*3);
 for(let i=0;i<p.count;i++)colorAt(i,p).toArray(colors,i*3);
 geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
}
// A sphere clamped flat at one side reads as a cut piece of tomato, with deeper red flesh on the cut.
export function tomatoGeometry(){
 const geometry=new THREE.SphereGeometry(.3,18,14),p=geometry.attributes.position,skin=new THREE.Color('#ee2a18'),flesh=new THREE.Color('#b8140c'),cut=new Set();
 for(let i=0;i<p.count;i++)if(p.getY(i)<-.07){p.setY(i,-.07);cut.add(i);}
 tint(geometry,i=>cut.has(i)?flesh:skin);geometry.computeVertexNormals();return geometry;
}
export function basilGeometry(){
 const geometry=new THREE.PlaneGeometry(1,1,6,12),p=geometry.attributes.position,green=new THREE.Color('#2f9e44'),vein=new THREE.Color('#1c6b2d');
 const across=new Float32Array(p.count);
 for(let i=0;i<p.count;i++){
  const x=p.getX(i)*2,v=p.getY(i)+.5,width=Math.pow(Math.sin(Math.PI*v),.75)*.42;
  across[i]=Math.abs(x);p.setXYZ(i,x*width,(v-.5)*1.25,-.22*x*x*width+.14*Math.sin(v*Math.PI));
 }
 tint(geometry,i=>green.clone().lerp(vein,Math.pow(1-across[i],6)));geometry.computeVertexNormals();return geometry;
}
export function cheeseGeometry(){return new THREE.DodecahedronGeometry(.16,0).scale(1.7,.6,1);}
// Instanced pieces drifting around the tunnel axis, recycled ahead once they pass the camera.
class Debris {
 constructor(scene,geometry,material,count,scale){
  this.mesh=new THREE.InstancedMesh(geometry,material,count);this.mesh.frustumCulled=false;scene.add(this.mesh);
  this.items=Array.from({length:count},()=>{
   const angle=Math.random()*Math.PI*2,radius=1.8+Math.random()*7.5;
   return {x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,z:Math.random()*DEPTH,scale:scale*(.7+Math.random()*.9),
    turn:[Math.random()*6,Math.random()*6,Math.random()*6],spin:[(Math.random()-.5)*.8,(Math.random()-.5)*.8,(Math.random()-.5)*.8]};
  });
  this.dummy=new THREE.Object3D();
 }
 update(z,flow){
  this.items.forEach((item,i)=>{
   while(item.z<z-4)item.z+=DEPTH;
   const axis=centerline(item.z);
   this.dummy.position.set(axis[0]+item.x,axis[1]+item.y,item.z);
   this.dummy.rotation.set(...item.turn.map((turn,n)=>turn+flow*item.spin[n]));
   this.dummy.scale.setScalar(item.scale);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);
  });
  this.mesh.instanceMatrix.needsUpdate=true;
 }
 dispose(){this.mesh.geometry.dispose();this.mesh.material.dispose();this.mesh.dispose();}
}
export class Cosmos {
 constructor(scene,mobile){
  this.scene=scene;
  // Pasta fades into the wall's dark core, so the tunnel has a true hole at its end.
  scene.background=new THREE.Color('#6b0b12');scene.fog.color.set('#6b0b12');
  this.wall=new TunnelWall(scene,mobile);
  const share=mobile?.55:1;
  this.debris=[
   new Debris(scene,tomatoGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.24}),Math.round(12*share),1.5),
   new Debris(scene,basilGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,side:THREE.DoubleSide}),Math.round(10*share),1.2),
   new Debris(scene,cheeseGeometry(),new THREE.MeshStandardMaterial({color:'#ffe7a6',roughness:.68,flatShading:true}),Math.round(14*share),1),
  ];
 }
 update(z,flow,rotation){
  this.wall.update(z,rotation);
  for(const group of this.debris)group.update(z,flow);
 }
 dispose(){this.debris.forEach(group=>group.dispose());this.wall.dispose();}
}
