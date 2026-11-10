'use strict';
// Progressive enhancement only; the entire public story works without JavaScript.
(() => {
  const menu = document.querySelector('.site-menu');
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu?.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (menu?.open && !menu.contains(event.target)) menu.open = false;
  });
  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { menu.open = false; }));
  matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches && menu) menu.open = false; });
  const control = document.querySelector('[data-motion-toggle]');
  if (!control) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  function sync() {
    const off = paused || reduced.matches || document.hidden;
    document.body.dataset.motion = off ? 'off' : 'on';
    control.textContent = paused ? 'Play ambient motion' : 'Pause ambient motion';
    control.setAttribute('aria-pressed', String(paused));
  }
  document.body.classList.add('motion-ready');
  control.addEventListener('click', () => { paused = !paused; sync(); });
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  sync();
})();
