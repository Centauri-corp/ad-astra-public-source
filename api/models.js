'use strict';
const { publicModels } = require('../lib/model-catalog');

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
  return res.end(JSON.stringify({ family: 'Ad Astra', tagline: 'Human-directed intelligence for complex questions', connectedModel: models[0]?.id || null, connectedModelCount: models.length, models }));
};
