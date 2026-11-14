'use strict';
// Local selection of prewritten examples only. No provider, analytics or storage access.
(() => {
  const controls = document.querySelector('[data-direction-controls]');
  const choices = [...document.querySelectorAll('[data-direction-choice]')];
  const panels = [...document.querySelectorAll('[data-direction-panel]')];
  const announcement = document.querySelector('[data-direction-announcement]');
  if (!controls || !choices.length || !panels.length || !announcement) return;
  const allowed = new Set(choices.map(button => button.dataset.directionChoice));
  const readDirection = () => {
    const value = new URLSearchParams(location.search).get('direction');
    return allowed.has(value) ? value : 'research';
  };
  function select(direction, updateHistory = false) {
    if (!allowed.has(direction)) return;
    for (const button of choices) button.setAttribute('aria-pressed', String(button.dataset.directionChoice === direction));
    for (const panel of panels) panel.hidden = panel.dataset.directionPanel !== direction;
    const label = choices.find(button => button.dataset.directionChoice === direction).textContent.trim().replace(/^\d+\s*/, '').replace(/↗$/, '').trim();
    announcement.textContent = label + ': written example selected. No AI request has been sent.';
    if (updateHistory && new URLSearchParams(location.search).get('direction') !== direction) history.pushState(null, '', '/start/?direction=' + encodeURIComponent(direction) + '#workspace');
  }
  for (const button of choices) button.addEventListener('click', () => select(button.dataset.directionChoice, true));
  window.addEventListener('popstate', () => select(readDirection()));
  select(readDirection());
  controls.hidden = false;
})();
