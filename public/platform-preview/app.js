'use strict';

// A local visual prototype. No provider, network, storage or microphone APIs.
(() => {
 if (globalThis.AdAstraWorkspacePreview) { globalThis.AdAstraWorkspacePreview.mount(); return; }
 const mounted = new WeakMap();
 // Native documents put the dialog after main; soft visits only replace main.
 function referenceDialog(app) {
  let dialog = app.querySelector('#reference-dialog') || document.querySelector('body > #reference-dialog');
  if (!dialog) {
    const element = (tag, attributes = {}, text = '') => {
      const node = document.createElement(tag);
      for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
      node.textContent = text;
      return node;
    };
    dialog = element('dialog', {id: 'reference-dialog', class: 'wp-reference-dialog', 'aria-labelledby': 'reference-title', 'aria-describedby': 'reference-intro'});
    const top = element('div', {class: 'wp-dialog-top'});
    top.append(element('span', {class: 'wp-overline'}, 'Reference notes / Sample only'), element('button', {type: 'button', class: 'wp-close', id: 'close-references', 'aria-label': 'Close reference notes', autofocus: ''}, '✕'));
    const title = element('h2', {id: 'reference-title'}, 'See what sits');
    title.append(element('br'), document.createTextNode('behind the sample.'));
    const details = element('details', {class: 'wp-preview-details'});
    const summary = element('summary', {}, 'About this preview ');
    summary.append(element('span', {'aria-hidden': 'true'}, '＋'));
    const boundary = element('div');
    boundary.append(
      element('p', {class: 'wp-overline'}, 'PREVIEW BOUNDARY'),
      element('p', {}, 'This customer workspace visual preview sends no customer prompts and performs no backend writes. Text and selections stay in memory in this tab, and reset on refresh. Responses are fixed samples, not live AI output.'),
      element('p', {}, 'The neural scene is concept art, not an indicator of processing or service availability. Voice activation will be available after customer access verification.'),
      element('a', {href: '/status/'}, 'Review current availability ↗')
    );
    details.append(summary, boundary);
    dialog.append(top, title,
      element('p', {id: 'reference-intro'}, 'These examples show how a brief could be structured. No sources were searched, retrieved or verified.'),
      element('p', {id: 'reference-context', class: 'wp-reference-context'}),
      element('ol', {id: 'reference-list', class: 'wp-reference-list'}), details);
  }
  app.append(dialog);
  return dialog;
 }
 function mount(scope = document) {
  const app = scope.matches?.('.wp-app') ? scope : scope.querySelector('.wp-app');
  if (!app) return;
  if (mounted.has(app)) return mounted.get(app);
  const dialog = referenceDialog(app);
  const $ = id => app.querySelector('#' + id);
  const events = new AbortController(), {signal} = events;
  const tabs = [...app.querySelectorAll('[role="tab"]')];
  const presets = [...app.querySelectorAll('[data-preset]')];
  const prompt = $('preview-prompt');
  const result = $('sample-result');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const defaultNote = 'Prewritten examples. Your text stays in this tab; no AI request is sent.';
  const sample = (label, question, title, intro, sections, evidence) => ({label, question, title, intro, sections, evidence});
  const modes = {
    research: {
      label: 'Research', description: 'Follow your curiosity. Bring the questions into focus.',
      question: 'What would you like to understand?', submit: 'View sample brief', kind: 'SAMPLE RESEARCH BRIEF',
      samples: [
        sample('Explore a resilient city', 'How could a city become more resilient to hotter summers?', 'A cooler city starts with better questions.',
          'A sample research brief for an imagined city exploring heat resilience. Start with people and place, then compare possible responses.',
          [['Frame the question', 'Which neighborhoods experience the most heat, and who has the least access to shade or cooling? Define the decision before choosing a technology.'], ['Build the evidence picture', 'Compare shade, cool roofs and access to public cooling spaces. Seek local temperature maps, maintenance requirements and community input before ranking options.'], ['Choose the next inquiry', 'Select one neighborhood for a small study. Agree how comfort, access and maintenance would be reviewed before making a recommendation.']],
          'Local heat maps, building conditions and community perspectives would be needed. None has been collected for this sample.'),
        sample('Compare energy pathways', 'What should a community consider when comparing local energy options?', 'Compare pathways before choosing a system.',
          'An illustrative research structure for a hypothetical community. The useful comparison begins with needs, constraints and unanswered questions.',
          [['Define the need', 'Separate essential demand from flexible demand. Establish the reliability, affordability and resilience questions that matter to the community.'], ['Compare on the same terms', 'Consider efficiency improvements, grid supply and local generation using consistent assumptions. Include maintenance, permissions and the full project lifetime.'], ['Name what is still unknown', 'A real decision requires local load data, technical assessment and community review. This sample supplies no prices, forecasts or engineering advice.']],
          'A real comparison would need measured demand, local network requirements and reviewed technical evidence. These are reference categories, not retrieved sources.'),
        sample('Understand a new subject', 'How can I build a useful understanding of systems thinking?', 'See the connections. Then test the explanation.',
          'A sample learning brief that introduces systems thinking through a simple, imaginary public transport network.',
          [['Start with a concrete system', 'Map the relationships between services, passengers and waiting times. Ask what changes when one part of the network changes.'], ['Look for feedback', 'A more reliable service may encourage more passengers. Ask which effects reinforce each other and which create limits or delays.'], ['Check your understanding', 'Explain one possible change in your own words. Identify an assumption and a piece of evidence that could challenge it.']],
          'A real learning brief could reference introductory systems literature and transport studies. This example contains no retrieved citations or validated model.')
      ]
    },
    create: {
      label: 'Create', description: 'Give a possibility its first shape. Keep your intention in view.',
      question: 'What would you like to bring to life?', submit: 'View sample outline', kind: 'SAMPLE CREATIVE OUTLINE',
      samples: [
        sample('Shape a new idea', 'Help outline a short film about human curiosity.', 'A small question. A much bigger world.',
          'A prewritten creative outline for an imagined short film about curiosity. Treat it as a starting point for your own direction.',
          [['Open with a human moment', 'A person pauses at an ordinary detail: light moving across a wall. One quiet question begins the story.'], ['Widen the perspective', 'Move from the detail to the wider world through matched shapes and natural sound. Let each scene introduce a new question rather than announce an answer.'], ['Return with a possibility', 'Come back to the person, now making a simple sketch. End on the invitation to keep exploring, with room for the audience to interpret.']],
          'The story, character and scene sequence are invented for this sample. No film references were retrieved; production and rights research would still be needed.'),
        sample('Find a fresh perspective', 'Outline a concept for a community reading space.', 'A place to pause. A reason to connect.',
          'An illustrative concept outline for a fictional reading space, built around a calm welcome and different ways to participate.',
          [['Set the intention', 'Offer room for quiet reading, shared discovery and people arriving for the first time. Keep the experience simple to understand.'], ['Shape three moments', 'A clear welcome, a comfortable place to stay and an optional invitation to share a recommendation. Explore the journey before selecting furniture or graphics.'], ['Invite a human review', 'Test the idea with prospective readers and accessibility advisers. Check acoustics, circulation and maintenance before developing a design.']],
          'This fictional concept draws on no site survey or participant research. A real brief would need access requirements, local input and a reviewed design.'),
        sample('Outline a story', 'Create a story outline about a scientist learning to listen.', 'The discovery begins with listening.',
          'A sample narrative structure for an original fictional story. It explores the relationship between technical curiosity and human experience.',
          [['A confident beginning', 'A scientist arrives with a precise question and a carefully prepared experiment. The people living nearby ask a different question.'], ['A change in perspective', 'The first result does not explain what residents experience. Listening reveals a missing assumption and reshapes the inquiry.'], ['An open ending', 'The scientist shares an unfinished model and asks the community what to test next. The resolution is a better question, reached together.']],
          'All characters and events are fictional. These are narrative choices, not sourced accounts or claims about scientific practice.')
      ]
    },
    plan: {
      label: 'Plan', description: 'Turn possibility into a practical next step. You set the direction.',
      question: 'What would you like to move forward?', submit: 'View sample plan', kind: 'SAMPLE PROJECT PLAN',
      samples: [
        sample('Map a first milestone', 'Help outline the first milestone for a community garden.', 'Start small. Make the first step count.',
          'A sample plan for a hypothetical community garden. The first milestone is an agreed brief, before any site work begins.',
          [['Define a useful outcome', 'Agree what the garden should offer, who it is for and how the group will make decisions. Record open questions rather than assuming agreement.'], ['Check the foundations', 'Confirm land permission, accessibility, water access and soil assessment needs. A real project needs local advice and a responsible human owner for each check.'], ['Review before moving ahead', 'Bring the brief and unresolved constraints back to participants. Decide together whether there is enough evidence to plan a small pilot.']],
          'No site, participants, permissions or dates are real. Site safety, local requirements and budgets would need independent review.'),
        sample('Plan a discovery sprint', 'Outline a discovery sprint for a new public service idea.', 'Learn enough to choose the next move.',
          'A prewritten discovery plan for an imagined public service. The sequence demonstrates decision points, without assigning real people or deadlines.',
          [['Agree the question', 'Name the problem, the people affected and what the team needs to learn. Decide what evidence would change the proposed direction.'], ['Explore with people', 'Plan accessible conversations and a simple service sketch. Arrange appropriate consent and review before collecting any real participant information.'], ['Make the decision visible', 'Bring findings, limitations and open questions to a human review. Choose whether to explore further, adjust the idea or stop.']],
          'This sample uses no research participants or personal data. Actual research would require an agreed scope, access needs and appropriate consent.'),
        sample('Turn an idea into steps', 'Help turn an idea for a small learning event into a plan.', 'An idea becomes a sequence of choices.',
          'An example planning outline for a fictional learning event. It makes dependencies visible without presenting an approved schedule.',
          [['Choose the purpose', 'Write one learning goal and define the intended audience. Decide how participants could tell whether the event was useful.'], ['Order the dependencies', 'Check venue access, facilitation needs and a suitable format before making invitations. Confirm a budget and accountable human owners in a real plan.'], ['Build in a review', 'Test the session outline with a small group. Use feedback to adjust the experience before confirming the event.']],
          'The event and sequence are illustrative. No venue, booking, budget, invitation or participant record has been created.')
      ]
    }
  };

  let mode = 'research';
  let selected = 0;
  let shownSample = null;
  let referenceTrigger = null;
  let paused = false;

  function announce(message) { $('preview-announcement').textContent = message; }

  function clearSample() {
    result.hidden = true;
    app.dataset.view = 'welcome';
    $('sample-title').textContent = '';
    $('sample-intro').textContent = '';
    $('sample-sections').replaceChildren();
    $('exploration-label').textContent = 'New exploration';
    shownSample = null;
  }

  function syncPresets() {
    presets.forEach((button, index) => button.setAttribute('aria-pressed', String(prompt.value === modes[mode].samples[index].question)));
  }

  function selectMode(next, focus = false, notify = true) {
    if (!Object.hasOwn(modes, next)) next = 'research';
    mode = next;
    selected = 0;
    clearSample();
    prompt.value = '';
    const config = modes[mode];
    tabs.forEach(tab => {
      const active = tab.dataset.mode === mode;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    });
    $('mode-panel').setAttribute('aria-labelledby', 'mode-' + mode);
    $('mode-description').textContent = config.description;
    $('prompt-label').textContent = config.question;
    $('composer-mode').textContent = config.label;
    $('submit-label').textContent = config.submit;
    $('composer-note').textContent = defaultNote;
    presets.forEach((button, index) => {
      button.firstElementChild.textContent = config.samples[index].label;
      button.setAttribute('aria-pressed', 'false');
    });
    if (notify) announce(config.label + ' mode. Choose a preset or view a prewritten sample.');
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectMode(tab.dataset.mode), {signal});
    tab.addEventListener('keydown', event => {
      const positions = {ArrowRight: (index + 1) % tabs.length, ArrowDown: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, ArrowUp: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1};
      if (!Object.hasOwn(positions, event.key)) return;
      event.preventDefault();
      selectMode(tabs[positions[event.key]].dataset.mode, true);
    }, {signal});
  });

  presets.forEach((button, index) => button.addEventListener('click', () => {
    selected = index;
    clearSample();
    prompt.value = modes[mode].samples[index].question;
    $('composer-note').textContent = defaultNote;
    syncPresets();
    announce('Example selected. ' + modes[mode].submit + ' to explore the prewritten example.');
    prompt.focus({preventScroll: true});
  }, {signal}));

  prompt.addEventListener('input', () => {
    const match = modes[mode].samples.findIndex(item => item.question === prompt.value);
    if (match !== -1) selected = match;
    syncPresets();
    $('composer-note').textContent = defaultNote;
    // An edit invalidates the visible sample so it cannot appear to answer new text.
    clearSample();
    announce('');
  }, {signal});

  function showSample(event) {
    event.preventDefault();
    const config = modes[mode];
    const example = config.samples[selected];
    shownSample = example;
    const customText = prompt.value.trim() && prompt.value.trim() !== example.question;
    $('sample-kind').textContent = config.kind;
    $('sample-boundary').textContent = customText
      ? 'Prewritten sample · Your text stays local and does not change this example.'
      : 'Prewritten sample · Illustrative, not a generated answer.';
    $('sample-title').textContent = example.title;
    $('sample-intro').textContent = example.intro;
    const items = example.sections.map(([title, text]) => {
      const li = document.createElement('li');
      const content = document.createElement('div');
      const heading = document.createElement('h3');
      const paragraph = document.createElement('p');
      heading.textContent = title;
      paragraph.textContent = text;
      content.append(heading, paragraph);
      li.append(content);
      return li;
    });
    $('sample-sections').replaceChildren(...items);
    $('exploration-label').textContent = config.label + ' / Sample';
    app.dataset.view = 'sample';
    result.hidden = false;
    announce(config.kind.toLowerCase() + ' displayed. No AI request was sent.');
    $('sample-title').focus({preventScroll: true});
    $('sample-title').scrollIntoView({behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start'});
  }
  $('preview-composer').addEventListener('submit', showSample, {signal});
  prompt.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.isComposing) {
      event.preventDefault();
      $('preview-composer').requestSubmit();
    }
  }, {signal});

  function reset(focus = true) {
    if (dialog.open) dialog.close();
    selectMode('research', false, false);
    announce('New exploration. Text and sample selections cleared.');
    if (focus) {
      prompt.focus({preventScroll: true});
      $('workspace').scrollIntoView({behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start'});
    }
  }
  $('reset-preview').addEventListener('click', () => reset(), {signal});
  $('preview-voice').addEventListener('click', () => {
    const message = 'Voice activation will be available after customer access verification.';
    $('composer-note').textContent = message;
    announce(message);
  }, {signal});

  function referenceRow(label, heading, text) {
    const li = document.createElement('li');
    const kicker = document.createElement('span');
    const h3 = document.createElement('h3');
    const p = document.createElement('p');
    kicker.textContent = label;
    h3.textContent = heading;
    p.textContent = text;
    li.append(kicker, h3, p);
    return li;
  }

  app.querySelectorAll('[data-open-references]').forEach(button => {
    button.addEventListener('click', () => {
      const example = shownSample || modes[mode].samples[selected];
      referenceTrigger = button;
      $('reference-context').textContent = modes[mode].label + ' / ' + example.label;
      $('reference-list').replaceChildren(
        referenceRow('01 / Starting question', example.question, 'A fictional scenario chosen to demonstrate the shape of an outcome. It describes no real customer, account or project.'),
        referenceRow('02 / Evidence to seek', 'Reference categories, not retrieved sources', example.evidence),
        referenceRow('03 / Human review', 'What would need checking?', 'A real outcome would need relevant evidence, a review of assumptions and a decision by the person directing the work. This preview does not establish accuracy or readiness.')
      );
      dialog.showModal();
      document.body.classList.add('wp-dialog-open');
      dialog.scrollTop = 0;
    }, {signal});
  });
  $('close-references').addEventListener('click', () => dialog.close(), {signal});
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  }, {signal});
  dialog.addEventListener('close', () => {
    document.body.classList.remove('wp-dialog-open');
    if (referenceTrigger?.isConnected) referenceTrigger.focus({preventScroll: true});
  }, {signal});

  function syncMotion() {
    const off = paused || reducedMotion.matches || document.hidden;
    app.dataset.visualMotion = off ? 'off' : 'on';
    $('preview-motion').setAttribute('aria-pressed', String(off));
    $('preview-motion').disabled = reducedMotion.matches;
    $('motion-label').textContent = reducedMotion.matches ? 'Reduced motion on' : paused ? 'Resume visual motion' : 'Pause visual motion';
    app.querySelector('.wp-motion-icon').textContent = off ? '▷' : 'Ⅱ';
    if (off) {
      $('neural-scene').style.removeProperty('--scene-x');
      $('neural-scene').style.removeProperty('--scene-y');
    }
  }
  $('preview-motion').addEventListener('click', () => { paused = !paused; syncMotion(); }, {signal});
  reducedMotion.addEventListener('change', syncMotion, {signal});
  document.addEventListener('visibilitychange', syncMotion, {signal});
  $('neural-scene').addEventListener('pointermove', event => {
    if (app.dataset.visualMotion !== 'on' || !finePointer.matches || event.pointerType === 'touch') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--scene-x', ((event.clientX - bounds.left) / bounds.width - .5) * 12 + 'px');
    event.currentTarget.style.setProperty('--scene-y', ((event.clientY - bounds.top) / bounds.height - .5) * 8 + 'px');
  }, {signal});
  $('neural-scene').addEventListener('pointerleave', event => {
    event.currentTarget.style.removeProperty('--scene-x');
    event.currentTarget.style.removeProperty('--scene-y');
  }, {signal});
  function syncOrientation() { app.querySelector('[role="tablist"]').setAttribute('aria-orientation', mobile.matches ? 'horizontal' : 'vertical'); }
  mobile.addEventListener('change', syncOrientation, {signal});

  // Clearing on pagehide also prevents a browser back/forward snapshot retaining text.
  const controller = {dispose() {
    if (signal.aborted) return;
    events.abort();
    referenceTrigger = null;
    reset(false);
    document.body.classList.remove('wp-dialog-open');
    paused = true;
    syncMotion();
    mounted.delete(app);
  }};
  mounted.set(app, controller);
  window.addEventListener('pagehide', controller.dispose, {signal});
  window.addEventListener('ad-astra:before-route-change', controller.dispose, {signal});
  selectMode(new URLSearchParams(location.search).get('mode'), false, false);
  syncOrientation();
  syncMotion();
  $('preview-motion').hidden = false;
  // Register all handlers before making the form usable; no-JS has no submit path.
  app.querySelectorAll('[disabled]').forEach(control => {
    if (control.id !== 'preview-motion') control.disabled = false;
  });
  return controller;
 }
 globalThis.AdAstraWorkspacePreview = Object.freeze({mount});
 window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
 mount();
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mount(), {once: true});
})();
