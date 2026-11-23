'use strict';
/**
 * A single client-side creative controller for the Ad Astra product journey.
 * Original local media, explicit motion, human-directed navigation. No API,
 * checkout, authentication, customer data or background audio on this route.
 */
(() => {
  const chapters = [...document.querySelectorAll('[data-cinematic-chapter]')];
  const links = [...document.querySelectorAll('[data-editorial-link]')];
  const hero = document.querySelector('.editorial-hero-media');
  const video = document.querySelector('.editorial-hero-film');
  const motion = document.querySelector('[data-editorial-motion]');
  const workbench = document.querySelector('#technical-foundation');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection?.saveData);
  let wantsMotion = false;
  let heroVisible = true;

  function stopMotion() {
    if (video) {
      video.pause();
      video.classList.remove('is-playing');
    }
    motion?.setAttribute('aria-pressed', 'false');
  }

  function syncMotion() {
    if (!video || !motion) return;
    if (!wantsMotion || reduced.matches || saveData || !heroVisible || document.hidden) {
      stopMotion();
      return;
    }
    video.muted = true;
    video.play().then(() => {
      video.classList.add('is-playing');
      motion.setAttribute('aria-pressed', 'true');
      motion.textContent = 'Pause ambient motion';
    }).catch(() => {
      wantsMotion = false;
      stopMotion();
      motion.textContent = 'Motion unavailable: static visual enabled';
    });
  }

  if (motion && video) {
    if (reduced.matches || saveData) {
      motion.disabled = true;
      motion.textContent = 'Static experience preferred';
    } else {
      motion.addEventListener('click', () => {
        wantsMotion = !wantsMotion;
        if (!wantsMotion) {
          stopMotion();
          motion.textContent = 'Enable ambient motion';
        } else syncMotion();
      });
    }
  }

  function selectChapter(id) {
    if (!id) return;
    links.forEach(link => {
      if (link.dataset.editorialLink === id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  links.forEach(link => link.addEventListener('click', () => {
    selectChapter(link.dataset.editorialLink);
  }));

  if ('IntersectionObserver' in window) {
    const visible = new Map();
    const observeChapters = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const id = entry.target.dataset.cinematicChapter;
        if (entry.isIntersecting) {
          visible.set(id, entry.intersectionRatio);
          entry.target.classList.add('is-visible');
        } else visible.delete(id);
      }
      const leading = [...visible].sort((a, b) => b[1] - a[1])[0];
      if (leading) selectChapter(leading[0]);
    }, { threshold: [0.12, 0.3, 0.55, 0.8] });
    chapters.forEach(chapter => observeChapters.observe(chapter));

    if (hero) new IntersectionObserver(([entry]) => {
      heroVisible = Boolean(entry?.isIntersecting);
      if (!heroVisible) stopMotion();
      else syncMotion();
    }, { threshold: 0.07 }).observe(hero);
  } else {
    chapters.forEach(chapter => chapter.classList.add('is-visible'));
  }

  reduced.addEventListener?.('change', () => {
    if (reduced.matches) {
      wantsMotion = false;
      stopMotion();
      if (motion) {
        motion.disabled = true;
        motion.textContent = 'Static experience preferred';
      }
    } else if (motion && !saveData) {
      motion.disabled = false;
      motion.textContent = 'Enable ambient motion';
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopMotion();
    else syncMotion();
  });
  window.addEventListener('pagehide', stopMotion, { once: true });

  // Progressive WebGL canvas mounts in the technical workbench; its dimensions
  // may be zero while <details> is closed. Recompute on explicit user expansion.
  workbench?.addEventListener('toggle', () => {
    if (workbench.open) {
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    } else stopMotion();
  });
})();
