'use strict';
/**
 * CRC Ad Astra cinematic director for the website homepage.
 *
 * One film-first public composition and one explicit interactive scene
 * handoff. Video playback/visibility remains owned by app.js; the WebGL2
 * renderer remains owned by cinematic-journey.js. No duplicate animation loops,
 * no customer traffic, production flags or provider calls.
 */
(() => {
  const hero = document.querySelector('.hero-cinema-v3[data-cinema-mode]');
  if (!hero) return;
  const switchButton = hero.querySelector('[data-cinema-switch]');
  const spatial = hero.querySelector('[data-cinematic-host]');
  const firstLayer = spatial?.querySelector('[data-cinematic-layer="0"]');
  const ambientFilm = hero.querySelector('[data-cinema-film]');
  const motion = hero.querySelector('.motion');
  const note = hero.querySelector('#motion-note');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection?.saveData);
  const validModes = Object.freeze(['film', 'spatial']);
  if (!switchButton || !spatial || !ambientFilm || !motion) return;

  function setMode(next, reason = 'user') {
    if (!validModes.includes(next)) return;
    const isSpatial = next === 'spatial';
    hero.dataset.cinemaMode = next;
    switchButton.setAttribute('aria-pressed', String(isSpatial));
    switchButton.textContent = isSpatial ? 'Return to cinematic film' : 'Explore spatial model';
    if (isSpatial) {
      // Ambient playback is controlled solely by app.js. Stop its current
      // film here and request an immediate sync through one shared event.
      ambientFilm.pause();
      ambientFilm.classList.remove('playing');
      if (reduced.matches || saveData) {
        if (note) note.textContent = 'Spatial controls use a still fallback for your device preference';
      } else {
        firstLayer?.click();
        if (note) note.textContent = 'Synthetic interactive spatial field · drag to orbit · Shift-scroll to zoom';
      }
    } else {
      if (note) note.textContent = 'Original Ad Astra cinematic study · no sound · motion preferences respected';
    }
    hero.dispatchEvent(new CustomEvent('ad-astra:cinema-mode-change', {
      bubbles: true,
      detail: {mode: next, source: reason}
    }));
  }

  switchButton.addEventListener('click', () =>
    setMode(hero.dataset.cinemaMode === 'spatial' ? 'film' : 'spatial')
  );
  ambientFilm.addEventListener('error', () => {
    hero.dataset.cinemaVideoFallback = 'true';
    if (note) note.textContent = 'Static cinematic artwork available · video format unsupported';
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ambientFilm.pause();
  });
  reduced.addEventListener?.('change', () => {
    if (reduced.matches && hero.dataset.cinemaMode === 'spatial') {
      setMode('film', 'motion-preference');
    }
  });
  window.addEventListener('pagehide', () => ambientFilm.pause(), {once: true});

  // CRC cinematic lens pass: event-driven camera drift tied to visitor travel.
  // No additional render loop; film playback remains wholly in public/app.js.
  let cameraFrame = 0;
  function syncCameraPass() {
    cameraFrame = 0;
    const disabled = reduced.matches || saveData || document.hidden ||
      hero.dataset.cinemaMode !== 'film' || matchMedia('(max-width:680px)').matches;
    if (disabled) {
      hero.style.setProperty('--cinema-lens-scale', '1.045');
      hero.style.setProperty('--cinema-lens-offset', '0px');
      return;
    }
    const box = hero.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight) return;
    const progress = Math.min(1, Math.max(0, -box.top / Math.max(1, box.height)));
    hero.style.setProperty('--cinema-lens-scale', (1.045 + progress * 0.055).toFixed(3));
    hero.style.setProperty('--cinema-lens-offset', Math.round(progress * -18) + 'px');
  }
  function scheduleCameraPass() {
    if (!cameraFrame) cameraFrame = requestAnimationFrame(syncCameraPass);
  }
  addEventListener('scroll', scheduleCameraPass, {passive: true});
  addEventListener('resize', scheduleCameraPass, {passive: true});
  addEventListener('pageshow', scheduleCameraPass);
  document.addEventListener('visibilitychange', scheduleCameraPass);
  reduced.addEventListener?.('change', scheduleCameraPass);
  hero.addEventListener('ad-astra:cinema-mode-change', scheduleCameraPass);
  scheduleCameraPass();
  setMode('film', 'initial');
})();