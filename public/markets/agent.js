'use strict';

(() => {
const input = document.getElementById('concierge-input');
const startButton = document.getElementById('concierge-start');
const unavailable = document.getElementById('concierge-unavailable');
const response = document.getElementById('concierge-response');
const responseTitle = document.getElementById('concierge-response-title');
const responseBody = document.getElementById('concierge-response-body');
const responseNext = document.getElementById('concierge-response-next');
const modeInputs = [...document.querySelectorAll('input[name="concierge-mode"]')];
const neuralArt = document.querySelector('.agent-neural-art');

// No native form exists: a disabled/missing script must never submit a question.
if (![input, startButton, unavailable, response, responseTitle, responseBody, responseNext].every(Boolean)) return;

const guides = {
  ask: {
    label: 'ASK / FIND THE QUESTION',
    title: 'Look for the question underneath the first question.',
    body: 'A strong starting point makes the goal, context and uncertainty visible. Keep the first version small enough to examine.',
    next: 'Rewrite your thought as one sentence with a clear subject, outcome or decision.'
  },
  learn: {
    label: 'LEARN / BUILD CONTEXT',
    title: 'Start with the part you want to make clear.',
    body: 'Name the idea, term or relationship that feels uncertain. A useful explanation starts by choosing the boundary of the question.',
    next: 'Write one sentence about what you already know, then name the part that still feels unclear.'
  }
};

const placeholders = {
  ask: 'What would you like to understand more clearly?',
  learn: 'What subject would you like to explore step by step?'
};

function setText(node, value) {
  node.textContent = value;
}

function setState(state) {
  if (neuralArt) neuralArt.dataset.state = state;
  if (response) response.dataset.state = state;
}

function selectedMode() {
  return modeInputs.find(item => item.checked)?.value || 'ask';
}

modeInputs.forEach(item => item.addEventListener('change', () => {
  input.placeholder = placeholders[selectedMode()];
  setState('idle');
}));

startButton.addEventListener('click', () => {
  const question = input.value.trim();
  const mode = selectedMode();
  const guide = guides[mode] || guides.ask;

  if (question.length < 3) {
    setText(responseTitle, 'Give the question a little more shape.');
    setText(responseBody, 'A few words are enough. Name the topic or decision you want to understand.');
    setText(responseNext, 'Try starting with “How…”, “Why…” or “What would change if…”.');
    response.hidden = false;
    setState('guided');
    response.focus();
    return;
  }

  setState('thinking');
  response.hidden = false;
  window.setTimeout(() => {
    const label = response.querySelector('.eyebrow');
    setText(label, 'ASTRA LUMEN / ' + guide.label);
    setText(responseTitle, guide.title);
    setText(responseBody, guide.body);
    setText(responseNext, guide.next);
    setState('guided');
    response.focus();
  }, 180);
});

input.placeholder = placeholders[selectedMode()];
// Enable interaction only after its browser-local handler is installed.
startButton.disabled = false;
unavailable.hidden = true;
})();
