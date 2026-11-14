'use strict';
// Progressive enhancement only; the entire public story works without JavaScript.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const menu = document.querySelector('.site-menu');
  const menuLabel = menu?.querySelector('.site-menu-label');
  const desktopNav = document.querySelector('.site-desktop-nav');
  const disclosures = [...document.querySelectorAll('.site-nav-disclosure')];
  function closeDisclosures(except) {
    disclosures.forEach(disclosure => { if (disclosure !== except) disclosure.open = false; });
  }
  disclosures.forEach(disclosure => {
    disclosure.addEventListener('toggle', () => { if (disclosure.open) closeDisclosures(disclosure); });
    disclosure.querySelector('summary').addEventListener('keydown', event => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      closeDisclosures(disclosure);
      disclosure.open = true;
      const links = [...disclosure.querySelectorAll('.site-nav-panel a[href]')];
      links.at(event.key === 'ArrowUp' ? -1 : 0)?.focus();
    });
  });
  desktopNav?.addEventListener('focusout', event => {
    disclosures.forEach(disclosure => {
      if (!disclosure.closest('.site-nav-item').contains(event.relatedTarget)) disclosure.open = false;
    });
  });
  desktopNav?.addEventListener('click', event => {
    if (event.target.closest('a[href]') && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) closeDisclosures();
  });
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
      event.preventDefault();
    } else if (event.key === 'Escape') {
      const disclosure = disclosures.find(item => item.open);
      if (disclosure) {
        disclosure.open = false;
        disclosure.querySelector('summary').focus();
        event.preventDefault();
      }
    }
  });
  document.addEventListener('pointerdown', event => {
    if (menu?.open && !menu.contains(event.target)) menu.open = false;
    disclosures.forEach(disclosure => {
      if (disclosure.open && !disclosure.contains(event.target)) disclosure.open = false;
    });
  });
  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { menu.open = false; }));
  matchMedia('(min-width: 761px)').addEventListener('change', event => {
    if (event.matches && menu) menu.open = false;
    if (!event.matches) closeDisclosures();
  });
  let transitionReset;
  const resetTransition = () => {
    clearTimeout(transitionReset);
    document.documentElement.classList.remove('site-transitioning');
  };
  // Cross-document view transitions are native. Older browsers receive only a
  // brief visual cue; ordinary link navigation is never intercepted or delayed.
  const nativePageTransitions = 'onpagereveal' in window;
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || nativePageTransitions || reduced.matches || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('target') || document.querySelector('base[target]') || link.hasAttribute('download') || link.relList.contains('external')) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin || destination.protocol !== location.protocol || destination.pathname === location.pathname && destination.search === location.search) return;
    resetTransition();
    document.documentElement.classList.add('site-transitioning');
    transitionReset = setTimeout(resetTransition, 650);
  });
  reduced.addEventListener('change', resetTransition);
  window.addEventListener('pageshow', () => { resetTransition(); closeDisclosures(); if (menu?.open) menu.open = false; syncMenu(); });
  const connection = navigator.connection;
  // One decorative-motion choice follows the shared companion between routes.
  // The older homepage film never competes with the scene for playback.
  let paused = reduced.matches || connection?.saveData === true;
  function sync() {
    const off = paused || reduced.matches || document.hidden || connection?.saveData === true;
    document.body.dataset.motion = off ? 'off' : 'on';
    document.querySelector('.ad-arrival-film')?.pause();
    document.querySelectorAll('[data-motion-toggle]').forEach(control=>{control.textContent = off ? 'Play cinematic motion' : 'Pause cinematic motion';control.setAttribute('aria-pressed', String(!off));});
  }
  document.body.classList.add('motion-ready');
  document.addEventListener('click', event => { if (event.target.closest('[data-motion-toggle]')) { paused = !paused; sync(); } });
  window.addEventListener('ad-astra:motion-choice',event=>{if(typeof event.detail?.paused==='boolean'){paused=event.detail.paused;sync();}});
  window.addEventListener('ad-astra:route-change',sync);
  reduced.addEventListener('change', sync);
  connection?.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  sync();
})();
