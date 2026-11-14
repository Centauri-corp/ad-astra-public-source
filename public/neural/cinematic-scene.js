import * as THREE from './vendor/three.module.js';

// First-party decorative sculpture. Motion responds to the visitor, never to
// invented inference, customer records, or hidden reasoning.
const TAU = Math.PI * 2;
function cortex(u, v, scale = 1) {
 const s = Math.sin(v), c = Math.cos(v);
 const fold = 1 + .045 * Math.sin(8 * u + 2 * Math.sin(5 * v)) * Math.sin(11 * v);
 return new THREE.Vector3(-1.48 * s * Math.cos(u) * fold * scale,
  (1.13 * c * fold - .13 * Math.exp(-Math.pow(s * Math.sin(u) / .18, 2)) * Math.max(0, c)) * scale,
  .97 * s * Math.sin(u) * fold * scale);
}
function merged(parts) {
 const flat = parts.map(g => g.index ? g.toNonIndexed() : g);
 const result = new THREE.BufferGeometry();
 for (const name of ['position', 'normal', 'uv']) {
  const size = flat.reduce((n, g) => n + (g.getAttribute(name)?.array.length || 0), 0);
  if (!size) continue;
  const array = new Float32Array(size); let offset = 0;
  for (const geometry of flat) { const attribute = geometry.getAttribute(name); if (!attribute) continue; array.set(attribute.array, offset); offset += attribute.array.length; }
  result.setAttribute(name, new THREE.BufferAttribute(array, name === 'uv' ? 2 : 3));
 }
 for (const g of new Set([...parts, ...flat])) g.dispose();
 return result;
}
function studioEnvironment(renderer) {
 const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
 const ctx = canvas.getContext('2d');
 ctx.fillStyle = '#101c28'; ctx.fillRect(0, 0, 1024, 512);
 const strip = (x, width, color) => {
  const gradient = ctx.createLinearGradient(x - width, 0, x + width, 0);
  gradient.addColorStop(0, '#101c28'); gradient.addColorStop(.43, color); gradient.addColorStop(.57, color); gradient.addColorStop(1, '#101c28');
  ctx.fillStyle = gradient; ctx.fillRect(x - width, 40, width * 2, 380);
 };
 strip(130, 50, '#cde9f5'); strip(470, 16, '#ffffff'); strip(750, 70, '#a6becb'); strip(940, 22, '#e7cfaa');
 const texture = new THREE.CanvasTexture(canvas); texture.mapping = THREE.EquirectangularReflectionMapping; texture.colorSpace = THREE.SRGBColorSpace;
 const generator = new THREE.PMREMGenerator(renderer), target = generator.fromEquirectangular(texture);
 texture.dispose(); generator.dispose(); return target;
}
export function createCinematicScene(host) {
 const compact = host.clientWidth < 760;
 const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio || 1, compact ? 1.35 : 1.6));
 renderer.setClearColor(0x030709, 0); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .92;
 renderer.domElement.setAttribute('aria-hidden', 'true'); host.append(renderer.domElement);
 const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, .1, 50);
 const environment = studioEnvironment(renderer); scene.environment = environment.texture;
 const sculpture = new THREE.Group(); scene.add(sculpture);
 const bodyGeometry = new THREE.SphereGeometry(1, 72, 48), position = bodyGeometry.attributes.position, uv = bodyGeometry.attributes.uv;
 for (let i = 0; i < position.count; i++) { const p = cortex(uv.getX(i) * TAU, (1 - uv.getY(i)) * Math.PI); position.setXYZ(i, p.x, p.y, p.z); }
 bodyGeometry.computeVertexNormals();
 const glass = new THREE.MeshPhysicalMaterial({color: 0x78a7bb, metalness: .02, roughness: .035, transmission: .94, thickness: .28, ior: 1.46, clearcoat: 1, clearcoatRoughness: .03, transparent: true, opacity: .7, envMapIntensity: .9});
 sculpture.add(new THREE.Mesh(bodyGeometry, glass));
 const folds = [];
 for (let i = 0; i < 132; i++) {
  const baseV = Math.acos(1 - 2 * (i + .5) / 132), baseU = i * 2.39996323, points = [];
  for (let j = 0; j < 36; j++) {
   const a = j / 36 * TAU;
   const v = THREE.MathUtils.clamp(baseV + .115 * Math.sin(a) + .025 * Math.sin(a * 3 + i), .045, Math.PI - .045);
   const u = baseU + (.20 * Math.cos(a) + .045 * Math.sin(a * 2 + i)) / Math.max(.45, Math.sin(baseV));
   points.push(cortex(u, v, 1.025));
  }
  folds.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 44, .024 + .007 * (1 + Math.sin(i)), 7, true));
 }
 const foldsMaterial = new THREE.MeshPhysicalMaterial({color: 0xb6d5df, metalness: .06, roughness: .045, transmission: .88, thickness: .11, ior: 1.46, clearcoat: 1, envMapIntensity: 1.1});
 sculpture.add(new THREE.Mesh(merged(folds), foldsMaterial));
 const pathways = [], filaments = [];
 for (let i = 0; i < 82; i++) {
  const end = cortex(i * 2.39996323, Math.acos(1 - 2 * (i + .5) / 82), .91);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(.04, -.13, 0), new THREE.Vector3(end.x * .3 + .13 * Math.sin(i), end.y * .45, end.z * .25), end]);
  pathways.push(curve);
  const points = curve.getPoints(24);
  for (let j = 1; j < points.length; j++) filaments.push(...points[j - 1].toArray(), ...points[j].toArray());
 }
 const network = new THREE.BufferGeometry(); network.setAttribute('position', new THREE.Float32BufferAttribute(filaments, 3));
 const fiberMaterial = new THREE.LineBasicMaterial({color: 0x9de5f3, transparent: true, opacity: .25});
 sculpture.add(new THREE.LineSegments(network, fiberMaterial));
 const pulseGeometry = new THREE.BufferGeometry(); pulseGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pathways.length * 3), 3));
 const pulseMaterial = new THREE.PointsMaterial({color: 0xbef5ff, size: .035, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false});
 sculpture.add(new THREE.Points(pulseGeometry, pulseMaterial));
 const spiralPoints = [];
 for (let i = 0; i <= 240; i++) {
  const t = i / 240, a = t * TAU * 1.37 - .8, radius = 1.72 - .11 * Math.sin(t * Math.PI);
  spiralPoints.push(new THREE.Vector3(Math.cos(a) * radius, (t - .5) * 3.1, Math.sin(a) * radius * .83));
 }
 const gold = new THREE.MeshPhysicalMaterial({color: 0xcdb895, metalness: .95, roughness: .23, envMapIntensity: 1.9});
 const spiral = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPoints), 240, .023, 8), gold); sculpture.add(spiral);
 const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.12, .0045, 5, 180), new THREE.MeshBasicMaterial({color: 0x9abacb, transparent: true, opacity: .26}));
 orbit.rotation.set(1.24, .28, -.22); sculpture.add(orbit);
 const stars = [];
 for (let i = 0; i < 240; i++) stars.push(Math.sin(i * 127.1) * 12, Math.cos(i * 311.7) * 7, -4 - (i % 12) * .7);
 const starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
 scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({color: 0x9ab7c7, size: .013, transparent: true, opacity: .38, depthWrite: false})));
 scene.add(new THREE.HemisphereLight(0xcdeaff, 0x051321, 2));
 const key = new THREE.DirectionalLight(0xe0f6ff, 4); key.position.set(2, 4, 5); scene.add(key);
 const rim = new THREE.DirectionalLight(0x7cbad7, 3); rim.position.set(-4, .5, -3); scene.add(rim);
 const warm = new THREE.DirectionalLight(0xe9c99b, 2.4); warm.position.set(4, 1, 1); scene.add(warm);
 let disposed = false, time = 0, pointerX = 0, pointerY = 0, scroll = 0, currentMode = 'research';
 const palette = {research: 0xa3e8f4, create: 0xe2c19a, plan: 0xb4c3f2};
 function renderAt(seconds, input = {}) {
  if (disposed) return;
  time = seconds; pointerX += ((input.x || 0) - pointerX) * .045; pointerY += ((input.y || 0) - pointerY) * .045; scroll = input.scroll || 0;
  const mobile = host.clientWidth < 760;
  sculpture.position.set(mobile ? 0 : 1.45, mobile ? .48 : .15, 0);
  sculpture.rotation.set(.13 + pointerY * .1 + Math.sin(time * .13) * .025, -.35 + time * .06 + pointerX * .14, -.08 + Math.sin(time * .11) * .035);
  sculpture.scale.setScalar(mobile ? .83 : 1 + Math.min(scroll, 1) * .04);
  const points = pulseGeometry.attributes.position;
  for (let i = 0; i < pathways.length; i++) { const p = pathways[i].getPoint((time * .12 + i / pathways.length) % 1); points.setXYZ(i, p.x, p.y, p.z); }
  points.needsUpdate = true;
  camera.position.set(pointerX * .1, .12 + pointerY * .06 + scroll * .15, mobile ? 8.8 : 8.4);
  camera.lookAt(0, mobile ? -.1 : .1, 0); renderer.render(scene, camera);
 }
 function resize() { if (disposed) return; const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false); renderAt(time); }
 const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host); resize();
 return {
  renderAt,
  setMode(mode) { if (!Object.hasOwn(palette, mode) || disposed) return; currentMode = mode; fiberMaterial.color.setHex(palette[mode]); pulseMaterial.color.setHex(palette[mode]); renderAt(time); },
  get mode() { return currentMode; },
  dispose() { if (disposed) return; disposed = true; resizeObserver.disconnect(); const materials = new Set(); scene.traverse(item => { item.geometry?.dispose(); if (item.material) materials.add(item.material); }); for (const material of materials) material.dispose(); environment.dispose(); renderer.dispose(); renderer.domElement.remove(); }
 };
}
