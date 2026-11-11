import * as THREE from './vendor/three.module.js';

// First-party procedural concept geometry. No prompt, account or provider access.
export function createScene(host,{reducedMotion=false,onContextLost=()=>{}}={}){
 const canvas=document.createElement('canvas');canvas.className='neural-canvas';canvas.setAttribute('aria-hidden','true');
 let renderer;
 try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});}catch{canvas.remove();throw Error('WebGL unavailable');}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
 const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,50);camera.position.set(0,.1,5.5);
 const sculpture=new THREE.Group();world.add(sculpture);
 const geometries=new Set(),materials=new Set();
 const geometry=g=>{geometries.add(g);return g;},material=m=>{materials.add(m);return m;};
 // A self-authored studio environment supplies physically based reflections.
 const studio=new THREE.Scene();studio.background=new THREE.Color('#142333');
 const panelGeometry=geometry(new THREE.PlaneGeometry(8,8));
 for(const[position,color,intensity]of[[[3,3,2],0xc6efff,4],[[-3,1,-2],0xf4d7b4,3],[[0,-3,1],0x537fb0,1.5]]){
  const panel=new THREE.Mesh(panelGeometry,material(new THREE.MeshBasicMaterial({color:color})));panel.material.color.multiplyScalar(intensity);panel.position.set(...position);panel.lookAt(0,0,0);studio.add(panel);
 }
 const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,.08,.1,30);world.environment=environment.texture;pmrem.dispose();
 world.add(new THREE.HemisphereLight(0xb5e7ff,0x192534,2));
 for(const[color,intensity,x,y,z]of[[0xe3f8ff,4,3,4,3],[0xd8b58c,3,-3,2,0],[0x5475b5,2,0,-2,3]]){const light=new THREE.DirectionalLight(color,intensity);light.position.set(x,y,z);world.add(light);}
 const glass=material(new THREE.MeshPhysicalMaterial({color:0x5a9fb1,metalness:.18,roughness:.12,transmission:.72,thickness:1.2,ior:1.45,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.3}));
 const heart=new THREE.Mesh(geometry(new THREE.IcosahedronGeometry(.68,4)),glass);heart.scale.set(.96,1.14,.96);sculpture.add(heart);
 const metal=material(new THREE.MeshStandardMaterial({color:0xc8c4b7,metalness:.95,roughness:.2,envMapIntensity:1.5}));
 const gold=material(new THREE.MeshStandardMaterial({color:0xc5a16d,metalness:.85,roughness:.23,envMapIntensity:1.3}));
 for(let arm=0;arm<3;arm++){
  const points=[];
  for(let i=0;i<=100;i++){const t=i/100,angle=t*Math.PI*3.3+arm*Math.PI*2/3,radius=.83+.15*Math.sin(t*Math.PI);points.push(new THREE.Vector3(Math.cos(angle)*radius,(t-.5)*2.4,Math.sin(angle)*radius));}
  const tube=new THREE.Mesh(geometry(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),128,.035,8,false)),arm===1?gold:metal);sculpture.add(tube);
 }
 for(let i=0;i<2;i++){const orbit=new THREE.Mesh(geometry(new THREE.TorusGeometry(1.3+i*.12,.018,8,150)),i?gold:metal);orbit.rotation.set(.5+i*.8,.3+i*.6,-.5+i*.9);sculpture.add(orbit);}
 const nodes=[],count=120;
 for(let i=0;i<count;i++){const y=1-2*(i+.5)/count,r=Math.sqrt(1-y*y),a=i*2.3999632297;nodes.push(new THREE.Vector3(Math.cos(a)*r*.78,y*.9,Math.sin(a)*r*.78));}
 const nodeMaterial=material(new THREE.MeshStandardMaterial({color:0x98dbe6,emissive:0x3f8698,emissiveIntensity:1.2,metalness:.3,roughness:.25}));
 const nodeMesh=new THREE.InstancedMesh(geometry(new THREE.IcosahedronGeometry(.014,1)),nodeMaterial,count),matrix=new THREE.Matrix4();
 nodes.forEach((p,i)=>{matrix.makeTranslation(p.x,p.y,p.z);nodeMesh.setMatrixAt(i,matrix);});sculpture.add(nodeMesh);
 const connections=[];
 nodes.forEach((p,i)=>{const nearest=nodes.map((q,j)=>({j,d:p.distanceToSquared(q)})).filter(v=>v.j!==i).sort((a,b)=>a.d-b.d).slice(0,3);for(const {j}of nearest)if(j>i)connections.push(p.x,p.y,p.z,nodes[j].x,nodes[j].y,nodes[j].z);});
 const lattice=geometry(new THREE.BufferGeometry());lattice.setAttribute('position',new THREE.Float32BufferAttribute(connections,3));
 sculpture.add(new THREE.LineSegments(lattice,material(new THREE.LineBasicMaterial({color:0x83c6d6,transparent:true,opacity:.42}))));
 const dust=[];for(let i=0;i<160;i++){const angle=i*2.39996,radius=2.2+(i%17)/8;dust.push(Math.cos(angle)*radius,Math.sin(angle*1.7)*2.5,-1.5-(i%13)/7);}
 const stars=geometry(new THREE.BufferGeometry());stars.setAttribute('position',new THREE.Float32BufferAttribute(dust,3));world.add(new THREE.Points(stars,material(new THREE.PointsMaterial({color:0x799aae,size:.009,transparent:true,opacity:.65}))));
 let paused=reducedMotion,visible=true,disposed=false,frame=0,last=0,elapsed=0,pitch=0,yaw=0;
 const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
 function draw(){if(disposed||document.hidden||!visible)return;sculpture.rotation.set(pitch,yaw+elapsed*.075,-.16);renderer.render(world,camera);}
 function tick(now){frame=0;if(disposed||paused||reducedMotion||document.hidden||!visible)return;if(now-last>=33){if(last)elapsed+=Math.min((now-last)/1000,.1);last=now;draw();}frame=requestAnimationFrame(tick);}
 function sync(){cancelAnimationFrame(frame);frame=0;last=0;if(!disposed&&!paused&&!reducedMotion&&!document.hidden&&visible)frame=requestAnimationFrame(tick);draw();}
 function resize(){if(disposed)return;const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);draw();}
 function rotate(x,y){if(disposed)return;pitch=clamp(pitch+x,-.6,.6);yaw=clamp(yaw+y,-1.1,1.1);host.dataset.pitch=pitch.toFixed(2);host.dataset.yaw=yaw.toFixed(2);draw();}
 function pointer(event){if(reducedMotion||disposed||event.pointerType==='touch')return;const rect=host.getBoundingClientRect();pitch=clamp((event.clientY-rect.top)/rect.height-.5,-.5,.5)*.45;yaw=clamp((event.clientX-rect.left)/rect.width-.5,-.5,.5)*.8;draw();}
 function reset(){pitch=0;yaw=0;elapsed=0;host.dataset.pitch='0.00';host.dataset.yaw='0.00';draw();}
 function lost(event){event.preventDefault();dispose();onContextLost();}
 function visibility(){sync();}
 const resizeObserver=new ResizeObserver(resize),intersection=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting===true;sync();},{threshold:0});
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);resizeObserver.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',lost);host.removeEventListener('pointermove',pointer);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();environment.dispose();renderer.dispose();canvas.remove();}
 canvas.addEventListener('webglcontextlost',lost);host.addEventListener('pointermove',pointer);document.addEventListener('visibilitychange',visibility);
 host.append(canvas);resizeObserver.observe(host);intersection.observe(host);resize();sync();
 function setActivity(value){const colors={idle:0x3f8698,listening:0x6b59a0,requesting:0x437ba8,responding:0x4c9c91,speaking:0xaa8450,error:0x98675b};if(!Object.hasOwn(colors,value)||disposed)return;nodeMaterial.emissive.setHex(colors[value]);nodeMaterial.emissiveIntensity=value==='idle'?1.2:1.7;host.dataset.activity=value;draw();}
 return {setPaused(value){paused=!!value;sync();},setReducedMotion(value){reducedMotion=!!value;if(reducedMotion)paused=true;sync();},setActivity,rotate,reset,dispose};
}
