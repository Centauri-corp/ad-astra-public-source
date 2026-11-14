'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const ROOT = path.resolve(__dirname, '../..');
const BINDING_PATH = 'projects/website-customer-experience/model-experience.json';
const CATALOG_PATHS = {
  models: 'lib/model-catalog.js',
  agents: 'lib/customer-agent-catalog.js',
  offers: 'lib/offer-catalog.js',
  modes: 'lib/modes.js',
  families: 'config/public-product-families.json',
  modelApi: 'api/models.js'
};
// These IDs mirror the privately owned role contract. They are UX contracts to
// verify, not evidence that a provider, media capability or runtime is available.
const ROLE_CONTRACTS = [
  { roleId: 'default-chat', offerId: 'core-intelligence', agentIds: ['guide', 'creator'] },
  { roleId: 'fast-chat', offerId: 'workflow-navigator', agentIds: ['navigator', 'access'] },
  { roleId: 'advanced-research', offerId: 'research-studio', agentIds: ['researcher', 'analyst'] },
  { roleId: 'vision-multimodal', offerId: 'visual-intelligence', agentIds: ['visual'] }
];
const PRODUCTION_FLAGS = ['runtimeModelActivation', 'customerAccess', 'billing', 'crmWrites', 'outreach', 'publicIndexing', 'agiAvailable', 'asiAvailable'];
const PENDING = new Set(['development-preview', 'in-development', 'planned', 'pending-release-evidence']);
const unique = values => [...new Set(values)];
const sameIds = (a, b) => isDeepStrictEqual([...a].sort(), [...b].sort());
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function fail(message) { throw new Error(`website_model_alignment_invalid: ${message}`); }
function keys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !sameIds(Object.keys(value), expected)) fail(`${label} fields`);
}
function ids(value, label) {
  if (!Array.isArray(value) || !value.length || value.some(id => typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(id)) || unique(value).length !== value.length) fail(`${label} IDs`);
  return value;
}
function index(rows, key, label) {
  if (!Array.isArray(rows) || !rows.length) fail(`${label} empty`);
  ids(rows.map(row => row?.[key]), label);
  return new Map(rows.map(row => [row[key], row]));
}
function reference(map, id, label) {
  if (!map.has(id)) fail(`unknown ${label}: ${String(id)}`);
  return map.get(id);
}
function assertPending(value, label) {
  if (value !== undefined && !PENDING.has(value)) fail(`${label} cannot claim live availability`);
}
function readCatalogs(root) {
  // A report must reflect current files, even when a build process invokes it
  // twice. Only these public, local CommonJS modules are evaluated; no gateway,
  // auth module, credentials, provider request or private catalog is loaded.
  for (const file of [...Object.values(CATALOG_PATHS), 'lib/model-validation.js']) {
    delete require.cache[require.resolve(path.join(root, file))];
  }
  const model = require(path.join(root, CATALOG_PATHS.models));
  const agent = require(path.join(root, CATALOG_PATHS.agents));
  const offer = require(path.join(root, CATALOG_PATHS.offers));
  const family = require(path.join(root, CATALOG_PATHS.families));
  const modes = require(path.join(root, CATALOG_PATHS.modes));
  let body;
  const response = { statusCode: 200, setHeader() {}, end(value) { body = JSON.parse(value); } };
  require(path.join(root, CATALOG_PATHS.modelApi))({ method: 'GET' }, response);
  if (response.statusCode !== 200 || !body) fail('public model API unavailable');
  const result = {
    root, models: model.publicModels(), profiles: model.publicMarketProfiles(),
    agents: agent.publicCustomerAgents(), offers: offer.publicOffers(),
    families: family.families, familyAvailability: family.availability, modes: modes.MODE_IDS
  };
  for (const key of ['models', 'profiles', 'agents', 'offers']) {
    if (!isDeepStrictEqual(body[key], result[key])) fail(`public model API ${key} mismatch`);
  }
  for (const [key, rows] of [['connectedModelCount', result.models], ['customerAgentCount', result.agents], ['publicOfferCount', result.offers]]) {
    if (body[key] !== rows.length) fail(`public model API ${key} mismatch`);
  }
  if (body.agiAvailable !== false || body.asiAvailable !== false) fail('public model API intelligence availability');
  assertPending(body.customerAgentAvailability, 'public model API');
  return { ...result, api: body };
}

/**
 * Validate the authored ID bindings, throwing on incomplete or stale coverage.
 * Optional dependencies: {models, profiles, agents, offers, families, modes,
 * familyAvailability, root?, routes?}. `routes` is an optional array of existing
 * route IDs for isolated negative tests; production checks use public files.
 * Returns derived counts. Does not call providers or change runtime state.
 */
