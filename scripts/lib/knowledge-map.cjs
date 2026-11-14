'use strict';

// Deliberately curated public examples; no runtime data sources.
const nodes = [
  { id: 'question', label: 'Question', title: 'Where should we begin?', description: 'A fictional team wants to make its first week easier to navigate. Start with a clear question: what would help a new colleague find their next step?', x: 12, y: 47 },
  { id: 'evidence', label: 'Evidence', title: 'Look at what is available.', description: 'In this curated example, a welcome checklist and a sample orientation guide provide starting material. They are illustrative documents, not retrieved or verified sources.', x: 39, y: 17 },
  { id: 'context', label: 'Context', title: 'Keep the situation in view.', description: 'The fictional team works across time zones and has limited time for live introductions. These sample constraints help frame which options could be practical.', x: 39, y: 77 },
  { id: 'alternatives', label: 'Alternatives', title: 'Compare possible directions.', description: 'Consider a self-guided welcome path or a short introduction with a colleague. Compare each against the example materials and time-zone constraints before choosing.', x: 67, y: 47 },
  { id: 'next-step', label: 'Next step', title: 'Choose something to try.', description: 'Draft a one-page welcome path, then ask a colleague to review it. This is an illustrative next action for a person to consider, not an automated decision or completed task.', x: 90, y: 47 }
];
const connections = [
  ['question', 'evidence'], ['question', 'context'], ['question', 'alternatives'],
  ['evidence', 'alternatives'], ['context', 'alternatives'], ['alternatives', 'next-step']
];
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

function knowledgeMap() {
  const prefix = 'ad-knowledge-map';
  const edges = connections.map(([from, to]) => {
    const a = nodes.find(node => node.id === from);
    const b = nodes.find(node => node.id === to);
    return `<path d="M ${a.x * 10} ${a.y * 5} L ${b.x * 10} ${b.y * 5}" data-map-edge data-from="${from}" data-to="${to}" class="${from === 'question' ? 'is-connected' : ''}" />`;
  }).join('');
  const items = nodes.map((node, index) => `<li style="--map-x:${node.x}%;--map-y:${node.y}%"><button type="button" data-map-node="${node.id}" data-map-title="${escape(node.title)}" data-map-description="${escape(node.description)}" aria-pressed="${index === 0}" aria-controls="${prefix}-detail"><span class="ad-knowledge-map__number" aria-hidden="true">0${index + 1}</span><span>${node.label}</span></button><p class="ad-knowledge-map__fallback">${escape(node.description)}</p></li>`).join('');
  return `<section class="ad-knowledge-map" data-knowledge-map aria-labelledby="${prefix}-heading">
  <header><p class="ad-knowledge-map__eyebrow">AD ASTRA / CONNECTED PERSPECTIVES</p><h2 id="${prefix}-heading">See the connections.</h2><p class="ad-knowledge-map__intro">Bring a question, its evidence and its context into view. Explore the alternatives. Find a next step.</p></header>
  <p class="ad-knowledge-map__scope">Curated, fictional example. These links describe relationships between sample ideas, not hidden AI reasoning. No customer records or live sources are used.</p>
  <p class="ad-knowledge-map__hint" data-map-hint hidden>Select a point to follow its connections. Use Tab and Enter, or the arrow keys, to explore.</p>
  <div class="ad-knowledge-map__canvas"><svg class="ad-knowledge-map__connections" viewBox="0 0 1000 500" aria-hidden="true" focusable="false">${edges}</svg><ol class="ad-knowledge-map__nodes" aria-label="Connected sample ideas">${items}</ol></div>
  <div class="ad-knowledge-map__detail" id="${prefix}-detail" role="status" aria-live="polite" aria-atomic="true" hidden><p class="ad-knowledge-map__eyebrow" data-map-category>Question</p><h3 data-map-title>${nodes[0].title}</h3><p data-map-description>${nodes[0].description}</p><p class="ad-knowledge-map__related" data-map-related></p></div>
  </section>`;
}

module.exports = { knowledgeMap };
