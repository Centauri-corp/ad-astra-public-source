'use strict';

// Capability offers over governed roles. These are not additional public model
// endpoints and do not disclose provider identities or pricing.
const OFFERS = Object.freeze([
  Object.freeze({ id: 'core-intelligence', name: 'Astra Core', purpose: 'A focused foundation for questions, learning, and practical next steps.', agentIds: Object.freeze(['guide', 'creator']), addOn: false, availability: 'development-preview', entitlement: 'release-gate-required' }),
  Object.freeze({ id: 'research-studio', name: 'Astra Research', purpose: 'Evidence mapping, comparisons, assumptions, and structured discovery.', agentIds: Object.freeze(['researcher', 'analyst']), addOn: true, availability: 'development-preview', entitlement: 'release-gate-required' }),
  Object.freeze({ id: 'workflow-navigator', name: 'Astra Workflow', purpose: 'Bounded planning, sequencing, and supervised next-step design.', agentIds: Object.freeze(['navigator', 'access']), addOn: true, availability: 'development-preview', entitlement: 'release-gate-required' }),
  Object.freeze({ id: 'visual-intelligence', name: 'Astra Visual', purpose: 'Visual briefs and supported multimodal work through a governed capability route.', agentIds: Object.freeze(['visual']), addOn: true, availability: 'development-preview', entitlement: 'release-gate-required' })
]);

const WITHHELD = Object.freeze(null);

function publicOffers() {
  return OFFERS.map(({ id, name, purpose, agentIds, addOn, availability, entitlement }) => ({ id, name, purpose, agentIds: [...agentIds], addOn, availability, entitlement }));
}

module.exports = { OFFERS, WITHHELD, publicOffers };
