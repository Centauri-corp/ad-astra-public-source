'use strict';
(() => {
  const publishableKey = 'pk_live_Y2xlcmsuYWRhc3RyYS5nbG9iYWwk';
  const $ = id => document.getElementById(id);
  const modeLabels = {
    ask: 'Ask — clarify the question',
    research: 'Research — connect the question',
    create: 'Create — shape an idea',
    learn: 'Learn — build understanding',
    explore: 'Explore — test possibilities'
  };
  function clerkDomain() {
    try { return atob(publishableKey.split('_')[2]).slice(0, -1); } catch { return 'clerk.adastra.global'; }
  }
  async function loadClerk() {
    const clerk = window.Clerk;
    if (!clerk) throw new Error('clerk_not_loaded');
    await clerk.load();
    return clerk;
  }
  async function requireSession() {
    const clerk = await loadClerk();
    if (!clerk.session) {
      const returnPath = location.pathname + location.search + location.hash;
      location.replace('/platform/?return=' + encodeURIComponent(returnPath));
      return null;
    }
    await window.adAstraVerifySession(clerk);
    $('knowledge-auth').hidden = true;
    $('main').hidden = false;
    return clerk;
  }
  async function mountEngine(clerk) {
    const form = $('live-ai-form');
    if (!form) return;
    const question = $('live-ai-question');
    const mode = $('live-ai-mode');
    const submit = $('live-ai-submit');
    const status = $('live-ai-status');
    const answer = $('live-ai-answer');
    const answerText = $('live-ai-text');
    // Keep one operation key after an uncertain response. Retrying the same
    // payload must never create a second billable model attempt.
    let pendingRequest = null;
    document.querySelectorAll('[data-mode]').forEach(link => link.addEventListener('click', () => {
      const requested = link.dataset.mode;
      if (modeLabels[requested]) mode.value = requested;
      window.setTimeout(() => question.focus(), 0);
    }));
    const requestedMode = new URLSearchParams(location.search).get('mode');
    if (modeLabels[requestedMode]) mode.value = requestedMode;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (submit.dataset.available !== 'true') { status.textContent = 'The live engine is paused while release checks are completed.'; return; }
      const value = question.value.trim();
      if (value.length < 5 || value.length > 4000) {
        status.textContent = 'Please enter a question between 5 and 4,000 characters.';
        return;
      }
      submit.disabled = true;
      status.textContent = 'Thinking…';
      answer.hidden = true;
      answerText.textContent = '';
      try {
        const requestBody = JSON.stringify({question: value, mode: mode.value, references: []});
        if (!pendingRequest || pendingRequest.body !== requestBody) {
          pendingRequest = {body: requestBody, key: crypto.randomUUID()};
        }
        const token = await clerk.session.getToken();
        if (!token) throw new Error('authentication_required');
        const response = await fetch('/api/ask', {
          method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(25000),
          headers: {'Content-Type': 'application/json', 'X-Ad-Astra-Request': 'public-v1',
            'Authorization': `Bearer ${token}`, 'Idempotency-Key': pendingRequest.key},
          body: pendingRequest.body
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data?.error || 'unavailable');
        pendingRequest = null;
        answerText.textContent = data.answer;
        answer.hidden = false;
        status.textContent = 'Response ready. Verify important claims.';
        answer.scrollIntoView({behavior: 'smooth', block: 'nearest'});
      } catch (error) {
        status.textContent = error.message === 'operation_already_recorded'
          ? 'This request is already recorded and will not be sent again. Check its result before starting a new request.'
          : ['rate_limit_reached','daily_capacity_reached','monthly_capacity_reached'].includes(error.message)
          ? 'Request capacity has been reached. Please try again later.'
          : ['authentication_required','authentication_invalid'].includes(error.message)
            ? 'Please sign in again to continue.'
            : 'The live engine is unavailable right now. Please try again shortly.';
      } finally {
        submit.disabled = submit.dataset.available !== 'true';
      }
    });
  }
  (async () => {
    try {
      const clerk = await requireSession();
      if (clerk) await mountEngine(clerk);
    } catch (error) {
      const auth = $('knowledge-auth');
      auth.hidden = false;
      auth.querySelector('p').textContent = 'Secure sign-in could not load. Please try again shortly.';
      console.error('ad_astra_clerk_load_error', error);
    }
  })();
})();




