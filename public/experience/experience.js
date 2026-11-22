'use strict';
(() => {
  const dialog = document.getElementById('experience-film');
  const player = dialog?.querySelector('.film-player');
  const error = dialog?.querySelector('[data-film-error]');
  const close = dialog?.querySelector('[data-film-close]');
  const openButtons = Array.from(document.querySelectorAll('[data-film-open]'));
  const ambientButton = document.querySelector('[data-ambient-toggle]');
  const ambient = document.querySelector('.cinema-ambient');
  const hero = document.querySelector('.cinema-hero');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection?.saveData);
  const sections = [...document.querySelectorAll('[data-experience-chapter]')];
  const nav = [...document.querySelectorAll('[data-chapter-link]')];
  let lastFocus = null;
  let heroVisible = true;
  let ambientRequested = false;

  function pauseAmbient() {
    if (!ambient) return;
    ambient.pause();
    ambient.classList.remove('is-playing');
    ambientButton?.setAttribute('aria-pressed', 'false');
    if (ambientButton) ambientButton.textContent = 'Enable background motion';
  }
  function updateAmbient() {
    if (!ambient || !ambientButton) return;
    if (!ambientRequested || reducedMotion.matches || saveData || document.hidden || !heroVisible || dialog?.open) {
      pauseAmbient();
      return;
    }
    ambient.muted = true;
    ambient.play().then(() => {
      ambient.classList.add('is-playing');
      ambientButton.setAttribute('aria-pressed', 'true');
      ambientButton.textContent = 'Pause background motion';
    }).catch(() => {
      ambientRequested = false;
      pauseAmbient();
    });
  }

  if (ambientButton && ambient) {
    ambientButton.addEventListener('click', () => {
      ambientRequested = !ambientRequested;
      if (!ambientRequested) pauseAmbient();
      else updateAmbient();
    });
    if (reducedMotion.matches || saveData) {
      ambientButton.textContent = 'Static image (motion preference)';
      ambientButton.disabled = true;
    }
  }

  function stopFilm() {
    if (!player) return;
    player.pause();
    player.currentTime = 0;
    player.removeAttribute('autoplay');
  }
  function dismissFilm() {
    if (!dialog?.open) return;
    dialog.close();
  }
  function openFilm(e) {
    if (!dialog || !player || typeof dialog.showModal !== 'function') return;
    if (dialog.open) return;
    lastFocus = e.currentTarget;
    if (error) error.hidden = true;
    pauseAmbient();
    dialog.showModal();
    document.body.classList.add('film-open');
    // No automatic playback until the user presses play. This avoids unwanted
    // audio, data use and accessibility issues on mobile and reduced motion.
    player.preload = 'metadata';
    player.muted = true;
    close?.focus();
  }

  openButtons.forEach(button => button.addEventListener('click', openFilm));
  close?.addEventListener('click', dismissFilm);
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) dismissFilm();
  });
  dialog?.addEventListener('close', () => {
    stopFilm();
    document.body.classList.remove('film-open');
    if (lastFocus?.isConnected) lastFocus.focus();
    lastFocus = null;
    updateAmbient();
  });
  player?.addEventListener('error', () => { if (error) error.hidden = false; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      player?.pause();
      pauseAmbient();
    } else {
      updateAmbient();
    }
  });
  window.addEventListener('pagehide', () => {
    stopFilm();
    pauseAmbient();
  }, { once: true });
  reducedMotion.addEventListener?.('change', () => {
    if (reducedMotion.matches) {
      ambientRequested = false;
      pauseAmbient();
      if (ambientButton) {
        ambientButton.disabled = true;
        ambientButton.textContent = 'Static image (motion preference)';
      }
    } else if (ambientButton && !saveData) {
      ambientButton.disabled = false;
      ambientButton.textContent = 'Enable background motion';
    }
  });

  function selectChapter(id) {
    nav.forEach(link => {
      if (link.dataset.chapterLink === id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  nav.forEach(link => link.addEventListener('click', () => selectChapter(link.dataset.chapterLink)));
  if ('IntersectionObserver' in window) {
    if (hero) new IntersectionObserver(entries => {
      heroVisible = entries[0]?.isIntersecting ?? false;
      if (!heroVisible) pauseAmbient();
      else updateAmbient();
    }, { threshold: 0.08 }).observe(hero);
    if (sections.length) {
      const visible = new Map();
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio);
          else visible.delete(entry.target.id);
          if (entry.target.classList.contains('feature') && entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        }
        const best = [...visible].sort((a, b) => b[1] - a[1])[0];
        if (best) selectChapter(best[0]);
      }, { threshold: [0.15, 0.35, 0.65] });
      sections.forEach(section => observer.observe(section));
    }
  } else {
    sections.forEach(section => section.classList.add('in-view'));
  }
})();
