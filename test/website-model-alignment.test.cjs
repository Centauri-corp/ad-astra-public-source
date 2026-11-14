'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateModelExperience, modelExperienceReport } = require('../scripts/lib/website-model-alignment.cjs');
const root = path.resolve(__dirname, '..');
const bindingPath = path.join(root, 'projects/website-customer-experience/model-experience.json');
const binding = () => JSON.parse(fs.readFileSync(bindingPath, 'utf8'));
function dependencies() {
  const model = require('../lib/model-catalog');
  const family = require('../config/public-product-families.json');
  return structuredClone({
    models: model.publicModels(), profiles: model.publicMarketProfiles(),
    agents: require('../lib/customer-agent-catalog').publicCustomerAgents(),
    offers: require('../lib/offer-catalog').publicOffers(), families: family.families,
    familyAvailability: family.availability, modes: require('../lib/modes').MODE_IDS
  });
}

test('every foundation model, customer agent, offer, profile and family has explicit ID coverage', () => {
  const catalogs = dependencies(), mapped = binding();
  const counts = validateModelExperience(mapped);
  for (const [source, target, key] of [['models', 'integrations', 'modelId'], ['agents', 'agents', 'agentId'], ['offers', 'offers', 'offerId'], ['profiles', 'profiles', 'profileId']]) {
    assert.deepEqual(mapped[target].map(row => row[key]).sort(), catalogs[source].map(row => row.id).sort());
  }
  assert.deepEqual(counts, {
    foundationModels: catalogs.models.length, customerAgents: catalogs.agents.length,
    offers: catalogs.offers.length, marketProfiles: catalogs.profiles.length,
    governedRoles: new Set(mapped.agents.map(agent => agent.roleId)).size,
    productFamilies: catalogs.families.length, modes: catalogs.modes.length
  });
  assert.equal(validateModelExperience(mapped, catalogs).foundationModels, counts.foundationModels);
});

test('a new runtime model cannot enter the website by appearing in a catalog alone', () => {
  const catalogs = dependencies();
  catalogs.models.push({ ...catalogs.models[0], id: 'astra-unmapped' });
  assert.throws(() => validateModelExperience(binding(), catalogs), /integration coverage missing or stale/);
  const absent = binding(); absent.integrations = [];
  assert.throws(() => validateModelExperience(absent), /integrations empty/);
  const stale = binding(); stale.integrations[0].modelId = 'astra-retired';
  assert.throws(() => validateModelExperience(stale), /integration coverage missing or stale/);
});

test('explicit future model coverage changes derived counts without enabling runtime models', () => {
  const catalogs = dependencies(), mapped = binding();
  const modelId = 'astra-future-fixture';
  catalogs.models.push({ ...catalogs.models[0], id: modelId, modes: ['create'] });
  mapped.integrations.push({ modelId, roleIds: ['default-chat'], customerRoutes: ['/platform-preview/'] });
  mapped.agents.find(agent => agent.agentId === 'creator').modelId = modelId;
  // The original-model hospitality profile retains explicit, compatible agents.
  mapped.profiles.find(profile => profile.profileId === 'capella-hospitality').agentIds = ['visual', 'navigator'];
  const profile = { ...catalogs.profiles[0], id: 'future-market-fixture' };
  catalogs.profiles.push(profile);
  mapped.profiles.push({ ...structuredClone(mapped.profiles[0]), profileId: profile.id });
  const result = validateModelExperience(mapped, catalogs);
  assert.equal(result.foundationModels, catalogs.models.length);
  assert.equal(result.marketProfiles, catalogs.profiles.length);
  assert.ok(Object.values(mapped.production).every(value => value === false));
});

test('missing or duplicate agent, offer and profile bindings fail instead of silently shrinking coverage', () => {
  for (const group of ['agents', 'offers', 'profiles']) {
    const missing = binding(); missing[group].pop();
    assert.throws(() => validateModelExperience(missing), /coverage missing or stale/);
    const duplicate = binding(); duplicate[group].push(structuredClone(duplicate[group][0]));
    assert.throws(() => validateModelExperience(duplicate), /IDs/);
  }
});

