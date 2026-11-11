'use strict';
const { publicModels, publicMarketProfiles } = require('../lib/model-catalog');
const { validateCatalog } = require('../lib/model-validation');

module.exports = function models(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end(JSON.stringify({ error: 'method_not_allowed' }));
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const models = publicModels();
  const profiles = publicMarketProfiles();
  try { validateCatalog(models, profiles); } catch {
    res.statusCode = 503;
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ error: 'model_catalog_unavailable' }));
  }
  return res.end(JSON.stringify({
    family: 'Ad Astra',
    tagline: 'Human-directed intelligence for complex questions',
    architecture: 'one-connected-model-with-sector-profiles',
    connectedModel: models[0]?.id || null,
    connectedModelCount: models.length,
    capabilityClass: 'bounded-narrow-ai-integration',
    agiAvailable: false,
    asiAvailable: false,
    disclosure: 'Sector profiles share one foundation integration. Listing a profile does not establish customer availability, professional certification, or AGI/ASI capability.',
    models,
    profiles
  }));
};
