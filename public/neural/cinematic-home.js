const hero = document.querySelector('.ad-arrival');
const host = hero?.querySelector('[data-neural-hero]');
if (host) {
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const saveData = navigator.connection?.saveData === true;
 let scene, disposed = false, visible = true, raf = 0, last = 0, time = 0, x = 0, y = 0;
 const caption = hero.querySelector('[data-neural-caption]');
 const controls = hero.querySelector('.ad-scene-controls');
 const sequence = hero.closest('[data-arrival-sequence]');
 function storyLayout(){sequence?.classList.toggle('is-story-ready',Boolean(scene&&!reduced.matches&&!saveData&&innerWidth>=900));}
 function progress(){if(!sequence?.classList.contains('is-story-ready'))return 0;const box=sequence.getBoundingClientRect();return Math.max(0,Math.min(1,-box.top/Math.max(1,sequence.offsetHeight-hero.offsetHeight)));}
 function stop() { cancelAnimationFrame(raf); raf = 0; last = 0; }
 function active() { return scene && !disposed && visible && !document.hidden && !reduced.matches && document.body.dataset.motion !== 'off'; }
 function frame(now) {
  if (!active()) return;
  if (last) time += Math.min((now - last) / 1000, .05);
  last = now; const scroll=progress();sequence?.style.setProperty('--ad-story-progress',scroll.toFixed(4));scene.renderAt(time, {x, y, scroll}); raf = requestAnimationFrame(frame);
 }
 function sync() { stop(); if (active()) raf = requestAnimationFrame(frame); }
 function fallback() { stop(); scene?.dispose(); scene = null; storyLayout();host.querySelectorAll('canvas').forEach(canvas => canvas.remove()); hero.classList.remove('is-live'); controls.hidden = true; host.dataset.neuralState = 'fallback'; caption.textContent = 'Neural sculpture · Still artwork'; }
 async function load() {
  if (scene || disposed || saveData || reduced.matches) return;
  try {
   host.dataset.neuralState = 'loading';
   const {createCinematicScene} = await import('./cinematic-scene.js');
   if (disposed) return;
   scene = createCinematicScene(host); host.dataset.neuralState = 'ready'; hero.classList.add('is-live'); controls.hidden = false;storyLayout();
   caption.textContent = 'Interactive neural sculpture · Visual preview'; sync();
  } catch { fallback(); }
 }
 const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting === true; sync(); }, {threshold: .01}); observer.observe(hero);
 const mutation = new MutationObserver(sync); mutation.observe(document.body, {attributes: true, attributeFilter: ['data-motion']});
 const pointer = event => { x = (event.clientX / innerWidth - .5) * 2; y = (event.clientY / innerHeight - .5) * 2; };
 hero.addEventListener('pointermove', pointer, {passive: true});
 hero.querySelectorAll('[data-neural-mode]').forEach(button => button.addEventListener('click', () => {
  hero.querySelectorAll('[data-neural-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  scene?.setMode(button.dataset.neuralMode);
 }));
 host.addEventListener('webglcontextlost', event => { event.preventDefault(); fallback(); }, true);
 reduced.addEventListener('change', () => { if (reduced.matches) stop(); else load();storyLayout();sync(); });
 window.addEventListener('resize',storyLayout,{passive:true});
 document.addEventListener('visibilitychange', sync);
 window.addEventListener('pagehide', () => { disposed = true; stop(); observer.disconnect(); mutation.disconnect(); scene?.dispose(); scene = null; hero.classList.remove('is-live'); });
 window.addEventListener('pageshow', event => { if (!event.persisted) return; disposed = false; observer.observe(hero); mutation.observe(document.body, {attributes: true, attributeFilter: ['data-motion']}); load(); });
 if (saveData || reduced.matches) { host.dataset.neuralState = 'static'; caption.textContent = 'Neural sculpture · Still artwork'; } else load();
}
