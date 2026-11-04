'use strict';
(() => {
  const ROOT_PATHS = new Set(['/', '/index.html']);

  function syncWorkspaceLink() {
    const link = document.getElementById('experience-launch');
    if (!link) return;
    const allowed = new Set(['ask', 'research', 'create', 'learn', 'explore']);
    const tab = document.querySelector('[role="tab"][data-mode][aria-selected="true"]');
    const mode = tab && allowed.has(tab.dataset.mode) ? tab.dataset.mode : 'ask';
    link.href = '/knowledge/?mode=' + encodeURIComponent(mode) + '#ask-ad-astra';
    link.textContent = 'Open ' + mode.charAt(0).toUpperCase() + mode.slice(1) + ' workspace \u2192';
  }

  function appendStylesheet(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = href;
    stylesheet.dataset.homeExperience = 'styles';
    document.head.append(stylesheet);
  }

  function appendScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.dataset.homeExperience = 'runtime';
      script.addEventListener('load', resolve, {once: true});
      script.addEventListener('error', reject, {once: true});
      document.head.append(script);
    });
  }

  function loadHomepageExperience() {
    if (!ROOT_PATHS.has(window.location.pathname)) return;
    appendStylesheet('/home-experience.css');
    appendStylesheet('/home-neural.css');
    [
      '/home-experience-data.js',
      '/home-experience-ui.js',
      '/home-experience-neural.js',
      '/home-experience.js'
    ].reduce((chain, src) => chain.then(() => appendScript(src)), Promise.resolve())
      .catch(() => { document.body.dataset.homeExperience = 'error'; });
  }

  const tabs = document.querySelector('.tabs');
  if (tabs) {
    new MutationObserver(syncWorkspaceLink).observe(tabs, {
      attributes: true,
      subtree: true,
      attributeFilter: ['aria-selected']
    });
  }
  syncWorkspaceLink();
  loadHomepageExperience();
})();
