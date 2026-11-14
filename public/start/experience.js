'use strict';
// Local selection of prewritten examples only. No provider, analytics or storage access.
(() => {
 if(globalThis.AdAstraStartExperience){globalThis.AdAstraStartExperience.mount();return;}
 const mounted = new WeakMap();
 function mount(scope = document) {
  const controls = scope.matches?.('[data-direction-controls]') ? scope : scope.querySelector('[data-direction-controls]');
  if (!controls) return;
  if (mounted.has(controls)) return mounted.get(controls);
  const root = controls.closest('main') || scope;
  const choices = [...root.querySelectorAll('[data-direction-choice]')];
  const panels = [...root.querySelectorAll('[data-direction-panel]')];
  const announcement = root.querySelector('[data-direction-announcement]');
  if (!controls || !choices.length || !panels.length || !announcement) return;
  const events = new AbortController(), {signal} = events;
  const controller = {dispose() { if (signal.aborted) return; events.abort(); mounted.delete(controls); }};
  mounted.set(controls, controller);
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
  for (const button of choices) button.addEventListener('click', () => select(button.dataset.directionChoice, true), {signal});
  window.addEventListener('popstate', () => select(readDirection()), {signal});
  window.addEventListener('ad-astra:before-route-change', controller.dispose, {signal});
  window.addEventListener('pagehide', controller.dispose, {signal});
  select(readDirection());
  controls.hidden = false;
  return controller;
 }
 globalThis.AdAstraStartExperience = Object.freeze({mount});
 window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
 mount();
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mount(), {once: true});
})();
