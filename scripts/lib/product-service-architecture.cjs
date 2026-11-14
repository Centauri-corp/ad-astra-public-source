'use strict';

// Public-only architecture projection. It connects existing product, offer and
// customer-role catalogs without introducing a runtime model, provider identity
// or availability claim.
const assert = require('node:assert/strict');
const binding = require('../../projects/website-customer-experience/model-experience.json');
const { publicOffers } = require('../../lib/offer-catalog.js');
const { publicCustomerAgents } = require('../../lib/customer-agent-catalog.js');

const SERVICE_AREAS = Object.freeze([
  Object.freeze({
    id: 'individuals-creators',
    label: 'Individuals & creators',
    title: 'Understand. Imagine. Make.',
    description: 'Frame an everyday question, shape a creative brief or plan a learning journey. Proposed outcomes stay editable and open to human review.',
    familyIds: Object.freeze(['core-intelligence', 'creative-studio'])
  }),
  Object.freeze({
    id: 'teams-organizations',
    label: 'Teams & organizations',
    title: 'Bring work into focus.',
    description: 'Explore evidence, compare approaches and plan accountable handoffs. Integrations, team access and commercial terms are not yet committed.',
    familyIds: Object.freeze(['business-commerce', 'autonomous-workflows'])
  }),
  Object.freeze({
    id: 'specialists-builders',
    label: 'Specialists & builders',
    title: 'Connect with care.',
    description: 'Research complex subjects or outline bounded interfaces. Qualified oversight, authorization and verification remain essential.',
    familyIds: Object.freeze(['specialist-intelligence', 'developer-platform'])
  })
]);

function mapById(items) {
  return new Map(items.map(item => [item.id, item]));
}

function productServiceArchitecture(catalog) {
  assert.equal(catalog.scope, 'public-family-descriptions-only');
  assert.equal(catalog.availability, 'in-development');
  assert.ok(Object.values(binding.production).every(value => value === false), 'Product architecture cannot claim production activation');

  const families = mapById(catalog.families);
  const offers = mapById(publicOffers());
  const agents = mapById(publicCustomerAgents());
  const areaIds = SERVICE_AREAS.flatMap(area => area.familyIds);
  assert.equal(new Set(areaIds).size, areaIds.length, 'A product family may have only one public solution context');
  assert.deepEqual([...areaIds].sort(), [...families.keys()].sort(), 'Solution contexts must cover every public product family exactly once');

  const serviceAreas = SERVICE_AREAS.map(area => ({
    ...area,
    families: area.familyIds.map(id => {
      const family = families.get(id);
      assert.ok(family, 'Unknown product family in service context: ' + id);
      return family;
    })
  }));

  const familyArchitecture = catalog.families.map(family => {
    const relatedOffers = binding.offers
      .filter(offer => offer.familyIds.includes(family.id))
      .map(offer => offers.get(offer.offerId));
    const relatedAgents = binding.agents
      .filter(agent => agent.familyIds.includes(family.id))
      .map(agent => agents.get(agent.agentId));
    const serviceArea = serviceAreas.find(area => area.familyIds.includes(family.id));
    assert.ok(relatedOffers.length, 'Missing capability direction for ' + family.id);
    assert.ok(relatedAgents.length, 'Missing customer role for ' + family.id);
    assert.ok(relatedOffers.every(Boolean) && relatedAgents.every(Boolean) && serviceArea, 'Stale public product architecture for ' + family.id);
    return {
      ...family,
      offers: relatedOffers,
      agents: relatedAgents,
      serviceArea: { id: serviceArea.id, label: serviceArea.label, title: serviceArea.title }
    };
  });

  return Object.freeze({
    scope: 'public-product-and-solution-design-architecture',
    availability: 'in-development',
    serviceAreas,
    families: familyArchitecture
  });
}

module.exports = { SERVICE_AREAS, productServiceArchitecture };
