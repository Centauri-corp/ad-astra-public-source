'use strict';
(() => {
  const endpoint = 'https://wewznejqpnsmiwkbozgw.supabase.co/functions/v1/astra-early-access';
  const panel = document.getElementById('early-access-form');
  const submit = document.getElementById('early-access-submit');
  const status = document.getElementById('early-access-status');
  const fields = {
    fullName: document.getElementById('early-full-name'),
    company: document.getElementById('early-company'),
    email: document.getElementById('early-email'),
    website: document.getElementById('early-website'),
    consent: document.getElementById('early-consent'),
  };
  if (!panel || !submit || !status || Object.values(fields).some((field) => !field)) return;

  const originalLabel = submit.textContent;
  const messages = Object.freeze({
    invalid_email: 'Enter a valid email address.',
    consent_required: 'Confirm that you agree to receive early-access updates.',
    input_too_long: 'One of the entries is too long. Please shorten it and try again.',
    body_too_large: 'The request is too large. Please shorten the entries and try again.',
    rate_limited: 'Too many requests were received. Please try again in a few minutes.',
    service_unavailable: 'The request service is temporarily unavailable. Please try again shortly.',
  });

  function announce(message, state = '') {
    status.textContent = message;
    status.dataset.state = state;
  }
  function setBusy(busy) {
    panel.setAttribute('aria-busy', String(busy));
    submit.disabled = busy;
    submit.textContent = busy ? 'Sending…' : originalLabel;
  }
  function validate() {
    for (const field of [fields.fullName, fields.company, fields.email, fields.consent]) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  }
  function resetFields() {
    fields.fullName.value = '';
    fields.company.value = '';
    fields.email.value = '';
    fields.website.value = '';
    fields.consent.checked = false;
  }

  async function send() {
    if (submit.disabled || !validate()) return;
    announce('');
    setBusy(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fields.email.value.trim(),
          full_name: fields.fullName.value.trim(),
          company: fields.company.value.trim(),
          website: fields.website.value.trim(),
          consent: fields.consent.checked,
        }),
      });
      let data = {};
      try { data = await response.json(); } catch { /* Use the safe generic message below. */ }
      if (!response.ok || data.ok !== true) {
        const error = new Error(typeof data.error === 'string' ? data.error : 'service_unavailable');
        error.status = response.status;
        throw error;
      }
      resetFields();
      announce('Your early-access request was received. We will use the email you provided for AD ASTRA launch and preview updates.', 'success');
    } catch (error) {
      const code = error && error.name === 'AbortError' ? 'service_unavailable' : error?.message;
      announce(messages[code] || 'The request could not be completed. Please try again shortly.', 'error');
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  }

  submit.addEventListener('click', send);
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing && event.target?.type !== 'checkbox') {
      event.preventDefault();
      send();
    }
  });
})();
