'use strict';
const crypto = require('node:crypto');
const { authenticateRequest } = require('../lib/auth');
const { reserve, LIMIT } = require('../lib/quota');
const { ready } = require('../lib/release-gates');
const sharedBudget = require('../lib/shared-budget');
const MODES = Object.freeze({ ask: 'clarify the question and give a useful next step', research: 'separate claims, evidence, uncertainty and a research path', create: 'develop a concept with options, constraints and a small experiment', learn: 'explain progressively with an example and a check for understanding', explore: 'compare possibilities, constraints and what would falsify each one' });
const MAX_BODY = 14000;
function sameOrigin(req) {
  const host = String(req.headers?.host || '').toLowerCase();
  const approvedHost = host === 'adastra.global' || host === process.env.VERCEL_URL;
  return approvedHost && req.headers?.origin === `https://${host}` && req.headers?.['sec-fetch-site'] !== 'cross-site';
}
async function parseBody(req) {
  if (Number(req.headers?.['content-length']) > MAX_BODY) throw new Error('too_large');
  if (req.body !== undefined) {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > MAX_BODY) throw new Error('too_large');
    return JSON.parse(raw);
  }
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.from(chunk); size += bytes.length;
    if (size > MAX_BODY) throw new Error('too_large');
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
module.exports = async function ask(req, res) {
  const requestId = crypto.randomUUID(), startedAt = Date.now();
  const reply = (status, payload, headers = {}) => {
    res.statusCode = status;
    const values = { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'X-Robots-Tag':'noindex, nofollow, noarchive, nosnippet', 'X-Request-Id':requestId, 'Server-Timing':`app;dur=${Date.now()-startedAt}`, ...headers };
    for (const [k,v] of Object.entries(values)) res.setHeader(k,String(v));
    console.info('ad_astra_request', {requestId,status,outcome:payload.error || 'success',durationMs:Date.now()-startedAt});
    res.end(JSON.stringify({...payload,requestId}));
  };
  if (req.method !== 'POST') return reply(405,{error:'method_not_allowed'},{Allow:'POST'});
  if (!sameOrigin(req) || req.headers?.['x-ad-astra-request'] !== 'public-v1') return reply(403,{error:'same_origin_required'});
  if (String(req.headers?.['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') return reply(415,{error:'json_required'});
  let body;
  try { body = await parseBody(req); } catch(error) {return reply(error.message === 'too_large' ? 413 : 400,{error:error.message === 'too_large' ? 'body_too_large' : 'invalid_json'});}
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400,{error:'invalid_body'});
  const prompt = typeof body.question === 'string' ? body.question.trim() : '';
  const mode = body.mode === undefined ? 'ask' : body.mode;
  if (typeof mode !== 'string' || !Object.hasOwn(MODES,mode) || prompt.length < 5 || prompt.length > 4000 ||
      Object.keys(body).some(k=>!['question','mode','references'].includes(k)) ||
      (body.references !== undefined && (!Array.isArray(body.references) || body.references.length))) return reply(422,{error:'invalid_question'});
  const auth = await authenticateRequest(req);
  if (!auth.ok) return reply(auth.status,{error:auth.error,message:auth.status === 401 ? 'Please sign in again to continue.' : 'Secure sign-in is temporarily unavailable.'});
  if (!ready()) return reply(503,{error:'release_not_ready',message:'The live engine is paused while release checks are completed.'},{'Retry-After':300});
  const idempotencyKey = String(req.headers?.['idempotency-key'] || '');
  if (!idempotencyKey || idempotencyKey.length > 200) return reply(400,{error:'idempotency_key_required'});
  const budgetClient = sharedBudget.createClient();
  void budgetClient;
  let quota;
  try { quota = await reserve(auth.claims); } catch { return reply(503,{error:'quota_unavailable',message:'The live engine is temporarily unavailable.'},{'Retry-After':60}); }
  const headers = {'X-RateLimit-Limit':LIMIT,'X-RateLimit-Remaining':quota.remaining,'X-Ad-Astra-Quota-Mode':'durable'};
  if (!quota.allowed) return reply(429,{error:quota.budgetReached ? 'daily_capacity_reached' : 'rate_limit_reached',message:'Request capacity has been reached. Please try again later.'},{...headers,'Retry-After':quota.retryAfter});
  try {
    const messages = [
      {role:'system',content:`You are Astra Polaris, Ad Astra's sole connected customer-facing model (product model ID: astra-lumen), and a careful human-directed thinking assistant. Your task is to ${MODES[mode]}. Answer directly in under 500 words. Separate evidence, assumptions and uncertainty. You cannot browse, retrieve private data, remember conversations or take external actions. Never invent citations or claim source verification. For medical, legal or financial decisions provide general information and recommend qualified advice. Decline unsafe instructions.`},
      {role:'user',content:prompt}
    ];
    if (messages.reduce((n,m)=>n+Buffer.byteLength(m.content)+32,0) > 16384) throw new Error('input_limit');
    const response = await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-4.1-mini-2025-04-14',temperature:0.25,max_tokens:700,store:false,messages}),
      redirect:'error',cache:'no-store',signal:AbortSignal.timeout(18000)
    });
    if (!response.ok) {console.warn('ad_astra_provider_status',{requestId,status:response.status});throw new Error('provider_unavailable');}
    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) throw new Error('empty_response');
    return reply(200,{ok:true,mode,answer:answer.trim().slice(0,6000),disclosure:'AI-generated response. Verify important claims against primary sources.'},headers);
  } catch { return reply(503,{error:'ai_unavailable',message:'Ad Astra could not complete this response. Please try again later.'},{...headers,'Retry-After':60}); }
};
