import * as THREE from '../vendor/three.module.js';
// Soup-plate cross-section, outer foot to inner well; the spline rounds every edge.
const PROFILE=[[0,0],[.82,0],[.9,.05],[1.08,.3],[1.2,.4],[1.72,.5],[1.78,.53],[1.72,.56],[1.2,.47],[1.08,.38],[.92,.16],[.7,.1],[0,.1]];
function createPlate(){return new THREE.LatheGeometry(new THREE.SplineCurve(PROFILE.map(([x,y])=>new THREE.Vector2(x,y))).getPoints(90),72);}
// One long strand wound into a dome; drawRange reveals it from the bottom layer up as the plate fills.
function createNest(){
 const points=[];
 for(let i=0;i<=900;i++){
  const t=i/900,angle=t*Math.PI*92,dome=Math.sqrt(1-t*t*.93);
  const r=.98*dome*(1+Math.sin(angle*.31)*.1+Math.sin(angle*1.7)*.04);
  const y=.2+t*1.05+Math.sin(angle*.43)*.05+Math.sin(angle+t*9)*.05;
  points.push(new THREE.Vector3(Math.cos(angle)*r,y,Math.sin(angle)*r));
 }
 return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),2400,.045,7,false);
}
export class PlateScene {
 constructor(canvas){
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;
  this.size=canvas.clientWidth||112;this.renderer.setSize(this.size,this.size,false);
  this.scene=new THREE.Scene();
  this.camera=new THREE.PerspectiveCamera(24,1,.1,30);this.camera.position.set(0,4.7,9.25);this.camera.lookAt(0,.52,0);
  this.scene.add(new THREE.HemisphereLight('#fff0cc','#7a101a',1.5));
  const key=new THREE.DirectionalLight('#fff1cc',2.8);key.position.set(-3,6,3.5);key.castShadow=true;key.shadow.mapSize.set(512,512);
  Object.assign(key.shadow.camera,{left:-2.4,right:2.4,top:2.4,bottom:-2.4,near:1,far:14});key.shadow.bias=-.001;key.shadow.normalBias=.02;this.scene.add(key);
  const plate=new THREE.MeshStandardMaterial({color:'#fff4db',roughness:.26,side:THREE.DoubleSide});
  this.plate=new THREE.Mesh(createPlate(),plate);this.plate.receiveShadow=true;
  this.rim=new THREE.Mesh(new THREE.TorusGeometry(1.74,.012,8,96),new THREE.MeshStandardMaterial({color:'#e0a92e',roughness:.35}));this.rim.rotation.x=Math.PI/2;this.rim.position.y=.545;
  this.nest=new THREE.Mesh(createNest(),new THREE.MeshStandardMaterial({color:'#e9b23a',roughness:.42}));this.nest.castShadow=true;this.nest.receiveShadow=true;
  this.group=new THREE.Group();this.group.add(this.plate,this.rim,this.nest);this.scene.add(this.group);
  this.pop=0;this.served=0;
 }
 render(fill,plates,dt,moving){
  if(plates!==this.served){this.served=plates;this.pop=1;}
  this.pop*=Math.exp(-dt*5);if(moving)this.group.rotation.y+=dt*.35;
  this.group.scale.setScalar(1+this.pop*.14);
  const size=this.renderer.domElement.clientWidth;
  if(size&&size!==this.size){this.size=size;this.renderer.setSize(size,size,false);}
  this.nest.geometry.setDrawRange(0,Math.floor(fill*this.nest.geometry.index.count/6)*6);
  this.renderer.render(this.scene,this.camera);
 }
 dispose(){for(const mesh of [this.plate,this.rim,this.nest]){mesh.geometry.dispose();mesh.material.dispose();}this.renderer.dispose();}
}
