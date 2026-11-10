'use strict';

// One registry serves pointer, keyboard, menu, and direct-link navigation.
const modes = {
  ask: {number:'01 / ASK', title:['Find the question','behind the question.'], description:'Move from a broad idea to a focused inquiry. Explore assumptions, connect context and identify what is worth investigating next.', example:'“What would change if energy were abundant?”', image:'adobe-curiosity.jpg', alt:'A hand sketches connected ideas in a notebook beside a luminous conceptual interface'},
  research: {number:'02 / RESEARCH', title:['See the evidence.','Connect the ideas.'], description:'Bring different perspectives into view. Our research direction emphasizes sources, uncertainty and connections across disciplines.', example:'“How do energy, water and agriculture shape one another?”', image:'runway-curiosity-notes.jpg', alt:'Handwritten research notes in an open notebook outdoors'},
  create: {number:'03 / CREATE', title:['Give a bold idea','a clearer shape.'], description:'Explore alternative approaches, develop a concept and find new ways to express it. Human intention guides the creative process.', example:'“Imagine a learning environment built around curiosity.”', image:'astra-lumen-neural-profile.png', alt:'A luminous neural profile with connected cyan and violet pathways'},
  learn: {number:'04 / LEARN', title:['Understand more.','Keep going further.'], description:'Approach a complex subject through questions, explanations and connections. Build understanding at a pace that supports deeper thought.', example:'“Explain orbital mechanics through everyday experiences.”', image:'astra-lumen-neural-brain.png', alt:'A translucent neural brain with cyan synapses and gold orbital paths'},
  explore: {number:'05 / EXPLORE', title:['Look beyond','the familiar.'], description:'Follow an idea across science, technology and human experience. Discover new perspectives and questions worth pursuing.', example:'“What could living beyond Earth teach us about life here?”', image:'astra-lumen-neural-horizon.png', alt:'A neural intelligence lattice rising over an illuminated Earth horizon'}
};
const tabs = [...document.querySelectorAll('[role="tab"]')];
const experienceImage = document.getElementById('experience-image');
function selectMode(tab) {
  const mode = modes[tab?.dataset.mode];
  if (!mode) return;
  tabs.forEach(item => {item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1;});
  document.getElementById('mode-number').textContent = mode.number;
  document.getElementById('mode-title').replaceChildren(document.createTextNode(mode.title[0]), document.createElement('br'), document.createTextNode(mode.title[1]));
  document.getElementById('mode-description').textContent = mode.description;
  document.getElementById('mode-example').textContent = mode.example;
  document.getElementById('experience-panel').setAttribute('aria-labelledby', tab.id);
  experienceImage.src = 'assets/' + mode.image;
  experienceImage.alt = mode.alt;
  document.getElementById('mode-art-label').textContent = 'AD ASTRA / ' + mode.number.slice(0, 2);
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectMode(tab));
  tab.addEventListener('keydown', event => {
    const next = {ArrowRight:(index+1)%tabs.length, ArrowLeft:(index+tabs.length-1)%tabs.length, Home:0, End:tabs.length-1}[event.key];
    if (next === undefined) return;
    event.preventDefault(); selectMode(tabs[next]); tabs[next].focus();
  });
});

const menuButton = document.querySelector('.menu');
const mobileNav = document.getElementById('mobile-nav');
const desktopMenus = [...document.querySelectorAll('.desktop-nav .nav-menu')];
const scrim = document.getElementById('nav-scrim');
const desktopViewport = matchMedia('(min-width: 901px)');
function closeDesktopMenus() {desktopMenus.forEach(item => {item.open = false;}); scrim.hidden = true;}
function setMobileMenu(open) {
  mobileNav.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  menuButton.querySelector('span').textContent = open ? '×' : '☰';
  document.body.classList.toggle('navigation-open', open);
}
menuButton.addEventListener('click', () => setMobileMenu(mobileNav.hidden));
desktopMenus.forEach(item => item.addEventListener('toggle', () => {
  if (item.open) desktopMenus.forEach(other => {if (other !== item) other.open = false;});
  scrim.hidden = !desktopMenus.some(other => other.open);
}));
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('.site-header')) closeDesktopMenus();
  if (!mobileNav.hidden && !event.target.closest('.site-header, #mobile-nav')) setMobileMenu(false);
});
document.addEventListener('focusin', event => {
  if (!event.target.closest('.site-header')) closeDesktopMenus();
  if (!mobileNav.hidden && !event.target.closest('.site-header, #mobile-nav')) setMobileMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (!mobileNav.hidden) {setMobileMenu(false); menuButton.focus();}
  const openMenu = desktopMenus.find(item => item.open);
  if (openMenu) {closeDesktopMenus(); openMenu.querySelector('summary').focus();}
});
desktopViewport.addEventListener('change', () => {setMobileMenu(false); closeDesktopMenus();});

