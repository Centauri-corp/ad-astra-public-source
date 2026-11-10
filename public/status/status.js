'use strict';
(()=>{
  const summary = document.getElementById('availability-update');
  const refresh = document.getElementById('availability-refresh');
  const cards = [...document.querySelectorAll('[data-service]')];
  const fallbacks = cards.map(card => ({
    state:card.querySelector('[data-state]').dataset.state,
    label:card.querySelector('[data-state]').textContent,
    description:card.querySelector('[data-description]').textContent
  }));
  const labels = {available:'Available', preview:'Preview', paused:'Paused', planned:'In development'};
  let running = false;
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
    if (running) return;
    running = true;
    refresh.disabled = true;
    summary.textContent = 'Checking current release availability…';
    try {
      const response = await fetch('/api/operating-status', {cache:'no-store', redirect:'error', signal:AbortSignal.timeout(5000)});
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json();
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
      // Remove any previous Available badge after a failed refresh. Never
      // leave a stale positive engine status looking current.
      apply(cards.map((card, index) => ({id:card.dataset.service, ...fallbacks[index]})));
      summary.textContent = 'Current release availability could not be checked. Showing development statuses. Try refreshing.';
    } finally {
      running = false;
      refresh.disabled = false;
    }
  }
  refresh.hidden = false;
  refresh.addEventListener('click', update);
  update();
})();
