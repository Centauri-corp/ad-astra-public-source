'use strict';
const {ready} = require('../lib/release-gates');
const {operatingStatus} = require('../lib/operating-status');

module.exports = function status(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    return res.end();
  }
  res.statusCode = 200;
  res.end(req.method === 'HEAD' ? '' : JSON.stringify({
    ...operatingStatus(ready()),
    generatedAt:new Date().toISOString()
  }));
};