const researchToggle = document.getElementById('research-toggle');
const researchNote = document.getElementById('research-note');
function setResearch(open) {
  researchNote.hidden = !open;
  researchToggle.setAttribute('aria-expanded', String(open));
  researchToggle.querySelector('span').textContent = open ? '−' : '+';
}
researchToggle.addEventListener('click', () => setResearch(researchNote.hidden));
function routeHash(hash, focus = false) {
  const modeTab = tabs.find(tab => '#' + tab.id === hash);
  if (modeTab) {selectMode(modeTab); if (focus) modeTab.focus({preventScroll:true});}
  if (hash === '#research-note') setResearch(true);
}
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
  const hash = link.getAttribute('href');
  routeHash(hash, true);
  closeDesktopMenus(); setMobileMenu(false);
}));
window.addEventListener('hashchange', () => routeHash(location.hash));
routeHash(location.hash);

// Motion has one authority: visitor preference, visibility, viewport and film state.
const motionButton = document.querySelector('.motion');
const motionVideos = [...document.querySelectorAll('.motion-video')];
const filmDialog = document.getElementById('film-dialog');
const filmVideo = document.getElementById('company-film');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let motionPaused = reducedMotion.matches || Boolean(navigator.connection?.saveData);
const visibleVideos = new Set();
function syncMotion() {
  document.body.classList.toggle('paused', motionPaused);
  motionButton.setAttribute('aria-pressed', String(motionPaused));
  motionButton.innerHTML = motionPaused ? 'Play motion <span aria-hidden="true">▶</span>' : 'Pause motion <span aria-hidden="true">Ⅱ</span>';
  const permitted = !motionPaused && !document.hidden && !(filmDialog && filmDialog.open);
  document.body.classList.toggle('motion-suspended', !permitted);
  motionVideos.forEach(video => {
    if (!permitted || !visibleVideos.has(video) || video.dataset.failed === 'true') {video.pause(); return;}
    // The Runway hero is a camera approach, not a seamless loop. Hold its last frame.
    if (video.ended && !video.loop) return;
    video.play().catch(error => {
      if (error.name === 'AbortError') return;
      video.classList.remove('playing');
      if (error.name === 'NotAllowedError') {motionPaused = true; syncMotion();}
    });
  });
}
motionVideos.forEach(video => {
  video.muted = true;
  video.addEventListener('playing', () => video.classList.add('playing'));
  video.addEventListener('error', () => {video.classList.remove('playing'); video.dataset.failed = 'true';});
});
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.isIntersecting ? visibleVideos.add(entry.target) : visibleVideos.delete(entry.target));
    syncMotion();
  }, {threshold:0.01});
  motionVideos.forEach(video => observer.observe(video));
} else {motionVideos.forEach(video => visibleVideos.add(video));}
motionButton.addEventListener('click', () => {
  motionPaused = !motionPaused;
  if (!motionPaused) motionVideos.forEach(video => {if (video.ended && !video.loop) video.currentTime = 0;});
  syncMotion();
});
reducedMotion.addEventListener('change', event => {motionPaused = event.matches; syncMotion();});
document.addEventListener('visibilitychange', syncMotion);
syncMotion();

// Film premiere is withheld until final audiovisual acceptance.

const approachSteps = [...document.querySelectorAll('.approach-steps details')];
const knowledgeVisual = document.querySelector('.knowledge-visual');
function highlightStep(step) {
  knowledgeVisual.dataset.active = step || '';
  document.querySelectorAll('[data-node]').forEach(node => node.classList.toggle('active', node.dataset.node === step));
}
approachSteps.forEach(step => step.addEventListener('toggle', () => {
  if (step.open) approachSteps.forEach(other => {if (other !== step) other.open = false;});
  highlightStep(approachSteps.find(other => other.open)?.dataset.step);
}));
highlightStep('question');

