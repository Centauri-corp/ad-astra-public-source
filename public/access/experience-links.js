'use strict';
(() => {
  const modes = new Set(['ask', 'research', 'create', 'learn', 'explore']);
  const mode = new URLSearchParams(location.search).get('mode');
  const signIn = document.getElementById('access-sign-in');
  if (signIn && modes.has(mode)) {
    signIn.href = '/sign-in/?return=' + encodeURIComponent('/knowledge/?mode=' + mode + '#ask-ad-astra');
    document.getElementById('access-mode').textContent = 'Selected mode: ' + mode + '.';
  }
  // The homepage's mode tabs update this link. Keep the access step in its path.
  const launch = document.getElementById('experience-launch');
  function align() {
    if (!launch) return;
    const tab = document.querySelector?.('[role="tab"][aria-selected="true"][data-mode]');
    if (tab && modes.has(tab.dataset.mode)) {
      const destination = '/access/?mode=' + tab.dataset.mode;
      if (launch.getAttribute('href') !== destination) launch.setAttribute('href', destination);
      launch.textContent = 'Open ' + tab.textContent.trim() + ' →';
      return;
    }
    const url = new URL(launch.href, location.origin);
    if (url.origin !== location.origin || url.pathname !== '/knowledge/') return;
    const selected = url.searchParams.get('mode');
    launch.href = '/access/' + (modes.has(selected) ? '?mode=' + selected : '');
  }
  if (launch) {
    align(); new MutationObserver(align).observe(launch, {attributes: true, attributeFilter: ['href']});
    const tabs = document.querySelector?.('[role="tablist"]');
    if (tabs) new MutationObserver(align).observe(tabs, {subtree: true, attributes: true, attributeFilter: ['aria-selected']});
  }
})();
