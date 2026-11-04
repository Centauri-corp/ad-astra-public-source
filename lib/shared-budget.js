'use strict';
// Server-only client for a separately audited customer budget bridge. This does
// not authorize the public project to use the private operator control bridge.
const crypto = require('node:crypto');

const POLICY = Object.freeze({
  protocol: 'ad-astra-customer-budget/v1',
  ledgerProject: 'wewznejqpnsmiwkbozgw',
  endpoint: 'https://wewznejqpnsmiwkbozgw.supabase.co/functions/v1/astra-customer-budget',
  provider: 'openai-direct',
  model: 'gpt-4.1-mini-2025-04-14',
  currency: 'USD', monthlyCeilingCents: 50000, reservedCents: 2,
  requestPolicy: 'public-question-v1',
  publicProject: 'prj_FX8QO3TIqUNAfFR4enz0bALmjeg1',
  publicTeam: 'team_5xblMPo2zEBjbz4KPmeDVHPr',
  workloadIssuer: 'https://oidc.vercel.com/zoheb-khan-825ab34d',
  workloadAudience: 'https://vercel.com/zoheb-khan-825ab34d',
  workloadSubject: 'owner:zoheb-khan-825ab34d:project:ad-astra-public:environment:production'
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CUSTOMER_ISSUER = 'https://clerk.adastra.global';
const MAX_RESPONSE_BYTES = 16384;
class BudgetError extends Error {
  constructor(code = 'shared_budget_unavailable', status = 503) { super(code); this.code = code; this.status = status; }
}
const fail = (code, status) => { throw new BudgetError(code, status); };
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function tokenClaims(token) {
  if (typeof token !== 'string' || token.length > 12000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) fail();
  try {
    const part = token.split('.')[1], bytes = Buffer.from(part, 'base64url');
    if (bytes.toString('base64url') !== part) fail();
    const claims = JSON.parse(bytes.toString('utf8'));
    if (!object(claims)) fail();
    return claims;
  } catch { fail(); }
}

function configuration(env = process.env, now = Date.now()) {
  if (env.AD_ASTRA_CUSTOMER_BUDGET_URL !== POLICY.endpoint || env.VERCEL_ENV !== 'production'
      || env.VERCEL_PROJECT_ID !== POLICY.publicProject || env.VERCEL_ORG_ID !== POLICY.publicTeam) fail();
  // This is only a preflight against a misbound/expired outgoing credential.
  // The remote customer bridge MUST independently verify its signature/JWKS.
  const workload = tokenClaims(env.VERCEL_OIDC_TOKEN), seconds = Math.floor(now / 1000);
  if (workload.iss !== POLICY.workloadIssuer || workload.aud !== POLICY.workloadAudience
      || workload.sub !== POLICY.workloadSubject || workload.project_id !== POLICY.publicProject
      || workload.owner_id !== POLICY.publicTeam || !Number.isSafeInteger(workload.exp)
      || !Number.isSafeInteger(workload.iat) || workload.exp <= seconds || workload.iat > seconds + 5
      || workload.exp <= workload.iat) fail();
  return { endpoint: POLICY.endpoint, workloadToken: env.VERCEL_OIDC_TOKEN };
}

async function boundedJson(response) {
  if (response.redirected || !/^application\/json(?:;|$)/i.test(response.headers?.get('content-type') || '')) fail();
  const length = response.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_RESPONSE_BYTES)) fail();
  const reader = response.body?.getReader();
  if (!reader) fail();
  let size = 0; const chunks = [];
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); fail(); }
      chunks.push(value);
    }
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!object(result)) fail();
    return result;
  } catch { fail(); } finally { reader.releaseLock(); }
}

