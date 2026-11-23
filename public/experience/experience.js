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
  // One local, bounded product-story controller. No model calls or billing
  // requests: scene and copy are static reviewed creative assets only.
  const productDirections = Object.freeze({
    discovery: Object.freeze({
      title: 'Beyond Physics',
      overline: 'FROM QUESTIONS TO CONNECTIONS',
      description: 'Explore how different disciplines interpret the same question, and distinguish evidence from possibility.',
      label: 'DISCOVERY / CONCEPTUAL VISUAL',
      image: '/assets/astra-lumen-neural-horizon.png',
      alt: 'Ad Astra conceptual orbital intelligence field over an Earth horizon'
    }),
    learning: Object.freeze({
      title: 'Astra Lumen',
      overline: 'FROM COMPLEXITY TO LEARNING',
      description: 'Follow a human-directed explanation of a difficult idea, with the intention of keeping the learner in control of the next step.',
      label: 'LEARNING / CONCEPTUAL VISUAL',
      image: '/assets/astra-lumen-neural-brain.png',
      alt: 'Luminous cyan neural network with golden orbital connections'
    }),
    visualize: Object.freeze({
      title: 'Neural Visual Experience',
      overline: 'FROM INFORMATION TO SPATIAL UNDERSTANDING',
      description: 'Make relationships and time-varying models easier to inspect. Try the synthetic scientific surface to experience direct controls.',
      label: 'VISUALIZATION / SYNTHETIC STUDY',
      image: '/assets/astra-lumen-neural-profile-canvas.png',
      alt: 'Cyan neural silhouette with connected violet signal geometry'
    }),
    govern: Object.freeze({
      title: 'Governed AI Workflows',
      overline: 'FROM INTENT TO HUMAN REVIEW',
      description: 'Explore how decision points, authorization boundaries and review steps fit into a governed operating process.',
      label: 'GOVERNANCE / CONCEPTUAL VISUAL',
      image: '/assets/astra-lumen-neural-concierge.png',
      alt: 'Conceptual neural figure in cyan and gold, representing a governed interface'
    })
  });
  const productButtons = [...document.querySelectorAll('[data-experience-product]')];
  const productPreview = document.querySelector('[data-product-preview]');
  function selectProduct(id) {
    if (!Object.hasOwn(productDirections, id) || !productPreview) return;
    const data = productDirections[id];
    const art = productPreview.querySelector('[data-product-art]');
    if (art) {
      art.src = data.image;
      art.alt = data.alt;
    }
    const textFields = {
      '[data-product-title]': data.title,
      '[data-product-overline]': data.overline,
      '[data-product-description]': data.description,
      '[data-product-label]': data.label,
      '[data-product-status]': 'Concept demonstration. No customer data, AI model, or external sources are accessed by this selector.'
    };
    for (const [selector, value] of Object.entries(textFields)) {
      const element = productPreview.querySelector(selector);
      if (element) element.textContent = value;
    }
    productPreview.dataset.productActive = id;
    productButtons.forEach(button => {
      const active = button.dataset.experienceProduct === id;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-selected', active);
    });
  }
  productButtons.forEach((button, index) => {
    button.addEventListener('click', () => selectProduct(button.dataset.experienceProduct));
    button.addEventListener('keydown', event => {
      const { key } = event;
      if (!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(key)) return;
      event.preventDefault();
      const delta = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1;
      const next = key === 'Home' ? 0
        : key === 'End' ? productButtons.length-1
        : (index + delta + productButtons.length) % productButtons.length;
      productButtons[next].focus();
      selectProduct(productButtons[next].dataset.experienceProduct);
    });
  });
  if (productButtons.length) selectProduct('discovery');

})();
