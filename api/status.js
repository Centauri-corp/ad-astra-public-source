'use strict';
const {ready} = require('../lib/release-gates');
module.exports = function status(req,res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if (req.method !== 'GET' && req.method !== 'HEAD') {res.statusCode=405;res.setHeader('Allow','GET, HEAD');return res.end();}
  const available=ready(); res.statusCode=200;
  res.end(req.method === 'HEAD' ? '' : JSON.stringify({available,message:available ? 'The engine is available to signed-in customers.' : 'The live engine is paused while release checks are completed.'}));
};
