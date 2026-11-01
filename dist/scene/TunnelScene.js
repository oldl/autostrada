import * as THREE from '../vendor/three.module.js';
import {Cosmos} from './Cosmos.js';
import {centerline,tunnelMotion,geometrySignal,CHUNK_LENGTH as LENGTH,STRANDS_PER_CHUNK as STRANDS,HELIX} from './motion.js';
const CHUNKS=8,SPAN=76;
function random(seed){let n=seed>>>0;return()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
// Each strand is a separate 3D curve with real circular cross-sections.
export function createChunk(seed,segments=64,sides=8){
 const rng=random(seed),parts=[];
 for(let i=0;i<STRANDS;i++){
  const angle=rng()*Math.PI*2,radius=2.4+rng()*5.5,phase=rng()*Math.PI*2;
  const winding=(rng()-.5)*6.5,depthOffset=(rng()-.5)*8;
  const close=i%8===0;
  const points=[];
  for(let j=0;j<=16;j++){
   const t=j/16,z=t*SPAN-12+depthOffset;
   const theta=angle+winding*(t-.5)+Math.sin(t*11+phase)*.48;
   const r=(close?1.35+rng()*.12:radius)+Math.sin(t*9+phase)*.65;
   points.push(new THREE.Vector3(Math.cos(theta)*r+Math.sin(t*15+phase)*.6,Math.sin(theta)*r+Math.cos(t*13+phase)*.5,z));
  }
  const curve=new THREE.CatmullRomCurve3(points);
  const thickness=.055+rng()*.09;
  const tube=new THREE.TubeGeometry(curve,segments,thickness,sides,false);
  const shade=new THREE.Color().setHSL(.115+rng()*.025,.83,.46+rng()*.13);
  const colors=new Float32Array(tube.attributes.position.count*3);
  for(let n=0;n<colors.length;n+=3){colors[n]=shade.r;colors[n+1]=shade.g;colors[n+2]=shade.b;}
  tube.setAttribute('color',new THREE.BufferAttribute(colors,3));parts.push(tube);
  for(const t of [0,1]){
   const cap=new THREE.SphereGeometry(thickness,sides,6);cap.translate(...curve.getPoint(t).toArray());
   const capColors=new Float32Array(cap.attributes.position.count*3);
   for(let k=0;k<capColors.length;k+=3){capColors[k]=shade.r;capColors[k+1]=shade.g;capColors[k+2]=shade.b;}
   cap.setAttribute('color',new THREE.BufferAttribute(capColors,3));parts.push(cap);
  }
 }
 // Batch the tubes into one draw call without duplicating vertices.
 const total=parts.reduce((n,g)=>n+g.attributes.position.count,0);
 const geometry=new THREE.BufferGeometry();
 for(const [name,size] of [['position',3],['normal',3],['uv',2],['color',3]]){
  const data=new Float32Array(total*size);let offset=0;
  for(const part of parts){data.set(part.attributes[name].array,offset);offset+=part.attributes[name].array.length;}
  geometry.setAttribute(name,new THREE.BufferAttribute(data,size));
 }
 const indices=new Uint32Array(parts.reduce((n,g)=>n+g.index.count,0));let index=0,offset=0;
 for(const part of parts){for(const v of part.index.array)indices[index++]=v+offset;offset+=part.attributes.position.count;part.dispose();}
 geometry.setIndex(new THREE.BufferAttribute(indices,1));geometry.computeBoundingSphere();return geometry;
}
const deformation=`
uniform float uTime;uniform float uRotation;uniform float uCompression;uniform float uTwist;uniform float uBend;
vec3 deformPasta(vec3 p){
 float z=p.z+modelMatrix[3].z;
 float angle=uRotation+sin(z*.045+uTime*.13)*uTwist*14.+z*${HELIX.toFixed(3)};
 float c=cos(angle),s=sin(angle);
 vec2 q=mat2(c,-s,s,c)*p.xy;
 float squeeze=uCompression+sin(z*.12-uTime*.32)*.035;
 q*=squeeze;
 q+=vec2(sin(z*.21+uTime*.42+p.y*.23),cos(z*.17-uTime*.31+p.x*.19))*uBend;
 q+=vec2(sin(z*.027)*1.8,sin(z*.019+.7)*1.15);
 return vec3(q,p.z);
}
`;
function customize(material,uniforms){
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+deformation);
  shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
 vec3 origin=deformPasta(position);
 vec3 dx=deformPasta(position+vec3(.005,0.,0.))-origin;
 vec3 dy=deformPasta(position+vec3(0.,.005,0.))-origin;
 vec3 dz=deformPasta(position+vec3(0.,0.,.005))-origin;
 objectNormal=normalize(cross(dy,dz)*normal.x+cross(dz,dx)*normal.y+cross(dx,dy)*normal.z);
 `);
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=deformPasta(position);');
 };
 material.customProgramCacheKey=()=> 'autostrada-tubes-v1';
}
export class TunnelScene {
 constructor(canvas){
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.setClearColor('#D71920');this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#D71920');this.scene.fog=new THREE.Fog('#D71920',20,108);
  this.camera=new THREE.PerspectiveCamera(72,1,.045,145);
  this.uniforms=Object.fromEntries(['uTime','uRotation','uCompression','uTwist','uBend'].map(key=>[key,{value:0}]));
  this.material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.47,metalness:0});
  customize(this.material,this.uniforms);
  this.chunks=[];
  const mobile=innerWidth<650;
  this.renderer.shadowMap.enabled=!mobile;this.renderer.shadowMap.type=THREE.PCFShadowMap;
  this.depthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});customize(this.depthMaterial,this.uniforms);
  for(let i=0;i<CHUNKS;i++){
   const mesh=new THREE.Mesh(createChunk(310+i*137,mobile?48:64,mobile?7:9),this.material);
   mesh.castShadow=!mobile;mesh.receiveShadow=!mobile;mesh.customDepthMaterial=this.depthMaterial;
   mesh.position.z=(i-1)*LENGTH;mesh.frustumCulled=false;this.scene.add(mesh);this.chunks.push(mesh);
  }
  this.scene.add(new THREE.HemisphereLight('#fff0cc','#7a101a',1.25));
  this.key=new THREE.DirectionalLight('#fff1cc',3.1);this.key.castShadow=!mobile;this.key.shadow.mapSize.set(1024,1024);
  Object.assign(this.key.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:.1,far:65});
  this.key.shadow.bias=-.0003;this.key.shadow.normalBias=.035;this.scene.add(this.key,this.key.target);
  this.rim=new THREE.DirectionalLight('#ffb65c',1.7);this.scene.add(this.rim,this.rim.target);
  this.fill=new THREE.PointLight('#ffe5aa',26,28,2);this.scene.add(this.fill);
  this.cosmos=new Cosmos(this.scene,mobile);
  this.target=new THREE.Vector3();this.quality=Math.min(devicePixelRatio||1,mobile?1.35:1.6);this.elapsed=0;this.samples=0;
  this.resize();
 }
 resize(){this.renderer.setPixelRatio(this.quality);this.renderer.setSize(innerWidth,innerHeight,false);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();}
 render(state,look,dt){
  const motion=tunnelMotion(state),z=motion.travel;
  this.uniforms.uTime.value=motion.time;this.uniforms.uRotation.value=motion.rotation;
  this.uniforms.uCompression.value=motion.compression;this.uniforms.uTwist.value=motion.twist;this.uniforms.uBend.value=motion.bend;
  // Recycle only once a whole chunk is behind the near plane; it reappears beyond opaque fog.
  for(const mesh of this.chunks)while(mesh.position.z+SPAN<z-8)mesh.position.z+=CHUNKS*LENGTH;
  const center=centerline(z),ahead=centerline(z+13);
  this.camera.position.set(center[0]+look[0]*.42+Math.sin(state.flow*.21)*.16,center[1]+look[1]*.32,z);
  this.target.set(ahead[0]+look[0]*1.1,ahead[1]+look[1]*.75,z+13);
  this.camera.lookAt(this.target);this.camera.rotateZ(Math.sin(state.flow*.17)*.018);
  // Small optical offset preserves the existing right-of-centre composition.
  this.camera.setViewOffset(innerWidth,innerHeight,-innerWidth*.10,0,innerWidth,innerHeight);
  this.key.position.set(center[0]-5,center[1]+7,z+2);this.key.target.position.set(center[0],center[1],z+18);
  this.rim.position.set(center[0]+6,center[1]-2,z+28);this.rim.target.position.set(center[0],center[1],z+4);
  this.fill.position.set(center[0]+1,center[1]+1,z+3);
  this.cosmos.update(z,state.flow,motion.rotation);
  this.renderer.render(this.scene,this.camera);
  if(dt>0){this.elapsed+=dt;this.samples++;if(this.samples>=180){if(this.elapsed/this.samples>.026&&this.quality>.85){this.quality=Math.max(.85,this.quality*.85);this.resize();}this.elapsed=0;this.samples=0;}}
  // Actual geometry control at the camera cross-section, shared with the sound adapter.
  return geometrySignal(state);
 }
 dispose(){this.cosmos.dispose();for(const mesh of this.chunks)mesh.geometry.dispose();this.material.dispose();this.depthMaterial.dispose();this.key.shadow.dispose();this.renderer.dispose();}
}