test('unknown models, agents, offers, product families and governed roles are rejected', () => {
  const mutations = [
    value => { value.agents[0].modelId = 'unregistered-model'; },
    value => { value.agents[0].agentId = 'unregistered-agent'; },
    value => { value.profiles[0].agentIds = ['unregistered-agent']; },
    value => { value.agents[0].offerId = 'unregistered-offer'; },
    value => { value.offers[0].offerId = 'unregistered-offer'; },
    value => { value.agents[0].familyIds = ['unregistered-family']; },
    value => { value.profiles[0].familyIds = ['unregistered-family']; },
    value => { value.integrations[0].roleIds.push('unregistered-role'); }
  ];
  for (const mutate of mutations) {
    const value = binding(); mutate(value);
    assert.throws(() => validateModelExperience(value), /website_model_alignment_invalid/);
  }
});

test('agent and offer roles must match the actual governed contract, including catalog agent membership', () => {
  for (const mutate of [
    value => { value.agents.find(agent => agent.agentId === 'guide').roleId = 'fast-chat'; },
    value => { value.agents.find(agent => agent.agentId === 'visual').offerId = 'core-intelligence'; },
    value => { value.offers.find(offer => offer.offerId === 'research-studio').roleId = 'default-chat'; }
  ]) {
    const value = binding(); mutate(value);
    assert.throws(() => validateModelExperience(value), /inconsistency/);
  }
  const catalogs = dependencies();
  catalogs.offers.find(offer => offer.id === 'core-intelligence').agentIds = ['guide', 'access'];
  assert.throws(() => validateModelExperience(binding(), catalogs), /inconsistency/);
  const missingRole = binding(); missingRole.integrations[0].roleIds = ['default-chat'];
  assert.throws(() => validateModelExperience(missingRole), /integration role not mapped/);
});

test('new product families fail coverage, and offer/family drift cannot be hidden by existing routes', () => {
  const catalogs = dependencies();
  catalogs.families.push({ ...catalogs.families[0], id: 'new-family-fixture' });
  catalogs.routes = [
    ...new Set([...binding().integrations, ...binding().offers, ...binding().agents, ...binding().profiles].flatMap(row => row.customerRoutes)),
    ...catalogs.families.map(family => `/products/${family.id}/`)
  ];
  assert.throws(() => validateModelExperience(binding(), catalogs), /unmapped family new-family-fixture/);
  const drift = binding(); drift.offers[0].familyIds = ['core-intelligence'];
  assert.throws(() => validateModelExperience(drift), /offer family coverage inconsistency/);
});

test('profile semantics require the catalog foundation, compatible agents and relevant product families', () => {
  for (const mutate of [
    value => { value.profiles[0].modelId = 'unregistered-model'; },
    value => { value.profiles[0].familyIds = ['creative-studio']; },
    value => { value.profiles.find(profile => profile.profileId === 'pulsar-access').agentIds = ['researcher']; }
  ]) {
    const value = binding(); mutate(value);
    assert.throws(() => validateModelExperience(value), /unknown model|profile family\/agent inconsistency/);
  }
  const catalogs = dependencies(); catalogs.profiles[0].foundationModel = 'different-foundation';
  assert.throws(() => validateModelExperience(binding(), catalogs), /profile foundation model mismatch/);
});

