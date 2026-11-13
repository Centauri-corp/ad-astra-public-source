import * as THREE from './vendor/three.module.js';

// Original procedural sculpture: two folded hemispheres, a neural lattice and six product orbits.
// Decorative geometry only. No model requests, microphone access or external textures.
export function createCompanyScene(host) {
 const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.5));
 renderer.domElement.setAttribute('aria-hidden','true'); host.append(renderer.domElement);
 const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(38,1,.1,40), brain=new THREE.Group();
 camera.position.set(0,.15,6.8); scene.add(brain);
 const positions=[], edges=[];
 for(let side of [-1,1]) for(let i=0;i<900;i++) {
  const y=1-2*(i+.5)/900, a=i*2.39996323, r=Math.sqrt(1-y*y);
  const fold=1+.065*Math.sin(a*9+y*15)*Math.cos(y*12);
  positions.push(side*(.025+Math.abs(r*Math.cos(a))*1.02)*fold,y*.85*fold,r*Math.sin(a)*.82*fold);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 const points=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xb7edf1,size:.027,transparent:true,opacity:.94}));brain.add(points);
 for(let i=0;i<1800;i++)for(let offset of [21,34]) {
  const j=i+offset;if(j>=1800||Math.floor(i/900)!==Math.floor(j/900))continue;
  const p=new THREE.Vector3(...positions.slice(i*3,i*3+3)),q=new THREE.Vector3(...positions.slice(j*3,j*3+3));
  if(p.distanceTo(q)<.33)edges.push(p.x,p.y,p.z,q.x,q.y,q.z);
 }
 const lines=new THREE.BufferGeometry();lines.setAttribute('position',new THREE.Float32BufferAttribute(edges,3));
 brain.add(new THREE.LineSegments(lines,new THREE.LineBasicMaterial({color:0x72b7c9,transparent:true,opacity:.35})));
 const rings=[];
 for(let i=0;i<3;i++) {const mesh=new THREE.Mesh(new THREE.TorusGeometry(1.8+i*.12,.009,6,160),new THREE.MeshBasicMaterial({color:i===1?0xd5ba91:0x5b8caa,transparent:true,opacity:.65}));mesh.rotation.set(.65+i*.52,.3+i*.65,.2);scene.add(mesh);rings.push(mesh);}
 const nodes=[];
 for(let i=0;i<6;i++) {const node=new THREE.Mesh(new THREE.IcosahedronGeometry(.065,1),new THREE.MeshBasicMaterial({color:i%2?0xd5ba91:0xa8dbe3}));scene.add(node);nodes.push(node);}
 let disposed=false;
 function renderAt(seconds=0) {if(disposed)return;brain.rotation.set(.06,Math.sin(seconds*Math.PI/6)*.32,Math.sin(seconds*Math.PI/6)*.045);nodes.forEach((node,i)=>{const a=i*Math.PI/3+seconds*Math.PI/6;node.position.set(Math.cos(a)*2.05,Math.sin(a)*1.45,Math.sin(a)*.5);});renderer.render(scene,camera);}
 function resize(){if(disposed)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);renderAt();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 return {renderAt,dispose(){if(disposed)return;disposed=true;observer.disconnect();scene.traverse(item=>{item.geometry?.dispose();if(item.material)item.material.dispose();});renderer.dispose();renderer.domElement.remove();}};
}
