'use strict';

const ALLOWED_RELEASE_STATES = new Set([
  'discovered',
  'terms-review',
  'approved-for-evaluation',
  'evaluation',
  'approved-for-staging',
  'staging',
  'approved-for-production',
  'production',
  'restricted',
  'suspended',
  'retired'
]);
const ALLOWED_PHASES = new Set(['phase-1','phase-2','phase-3','phase-4','backlog']);

function validateRegistry(registry) {
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) throw new Error('invalid_registry');
  if (!Array.isArray(registry.domains) || !Array.isArray(registry.resources)) throw new Error('invalid_registry_shape');
  const domainIds = new Set(registry.domains.map(domain => domain.id));
  if (domainIds.size !== registry.domains.length || domainIds.size !== 12) throw new Error('invalid_domain_registry');
  const resourceIds = new Set();
  for (const resource of registry.resources) {
    if (!resource || typeof resource !== 'object' || typeof resource.id !== 'string' || resourceIds.has(resource.id)) throw new Error('invalid_resource_id');
    resourceIds.add(resource.id);
    if (!Array.isArray(resource.domains) || !resource.domains.length || resource.domains.some(domain => !domainIds.has(domain))) throw new Error('invalid_resource_domains');
    if (!ALLOWED_RELEASE_STATES.has(resource.releaseStatus) || !ALLOWED_PHASES.has(resource.phase)) throw new Error('invalid_resource_state');
    let url;
    try { url = new URL(resource.officialUrl); } catch { throw new Error('invalid_resource_url'); }
    if (url.protocol !== 'https:') throw new Error('invalid_resource_url');
  }
  if (resourceIds.size !== 42) throw new Error('invalid_resource_count');
  if (registry.externalContentTrustedAsInstructions !== false || registry.releasePolicy?.externalWritesAllowed !== false || registry.releasePolicy?.paidProviderCallsAllowed !== false) throw new Error('unsafe_registry_policy');
  return true;
}

function scalar(value, name) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 100) throw new Error(`invalid_${name}`);
  return value.trim().toLowerCase();
}

function publicResource(resource) {
  return Object.freeze({
    id: resource.id,
    provider: resource.provider,
    name: resource.name,
    group: resource.group,
    domains: [...resource.domains],
    officialUrl: resource.officialUrl,
    access: resource.access,
    authentication: resource.authentication,
    rightsStatus: resource.rightsStatus,
    phase: resource.phase,
    releaseStatus: resource.releaseStatus
  });
}

function queryResources(registry, query = {}) {
  validateRegistry(registry);
  const allowedQuery = new Set(['id','domain','phase','status']);
  if (Object.keys(query).some(key => !allowedQuery.has(key))) throw new Error('unsupported_query');
  const id = scalar(query.id, 'id');
  const domain = scalar(query.domain, 'domain');
  const phase = scalar(query.phase, 'phase');
  const status = scalar(query.status, 'status');
  const domainIds = new Set(registry.domains.map(item => item.id));
  if (domain && !domainIds.has(domain)) throw new Error('unknown_domain');
  if (phase && !ALLOWED_PHASES.has(phase)) throw new Error('unknown_phase');
  if (status && !ALLOWED_RELEASE_STATES.has(status)) throw new Error('unknown_status');
  return registry.resources
    .filter(resource => !id || resource.id === id)
    .filter(resource => !domain || resource.domains.includes(domain))
    .filter(resource => !phase || resource.phase === phase)
    .filter(resource => !status || resource.releaseStatus === status)
    .map(publicResource);
}

function domainPolicy(registry, domainId) {
  validateRegistry(registry);
  const domain = registry.domains.find(item => item.id === domainId);
  if (!domain) throw new Error('unknown_domain');
  return Object.freeze({...domain});
}

function createEvidenceEnvelope(resource, record) {
  if (!resource || !record || typeof record !== 'object') throw new Error('invalid_evidence');
  if (typeof record.recordId !== 'string' || !record.recordId.trim()) throw new Error('missing_record_id');
  let sourceUrl;
  try { sourceUrl = new URL(record.sourceUrl); } catch { throw new Error('invalid_source_url'); }
  if (sourceUrl.protocol !== 'https:') throw new Error('invalid_source_url');
  const retrievedAt = record.retrievedAt || new Date().toISOString();
  if (!Number.isFinite(Date.parse(retrievedAt))) throw new Error('invalid_retrieved_at');
  return Object.freeze({
    source: {
      provider: resource.provider,
      resourceId: resource.id,
      recordId: record.recordId,
      sourceUrl: sourceUrl.toString()
    },
    retrieval: {
      retrievedAt,
      connectorVersion: record.connectorVersion || 'unimplemented',
      transformations: Array.isArray(record.transformations) ? [...record.transformations] : []
    },
    rights: {
      reviewStatus: resource.rightsStatus,
      releaseStatus: resource.releaseStatus
    },
    quality: {
      confidence: record.confidence || 'provider-record',
      limitations: Array.isArray(record.limitations) ? [...record.limitations] : []
    },
    data: record.data ?? null
  });
}

module.exports = {ALLOWED_RELEASE_STATES, ALLOWED_PHASES, validateRegistry, queryResources, domainPolicy, createEvidenceEnvelope};
