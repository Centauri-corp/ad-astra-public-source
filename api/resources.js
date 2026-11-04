'use strict';
const registry = require('../intelligence/global-resource-registry.json');
const {queryResources} = require('../lib/resource-gateway');

module.exports = function resources(req, res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow','GET, HEAD');
    return res.end();
  }
  try {
    const resources = queryResources(registry, req.query || {});
    const payload = {
      schemaVersion: registry.schemaVersion,
      status: 'catalog-only',
      productionActivation: false,
      providerConnectorsActive: false,
      notice: 'Discovery catalog only. No external provider call, professional decision service, paid access or autonomous action is active.',
      count: resources.length,
      resources
    };
    res.statusCode = 200;
    return res.end(req.method === 'HEAD' ? '' : JSON.stringify(payload));
  } catch (error) {
    res.statusCode = 400;
    return res.end(req.method === 'HEAD' ? '' : JSON.stringify({error:'invalid_resource_query'}));
  }
};