function createClient({ claims, customerToken, env = process.env, request = fetch, now = Date.now } = {}) {
  configuration(env, now());
  // Caller claims must come from authenticateRequest. The original JWT is sent
  // only to the pinned bridge, which must reverify it and resolve membership.
  const token = tokenClaims(customerToken);
  if (!object(claims) || claims.iss !== CUSTOMER_ISSUER || !/^user_[A-Za-z0-9]+$/.test(claims.sub || '')
      || !/^sess_[A-Za-z0-9]+$/.test(claims.sid || '') || token.iss !== claims.iss
      || token.sub !== claims.sub || token.sid !== claims.sid || !Number.isSafeInteger(token.exp)
      || token.exp <= Math.floor(now() / 1000)) fail('customer_budget_identity_invalid', 403);
  const identity = Object.freeze({ issuer: claims.iss, subject: claims.sub, session_id: claims.sid });
  const attempts = new WeakMap();

  async function call(action, payload) {
    const config = configuration(env, now());
    if (token.exp <= Math.floor(now() / 1000)) fail('customer_budget_identity_invalid', 403);
    const nonce = crypto.randomUUID();
    let response;
    try {
      response = await request(config.endpoint, {
        method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(3000),
        headers: { Authorization: `Bearer ${config.workloadToken}`, 'Content-Type': 'application/json',
          'X-Ad-Astra-Customer-Token': customerToken },
        body: JSON.stringify({ protocol: POLICY.protocol, action, nonce, ...payload })
      });
    } catch { fail(); }
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 409) fail('operation_already_recorded', 409);
      if (response.status === 401 || response.status === 403) fail('customer_budget_denied', 403);
      if (response.status === 429) fail('monthly_capacity_reached', 429);
      fail();
    }
    const data = await boundedJson(response);
    if (data.nonce !== nonce) fail();
    return data;
  }

  function matches(data, operation, bound) {
    const who = data.identity;
    return data.protocol === POLICY.protocol && data.ledger_project === POLICY.ledgerProject
      && data.operation_key === operation.operation_key && data.request_hash === operation.request_hash
      && data.provider === POLICY.provider && data.model === POLICY.model && data.currency === POLICY.currency
      && Number.isSafeInteger(data.monthly_ceiling_cents) && data.monthly_ceiling_cents > 0
      && data.monthly_ceiling_cents <= POLICY.monthlyCeilingCents && data.budget_evidence_verified === true
      && object(who) && who.issuer === identity.issuer && who.subject === identity.subject
      && who.session_id === identity.session_id && UUID.test(who.tenant_id || '') && UUID.test(who.user_id || '')
      && who.membership_active === true && who.entitlement_active === true
      && (!bound || who.tenant_id === bound.identity.tenant_id && who.user_id === bound.identity.user_id
        && data.reservation_id === bound.reservation_id && data.reserved_cents === bound.reserved_cents);
  }

  async function reserve({ idempotencyKey, question, mode }) {
    if (!UUID.test(idempotencyKey || '')) fail('operation_key_required', 428);
    if (typeof question !== 'string' || question.length < 5 || question.length > 4000
        || !['ask','research','create','learn','explore'].includes(mode)) fail('invalid_budget_operation', 422);
    const operation = Object.freeze({
      operation_key: 'public:' + hash(identity.issuer + '\0' + identity.subject + '\0' + idempotencyKey.toLowerCase()),
      request_hash: hash(JSON.stringify({ policy: POLICY.requestPolicy, model: POLICY.model, question, mode, max_tokens: 700 })),
      provider: POLICY.provider, model: POLICY.model, currency: POLICY.currency,
      maximum_cost_cents: POLICY.reservedCents, monthly_ceiling_cents: POLICY.monthlyCeilingCents
    });
    // No tenant ID, owner binding, cost attestation, or raw prompt is accepted
    // from the browser or supplied to this reservation request.
    const data = await call('reserve', { ...operation, identity });
    if (data.dispatch_authorized !== true || data.state !== 'reserved') fail('operation_already_recorded', 409);
    const expiry = typeof data.dispatch_expires_at === 'string' && /Z$/.test(data.dispatch_expires_at)
      ? Date.parse(data.dispatch_expires_at) : NaN;
    if (!matches(data, operation) || !UUID.test(data.reservation_id || '') || !UUID.test(data.dispatch_permit || '')
        || data.reserved_cents !== POLICY.reservedCents || !Number.isFinite(expiry)
        || expiry <= now() || expiry > now() + 60000) fail();
    const admission = Object.freeze({ reservation_id: data.reservation_id, reserved_cents: data.reserved_cents,
      identity: Object.freeze({ ...identity, tenant_id: data.identity.tenant_id, user_id: data.identity.user_id,
        membership_active: true, entitlement_active: true }), dispatch_permit: data.dispatch_permit });
    attempts.set(admission, { operation, expiry, dispatched: false, settled: null });
    return admission;
  }

  function attemptFor(admission) {
    const attempt = attempts.get(admission);
    if (!attempt) fail('invalid_budget_admission', 403);
    return attempt;
  }
  function payloadFor(admission, attempt) {
    return { ...attempt.operation, reservation_id: admission.reservation_id,
      identity: admission.identity, dispatch_permit: admission.dispatch_permit };
  }
  async function unknown(admission) {
    const attempt = attemptFor(admission);
    try { await call('record-unknown', payloadFor(admission, attempt)); } catch { /* The reservation is never refunded. */ }
  }
  async function settle(admission, receipt) {
    const attempt = attemptFor(admission);
    if (!attempt.dispatched) fail('provider_not_dispatched', 409);
    if (!object(receipt) || !/^chatcmpl-[A-Za-z0-9_-]{8,160}$/.test(receipt.id || '')
        || receipt.model !== POLICY.model || Object.keys(receipt).some(key => !['id','model','request_id'].includes(key))
        || receipt.request_id !== undefined && !/^[A-Za-z0-9_-]{8,160}$/.test(receipt.request_id)) fail('invalid_provider_receipt');
    const receiptHash = hash(JSON.stringify({id:receipt.id,model:receipt.model,request_id:receipt.request_id || null}));
    if (attempt.settled) {
      if (attempt.settled.receiptHash !== receiptHash) fail('settlement_conflict', 409);
      return attempt.settled.result;
    }
    // The bridge must retrieve independent provider cost evidence. This client
    // never supplies actual cost, pricing, usage totals, or a verified=true flag.
    const data = await call('settle', { ...payloadFor(admission, attempt), provider_receipt: receipt });
    if (!matches(data, attempt.operation, admission)) fail();
    if (data.state === 'pending' && data.hold_retained === true) return Object.freeze({state:'pending'});
    if (!['settled','overrun'].includes(data.state) || data.receipt_id !== receipt.id
        || data.cost_source !== 'provider_receipt' || data.cost_verified !== true
        || !UUID.test(data.settlement_id || '') || !Number.isSafeInteger(data.actual_cost_cents) || data.actual_cost_cents < 0
        || (data.actual_cost_cents > admission.reserved_cents
          ? data.state !== 'overrun' || data.execution_disabled !== true : data.state !== 'settled')) fail();
    const result = Object.freeze({state:data.state,settlementId:data.settlement_id});
    attempt.settled = {receiptHash,result};
    return result;
  }
  async function execute(admission, dispatch) {
    const attempt = attemptFor(admission);
    if (attempt.dispatched || attempt.expiry <= now()) fail('operation_already_recorded', 409);
    // No automatic provider retry. The durable bridge must give exactly one
    // dispatch permit per operation, including after an uncertain HTTP reply.
    attempt.dispatched = true;
    let result;
    try { result = await dispatch(); } catch { await unknown(admission); throw new BudgetError('ai_unavailable'); }
    let accounting = 'pending';
    if (result?.receipt) {
      try { accounting = (await settle(admission, result.receipt)).state; } catch { await unknown(admission); }
    } else { await unknown(admission); }
    // A completed response is never made retryable merely because accounting
    // is delayed. Its hold persists until the bridge verifies a real receipt.
    return { value: result?.value, accounting };
  }
  return Object.freeze({reserve,execute,settle});
}
module.exports = { POLICY, BudgetError, configuration, createClient };
