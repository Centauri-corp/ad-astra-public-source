'use strict';
// Progressive enhancement only; the entire public story works without JavaScript.
(() => {
  const menu = document.querySelector('.site-menu');
  const menuLabel = menu?.querySelector('.site-menu-label');
  function syncMenu() {
    if (!menu) return;
    document.documentElement.classList.toggle('site-menu-open', menu.open);
    if (menuLabel) menuLabel.textContent = menu.open ? 'Close' : 'Explore';
  }
  menu?.addEventListener('toggle', syncMenu);
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
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin || destination.pathname === location.pathname && destination.search === location.search && destination.hash) return;
    document.documentElement.classList.add('site-transitioning');
  });
  window.addEventListener('pageshow', () => { document.documentElement.classList.remove('site-transitioning'); if (menu?.open) menu.open = false; syncMenu(); });
  const control = document.querySelector('[data-motion-toggle]');
  if (!control) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const heroFilm = document.querySelector('.ad-arrival-film');
  let paused = false;
  function sync() {
    const off = paused || reduced.matches || document.hidden;
    document.body.dataset.motion = off ? 'off' : 'on';
    if (off) heroFilm?.pause(); else heroFilm?.play().catch(() => {});
    control.textContent = paused ? 'Play cinematic motion' : 'Pause cinematic motion';
    control.setAttribute('aria-pressed', String(paused));
  }
  document.body.classList.add('motion-ready');
  control.addEventListener('click', () => { paused = !paused; sync(); });
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  sync();
})();
