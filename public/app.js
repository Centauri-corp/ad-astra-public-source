'use strict';

// One registry serves pointer, keyboard, menu, and direct-link navigation.
const modes = {
  ask: {number:'01 / ASK', title:['Find the question','behind the question.'], description:'Move from a broad idea to a focused inquiry. Explore assumptions, connect context and identify what is worth investigating next.', example:'“What would change if energy were abundant?”', image:'adobe-curiosity.jpg', alt:'A hand sketches connected ideas in a notebook beside a luminous conceptual interface'},
  research: {number:'02 / RESEARCH', title:['See the evidence.','Connect the ideas.'], description:'Bring different perspectives into view. Our research direction emphasizes sources, uncertainty and connections across disciplines.', example:'“How do energy, water and agriculture shape one another?”', image:'runway-curiosity-notes.jpg', alt:'Handwritten research notes in an open notebook outdoors'},
  create: {number:'03 / CREATE', title:['Give a bold idea','a clearer shape.'], description:'Explore alternative approaches, develop a concept and find new ways to express it. Human intention guides the creative process.', example:'“Imagine a learning environment built around curiosity.”', image:'ad-astra-runway-orbital-poster.jpg', alt:'A luminous sphere with cyan and gold orbital paths against a dark galaxy'},
  learn: {number:'04 / LEARN', title:['Understand more.','Keep going further.'], description:'Approach a complex subject through questions, explanations and connections. Build understanding at a pace that supports deeper thought.', example:'“Explain orbital mechanics through everyday experiences.”', image:'runway-orbital-intelligence.jpg', alt:'A luminous sphere with orbital paths representing connected knowledge'},
  explore: {number:'05 / EXPLORE', title:['Look beyond','the familiar.'], description:'Follow an idea across science, technology and human experience. Discover new perspectives and questions worth pursuing.', example:'“What could living beyond Earth teach us about life here?”', image:'ad-astra-runway-horizon-poster.jpg', alt:'Golden connection arcs above Earth’s blue horizon at dawn'}
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
const pendingVideos = new Set();
function motionPermitted() {
  return !motionPaused && !document.hidden && !(filmDialog && filmDialog.open);
}
function syncMotionButton() {
  const visible = [...visibleVideos];
  const usable = visible.filter(video => video.dataset.failed !== 'true');
  const playing = usable.some(video => !video.paused && !video.ended && video.classList.contains('playing'));
  const ended = usable.length > 0 && usable.every(video => video.ended && !video.loop);
  const pending = usable.some(video => pendingVideos.has(video));
  const mediaUnavailable = visible.length > 0 && usable.length === 0;
  let action = 'pause', label = 'Pause motion', icon = 'Ⅱ';
  if (motionPaused || !motionPermitted()) { action = 'play'; label = mediaUnavailable ? 'Resume effects' : 'Play motion'; icon = '▶'; }
  else if (playing) { action = 'pause'; }
  else if (ended) { action = 'replay'; label = 'Replay motion'; icon = '↻'; }
  else if (pending) { action = 'pause'; label = 'Cancel loading'; icon = 'Ⅱ'; }
  else if (mediaUnavailable) { action = 'pause'; label = 'Pause effects'; }
  motionButton.dataset.motionAction = action;
  motionButton.disabled = false;
  motionButton.setAttribute('aria-pressed', String(action === 'play' || action === 'replay'));
  motionButton.setAttribute('aria-label', label);
  motionButton.innerHTML = label + ' <span aria-hidden="true">' + icon + '</span>';
}
function syncMotion() {
  document.body.classList.toggle('paused', motionPaused);
  const permitted = motionPermitted();
  document.body.classList.toggle('motion-suspended', !permitted);
  motionVideos.forEach(video => {
    if (!permitted || !visibleVideos.has(video) || video.dataset.failed === 'true') {
      video.pause(); video.classList.remove('playing'); return;
    }
    // The Runway hero is a camera approach, not a seamless loop. Hold its last frame.
    if (video.ended && !video.loop) {video.classList.remove('playing'); return;}
    if (pendingVideos.has(video) || !video.paused) return;
    pendingVideos.add(video);
    Promise.resolve().then(() => {
      // A preference or visibility change can arrive while playback is pending.
      if (!motionPermitted() || !visibleVideos.has(video)) return;
      return video.play();
    }).catch(error => {
      if (error.name === 'AbortError') return;
      video.classList.remove('playing');
      if (error.name === 'NotAllowedError') {motionPaused = true; syncMotion();}
      else video.dataset.failed = 'true';
    }).finally(() => {
      pendingVideos.delete(video);
      if (!motionPermitted() || !visibleVideos.has(video)) {
        video.pause(); video.classList.remove('playing');
      }
      document.body.classList.toggle('paused', motionPaused);
      document.body.classList.toggle('motion-suspended', !motionPermitted());
      syncMotionButton();
    });
  });
  syncMotionButton();
}
motionVideos.forEach(video => {
  video.muted = true;
  video.addEventListener('playing', () => {
    if (!motionPermitted() || !visibleVideos.has(video)) {video.pause(); return;}
    video.classList.add('playing'); syncMotionButton();
  });
  video.addEventListener('pause', () => {video.classList.remove('playing'); syncMotionButton();});
  video.addEventListener('ended', () => {
    video.classList.remove('playing'); pendingVideos.delete(video); syncMotionButton();
  });
  video.addEventListener('error', () => {
    video.classList.remove('playing'); video.dataset.failed = 'true';
    pendingVideos.delete(video); syncMotionButton();
  });
});
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.isIntersecting ? visibleVideos.add(entry.target) : visibleVideos.delete(entry.target));
    syncMotion();
  }, {threshold:0.01});
  motionVideos.forEach(video => observer.observe(video));
} else {motionVideos.forEach(video => visibleVideos.add(video));}
motionButton.addEventListener('click', () => {
  if (motionButton.disabled) return;
  const action = motionButton.dataset.motionAction;
  motionPaused = action === 'pause';
  if (!motionPaused) visibleVideos.forEach(video => {if (video.ended && !video.loop) video.currentTime = 0;});
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
    if (navigator.share) {await navigator.share({title:'Ad Astra', text:'A new horizon for human curiosity. Explore the Ad Astra vision.', url}); result.textContent = '';}
    else if (navigator.clipboard) {await navigator.clipboard.writeText(url); result.textContent = 'Website link copied. Share it with a curious mind.';}
    else result.textContent = 'Share our website: ' + url;
  } catch (error) {if (error.name !== 'AbortError') result.textContent = 'Share our website: ' + url;}
});


