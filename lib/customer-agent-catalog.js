'use strict';

// Customer-facing capability profiles. These are not provider/model endpoints.
// Server-side routing remains the authority for any runtime binding.
const AGENTS = Object.freeze([
  Object.freeze({ id: 'guide', name: 'Astra Guide', purpose: 'Clarify questions and turn uncertainty into a practical starting point.', capabilities: Object.freeze(['question framing', 'plain-language explanations', 'next-step planning']), defaultMode: 'ask', availability: 'development-preview', entitlement: 'release-gate-required', directive: 'clarify the question and offer a practical starting point' }),
  Object.freeze({ id: 'researcher', name: 'Astra Researcher', purpose: 'Structure evidence, comparisons, assumptions, and open questions.', capabilities: Object.freeze(['evidence mapping', 'comparative analysis', 'uncertainty tracking']), defaultMode: 'research', availability: 'development-preview', entitlement: 'release-gate-required', directive: 'structure evidence, comparisons, assumptions, and open questions' }),
  Object.freeze({ id: 'creator', name: 'Astra Creator', purpose: 'Shape concepts, briefs, drafts, and communication directions.', capabilities: Object.freeze(['concept development', 'writing support', 'creative briefs']), defaultMode: 'create', availability: 'development-preview', entitlement: 'release-gate-required', directive: 'shape a clear concept, draft, or creative direction' }),
  Object.freeze({ id: 'analyst', name: 'Astra Analyst', purpose: 'Break complex choices into scenarios, trade-offs, and decision criteria.', capabilities: Object.freeze(['scenario analysis', 'trade-off mapping', 'decision support']), defaultMode: 'explore', availability: 'development-preview', entitlement: 'release-gate-required', directive: 'break choices into scenarios, trade-offs, and decision criteria' }),
  Object.freeze({ id: 'navigator', name: 'Astra Navigator', purpose: 'Convert an objective into an ordered, bounded path forward.', capabilities: Object.freeze(['roadmap framing', 'task sequencing', 'risk prompts']), defaultMode: 'ask', availability: 'development-preview', entitlement: 'release-gate-required', directive: 'turn the objective into an ordered, bounded path forward' }),
  Object.freeze({ id: 'access', name: 'Astra Access', purpose: 'Make interactions concise, clear, and easier to use across supported access needs.', capabilities: Object.freeze(['concise responses', 'step-by-step guidance', 'accessible interaction']), defaultMode: 'learn', availability: 'development-preview', entitlement: 'release-gate-required', directive: 'respond concisely with clear, step-by-step guidance' }),
  Object.freeze({ id: 'visual', name: 'Astra Visual', purpose: 'Develop text-based visual briefs and communication directions. Image analysis is not available in this release.', capabilities: Object.freeze(['text-based visual briefs', 'art direction planning', 'visual communication']), defaultMode: 'create', availability: 'development-preview', entitlement: 'release-gate-required', directive: 'develop text-based visual briefs and state that image analysis is unavailable' })
]);

function resolveCustomerAgent(id) { return AGENTS.find(agent => agent.id === id) || null; }
function publicCustomerAgents() {
  return AGENTS.map(({ id, name, purpose, capabilities, defaultMode, availability, entitlement }) => ({ id, name, purpose, capabilities: [...capabilities], defaultMode, availability, entitlement }));
}

module.exports = { AGENTS, resolveCustomerAgent, publicCustomerAgents };
