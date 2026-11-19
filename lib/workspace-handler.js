'use strict';
const crypto = require('node:crypto');
const {authenticateRequest} = require('./auth');
const {reserve,LIMIT} = require('./quota');
const {workspaceReady} = require('./release-gates');
const workspace = require('./customer-workspace');
const MAX_BODY = 14000;

async function parseBody(req) {
  if (Number(req.headers && req.headers['content-length']) > MAX_BODY) throw Error('body_too_large');
  let raw;
  if (req.body !== undefined) raw = Buffer.isBuffer(req.body)?req.body.toString('utf8'):typeof req.body === 'string'?req.body:JSON.stringify(req.body);
  else {
    const parts = []; let size = 0;
    for await (const chunk of req) {const bytes=Buffer.from(chunk);size+=bytes.length;if(size>MAX_BODY)throw Error('body_too_large');parts.push(bytes);}
    raw = Buffer.concat(parts).toString('utf8');
  }
  if (Buffer.byteLength(raw) > MAX_BODY) throw Error('body_too_large');
  try {return JSON.parse(raw);} catch {throw Error('invalid_json');}
}
function createHandler({runOnly=false}={}) {
  return async function handler(req,res) {
    const deadline = Date.now()+55000;
    const requestId = crypto.randomUUID();
    const reply = (status,body,extra={})=>{
      res.statusCode = status;
      for (const [key,value] of Object.entries({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
        'X-Robots-Tag':'noindex, nofollow, noarchive, nosnippet','Referrer-Policy':'no-referrer','X-Request-Id':requestId,...extra})) res.setHeader(key,String(value));
      // Keep local transport identity distinct from the durable runtime request.
      res.end(JSON.stringify({...body,transportRequestId:requestId}));
    };
    if (req.method !== 'POST') return reply(405,{error:'method_not_allowed'},{Allow:'POST'});
    const host = String(req.headers && req.headers.host || '').toLowerCase();
    if (!['adastra.global',process.env.VERCEL_URL].includes(host) || req.headers.origin !== 'https://' + host || req.headers['sec-fetch-site'] === 'cross-site' || req.headers['x-ad-astra-request'] !== 'public-v1') return reply(403,{error:'same_origin_required'});
    if (String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') return reply(415,{error:'json_required'});
    let body;
    try {body=await parseBody(req);} catch(error) {return reply(error.message==='body_too_large'?413:400,{error:error.message==='body_too_large'?'body_too_large':'invalid_json'});}
    if (runOnly) {
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.hasOwn(body,'action')) return reply(422,{error:'invalid_workspace_request'});
      body = {...body,action:'run'};
    }
    if (!workspace.validRequest(body)) return reply(422,{error:'invalid_workspace_request'});
    const auth = await authenticateRequest(req);
    if (!auth.ok) return reply(auth.status,{error:auth.error});
    const token = req.headers.authorization.slice(7);
    const key = req.headers['idempotency-key'];
    let quotaHeaders = {};
    const forward = result=>{
      const payload = {...result.body};
      if (typeof payload.canExecute === 'boolean') payload.canExecute = payload.canExecute && workspaceReady();
      return reply(result.status,payload,{...quotaHeaders,...(result.status===429?{'Retry-After':60}:{})});
    };
    if (['run','recover'].includes(body.action) && (typeof key !== 'string' || !workspace.IDEMPOTENCY_KEY.test(key))) return reply(400,{error:'idempotency_key_required'});
    if (body.action === 'run') {
      // A retry first performs a read-only lookup. Only a confirmed missing key
      // can enter new-work admission. Holds and exhausted quota cannot hide an
      // accepted outcome, and no public flag can authorize model execution.
      try {
        const recovery = await workspace.call({...body,action:'recover'},token,key,{deadline});
        if (recovery.status !== 404 || recovery.body.error !== 'workspace_not_found') return forward(recovery);
      } catch {return reply(503,{error:'workspace_unavailable'},{'Retry-After':60});}
      if (!workspaceReady()) return reply(503,{error:'release_not_ready'},{'Retry-After':300});
      let quota;
      try {quota=await reserve(auth.claims);} catch {return reply(503,{error:'quota_unavailable'},{'Retry-After':60});}
      quotaHeaders = {'X-RateLimit-Limit':LIMIT,'X-RateLimit-Remaining':quota.remaining};
      if (!quota.allowed) return reply(429,{error:quota.budgetReached?'daily_capacity_reached':'rate_limit_reached'},{...quotaHeaders,'Retry-After':quota.retryAfter});
    }
    try {
      return forward(await workspace.call(body,token,key,{deadline}));
    } catch {return reply(503,{error:'workspace_unavailable'}, {...quotaHeaders,'Retry-After':60});}
  };
}
module.exports = {createHandler,parseBody};