// Public artwork state selection only; never calls private AI services.
const neuralStateDescriptions = Object.freeze({
  analyzing:'Exploring questions, evidence and patterns.',
  reasoning:'Tracing possible connections between ideas.',
  planning:'Organizing steps and alternative directions.',
  acting:'Considering the responsible next action.',
  learning:'Revisiting evidence and new perspectives.',
  aligning:'Keeping human intent, permissions and oversight central.'
});
const neuralButtons=[...document.querySelectorAll('[data-neural-state]')];
const neuralTitle=document.getElementById('neural-state-title');
const neuralDescription=document.getElementById('neural-state-description');
neuralButtons.forEach(button=>button.addEventListener('click',()=>{
  const state=button.dataset.neuralState;
  if(!Object.hasOwn(neuralStateDescriptions,state))return;
  neuralButtons.forEach(item=>{const selected=item===button;item.classList.toggle('is-active',selected);item.setAttribute('aria-pressed',String(selected));});
  neuralTitle.textContent=state.charAt(0).toUpperCase()+state.slice(1);
  neuralDescription.textContent=neuralStateDescriptions[state]+' A conceptual artwork state, not a live system measurement.';
}));
const neuralMaster=document.querySelector('.neural-original-master');
if(neuralMaster)neuralMaster.addEventListener('error',()=>{
  const fallback=document.querySelector('.neural-art-fallback');
  if(fallback)fallback.hidden=false;
});

// Neural state keyboard navigation v2 — presentation-only, no AI inference.
const neuralAccentByState=Object.freeze({
  analyzing:'#278AFF',reasoning:'#B96BFF',planning:'#44DF96',
  acting:'#F7C05D',learning:'#FF6987',aligning:'#4BDDF2'
});
const neuralStage=document.querySelector('.neural-cinematic');
for(const button of neuralButtons){
  button.addEventListener('click',()=>{
    if(neuralStage && Object.hasOwn(neuralAccentByState,button.dataset.neuralState))
      neuralStage.style.setProperty('--neural-accent',neuralAccentByState[button.dataset.neuralState]);
  });
  button.addEventListener('keydown',event=>{
    const key=event.key;
    if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(key))return;
    event.preventDefault();
    const index=neuralButtons.indexOf(button);
    let next=index;
    if(key==='Home')next=0;
    else if(key==='End')next=neuralButtons.length-1;
    else next=(index+(key==='ArrowRight'||key==='ArrowDown'?1:-1)+neuralButtons.length)%neuralButtons.length;
    neuralButtons[next]?.focus();
    neuralButtons[next]?.click();
  });
}

// Separate accessible ambient-motion control; never alters approved neural artwork.
const neuralEffectsToggle=document.getElementById('neural-effects-toggle');
if(neuralStage && neuralEffectsToggle){
  let pausedByUser=false;
  const syncNeuralFx=()=>{
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const globalPaused=document.body.classList.contains('motion-suspended');
    const paused=pausedByUser||reduced||globalPaused;
    neuralStage.classList.toggle('neural-fx-paused',paused);
    neuralEffectsToggle.setAttribute('aria-pressed',String(paused));
    neuralEffectsToggle.disabled=reduced||globalPaused;
    neuralEffectsToggle.textContent=reduced?'Reduced motion enabled':globalPaused?'Effects paused globally':pausedByUser?'Resume ambient effects':'Pause ambient effects';
  };
  neuralEffectsToggle.addEventListener('click',()=>{pausedByUser=!pausedByUser;syncNeuralFx();});
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',syncNeuralFx);
  new MutationObserver(syncNeuralFx).observe(document.body,{attributes:true,attributeFilter:['class']});
  syncNeuralFx();
}
