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
const neuralField = document.getElementById('neural-field');
const neuralFieldContext = neuralField?.getContext('2d', {alpha:true});
const heroSection = document.querySelector('.hero');
const neuralFieldNodes = Array.from({length:34}, (_, index) => {
  const angle = index * 2.399963 + 0.35;
  const radius = 0.16 + (index % 7) * 0.018;
  return {angle, radius, depth:0.55 + ((index * 17) % 43) / 100, phase:(index * 0.73) % 6.28};
});
let neuralFieldVisible = true;
let neuralFieldFrame = 0;
function resizeNeuralField() {
  if (!neuralField || !neuralFieldContext) return;
  const rect = neuralField.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  neuralField.width = Math.max(1, Math.round(rect.width * dpr));
  neuralField.height = Math.max(1, Math.round(rect.height * dpr));
  neuralFieldContext.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function drawNeuralField(now = 0) {
  if (!neuralField || !neuralFieldContext) return;
  const width = neuralField.clientWidth;
  const height = neuralField.clientHeight;
  if (!width || !height) return;
  const context = neuralFieldContext;
  const time = now * 0.00035;
  const scale = Math.min(width, height);
  const centerX = width * 0.73;
  const centerY = height * 0.44;
  context.clearRect(0, 0, width, height);
  const points = neuralFieldNodes.map(node => {
    const pulse = Math.sin(time * 2 + node.phase) * 0.012;
    const orbit = node.angle + time * (0.17 + node.depth * 0.08);
    return {
      x:centerX + Math.cos(orbit) * scale * (node.radius + pulse),
      y:centerY + Math.sin(orbit * 1.13) * scale * (node.radius * 0.64 + pulse),
      size:1.1 + node.depth * 1.7,
      depth:node.depth
    };
  });
  context.lineWidth = 0.7;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const distance = Math.hypot(dx, dy);
      if (distance > scale * 0.105) continue;
      context.strokeStyle = `rgba(142, 215, 244, ${Math.max(0.025, 0.15 - distance / scale)})`;
      context.beginPath(); context.moveTo(points[i].x, points[i].y); context.lineTo(points[j].x, points[j].y); context.stroke();
    }
  }
  points.forEach((point, index) => {
    context.fillStyle = index % 5 === 0 ? 'rgba(226, 207, 155, .8)' : 'rgba(158, 224, 245, .7)';
    context.beginPath(); context.arc(point.x, point.y, point.size, 0, Math.PI * 2); context.fill();
  });
}
function animateNeuralField(now) {
  neuralFieldFrame = 0;
  if (!motionPaused && neuralFieldVisible && !document.hidden) {
    drawNeuralField(now);
    neuralFieldFrame = requestAnimationFrame(animateNeuralField);
  }
}
function syncNeuralField() {
  if (!neuralFieldContext) return;
  if (!motionPaused && neuralFieldVisible && !document.hidden) {
    if (!neuralFieldFrame) neuralFieldFrame = requestAnimationFrame(animateNeuralField);
  } else {
    if (neuralFieldFrame) cancelAnimationFrame(neuralFieldFrame);
    neuralFieldFrame = 0;
    drawNeuralField(0);
  }
}
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
  syncNeuralField();
}
motionVideos.forEach(video => {
  video.muted = true;
  video.addEventListener('playing', () => video.classList.add('playing'));
  video.addEventListener('error', () => {video.classList.remove('playing'); video.dataset.failed = 'true';});
});
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.target === heroSection) neuralFieldVisible = entry.isIntersecting;
      else if (entry.isIntersecting) visibleVideos.add(entry.target);
      else visibleVideos.delete(entry.target);
    });
    syncMotion();
  }, {threshold:0.01});
  motionVideos.forEach(video => observer.observe(video));
  if (heroSection) observer.observe(heroSection);
} else {motionVideos.forEach(video => visibleVideos.add(video));}
resizeNeuralField();
window.addEventListener('resize', () => {resizeNeuralField(); syncNeuralField();}, {passive:true});
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
