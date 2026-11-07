'use strict';

const form = document.getElementById('concierge-form');
const input = document.getElementById('concierge-input');
const response = document.getElementById('concierge-response');
const responseTitle = document.getElementById('concierge-response-title');
const responseBody = document.getElementById('concierge-response-body');
const responseNext = document.getElementById('concierge-response-next');

const guides = [
  {
    matches: /learn|understand|explain|teach|know/i,
    label: 'LEARN / BUILD CONTEXT',
    title: 'Start with the part you want to make clear.',
    body: 'Name the idea, term or relationship that feels uncertain. A useful explanation starts by choosing the boundary of the question.',
    next: 'Write one sentence about what you already know, then name the part that still feels unclear.'
  },
  {
    matches: /create|design|build|make|idea|imagine/i,
    label: 'CREATE / GIVE IT SHAPE',
    title: 'Give the idea a purpose and a first form.',
    body: 'Describe who the idea is for, what it should change and what constraint matters most. Clear intent makes creative options easier to compare.',
    next: 'Choose one audience and one outcome before you expand the concept.'
  },
  {
    matches: /research|evidence|source|compare|why|should/i,
    label: 'RESEARCH / KEEP EVIDENCE IN VIEW',
    title: 'Turn the broad question into something you can examine.',
    body: 'Separate the claim from the evidence you would need to trust it. Then list the strongest alternative explanation.',
    next: 'Write the claim, the evidence you have and the evidence that would change your mind.'
  }
];

function setText(node, value) {
  node.textContent = value;
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const question = input.value.trim();
  if (question.length < 3) {
    setText(responseTitle, 'Give the question a little more shape.');
    setText(responseBody, 'A few words are enough. Name the topic or decision you want to understand.');
    setText(responseNext, 'Try starting with “How…”, “Why…” or “What would change if…”.');
    response.hidden = false;
    response.focus();
    return;
  }

  const guide = guides.find(item => item.matches.test(question)) || {
    label: 'ASK / FIND THE QUESTION',
    title: 'Look for the question underneath the first question.',
    body: 'A strong starting point makes the goal, context and uncertainty visible. Keep the first version small enough to examine.',
    next: 'Rewrite your thought as one sentence with a clear subject, outcome or decision.'
  };

  const label = response.querySelector('.eyebrow');
  setText(label, 'ASTRA LUMEN / ' + guide.label);
  setText(responseTitle, guide.title);
  setText(responseBody, guide.body);
  setText(responseNext, guide.next);
  response.hidden = false;
  response.focus();
});