function validateModelExperience(binding, dependencies) {
  const catalogs = dependencies || readCatalogs(ROOT);
  const root = path.resolve(catalogs.root || ROOT);
  keys(binding, ['schema', 'production', 'integrations', 'offers', 'agents', 'profiles'], 'binding');
  if (binding.schema !== 'ad-astra-website-model-experience/v1') fail('schema');
  keys(binding.production, PRODUCTION_FLAGS, 'production');
  if (PRODUCTION_FLAGS.some(flag => binding.production[flag] !== false)) fail('production flags must remain false');
  const models = index(catalogs.models, 'id', 'models');
  const agents = index(catalogs.agents, 'id', 'agents');
  const offers = index(catalogs.offers, 'id', 'offers');
  const profiles = index(catalogs.profiles, 'id', 'profiles');
  const families = index(catalogs.families, 'id', 'families');
  ids(catalogs.modes, 'modes');
  assertPending(catalogs.familyAvailability, 'product families');
  const integrations = index(binding.integrations, 'modelId', 'integrations');
  const agentBindings = index(binding.agents, 'agentId', 'agent bindings');
  const offerBindings = index(binding.offers, 'offerId', 'offer bindings');
  const profileBindings = index(binding.profiles, 'profileId', 'profile bindings');
  for (const [source, mapped, label] of [[models, integrations, 'integration'], [agents, agentBindings, 'agent'], [offers, offerBindings, 'offer'], [profiles, profileBindings, 'profile']]) {
    if (!sameIds([...source.keys()], [...mapped.keys()])) fail(`${label} coverage missing or stale`);
  }
  const roles = new Map(ROLE_CONTRACTS.map(role => [role.roleId, role]));
  function route(routeId) {
    if (typeof routeId !== 'string' || !/^\/(?:[a-z0-9-]+\/)*$/.test(routeId)) fail('invalid customer route');
    if (catalogs.routes !== undefined) {
      if (!Array.isArray(catalogs.routes) || !catalogs.routes.includes(routeId)) fail(`missing customer route: ${routeId}`);
    } else {
      const publicRoot = fs.realpathSync(path.join(root, 'public'));
      const file = path.join(publicRoot, routeId.slice(1), 'index.html');
      if (!fs.existsSync(file) || !fs.statSync(file).isFile() || !fs.realpathSync(file).startsWith(publicRoot + path.sep)) fail(`missing customer route: ${routeId}`);
    }
  }
  function routes(values) {
    if (!Array.isArray(values) || !values.length || unique(values).length !== values.length) fail('customer routes must be explicit and unique');
    values.forEach(route);
  }
  function familyIds(values) { ids(values, 'family'); values.forEach(id => reference(families, id, 'family')); }
  for (const model of models.values()) {
    ids(model.modes, 'model modes');
    if (model.modes.some(mode => !catalogs.modes.includes(mode))) fail('unknown model mode');
    assertPending(model.availability, 'model');
  }
  for (const family of families.values()) {
    ids(family.modes, 'family modes');
    if (family.modes.some(mode => !catalogs.modes.includes(mode))) fail('unknown family mode');
    assertPending(family.availability, 'family');
    route(`/products/${family.id}/`);
  }
  for (const integration of integrations.values()) {
    keys(integration, ['modelId', 'roleIds', 'customerRoutes'], 'integration');
    ids(integration.roleIds, 'role');
    integration.roleIds.forEach(id => reference(roles, id, 'governed role'));
    routes(integration.customerRoutes);
  }
  for (const row of agentBindings.values()) {
    keys(row, ['agentId', 'modelId', 'offerId', 'roleId', 'familyIds', 'customerRoutes'], 'agent binding');
    const agent = agents.get(row.agentId);
    const model = reference(models, row.modelId, 'model');
    const offer = reference(offers, row.offerId, 'offer');
    const contract = reference(roles, row.roleId, 'governed role');
    if (contract.offerId !== row.offerId || !contract.agentIds.includes(row.agentId) || !offer.agentIds.includes(row.agentId)) fail(`agent/offer role inconsistency: ${row.agentId}`);
    if (!integrations.get(row.modelId).roleIds.includes(row.roleId)) fail(`integration role not mapped: ${row.agentId}`);
    if (!catalogs.modes.includes(agent.defaultMode) || !model.modes.includes(agent.defaultMode)) fail(`agent mode not supported: ${row.agentId}`);
    assertPending(agent.availability, 'agent');
    if (agent.entitlement !== 'release-gate-required') fail('agent entitlement must remain gated');
    familyIds(row.familyIds); routes(row.customerRoutes);
  }
  for (const row of offerBindings.values()) {
    keys(row, ['offerId', 'roleId', 'familyIds', 'customerRoutes'], 'offer binding');
    const offer = offers.get(row.offerId);
    const contract = reference(roles, row.roleId, 'governed role');
    ids(offer.agentIds, 'offer agents');
    if (contract.offerId !== row.offerId || !sameIds(offer.agentIds, contract.agentIds)) fail(`offer/role agent inconsistency: ${row.offerId}`);
    const mapped = binding.agents.filter(agent => agent.offerId === row.offerId);
    if (!sameIds(mapped.map(agent => agent.agentId), offer.agentIds) || mapped.some(agent => agent.roleId !== row.roleId)) fail(`offer/agent coverage inconsistency: ${row.offerId}`);
    familyIds(row.familyIds); routes(row.customerRoutes);
    if (!sameIds(row.familyIds, unique(mapped.flatMap(agent => agent.familyIds)))) fail(`offer family coverage inconsistency: ${row.offerId}`);
    assertPending(offer.availability, 'offer');
    if (offer.entitlement !== 'release-gate-required') fail('offer entitlement must remain gated');
  }
  for (const row of profileBindings.values()) {
    keys(row, ['profileId', 'modelId', 'agentIds', 'familyIds', 'customerRoutes'], 'profile binding');
    const profile = profiles.get(row.profileId);
    reference(models, row.modelId, 'model');
    if (profile.foundationModel !== row.modelId) fail(`profile foundation model mismatch: ${row.profileId}`);
    ids(row.agentIds, 'profile agents'); familyIds(row.familyIds); routes(row.customerRoutes);
    const mapped = row.agentIds.map(id => reference(agentBindings, id, 'agent'));
    if (mapped.some(agent => agent.modelId !== row.modelId)) fail(`profile agent/model inconsistency: ${row.profileId}`);
    if (row.familyIds.some(id => !mapped.some(agent => agent.familyIds.includes(id))) || mapped.some(agent => !agent.familyIds.some(id => row.familyIds.includes(id)))) fail(`profile family/agent inconsistency: ${row.profileId}`);
    assertPending(profile.availability, 'profile');
  }
  for (const familyId of families.keys()) {
    for (const [label, rows] of [['agent', binding.agents], ['offer', binding.offers], ['profile', binding.profiles]]) {
      if (!rows.some(row => row.familyIds.includes(familyId))) fail(`unmapped family ${familyId}: ${label}`);
    }
  }
  for (const integration of integrations.values()) {
    const mapped = binding.agents.filter(agent => agent.modelId === integration.modelId);
    if (!sameIds(integration.roleIds, unique(mapped.map(agent => agent.roleId)))) fail(`unused or missing integration role: ${integration.modelId}`);
    const modes = unique(mapped.map(agent => agents.get(agent.agentId).defaultMode));
    if (!sameIds(models.get(integration.modelId).modes, modes)) fail(`unmapped model mode: ${integration.modelId}`);
  }
  return {
    foundationModels: models.size, customerAgents: agents.size, offers: offers.size,
    marketProfiles: profiles.size, governedRoles: unique(binding.agents.map(agent => agent.roleId)).length,
    productFamilies: families.size, modes: catalogs.modes.length
  };
}

