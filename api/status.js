'use strict';
const {authenticateRequest} = require('../lib/auth');
const {workspaceReady} = require('../lib/release-gates');
const workspace = require('../lib/customer-workspace');

// Anonymous status cannot assert a customer's entitlement. Authenticated status
// asks the same canonical runtime used for execution, without model/quota work.
module.exports = async function status(req,res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if (req.method !== 'GET' && req.method !== 'HEAD') {res.statusCode=405;res.setHeader('Allow','GET, HEAD');return res.end();}
  const reply=(available,message)=>{res.statusCode=200;res.end(req.method==='HEAD'?'':JSON.stringify({available,message}));};
  if (!workspaceReady()) return reply(false,'Customer execution is paused while release checks are completed.');
  if (!req.headers || !req.headers.authorization) return reply(false,'Sign in to the workspace to check your current access.');
  const auth=await authenticateRequest(req);
  if (!auth.ok) return reply(false,'Secure account access could not be verified.');
  try {
    const result=await workspace.call({action:'status'},req.headers.authorization.slice(7));
    const available=result.status===200 && result.body.canExecute===true;
    return reply(available,available?'Your account can use the included Life journeys.':'Customer execution is unavailable for this account and release.');
  } catch {return reply(false,'Workspace access could not be verified. Please try again later.');}
};
