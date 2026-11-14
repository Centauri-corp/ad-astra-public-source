/**
 * ORIGINAL PROCEDURAL CGI. An abstract glass neural sculpture, not brain telemetry
 * or AI inference. No raster input, external textures, models, or network assets.
 * Browser entry, served by render-neural-master.cjs with a local import map.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const RECIPE = Object.freeze({
  id: 'ad-astra-neural-master-cgi-v1',
  classification: 'Original procedural CGI / physically based WebGL rendering',
  disclosure: 'Abstract neural sculpture. Not AI inference, human brain telemetry, or an anatomical/medical model.',
  seed: 401913,
  rasterInputs: [],
  palette: { background: '#020710', glass: '#daeff5', filament: '#8ce4ff', champagne: '#cbb894' },
  geometry: { cortexSegments: [160, 112], glassGyri: 60, primaryAxons: 144, fineAxons: 240, spiralTurns: 1.5, spiralSegments: 480 },
  materials: {
    cortex: { transmission: 1, roughness: 0.018, ior: 1.46, thickness: 0.12, metalness: 0 },
    gyri: { transmission: 1, roughness: 0.025, ior: 1.46, thickness: 0.16, metalness: 0 },
    spiral: { transmission: 0.92, roughness: 0.065, ior: 1.48, thickness: 0.24, metalness: 0 },
    goldEdges: { metalness: 0.88, roughness: 0.24 },
  },
  lighting: {
    environment: 'Local RoomEnvironment with slate room (#33414d), no furniture, narrow strip panels at 65% emission; PMREM sigma 0.015',
    environmentIntensity: 0.48,
    lights: [
      { type: 'DirectionalLight', color: '#d9f4ff', intensity: 3.2, position: [1, 6, 6] },
      { type: 'DirectionalLight', color: '#7ccde9', intensity: 2.6, position: [4, 2, -5] },
      { type: 'DirectionalLight', color: '#efdbc0', intensity: 1.15, position: [-4, 3, 2] },
      { type: 'PointLight', color: '#a0eaff', intensity: 1.7, distance: 5, decay: 2, position: [0.12, -0.04, 0.35], localToSculpture: true },
    ],
  },
  camera: {
    landscape: { position: [0, 0.65, 13.5], target: [0, 0.25, 0], fov: 36, near: 0.1, far: 160 },
    portrait: { position: [3.1, 0.9, 19.8], target: [3.1, 0.35, 0], fov: 38, near: 0.1, far: 160 },
  },
  composition: { sculpturePosition: [3.1, 0.65, 0], sculptureRotation: [0.08, -0.32, -0.075], sculptureScale: 1.28, planetCenter: [60, -213, -40], planetRadius: 200, quietLeftFraction: 0.4 },
  rendering: { toneMapping: 'ACESFilmicToneMapping', exposure: 0.91, transmissionResolutionScale: 1, samples: 4, bloom: { strength: 0.24, radius: 0.45, threshold: 1.1 }, animationFrames: 0 },
  limits: { maxPixels: 8294400, maxDimension: 3840, maxTriangles: 750000, maxDrawCalls: 100, maxTextures: 64, renderTimeoutMs: 180000, maxBrowserHeapMB: 2048 },
  limitations: [
    'Rasterized physical materials, environment lighting and screen-space transmission; not path-traced global illumination or spectral caustics.',
    'Bloom uses a downsampled mip pyramid; geometry, physical refraction source and final color buffer are rendered at the declared native dimensions.',
    'Procedural folds and axons are artistic abstractions, not anatomical reconstruction.',
    'GPU/driver versions can change floating point results; source/recipe/seed repeatability does not promise cross-driver byte-identical pixels.',
  ],
});

function randomGenerator(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let n = Math.imul(seed ^ seed >>> 15, 1 | seed);
    n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n;
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
const vector = (x, y, z) => new THREE.Vector3(x, y, z);

// Ovoid cortical silhouette, with broad lobes and fine physical corrugation.
// There is deliberately no face, skull, neck, wire head, or humanoid silhouette.
function cortexPoint(u, v, scale = 1) {
  const sv = Math.sin(v), cv = Math.cos(v);
  const fold = 1 + 0.052 * Math.sin(7 * u + 1.7 * Math.sin(4 * v)) * Math.sin(10 * v + 1.1 * Math.cos(5 * u)) + 0.009 * Math.sin(19 * u + 7 * v);
  const lobes = 1 + 0.035 * Math.cos(3 * u + 0.3) * sv;
  // SphereGeometry's UV winding uses -cos(u); keep it outward-facing.
  const x = -2.6 * sv * Math.cos(u) * fold * lobes;
  let y = 1.98 * cv * fold;
  if (cv < 0) y *= 0.78;
  y += 0.18 * Math.cos(u) * sv - 0.08 * Math.cos(2 * u) * sv;
  let z = 1.58 * sv * Math.sin(u) * fold;
  // A restrained sagittal cleft, rather than a smooth glass balloon.
  y -= 0.28 * Math.exp(-Math.pow(z / 0.28, 2)) * Math.max(0, cv);
  return vector(x * scale, y * scale, z * scale);
}

function mergeMesh(scene, parts, material, name) {
  const geometry = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  scene.add(mesh);
  return mesh;
}

function tube(points, radius, segments = 64, radialSegments = 7, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  return new THREE.TubeGeometry(curve, segments, radius, radialSegments, closed);
}

function makeCortex(group) {
  const [width, height] = RECIPE.geometry.cortexSegments;
  const geometry = new THREE.SphereGeometry(1, width, height);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const p = cortexPoint(uv.getX(i) * Math.PI * 2, (1 - uv.getY(i)) * Math.PI, 0.985);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshPhysicalMaterial({
    color: RECIPE.palette.glass, ...RECIPE.materials.cortex,
    attenuationColor: new THREE.Color('#a3d6e1'), attenuationDistance: 8,
    clearcoat: 1, clearcoatRoughness: 0.035, envMapIntensity: 0.72,
  });
  const cortex = new THREE.Mesh(geometry, material);
  cortex.name = 'folded-optical-glass-cortex';
  group.add(cortex);

  const gyri = [];
  // Quasi-uniform, gently meandering sulcal loops. Avoid longitude/latitude cages.
  for (let i = 0; i < RECIPE.geometry.glassGyri; i++) {
    const vv = Math.acos(1 - 2 * (i + 0.5) / RECIPE.geometry.glassGyri);
    const uu = i * 2.399963229728653;
    const points = [];
    const amplitude = 0.26 + 0.08 * Math.sin(i * 3.3);
    for (let j = 0; j < 48; j++) {
      const t = j / 48;
      const a = t * Math.PI * 2;
      const v = THREE.MathUtils.clamp(vv + amplitude * 0.65 * Math.sin(a) + 0.04 * Math.sin(a * 3 + i), 0.045, Math.PI - 0.045);
      const u = uu + (amplitude * 1.2 * Math.cos(a) + 0.07 * Math.sin(2 * a + i)) / Math.max(0.4, Math.sin(vv));
      points.push(cortexPoint(u, v, 1.035));
    }
    gyri.push(tube(points, 0.057 + 0.039 * (0.5 + 0.5 * Math.sin(i * 1.7)), 84, 12, true));
  }
  const foldMaterial = new THREE.MeshPhysicalMaterial({
    color: '#e1f2f5', ...RECIPE.materials.gyri,
    attenuationColor: new THREE.Color('#a3d6e1'), attenuationDistance: 6,
    clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 0.95,
  });
  mergeMesh(group, gyri, foldMaterial, 'cast-glass-cortical-folds');

  // A small lower rear lobe keeps the sculpture's silhouette recognizably neural.
  const lower = new THREE.SphereGeometry(1, 96, 64);
  const lp = lower.attributes.position;
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i), y = lp.getY(i), z = lp.getZ(i);
    const ripple = 1 + 0.045 * Math.sin(y * 38 + x * 3);
    lp.setXYZ(i, 1.17 + x * 0.99 * ripple, -1.48 + y * 0.71, z * 1.15 * ripple);
  }
  lower.computeVertexNormals();
  const rear = new THREE.Mesh(lower, foldMaterial); rear.name = 'lower-folded-glass-lobe'; group.add(rear);
  const folds = [];
  for (let i = 0; i < 13; i++) {
    const y = -0.89 + i * 0.142;
    const radius = Math.sqrt(Math.max(0.01, 1 - y * y));
    const points = [];
    for(let j=0;j<80;j++) {
      const a = j / 80 * Math.PI * 2;
      points.push(vector(1.17 + Math.cos(a) * radius * 1.02, -1.48 + y * 0.71 + 0.015 * Math.sin(a * 4 + i), Math.sin(a) * radius * 1.18));
    }
    folds.push(tube(points, 0.026, 80, 7, true));
  }
  mergeMesh(group, folds, foldMaterial, 'fine-lower-lobe-lamellae');
}

function makeAxons(group, random) {
  const core = vector(0.12, -0.04, 0.35);
  const sheaths = [], filaments = [], micro = [], nodes = [];
  const endpoints = [];
  for (let i = 0; i < RECIPE.geometry.primaryAxons; i++) {
    const u = random() * Math.PI * 2;
    const v = Math.acos(1 - 2 * random());
    const end = cortexPoint(u, v, 0.91 + 0.04 * random());
    endpoints.push(end);
    const bend = vector((random() - 0.5) * 1.3, (random() - 0.5) * 1.1, (random() - 0.5) * 1.3);
    const points = [];
    for (let j = 0; j <= 10; j++) {
      const t = j / 10;
      const p = core.clone().lerp(end, t);
      p.addScaledVector(bend, Math.sin(t * Math.PI));
      p.addScaledVector(vector(-end.y, end.x, 0.2), Math.sin(t * Math.PI) * 0.22);
      p.y += 0.065 * Math.sin(t * 12 + i) * t;
      points.push(p);
    }
    sheaths.push(tube(points, 0.009 + random() * 0.006, 44, 6));
    filaments.push(tube(points, 0.0028 + random() * 0.0028, 44, 5));
    if (i % 2 === 0) {
      const pivot = points[6];
      const branchEnd = cortexPoint(u + 0.22 + random() * 0.3, v + (random() - 0.5) * 0.4, 0.92);
      const branch = [pivot, pivot.clone().lerp(branchEnd, 0.45).add(vector(0, 0.07, 0.08)), branchEnd];
      filaments.push(tube(branch, 0.0024, 24, 5));
      nodes.push(pivot);
    }
  }
  for (let i = 0; i < RECIPE.geometry.fineAxons; i++) {
    const a = endpoints[Math.floor(random() * endpoints.length)];
    const b = endpoints[Math.floor(random() * endpoints.length)];
    if (a.distanceTo(b) > 3.2) continue;
    const mid = a.clone().lerp(b, 0.5).multiplyScalar(0.82);
    mid.add(vector((random() - 0.5) * 0.2, (random() - 0.5) * 0.25, 0.07));
    micro.push(tube([a, mid, b], 0.0017 + random() * 0.001, 24, 4));
  }
  mergeMesh(group, sheaths, new THREE.MeshPhysicalMaterial({
    color: '#c6edfa', transmission: 0.96, roughness: 0.04, ior: 1.46, thickness: 0.025, envMapIntensity: 1.1,
  }), 'optical-axon-sheaths');
  mergeMesh(group, filaments, new THREE.MeshStandardMaterial({
    color: '#285e73', emissive: '#64b7d0', emissiveIntensity: 0.7, roughness: 0.32, metalness: 0.18,
  }), 'icy-cyan-filament-core');
  mergeMesh(group, micro, new THREE.MeshStandardMaterial({
    color: '#1c4251', emissive: '#3f8298', emissiveIntensity: 0.5, roughness: 0.32, metalness: 0.1,
  }), 'fine-dendritic-branches');
  const glints = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({
    color: '#b3ecff', emissive: '#8ee4ff', emissiveIntensity: 2.4, roughness: 0.12,
  }), nodes.length);
  glints.name = 'subtle-filament-junctions';
  const dummy = new THREE.Object3D();
  nodes.forEach((p, i) => { dummy.position.copy(p); dummy.scale.setScalar(0.009 + random() * 0.009); dummy.updateMatrix(); glints.setMatrixAt(i, dummy.matrix); });
  group.add(glints);
  const emitter = new THREE.Mesh(new THREE.SphereGeometry(0.065, 32, 24), new THREE.MeshStandardMaterial({ color: '#e6faff', emissive: '#b0efff', emissiveIntensity: 5 }));
  emitter.position.copy(core); emitter.name = 'sculpture-light-source'; group.add(emitter);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.16, 48, 32), new THREE.MeshPhysicalMaterial({ color: '#c4edff', transmission: 1, roughness: 0.025, ior: 1.46, thickness: 0.15, clearcoat: 1 }));
  lens.position.copy(core); lens.name = 'core-optical-lens'; group.add(lens);
}

function makeSpiral(group) {
  const samples = RECIPE.geometry.spiralSegments;
  const points = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const a = t * Math.PI * 2 * RECIPE.geometry.spiralTurns + 0.9;
    const envelope = Math.pow(Math.sin(Math.PI * t), 0.62);
    const radius = 0.14 + 1.88 * envelope;
    points.push(vector(Math.sin(a) * radius * 0.84, -1.98 + t * 4.03, Math.cos(a) * radius));
  }
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const frames = curve.computeFrenetFrames(samples, false);
  const positions = [], normals = [], uvs = [], indices = [];
  const edges = [[], []], ring = 12;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = curve.getPointAt(t), n = frames.normals[i], b = frames.binormals[i];
    const taper = 0.12 + 0.88 * Math.pow(Math.sin(Math.PI * t), 0.42);
    const width = 0.185 * taper, depth = 0.044 * taper;
    for (let j = 0; j <= ring; j++) {
      const a = j / ring * Math.PI * 2;
      const q = p.clone().addScaledVector(n, Math.cos(a) * width).addScaledVector(b, Math.sin(a) * depth);
      const nn = n.clone().multiplyScalar(Math.cos(a) / width).addScaledVector(b, Math.sin(a) / depth).normalize();
      positions.push(q.x, q.y, q.z); normals.push(nn.x, nn.y, nn.z); uvs.push(t, j / ring);
      if (i < samples && j < ring) {
        const k = i * (ring + 1) + j;
        indices.push(k, k + 1, k + ring + 1, k + 1, k + ring + 2, k + ring + 1);
      }
    }
    edges[0].push(p.clone().addScaledVector(n, width));
    edges[1].push(p.clone().addScaledVector(n, -width));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const ribbon = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({
    color: '#e0cba9', ...RECIPE.materials.spiral, attenuationColor: new THREE.Color('#d9bb8f'), attenuationDistance: 0.85,
    clearcoat: 1, clearcoatRoughness: 0.045, envMapIntensity: 1.3, side: THREE.DoubleSide,
  }));
  ribbon.name = 'champagne-optical-spiral'; group.add(ribbon);
  mergeMesh(group, edges.map(p => tube(p, 0.009, samples, 6)), new THREE.MeshStandardMaterial({
    color: RECIPE.palette.champagne, ...RECIPE.materials.goldEdges, envMapIntensity: 0.9,
  }), 'restrained-champagne-gold-edges');
}

const noiseGLSL = `
float hash(vec3 p) { p=fract(p*0.3183099+vec3(.11,.23,.37)); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 p) { vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p) { float s=0., a=.5; for(int i=0;i<6;i++){s+=noise(p)*a;p=p*2.07+vec3(12.2,3.1,7.7);a*=.5;}return s; }
`;

function makePlanet(scene) {
  const planet = new THREE.Mesh(new THREE.SphereGeometry(RECIPE.composition.planetRadius, 192, 112), new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vW;
      void main(){ vP=position; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `varying vec3 vP; varying vec3 vN; varying vec3 vW; ${noiseGLSL}
      void main(){ vec3 n=normalize(vN), view=normalize(cameraPosition-vW);float mu=max(0.,dot(n,view));
        vec3 landP=vP*.53;float continents=fbm(landP*.32+vec3(2.,7.,1.));
        float terrain=fbm(landP*4.8+fbm(landP*1.7)*3.);float ridges=pow(1.-abs(terrain*2.-1.),8.);
        float clouds=smoothstep(.49,.71,fbm(landP*.95+vec3(1.,0.,5.))+.15*fbm(landP*9.));
        float light=.18+.82*max(0.,dot(n,normalize(vec3(.6,.7,.5))));
        vec3 ocean=vec3(.003,.012,.022), land=vec3(.012,.027,.037)+ridges*vec3(.026,.042,.048);
        vec3 color=mix(ocean,land,smoothstep(.46,.58,continents));
        color=mix(color,vec3(.068,.106,.122),clouds*.55)*light;
        float rim=pow(1.-mu,13.); color+=vec3(.036,.16,.22)*rim;
        gl_FragColor=vec4(color,1.);
      }`,
  }));
  planet.name = 'procedural-planetary-horizon'; planet.position.fromArray(RECIPE.composition.planetCenter); scene.add(planet);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(RECIPE.composition.planetRadius + 0.075, 192, 112), new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vN;varying vec3 vW;void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `varying vec3 vN;varying vec3 vW;void main(){float m=abs(dot(normalize(vN),normalize(cameraPosition-vW)));float a=pow(1.-m,48.);gl_FragColor=vec4(vec3(.32,.73,.92)*1.8,a*.8);}`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  atmosphere.name = 'thin-cyan-planet-atmosphere'; atmosphere.position.copy(planet.position); scene.add(atmosphere);
}

function makeBackground(scene, random) {
  const background = new THREE.Mesh(new THREE.PlaneGeometry(140, 90), new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv;void main(){vec2 p=vUv;float glow=exp(-length((p-vec2(.61,.48))*vec2(9.,6.))*2.3);vec3 c=vec3(.00055,.0014,.0032)+glow*vec3(.002,.009,.015);gl_FragColor=vec4(c,1.);}`,
    depthWrite: false,
  }));
  background.position.set(0, 0, -36); background.name = 'almost-black-navy-space'; scene.add(background);
  const stars = [];
  for (let i = 0; i < 54; i++) stars.push(1 + random() * 20, -1 + random() * 13, -22 - random() * 4);
  const g = new THREE.BufferGeometry();g.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
  const points = new THREE.Points(g, new THREE.PointsMaterial({ color: '#769eaf', size: 0.012, transparent: true, opacity: 0.23, depthWrite: false }));
  points.name = 'sparse-distant-stars'; scene.add(points);
}

export async function renderNeuralMaster({ canvas, width, height, dpr = 1, composition = 'landscape' }) {
  if (![width, height].every(n => Number.isInteger(n) && n > 0) || ![1, 2, 3].includes(dpr) ||
      width * height * dpr * dpr > RECIPE.limits.maxPixels || Math.max(width, height) * dpr > RECIPE.limits.maxDimension || !Object.hasOwn(RECIPE.camera, composition)) {
    throw new Error('Native render dimensions/composition exceed the bounded recipe');
  }
  const started = performance.now();
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  const context = renderer.getContext();
  const debug = context.getExtension('WEBGL_debug_renderer_info');
  const capabilities = {
    webglVersion: context.getParameter(context.VERSION),
    renderer: debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER),
    vendor: debug ? context.getParameter(debug.UNMASKED_VENDOR_WEBGL) : context.getParameter(context.VENDOR),
    maxTextureSize: context.getParameter(context.MAX_TEXTURE_SIZE),
    maxRenderbufferSize: context.getParameter(context.MAX_RENDERBUFFER_SIZE),
  };
  const nativeWidth = width * dpr, nativeHeight = height * dpr;
  if (Math.max(nativeWidth, nativeHeight) > Math.min(capabilities.maxTextureSize, capabilities.maxRenderbufferSize)) throw new Error('WebGL native render target unsupported');
  renderer.setPixelRatio(dpr); renderer.setSize(width, height, false);
  renderer.transmissionResolutionScale = RECIPE.rendering.transmissionResolutionScale;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = RECIPE.rendering.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.info.autoReset = false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(RECIPE.palette.background);
  const room = new RoomEnvironment();
  const furniture = [];
  room.traverse(object => {
    if (object.isInstancedMesh) {
      furniture.push(object); // Its geometry/material are shared; room.dispose owns them.
    } else if (object.isMesh && object.material.emissiveIntensity > 1) {
      object.material.emissiveIntensity *= 0.65;
      // Preserve six photographic strip sources rather than broad white squares.
      if (object.scale.x < 0.2) object.scale.z *= 0.16;
      else object.scale.x *= 0.14;
    } else if (object.isMesh) object.material.color.set('#33414d');
  });
  for (const object of furniture) room.remove(object);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.015);
  scene.environment = environment.texture; scene.environmentIntensity = RECIPE.lighting.environmentIntensity;
  for (const object of furniture) room.add(object);
  room.dispose(); pmrem.dispose();
  const random = randomGenerator(RECIPE.seed);
  makeBackground(scene, random); makePlanet(scene);
  const group = new THREE.Group(); group.name = 'abstract-glass-neural-sculpture';
  group.position.fromArray(RECIPE.composition.sculpturePosition); group.rotation.fromArray(RECIPE.composition.sculptureRotation); group.scale.setScalar(RECIPE.composition.sculptureScale);
  scene.add(group);
  makeCortex(group); makeAxons(group, random); makeSpiral(group);
  for (const light of RECIPE.lighting.lights) {
    const object = light.type === 'PointLight' ? new THREE.PointLight(light.color, light.intensity, light.distance, light.decay) : new THREE.DirectionalLight(light.color, light.intensity);
    object.position.fromArray(light.position); (light.localToSculpture ? group : scene).add(object);
  }
  const cameraRecipe = RECIPE.camera[composition];
  const camera = new THREE.PerspectiveCamera(cameraRecipe.fov, width / height, cameraRecipe.near, cameraRecipe.far);
  camera.position.fromArray(cameraRecipe.position); camera.lookAt(...cameraRecipe.target); camera.updateMatrixWorld();
  let triangles = 0, meshCount = 0;
  scene.traverse(object => {
    if (object.isMesh) { meshCount++; triangles += (object.geometry.index ? object.geometry.index.count : object.geometry.attributes.position.count) / 3 * (object.isInstancedMesh ? object.count : 1); }
  });
  if (triangles > RECIPE.limits.maxTriangles) throw new Error(`Triangle bound exceeded: ${triangles}`);
  const target = new THREE.WebGLRenderTarget(nativeWidth, nativeHeight, { type: THREE.HalfFloatType, samples: RECIPE.rendering.samples });
  const composer = new EffectComposer(renderer, target);
  // Explicitly pass logical size; composer applies the renderer's DPR once.
  composer.setSize(width, height);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(nativeWidth, nativeHeight), RECIPE.rendering.bloom.strength, RECIPE.rendering.bloom.radius, RECIPE.rendering.bloom.threshold);
  const output = new OutputPass();
  composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(output);
  renderer.info.reset();
  composer.render(0); context.finish();
  const glError = context.getError();
  if (glError !== context.NO_ERROR || context.isContextLost()) throw new Error(`WebGL failed: ${glError}, contextLost=${context.isContextLost()}`);
  const stats = { ...structuredClone(renderer.info.render), memory: { ...renderer.info.memory }, programs: renderer.info.programs.length, sceneTriangles: triangles, meshCount };
  if (stats.calls > RECIPE.limits.maxDrawCalls || stats.memory.textures > RECIPE.limits.maxTextures) throw new Error(`GPU resource bound exceeded: ${JSON.stringify(stats)}`);
  const projection = group.position.clone().project(camera);
  const proof = {
    recipe: RECIPE, threeRevision: THREE.REVISION, capabilities, stats,
    dimensions: { cssWidth: width, cssHeight: height, requestedDPR: dpr, browserDPR: window.devicePixelRatio, canvasWidth: canvas.width, canvasHeight: canvas.height, drawingBufferWidth: context.drawingBufferWidth, drawingBufferHeight: context.drawingBufferHeight, composerWidth: target.width, composerHeight: target.height, transmissionScale: renderer.transmissionResolutionScale },
    camera: { ...cameraRecipe, aspect: camera.aspect, projectionMatrix: camera.projectionMatrix.toArray(), matrixWorld: camera.matrixWorld.toArray() },
    corePixel: { x: Math.round((projection.x * 0.5 + 0.5) * nativeWidth), y: Math.round((-projection.y * 0.5 + 0.5) * nativeHeight) },
    renderMs: Math.round(performance.now() - started), glError,
  };
  let disposed = false;
  return {
    proof,
    dispose() {
      if (disposed) return; disposed = true;
      const geometries = new Set(), materials = new Set();
      scene.traverse(o => { if(o.geometry) geometries.add(o.geometry); if(o.material) for(const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m); });
      for(const g of geometries) g.dispose(); for(const m of materials) m.dispose();
      scene.environment = null; environment.dispose();
      for(const pass of [renderPass, bloom, output]) pass.dispose();
      composer.dispose(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