/** Safe, deterministic build snapshot. Paths are relative; hashes attest local
 * source identity only. All private role/provider availability remains pending.
 */
function modelExperienceReport(root = ROOT) {
  root = path.resolve(root);
  const paths = { ...CATALOG_PATHS, binding: BINDING_PATH };
  const sources = Object.entries(paths).map(([id, file]) => ({ id, path: file, sha256: digest(fs.readFileSync(path.join(root, file))) }));
  const binding = JSON.parse(fs.readFileSync(path.join(root, BINDING_PATH), 'utf8'));
  const catalogs = readCatalogs(root);
  const counts = validateModelExperience(binding, catalogs);
  const byId = rows => new Map(rows.map(row => [row.id, row]));
  const models = byId(catalogs.models), agents = byId(catalogs.agents), offers = byId(catalogs.offers), profiles = byId(catalogs.profiles);
  const pending = catalogStatus => ({ catalogStatus, customerAvailable: false, providerVerified: false, releaseState: 'pending-release-evidence' });
  const routes = row => unique([...row.customerRoutes, ...(row.familyIds || []).map(id => `/products/${id}/`)]);
  const agentMap = new Map(binding.agents.map(row => [row.agentId, row]));
  const joined = rows => ({
    modelIds: unique(rows.map(row => row.modelId)), roleIds: unique(rows.map(row => row.roleId)),
    offerIds: unique(rows.map(row => row.offerId)), agentIds: rows.map(row => row.agentId),
    familyIds: unique(rows.flatMap(row => row.familyIds)), customerRoutes: unique(rows.flatMap(routes))
  });
  const report = {
    schema: 'ad-astra-website-model-experience-report/v1',
    production: { ...binding.production }, sources, counts,
    api: {
      path: '/api/models', architecture: catalogs.api.architecture,
      customerAgentArchitecture: catalogs.api.customerAgentArchitecture,
      publicOfferArchitecture: catalogs.api.publicOfferArchitecture,
      capabilityClass: catalogs.api.capabilityClass,
      agiAvailable: catalogs.api.agiAvailable, asiAvailable: catalogs.api.asiAvailable
    },
    models: binding.integrations.map(row => {
      const model = models.get(row.modelId);
      return { modelId: row.modelId, name: model.name, role: model.role, modes: [...model.modes],
        ...joined(binding.agents.filter(agent => agent.modelId === row.modelId)),
        profileIds: binding.profiles.filter(profile => profile.modelId === row.modelId).map(profile => profile.profileId),
        customerRoutes: unique([...row.customerRoutes, ...joined(binding.agents.filter(agent => agent.modelId === row.modelId)).customerRoutes]),
        availability: pending(model.availability || catalogs.api.customerAgentAvailability) };
    }),
    roles: ROLE_CONTRACTS.map(contract => ({ roleId: contract.roleId,
      ...joined(binding.agents.filter(agent => agent.roleId === contract.roleId)),
      authority: 'privately-owned-routing-contract', verification: 'pending-owner-and-provider-verification',
      providerEvidence: false, customerAvailable: false })),
    offers: binding.offers.map(row => {
      const offer = offers.get(row.offerId);
      return { offerId: row.offerId, name: offer.name, purpose: offer.purpose, addOn: offer.addOn,
        ...joined(binding.agents.filter(agent => agent.offerId === row.offerId)),
        roleId: row.roleId, familyIds: [...row.familyIds], customerRoutes: routes(row),
        availability: pending(offer.availability), entitlement: offer.entitlement };
    }),
    agents: binding.agents.map(row => {
      const agent = agents.get(row.agentId);
      return { ...row, familyIds: [...row.familyIds], customerRoutes: routes(row),
        name: agent.name, purpose: agent.purpose, capabilities: [...agent.capabilities], defaultMode: agent.defaultMode,
        availability: pending(agent.availability), entitlement: agent.entitlement };
    }),
    profiles: binding.profiles.map(row => {
      const profile = profiles.get(row.profileId);
      const linked = joined(row.agentIds.map(id => agentMap.get(id)));
      return { profileId: row.profileId, name: profile.name, market: profile.market, focus: profile.focus,
        modelId: profile.foundationModel, roleIds: linked.roleIds, offerIds: linked.offerIds,
        agentIds: [...row.agentIds], familyIds: [...row.familyIds], customerRoutes: routes(row),
        availability: pending(catalogs.api.customerAgentAvailability), professionalAuthorizationVerified: false,
        regionalAvailabilityVerified: false };
    }),
    families: catalogs.families.map(family => ({ familyId: family.id, name: family.name,
      summary: family.summary, audience: family.audience, outcome: family.outcome, modes: [...family.modes],
      ...joined(binding.agents.filter(agent => agent.familyIds.includes(family.id))),
      profileIds: binding.profiles.filter(profile => profile.familyIds.includes(family.id)).map(profile => profile.profileId),
      customerRoutes: [`/products/${family.id}/`], availability: pending(family.availability || catalogs.familyAvailability) })),
    boundaries: {
      catalogEntriesAreNotAdditionalRuntimeModels: true, roleMappingsAreContractsNotProviderEvidence: true,
      routeMappingsAreDesignContractsNotRenderedFeatureEvidence: true,
      customerPreviewIsNotLiveModelExecution: true, productionActivationAuthorized: false
    }
  };
  for (const source of sources) {
    if (digest(fs.readFileSync(path.join(root, source.path))) !== source.sha256) fail('source changed while generating report');
  }
  return report;
}

module.exports = { validateModelExperience, modelExperienceReport };
