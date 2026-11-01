import * as THREE from '../vendor/three.module.js';
import {WALL_RADIUS,HELIX} from './motion.js';
const STRIPES=120;
const vertexShader=`
uniform float uTravel;
varying vec2 vDir;varying float vZ;varying vec3 vWorld;
void main(){
 vDir=normalize(position.xy);vZ=position.z+uTravel;
 vec2 axis=vec2(sin(vZ*.027)*1.8,sin(vZ*.019+.7)*1.15);
 vWorld=vec3(axis+vDir*${WALL_RADIUS.toFixed(1)},vZ);
 gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);
}`;
const fragmentShader=`
uniform float uRotation;
varying vec2 vDir;varying float vZ;varying vec3 vWorld;
const vec3 tomato=vec3(.843,.098,.125),line=vec3(.96,.74,.66),gold=vec3(.97,.77,.19),hole=vec3(.42,.043,.071);
float hash(float n){return fract(sin(n*12.9898)*43758.5453);}
void main(){
 vec2 dir=normalize(vDir);
 float angle=atan(dir.y,dir.x)+vZ*${HELIX.toFixed(3)}+uRotation;
 float s=angle*${STRIPES.toFixed(1)},id=mod(floor(s/6.28318+.5),${STRIPES.toFixed(1)});
 // Measured on the continuous direction, so the atan seam cannot show up as a line.
 float width=(length(vec2(length(dFdx(dir)),length(dFdy(dir))))+fwidth(vZ)*${HELIX.toFixed(3)})*${STRIPES.toFixed(1)};
 float taper=.5+.5*sin(vZ*.16+hash(id)*6.28);
 float stripe=smoothstep(.68+taper*.2,.96,cos(s)*.5+.5)*(1.-smoothstep(1.2,3.,width));
 float streak=smoothstep(.62,.9,sin(vZ*.11+hash(id+7.)*6.28))*step(.45,hash(id+3.));
 vec3 color=mix(tomato,mix(line,gold,streak),stripe*.26);
 color=mix(color,tomato*.92+line*.08,smoothstep(1.2,3.,width)*.6);
 // A dark core gives the tunnel a hole to fall into.
 float distance=length(vWorld-cameraPosition);
 gl_FragColor=vec4(mix(color,hole,smoothstep(24.,96.,distance)),1.);
}`;
// An open tube that follows the camera; the spiral stays anchored in world depth.
export class TunnelWall {
 constructor(scene,mobile){
  const geometry=new THREE.CylinderGeometry(1,1,150,mobile?64:96,mobile?70:100,true).rotateX(Math.PI/2).translate(0,0,60);
  this.uniforms={uTravel:{value:0},uRotation:{value:0}};
  this.mesh=new THREE.Mesh(geometry,new THREE.ShaderMaterial({uniforms:this.uniforms,vertexShader,fragmentShader,side:THREE.DoubleSide}));
  this.mesh.frustumCulled=false;scene.add(this.mesh);
 }
 update(z,rotation){this.uniforms.uTravel.value=z;this.uniforms.uRotation.value=rotation;}
 dispose(){this.mesh.geometry.dispose();this.mesh.material.dispose();}
}
