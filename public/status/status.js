'use strict';
(()=>{
 if (globalThis.AdAstraStatusPage) { globalThis.AdAstraStatusPage.mount(); return; }
 const mounted = new WeakMap(), defaults = new WeakMap();
 function mount(scope = document) {
  const summary = scope.matches?.('#availability-update') ? scope : scope.querySelector('#availability-update');
  if (!summary) return;
  if (mounted.has(summary)) return mounted.get(summary);
  const root = summary.closest('main') || scope;
  const refresh = root.querySelector('#availability-refresh');
  const cards = [...root.querySelectorAll('[data-service]')];
  if (!refresh || !cards.length) return;
  const events = new AbortController(), {signal} = events;
  const fallbacks = cards.map(card => ({
    state:card.querySelector('[data-state]').dataset.state,
    label:card.querySelector('[data-state]').textContent,
    description:card.querySelector('[data-description]').textContent
  }));
  if (!defaults.has(summary)) defaults.set(summary, fallbacks);
  const labels = {available:'Available', preview:'Preview', paused:'Paused', planned:'In development'};
  let running = false;
  let request = null, timeout = null;
  const controller = {dispose() {
    if (signal.aborted) return;
    events.abort(); request?.abort(); clearTimeout(timeout); mounted.delete(summary);
  }};
  mounted.set(summary, controller);
  function apply(services) {
    cards.forEach(card => {
      const service = services.find(item => item.id === card.dataset.service);
      const badge = card.querySelector('[data-state]');
      badge.dataset.state = service.state;
      badge.textContent = labels[service.state];
      card.querySelector('[data-description]').textContent = service.description;
    });
  }
  async function update() {
    if (running || signal.aborted) return;
    running = true;
    refresh.disabled = true;
    summary.textContent = 'Checking current release availability…';
    request = new AbortController();
    timeout = setTimeout(() => request.abort(), 5000);
    try {
      const response = await fetch('/api/operating-status', {cache:'no-store', redirect:'error', signal:request.signal});
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json();
      if (signal.aborted) return;
      if (data.schema !== 'ad-astra-operating-status/v1' || data.basis !== 'release-configuration'
        || !Array.isArray(data.services) || data.services.length !== cards.length
        || new Set(data.services.map(item => item?.id)).size !== cards.length
        || !data.services.every(item => item && cards.some(card => card.dataset.service === item.id)
          && Object.hasOwn(labels, item.state) && typeof item.description === 'string' && item.description.length <= 500)
        || typeof data.generatedAt !== 'string' || !Number.isFinite(Date.parse(data.generatedAt))) throw new Error('invalid-response');
      apply(data.services);
      const time = new Intl.DateTimeFormat(undefined, {dateStyle:'medium', timeStyle:'short'}).format(new Date(data.generatedAt));
      summary.textContent = `Release availability refreshed ${time}.`;
    } catch {
      if (signal.aborted) return;
      // Remove any previous Available badge after a failed refresh. Never
      // leave a stale positive engine status looking current.
      apply(cards.map((card, index) => ({id:card.dataset.service, ...defaults.get(summary)[index]})));
      summary.textContent = 'Current release availability could not be checked. Showing development statuses. Try refreshing.';
    } finally {
      clearTimeout(timeout);
      running = false;
      if (!signal.aborted) refresh.disabled = false;
    }
  }
  refresh.hidden = false;
  refresh.addEventListener('click', update, {signal});
  window.addEventListener('ad-astra:before-route-change', controller.dispose, {signal});
  window.addEventListener('pagehide', controller.dispose, {signal});
  update();
  return controller;
 }
 globalThis.AdAstraStatusPage = Object.freeze({mount});
 window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
 mount();
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mount(), {once: true});
})();