// The public neural artwork responds locally to visitor motion. No sensor data leaves the page.
const neuralVisual = document.querySelector('.neural-brain-visual');
if (neuralVisual) {
  const setNeuralMotion = (x, y) => {
    const tiltX = Math.max(-9, Math.min(9, x * 9));
    const tiltY = Math.max(-7, Math.min(7, y * 7));
    neuralVisual.style.setProperty('--brain-tilt-x', `${tiltX}deg`);
    neuralVisual.style.setProperty('--brain-tilt-y', `${-tiltY}deg`);
    neuralVisual.dataset.sensor = 'active';
  };
  neuralVisual.addEventListener('pointermove', event => {
    const rect = neuralVisual.getBoundingClientRect();
    setNeuralMotion((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1);
  }, {passive:true});
  neuralVisual.addEventListener('pointerleave', () => setNeuralMotion(0, 0));
  if ('DeviceOrientationEvent' in window && !reducedMotion.matches) {
    window.addEventListener('deviceorientation', event => setNeuralMotion((event.gamma || 0) / 30, (event.beta || 0) / 45), {passive:true});
  }
}

const sceneNames = {arrival:'ARRIVAL', vision:'THE VISION', approach:'OUR APPROACH', experiences:'FIVE WAYS FORWARD', horizon:'NEW HORIZON', company:'THE COMPANY', signature:'STAY CURIOUS'};
const chapters = [...document.querySelectorAll('.chapter-nav a')];
const sections = [...document.querySelectorAll('[data-scene]')];
const progress = document.getElementById('reading-progress');
let scrollFrame = 0;
function updateReading() {
  scrollFrame = 0;
  const available = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${available > 0 ? Math.min(1, Math.max(0, scrollY / available)) : 0})`;
  const active = [...sections].reverse().find(section => section.getBoundingClientRect().top <= innerHeight * 0.4) || sections[0];
  document.body.dataset.activeScene = active.dataset.scene;
  document.getElementById('scene-label').textContent = `${active.dataset.sceneIndex} / ${sceneNames[active.dataset.scene]}`;
  chapters.forEach(link => {if (link.hash === '#' + active.id) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');});
}
window.addEventListener('scroll', () => {if (!scrollFrame) scrollFrame = requestAnimationFrame(updateReading);}, {passive:true});
window.addEventListener('resize', () => {if (!scrollFrame) scrollFrame = requestAnimationFrame(updateReading);});
window.addEventListener('load', updateReading);
updateReading();

document.getElementById('save-launch').addEventListener('click', async () => {
  const result = document.getElementById('save-result');
  const url = 'https://adastra.global/';
  try {
    if (navigator.share) {await navigator.share({title:'Ad Astra', text:'A new horizon for human curiosity. Ad Astra is coming soon.', url}); result.textContent = '';}
    else if (navigator.clipboard) {await navigator.clipboard.writeText(url); result.textContent = 'Launch-page link copied. Share it with a curious mind.';}
    else result.textContent = 'Share our launch page: ' + url;
  } catch (error) {if (error.name !== 'AbortError') result.textContent = 'Share our launch page: ' + url;}
});

// Local-only neural field visualizer. It is deliberately decoupled from server
// telemetry, model weights and customer prompts; it provides a bounded visual
// simulation for the public intelligence-layer concept.
(() => {
  const section = document.getElementById('intelligence-layer');
  const canvas = document.getElementById('neural-field-canvas');
  if (!section || !canvas) return;
  const tabs = [...section.querySelectorAll('.intelligence-tab')];
  const label = document.getElementById('intelligence-readout-label');
  const value = document.getElementById('intelligence-readout-value');
  const activityLabel = document.getElementById('intelligence-activity');
  const input = document.getElementById('intelligence-input');
  const form = document.getElementById('intelligence-prompt');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const labels = {
    1: ['NARROW AI / BOUNDED SIGNAL FLOW', 'A clean, predictable field for focused tasks.'],
    2: ['AGI / CROSS-DOMAIN TOPOLOGY', 'A research-direction field for connected reasoning.'],
    3: ['ASI / HYPOTHETICAL HORIZON', 'A denser visual horizon for multi-threaded possibility.']
  };
  let tier = 1, activity = 0, targetActivity = 0, visible = true, frame = 0, started = performance.now();
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' });
  // Even without WebGL, never allow a local demo form to navigate or submit.
  form?.addEventListener('submit', event => event.preventDefault());
  if (!gl) {
    canvas.hidden = true;
    activityLabel.textContent = 'STATIC FALLBACK / WEBGL UNAVAILABLE';
    document.getElementById('voice-command')?.setAttribute('disabled', '');
    document.getElementById('voice-help').textContent = 'The interactive visual demo is unavailable. Explore the static artwork and product directions instead.';
    if (input) input.disabled = true;
    form?.querySelector('button')?.setAttribute('disabled', '');
    return;
  }
  const vertexSource = [
    'attribute vec2 position;',
    'void main(){gl_Position=vec4(position,0.0,1.0);}'
  ].join('\n');
  const fragmentSource = [
    'precision highp float;',
    'uniform vec2 u_resolution;',
    'uniform float u_time;',
    'uniform float u_tier;',
    'uniform float u_activity;',
    'uniform float u_amplitude;',
    'uniform float u_state;',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float spiralLine(vec2 p,float arm,float t){float r=length(p);float a=atan(p.y,p.x);float twist=a+log(r+.12)*(3.1+arm*.08)-t;float wave=abs(sin((twist+arm*1.256637)*2.0));float line=1.0-smoothstep(0.0,.18,wave);float pulse=.5+.5*sin(twist*10.0+r*24.0-t*2.0);return line*(.35+.65*pulse)*smoothstep(1.22,.06,r);}',
    'void main(){vec2 p=(gl_FragCoord.xy-.5*u_resolution.xy)/u_resolution.y;float speed=u_tier==3.0?1.8:(u_tier==2.0?1.15:.65);float t=u_time*speed;float voice=u_amplitude*(.18+.12*sin(t*7.0));float statePulse=u_state==1.0?sin(t*18.0)*.035:(u_state==2.0?sin(t*24.0)*.08:0.0);vec2 q=p+vec2(voice+statePulse);float spiral=0.0;float nodes=0.0;for(int arm=0;arm<5;arm++){float line=spiralLine(q,float(arm),t);spiral=max(spiral,line);nodes+=line*(.5+.5*sin(float(arm)*4.0+t*3.0));}float r=length(q);float core=exp(-r*9.0);float halo=exp(-r*2.4);vec2 starCell=floor((q+vec2(2.0))*72.0);float stars=step(.997,hash(starCell));vec3 base=vec3(.002,.008,.018);vec3 cyan=vec3(.0,.46,.58);vec3 green=vec3(.08,.56,.42);vec3 violet=vec3(.48,.18,.78);vec3 champagne=vec3(.91,.79,.56);vec3 accent=u_state==1.0?violet:(u_state==2.0?champagne:(u_tier==1.0?cyan:(u_tier==2.0?green:violet)));float intensity=.48+u_activity*.16+u_amplitude*.32+abs(statePulse)*2.0;vec3 color=base+accent*(spiral*intensity+core*(1.15+u_amplitude*.8)+halo*.16)+champagne*nodes*.08+vec3(.15,.34,.45)*stars;gl_FragColor=vec4(color,1.0);}'
  ].join('\n');
  function shader(type, source) {
    const item = gl.createShader(type); if (!item) return null;
    gl.shaderSource(item, source); gl.compileShader(item);
    if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) { gl.deleteShader(item); return null; }
    return item;
  }
  const vertex = shader(gl.VERTEX_SHADER, vertexSource), fragment = shader(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) { canvas.hidden = true; activityLabel.textContent = 'STATIC FALLBACK / SHADER UNAVAILABLE'; return; }
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { canvas.hidden = true; activityLabel.textContent = 'STATIC FALLBACK / SHADER UNAVAILABLE'; return; }
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = {
    resolution: gl.getUniformLocation(program, 'u_resolution'),
    time: gl.getUniformLocation(program, 'u_time'),
    tier: gl.getUniformLocation(program, 'u_tier'),
    activity: gl.getUniformLocation(program, 'u_activity')
    ,amplitude: gl.getUniformLocation(program, 'u_amplitude'),
    state: gl.getUniformLocation(program, 'u_state')
  };
  const pointVertexSource = [
    'attribute vec3 a_position3d;',
    'attribute float a_arm3d;',
    'attribute float a_size3d;',
    'uniform float u_time3d;',
    'uniform float u_tier3d;',
    'uniform float u_amplitude3d;',
    'varying float v_arm3d;',
    'void main(){float speed=u_tier3d==3.0?1.7:(u_tier3d==2.0?1.15:.72);float t=u_time3d*speed;vec3 p=a_position3d;float r=length(p.xy);float angle=t*.18+r*1.9;float cs=cos(angle),sn=sin(angle);p.xy=mat2(cs,-sn,sn,cs)*p.xy;p.xy*=1.0+u_amplitude3d*.12+sin(t*2.0+r*8.0+a_arm3d)*.025;p.z+=sin(t*1.7+r*13.0+a_arm3d*2.0)*.05;float depth=2.3-p.z;gl_Position=vec4(p.xy*(1.35/depth),p.z/depth,1.0);gl_PointSize=(a_size3d*(1.0+u_amplitude3d*.7)+1.2)*(2.8/depth);v_arm3d=a_arm3d;}'
  ].join('\n');
  const pointFragmentSource = [
    'precision mediump float;',
    'uniform float u_state3d;',
    'uniform float u_activity3d;',
    'varying float v_arm3d;',
    'void main(){vec2 d=gl_PointCoord-vec2(.5);float edge=smoothstep(.5,.05,length(d));vec3 cyan=vec3(.16,.82,.92);vec3 violet=vec3(.58,.32,.96);vec3 gold=vec3(.96,.76,.42);vec3 color=mod(v_arm3d,2.0)<1.0?cyan:violet;if(u_state3d==1.0)color=mix(color,violet,.55);if(u_state3d==2.0)color=mix(color,gold,.68);gl_FragColor=vec4(color*(1.0+u_activity3d*.24),edge*(.5+u_activity3d*.16));}'
  ].join('\n');
  const pointVertex = shader(gl.VERTEX_SHADER, pointVertexSource), pointFragment = shader(gl.FRAGMENT_SHADER, pointFragmentSource);
  const pointProgram = gl.createProgram();
  let pointBuffer = null, pointCount = 0, pointUniforms = null;
  if (pointVertex && pointFragment && pointProgram) {
    gl.attachShader(pointProgram, pointVertex); gl.attachShader(pointProgram, pointFragment); gl.linkProgram(pointProgram);
    if (gl.getProgramParameter(pointProgram, gl.LINK_STATUS)) {
      const pointData = [], armTotal = 5, pointsPerArm = 190;
      for (let arm = 0; arm < armTotal; arm++) {
        for (let index = 0; index < pointsPerArm; index++) {
          const progress = index / (pointsPerArm - 1), radius = .07 + progress * 1.08;
          const angle = arm * Math.PI * 2 / armTotal + progress * Math.PI * 3.6;
          const wobble = Math.sin(index * .72 + arm) * .014;
          pointData.push(Math.cos(angle) * radius + wobble, Math.sin(angle) * radius + wobble, (1 - progress) * .58 - .28 + Math.sin(angle * 2 + arm) * .1, arm, 1.0 + (index % 5) * .22);
        }
      }
      for (let index = 0; index < 150; index++) {
        const angle = index * 2.39996, radius = .06 + (index % 17) / 17 * .25;
        pointData.push(Math.cos(angle) * radius, Math.sin(angle) * radius, .42 - radius * .7, index % armTotal, 1.3 + (index % 4) * .18);
      }
      pointBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointData), gl.STATIC_DRAW);
      pointCount = pointData.length / 5;
      pointUniforms = {
        time: gl.getUniformLocation(pointProgram, 'u_time3d'),
        tier: gl.getUniformLocation(pointProgram, 'u_tier3d'),
        amplitude: gl.getUniformLocation(pointProgram, 'u_amplitude3d'),
        state: gl.getUniformLocation(pointProgram, 'u_state3d'),
        activity: gl.getUniformLocation(pointProgram, 'u_activity3d')
      };
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    }
  }
  function resize() {
    const rect = section.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.floor(rect.width * ratio)), height = Math.max(1, Math.floor(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height); }
  }
  let audioContext = null, audioAnalyser = null, audioStream = null, audioData = null, amplitude = 0, audioGeneration = 0;
  async function startAudioMeter() {
    if (audioAnalyser || !navigator.mediaDevices?.getUserMedia) return false;
    const generation = ++audioGeneration;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      if (generation !== audioGeneration || document.hidden) { stream.getTracks().forEach(track => track.stop()); return false; }
      audioStream = stream;
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioAnalyser = audioContext.createAnalyser(); audioAnalyser.fftSize = 512; audioAnalyser.smoothingTimeConstant = .78;
      audioData = new Uint8Array(audioAnalyser.fftSize);
      audioContext.createMediaStreamSource(audioStream).connect(audioAnalyser);
      return true;
    } catch { stopAudioMeter(); return false; }
  }
  function stopAudioMeter() {
    audioGeneration++;
    audioStream?.getTracks().forEach(track => track.stop()); audioStream = null;
    audioAnalyser?.disconnect(); audioAnalyser = null; audioData = null;
    audioContext?.close()?.catch(() => {}); audioContext = null; amplitude = 0;
  }
  function sampleAudio() {
    if (!audioAnalyser || !audioData || reducedMotion.matches) { amplitude *= .9; return amplitude; }
    audioAnalyser.getByteTimeDomainData(audioData);
    let sum = 0; for (const value of audioData) { const normalized = (value - 128) / 128; sum += normalized * normalized; }
    const rms = Math.sqrt(sum / audioData.length);
    amplitude += (Math.min(1, rms * 4.6) - amplitude) * .18;
    return amplitude;
  }
  function voiceStateCode() {
    const state = section.dataset.voiceState;
    return state === 'thinking' ? 1 : state === 'speaking' ? 2 : 0;
  }
  function render(now) {
    frame = requestAnimationFrame(render);
    if (!visible || document.hidden) return;
    resize();
    targetActivity *= 0.96; activity += (targetActivity - activity) * 0.12;
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    // Keep the procedural field genuinely still for reduced-motion users;
    // disabling CSS animations alone does not stop shader time from advancing.
    gl.uniform1f(uniforms.time, reducedMotion.matches ? 0 : (now - started) / 1000);
    gl.uniform1f(uniforms.tier, tier);
    gl.uniform1f(uniforms.activity, activity);
    gl.uniform1f(uniforms.amplitude, sampleAudio());
    gl.uniform1f(uniforms.state, voiceStateCode());
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (pointProgram && pointBuffer && pointUniforms) {
      gl.useProgram(pointProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
      const stride = 5 * 4;
      const position3d = gl.getAttribLocation(pointProgram, 'a_position3d');
      const arm3d = gl.getAttribLocation(pointProgram, 'a_arm3d');
      const size3d = gl.getAttribLocation(pointProgram, 'a_size3d');
      gl.enableVertexAttribArray(position3d); gl.vertexAttribPointer(position3d, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(arm3d); gl.vertexAttribPointer(arm3d, 1, gl.FLOAT, false, stride, 3 * 4);
      gl.enableVertexAttribArray(size3d); gl.vertexAttribPointer(size3d, 1, gl.FLOAT, false, stride, 4 * 4);
      gl.uniform1f(pointUniforms.time, reducedMotion.matches ? 0 : (now - started) / 1000);
      gl.uniform1f(pointUniforms.tier, tier);
      gl.uniform1f(pointUniforms.amplitude, amplitude);
      gl.uniform1f(pointUniforms.state, voiceStateCode());
      gl.uniform1f(pointUniforms.activity, activity);
      gl.drawArrays(gl.POINTS, 0, pointCount);
      gl.useProgram(program);
    }
  }
  function setTier(next) {
    tier = next;
    section.dataset.tier = String(tier);
    tabs.forEach(tab => { const active = Number(tab.dataset.tier) === tier; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); });
    const current = labels[tier]; label.textContent = current[0]; value.textContent = current[1];
    targetActivity = Math.max(targetActivity, tier * .45);
  }
  tabs.forEach(tab => tab.addEventListener('click', () => setTier(Number(tab.dataset.tier))));
  input?.addEventListener('input', () => { targetActivity = Math.min(3, .35 + input.value.length / 45); activityLabel.textContent = 'LOCAL SIMULATION / RIPPLE INTENSITY ' + Math.round(targetActivity * 33) + '%'; });
  form?.addEventListener('submit', event => { event.preventDefault(); targetActivity = 3; activityLabel.textContent = 'LOCAL SIMULATION / RIPPLE REGISTERED'; setTimeout(() => { activityLabel.textContent = 'LOCAL SIMULATION / NO PROMPT IS SENT'; }, 1400); });
  const voiceButton = document.getElementById('voice-command');
  const voiceState = document.getElementById('voice-state');
  const voiceHelp = document.getElementById('voice-help');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const voiceStates = {
    idle: {label: 'VOICE CONCIERGE / IDLE', intensity: .15, message: 'LOCAL VISUAL / IDLE FIELD'},
    listening: {label: 'VOICE CONCIERGE / LISTENING', intensity: .65, message: 'LOCAL VOICE / LISTENING FOR A COMMAND'},
    thinking: {label: 'VOICE CONCIERGE / THINKING', intensity: 1.8, message: 'LOCAL VISUAL / PROCESSING STATE'},
    speaking: {label: 'VOICE CONCIERGE / SPEAKING', intensity: 2.6, message: 'LOCAL VISUAL / OUTPUT STATE'}
  };
  let recognition = null, voiceTimer = 0, voiceStarting = false, voiceActivation = 0;
  function stopVoice() {
    voiceActivation++; voiceStarting = false; clearTimeout(voiceTimer);
    try { recognition?.abort(); } catch {}
    stopAudioMeter(); voiceButton?.setAttribute('aria-pressed', 'false'); voiceButton?.setAttribute('aria-busy', 'false');
    setVoiceState('idle');
  }
  function setVoiceState(next, transcript = '') {
    const state = voiceStates[next] || voiceStates.idle;
    section.dataset.voiceState = next;
    voiceState.textContent = state.label;
    activityLabel.textContent = transcript ? `${state.message} / “${transcript.slice(0, 54)}”` : state.message;
    targetActivity = Math.max(targetActivity, state.intensity);
    clearTimeout(voiceTimer);
    if (next !== 'idle') { voiceTimer = setTimeout(() => setVoiceState('idle'), 3600); }
  }
  function classifyVoice(text) {
    const valueText = String(text || '').toLowerCase();
    if (/\b(idle|pause|stop|quiet)\b/.test(valueText)) return 'idle';
    if (/\b(listen|wake|hello|activate)\b/.test(valueText)) return 'listening';
    if (/\b(speak|answer|respond|output)\b/.test(valueText)) return 'speaking';
    return 'thinking';
  }
  if (!SpeechRecognition) {
    voiceButton?.setAttribute('disabled', '');
    voiceHelp.textContent = 'Voice commands are unavailable in this browser. Use the local visual prompt above.';
  } else {
    recognition = new SpeechRecognition();
    recognition.continuous = false; recognition.interimResults = true; recognition.lang = 'en-US';
    recognition.onstart = () => { voiceButton.setAttribute('aria-pressed', 'true'); setVoiceState('listening'); };
    recognition.onresult = event => {
      const transcript = Array.from(event.results).map(result => result[0]?.transcript || '').join(' ').trim();
      const state = classifyVoice(transcript);
      if (state === 'idle') stopVoice(); else setVoiceState(state, transcript);
    };
    recognition.onerror = () => { voiceButton.setAttribute('aria-pressed', 'false'); setVoiceState('idle'); stopAudioMeter(); voiceHelp.textContent = 'Speech recognition was unavailable. Use the visual prompt above.'; };
    recognition.onend = () => { voiceButton.setAttribute('aria-pressed', 'false'); stopAudioMeter(); };
    voiceButton?.addEventListener('click', async () => {
      if (voiceStarting) { stopVoice(); return; }
      if (voiceButton.getAttribute('aria-pressed') === 'true') { stopVoice(); return; }
      voiceStarting = true; const activation = ++voiceActivation; voiceButton.setAttribute('aria-busy', 'true');
      const audioReady = await startAudioMeter();
      if (activation !== voiceActivation || document.hidden) { stopAudioMeter(); return; }
      voiceStarting = false; voiceButton.setAttribute('aria-busy', 'false');
      if (!audioReady) { voiceHelp.textContent = 'Microphone access was not granted. Use the local visual prompt instead.'; setVoiceState('idle'); return; }
      voiceHelp.textContent = audioReady ? 'LOCAL AUDIO REACTIVITY / amplitude drives the neural field in this browser.' : 'Microphone access was unavailable. Voice intent can still use the browser speech interface.';
      try { recognition.start(); } catch { stopAudioMeter(); setVoiceState('idle'); }
    });
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopVoice(); });
  window.addEventListener('pagehide', stopVoice);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); stopVoice(); cancelAnimationFrame(frame); canvas.hidden = true;
    voiceButton?.setAttribute('disabled', ''); activityLabel.textContent = 'STATIC FALLBACK / WEBGL CONTEXT LOST';
  });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); }, { threshold: .01 }).observe(section);
  if (reducedMotion.matches) { targetActivity = .2; }
  resize(); render(performance.now());
})();
