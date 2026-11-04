'use strict';
(() => {
  const ROOT_PATHS = new Set(['/', '/index.html']);
  if (!ROOT_PATHS.has(window.location.pathname)) return;

  function init() {
    if (document.body.dataset.homeExperience === 'active') return;
    if (!window.AD_ASTRA_HOME_DATA || !window.AD_ASTRA_HOME_UI || !window.AD_ASTRA_HOME_NEURAL) {
      document.body.dataset.homeExperience = 'error';
      return;
    }
    document.body.dataset.homeExperience = 'active';
    document.body.classList.add('hx-enhanced');
    window.AD_ASTRA_HOME_NEURAL.init();
    window.AD_ASTRA_HOME_UI.init();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
