'use strict';
const { MODE_IDS } = require('./modes');

const MODELS = Object.freeze([
  Object.freeze({ id: 'astra-lumen', name: 'Astra Polaris', legacyName: 'Astra Lumen', role: 'Connected foundation intelligence', modes: MODE_IDS, visual: 'central radiant core', latency: 'fast' })
]);

// Sector names are public product profiles over the one connected foundation
// model. They do not create additional model endpoints or provider exposure.
const MARKET_PROFILES = Object.freeze([
  Object.freeze({ id: 'sirius-public', name: 'Astra Sirius', market: 'General public', focus: 'Everyday questions, planning and learning' }),
  Object.freeze({ id: 'orion-defense', name: 'Astra Orion', market: 'Defense and DOD', focus: 'Mission planning, analysis and governed knowledge work' }),
  Object.freeze({ id: 'helios-energy', name: 'Astra Helios', market: 'DOE and energy', focus: 'Energy systems, research and program planning' }),
  Object.freeze({ id: 'spica-medical', name: 'Astra Spica', market: 'Medical and life sciences', focus: 'Health literacy, research and clinical operations support' }),
  Object.freeze({ id: 'lyra-education', name: 'Astra Lyra', market: 'Schools and universities', focus: 'Teaching, learning, research and workforce development' }),
  Object.freeze({ id: 'capella-hospitality', name: 'Astra Capella', market: 'Catering and hospitality', focus: 'Menu planning, service operations and guest experience' }),
  Object.freeze({ id: 'andromeda-science', name: 'Astra Andromeda', market: 'Science and research', focus: 'Evidence mapping, hypotheses and cross-domain discovery' }),
  Object.freeze({ id: 'altair-engineering', name: 'Astra Altair', market: 'Professional engineering', focus: 'Engineering documentation, review and decision support' }),
  Object.freeze({ id: 'rigel-mechanical', name: 'Astra Rigel', market: 'Mechanical engineering', focus: 'Mechanical systems, design reviews and maintenance planning' }),
  Object.freeze({ id: 'electra-electrical', name: 'Astra Electra', market: 'Electrical engineering', focus: 'Electrical systems, controls and power analysis' }),
  Object.freeze({ id: 'terra-nova-civil', name: 'Astra Terra Nova', market: 'Civil and infrastructure engineering', focus: 'Sites, structures, infrastructure and resilience planning' }),
  Object.freeze({ id: 'vega-systems', name: 'Astra Vega', market: 'Systems and software engineering', focus: 'Architecture, requirements and technical delivery' }),
  Object.freeze({ id: 'procyon-programs', name: 'Astra Procyon', market: 'Project and program management', focus: 'Scope, schedule, risk, decisions and stakeholder alignment' }),
  Object.freeze({ id: 'deneb-epc', name: 'Astra Deneb', market: 'EPC and construction', focus: 'Estimating, procurement, delivery and commissioning' }),
  Object.freeze({ id: 'helios-grid', name: 'Astra Helios Grid', market: 'Power utilities and grid operations', focus: 'Grid planning, asset programs and customer communications' }),
  Object.freeze({ id: 'arcturus-weather', name: 'Astra Arcturus', market: 'Weather and climate', focus: 'Forecast interpretation, resilience and climate planning' }),
  Object.freeze({ id: 'aquarius-water', name: 'Astra Aquarius', market: 'Water and environmental systems', focus: 'Water planning, environmental review and resource stewardship' }),
  Object.freeze({ id: 'cygnus-industrial', name: 'Astra Cygnus', market: 'Manufacturing and industrial operations', focus: 'Process improvement, quality and operational risk' }),
  Object.freeze({ id: 'vela-logistics', name: 'Astra Vela', market: 'Logistics and transportation', focus: 'Routing, supply chain scenarios and operational coordination' }),
  Object.freeze({ id: 'altair-signal', name: 'Astra Altair Signal', market: 'Telecom and data centers', focus: 'Network planning, infrastructure and service operations' }),
  Object.freeze({ id: 'orion-enterprise', name: 'Astra Orion Enterprise', market: 'Business and finance', focus: 'Strategy, operations, customer work and scenario analysis' }),
  Object.freeze({ id: 'sentinel-civic', name: 'Astra Sentinel', market: 'Government and public services', focus: 'Citizen services, policy research and official information' }),
  Object.freeze({ id: 'andromeda-global', name: 'Astra Andromeda Global', market: 'Multilingual global markets', focus: 'Regional language, localization and cross-border workflows' }),
  Object.freeze({ id: 'pulsar-access', name: 'Astra Pulsar', market: 'Accessibility and voice access', focus: 'Voice, mobile, low-bandwidth and assisted experiences' })
]);

const byId = new Map(MODELS.map(model => [model.id, model]));

function getModel(id) {
  return byId.get(id) || null;
}

function publicModels() {
  return MODELS.map(({ id, name, role, modes, visual, latency }) => ({ id, name, role, modes: [...modes], visual, latency }));
}

function publicMarketProfiles() {
  return MARKET_PROFILES.map(({ id, name, market, focus }) => ({ id, name, market, focus, foundationModel: 'astra-lumen' }));
}

module.exports = { MODELS, MARKET_PROFILES, getModel, publicModels, publicMarketProfiles };