test('routes must resolve to public page files; traversal, external URLs and absent product pages fail', () => {
  for (const route of ['/does-not-exist/', '/../lib/', '//example.test/', 'https://example.test/', '/platform-preview/?active=true', '/Platform/']) {
    const value = binding(); value.integrations[0].customerRoutes = [route];
    assert.throws(() => validateModelExperience(value), /customer route/);
  }
  const catalogs = dependencies(); catalogs.routes = ['/intelligence/', '/platform/', '/platform-preview/'];
  assert.throws(() => validateModelExperience(binding(), catalogs), /missing customer route: \/products\//);
});

test('modes must remain catalog-owned and each model has a supported customer-mode path', () => {
  const catalogs = dependencies(); catalogs.agents[0].defaultMode = 'invented-mode';
  assert.throws(() => validateModelExperience(binding(), catalogs), /agent mode not supported/);
  const missingMode = dependencies(); missingMode.models[0].modes = missingMode.models[0].modes.filter(mode => mode !== 'learn');
  assert.throws(() => validateModelExperience(binding(), missingMode), /agent mode not supported/);
  const unrepresented = dependencies(); unrepresented.modes.push('future-mode'); unrepresented.models[0].modes.push('future-mode');
  assert.throws(() => validateModelExperience(binding(), unrepresented), /unmapped model mode/);
});

test('production activation, live claims, copied names and credentials cannot enter authored bindings', () => {
  for (const flag of Object.keys(binding().production)) {
    const value = binding(); value.production[flag] = true;
    assert.throws(() => validateModelExperience(value), /production flags must remain false/);
  }
  for (const mutate of [
    value => { value.agents[0].name = 'Stale copied display name'; },
    value => { value.offers[0].availability = 'live'; },
    value => { value.integrations[0].apiKey = 'synthetic-not-a-credential'; }
  ]) {
    const value = binding(); mutate(value);
    assert.throws(() => validateModelExperience(value), /fields/);
  }
  for (const group of ['models', 'agents', 'offers', 'profiles', 'families']) {
    const catalogs = dependencies(); catalogs[group][0].availability = 'live';
    assert.throws(() => validateModelExperience(binding(), catalogs), /cannot claim live availability/);
  }
  const entitlement = dependencies(); entitlement.agents[0].entitlement = 'enabled';
  assert.throws(() => validateModelExperience(binding(), entitlement), /entitlement must remain gated/);
});

test('report derives customer metadata and hashes from public sources, retaining pending availability', () => {
  const catalogs = dependencies(), report = modelExperienceReport(root);
  assert.deepEqual(report, modelExperienceReport());
  assert.deepEqual(report.counts, validateModelExperience(binding(), catalogs));
  for (const source of report.sources) {
    assert.equal(path.isAbsolute(source.path), false);
    assert.equal(source.path.includes('..'), false);
    assert.equal(source.sha256, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, source.path))).digest('hex'));
  }
  for (const file of ['lib/model-catalog.js', 'lib/customer-agent-catalog.js', 'lib/offer-catalog.js', 'lib/modes.js', 'config/public-product-families.json', 'api/models.js']) {
    assert.ok(report.sources.some(source => source.path === file), file);
  }
  for (const [group, catalogGroup, id] of [['models', 'models', 'modelId'], ['agents', 'agents', 'agentId'], ['offers', 'offers', 'offerId'], ['profiles', 'profiles', 'profileId'], ['families', 'families', 'familyId']]) {
    for (const row of report[group]) {
      const catalog = catalogs[catalogGroup].find(entry => entry.id === row[id]);
      assert.equal(row.name, catalog.name);
      assert.equal(row.availability.customerAvailable, false);
      assert.equal(row.availability.providerVerified, false);
      assert.equal(row.availability.releaseState, 'pending-release-evidence');
      assert.ok(row.customerRoutes.length);
    }
  }
  for (const agent of report.agents) {
    const catalog = catalogs.agents.find(entry => entry.id === agent.agentId);
    assert.deepEqual(agent.capabilities, catalog.capabilities);
    assert.equal(agent.defaultMode, catalog.defaultMode);
  }
  for (const role of report.roles) {
    assert.equal(role.authority, 'privately-owned-routing-contract');
    assert.equal(role.providerEvidence, false);
    assert.equal(role.verification, 'pending-owner-and-provider-verification');
  }
  assert.ok(Object.values(report.production).every(value => value === false));
  assert.equal(report.boundaries.routeMappingsAreDesignContractsNotRenderedFeatureEvidence, true);
  assert.equal(report.api.agiAvailable, false); assert.equal(report.api.asiAvailable, false);
});

test('local report generation makes no provider calls and does not project environment secrets or private metadata', () => {
  const originalFetch = globalThis.fetch;
  const key = 'WEBSITE_ALIGNMENT_SYNTHETIC_SECRET';
  const previous = process.env[key];
  process.env[key] = 'synthetic-secret-must-not-enter-report';
  globalThis.fetch = () => { throw new Error('network forbidden in alignment report'); };
  try {
    const report = modelExperienceReport();
    const serialized = JSON.stringify(report);
    assert.equal(serialized.includes(process.env[key]), false);
    assert.equal(serialized.includes('legacyName'), false);
    assert.equal(serialized.includes('directive'), false);
    assert.equal(serialized.includes('providerModel'), false);
    assert.equal(serialized.includes('/workspace/'), false);
    for (const profile of report.profiles) {
      assert.equal(profile.professionalAuthorizationVerified, false);
      assert.equal(profile.regionalAvailabilityVerified, false);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env[key]; else process.env[key] = previous;
  }
});
