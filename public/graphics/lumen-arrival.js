(() => {
  const form = document.querySelector('#lumen-form');
  if (!form) return;
  const field = document.querySelector('#lumen-question');
  const status = document.querySelector('#lumen-status');
  const panel = document.querySelector('#lumen-interaction');
  const voice = document.querySelector('#lumen-voice');
  const reply = document.querySelector('#lumen-reply');
  const result = document.querySelector('#lumen-result');
  const listen = document.querySelector('#lumen-listen');
  const portal = document.querySelector('#lumen-workspace');
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const example = 'Why do cities stay warmer at night?';
  let speech;
  const showState = (state, message) => {
    panel.dataset.state = state;
    status.textContent = message;
  };
  function respond() {
    const question = field.value.trim();
    if (!question) { field.focus(); return; }
    speech?.abort();
    window.speechSynthesis?.cancel();
    const isExample = question.toLowerCase().replace(/[?!.]+$/, '') === example.toLowerCase().slice(0, -1);
    reply.textContent = isExample
      ? 'Buildings and roads store heat during the day and release it after sunset. Trees and open ground often cool faster.'
      : 'Continue in your workspace to submit this question to the Ad Astra intelligence engine.';
    listen.hidden = !isExample || !window.speechSynthesis;
    document.querySelector('#lumen-example-label').hidden = !isExample;
    portal.hidden = isExample;
    try { sessionStorage.setItem('ad-astra-home-question', question); } catch {}
    result.hidden = false;
    showState('responding', isExample ? 'Example response ready' : 'Question ready for the workspace');
  }
  form.addEventListener('submit', event => { event.preventDefault(); respond(); });
  document.querySelector('#lumen-example').addEventListener('click', () => { field.value = example; respond(); });
  field.addEventListener('input', () => { result.hidden = true; showState('idle', ''); });
  voice.hidden = !Recognition;
  voice.addEventListener('click', () => {
    if (speech) { speech.abort(); return; }
    const session = new Recognition();
    speech = session;
    session.lang = 'en-US';
    session.onstart = () => {
      voice.setAttribute('aria-pressed', 'true');
      showState('listening', 'Microphone on. Say “Hey Astra” followed by your question.');
    };
    session.onresult = event => {
      const words = event.results[0][0].transcript.trim();
      const question = words.replace(/^hey[ ,]+astra[ ,.!?]*/i, '');
      if (question === words || !question) { showState('idle', 'Select voice again and say “Hey Astra” followed by a question.'); return; }
      field.value = question;
      respond();
    };
    session.onerror = () => showState('idle', 'Voice is unavailable. You can type your question.');
    session.onend = () => {
      speech = null;
      voice.setAttribute('aria-pressed', 'false');
      if (panel.dataset.state === 'listening') showState('idle', '');
    };
    try { session.start(); } catch { session.onend(); showState('idle', 'Could not activate the microphone.'); }
  });
  listen.addEventListener('click', () => {
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
    const words = new SpeechSynthesisUtterance(reply.textContent);
    words.lang = 'en-US';
    words.onstart = () => showState('speaking', 'Reading the example aloud');
    words.onend = words.onerror = () => {
      if (panel.dataset.state === 'speaking') showState('responding', 'Example response ready');
    };
    speechSynthesis.speak(words);
  });
  // The intelligence prompt can live in the secondary narrative, independent
  // of the cinematic hero. Only attach spatial portrait movement when a portrait
  // is intentionally present; never assume the form is inside .hero.
  const motionHost = panel.closest('.lumen-intelligence-bridge') || panel.closest('.hero');
  const portrait = panel.querySelector('.lumen-portrait');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (motionHost && portrait) {
    motionHost.addEventListener('pointermove', event => {
      if (reduced.matches || event.pointerType !== 'mouse') return;
      const bounds = motionHost.getBoundingClientRect();
      panel.style.setProperty('--lumen-yaw', ((event.clientX - bounds.left) / Math.max(1,bounds.width) - .5) * 18 + 'deg');
      panel.style.setProperty('--lumen-pitch', (.5 - (event.clientY - bounds.top) / Math.max(1,bounds.height)) * 9 + 'deg');
    });
    const reset = () => {
      panel.style.removeProperty('--lumen-yaw');
      panel.style.removeProperty('--lumen-pitch');
    };
    motionHost.addEventListener('pointerleave', reset);
    motionHost.querySelector('.motion')?.addEventListener('click', reset);
  }
})();