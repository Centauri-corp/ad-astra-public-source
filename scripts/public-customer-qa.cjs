#!/usr/bin/env node
'use strict';
// Hosted public Clerk-session QA only. Never sends an authenticated AI request,
// creates/revokes accounts, reads customer records or calls billing/CRM/providers.
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const receipts = require('./lib/public-qa-receipts.cjs');
const { publicCustomerAgents } = require('../lib/customer-agent-catalog');
async function json(response, maximum = 16384) {
  if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) {
    await response.body?.cancel(); throw Error('public_response_not_json');
  }
  const reader = response.body?.getReader(); if (!reader) throw Error('public_response_empty');
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break; size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw Error('public_response_too_large'); }
      chunks.push(value);
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
  } finally { reader.releaseLock(); }
}
function configuration(env) {
  const environment = env.AD_ASTRA_PUBLIC_QA_ENVIRONMENT, publicSha = env.AD_ASTRA_PUBLIC_QA_SHA;
  if (!receipts.SHA.test(publicSha || '')) throw Error('public_sha_required');
  if (env.AD_ASTRA_PUBLIC_QA_SYNTHETIC_IDENTITY !== 'true' || !receipts.HASH.test(env.AD_ASTRA_PUBLIC_QA_SUBJECT_SHA256 || '')) throw Error('synthetic_identity_binding_required');
  return { environment, publicSha, origin: receipts.origin(env.AD_ASTRA_PUBLIC_QA_URL, environment), subjectHash: env.AD_ASTRA_PUBLIC_QA_SUBJECT_SHA256 };
}
async function run(env, { transport = fetch, read, now = Date.now, catalog = publicCustomerAgents() } = {}) {
  const checks = [], externalEvidence = [];
  const report = {
    schema: 'ad-astra-public-customer-qa/v1', observedAt: new Date(now()).toISOString(),
    component: receipts.COMPONENT, repository: receipts.REPOSITORY, publicSha: receipts.SHA.test(env.AD_ASTRA_PUBLIC_QA_SHA || '') ? env.AD_ASTRA_PUBLIC_QA_SHA : null,
    identityPlane: 'public-clerk', issuer: receipts.ISSUER, audience: 'ad-astra-workspace', sessionProtocol: receipts.SESSION_PROTOCOL,
    environment: env.AD_ASTRA_PUBLIC_QA_ENVIRONMENT || null, origin: null,
    endpoints: { session: 'POST /api/session; Bearer JWT; X-Ad-Astra-Request: public-v1', catalog: 'GET /api/models', unauthenticatedAsk: 'POST /api/ask without bearer' },
    scope: 'public-clerk-session-protocol-and-explicit-lifecycle-evidence',
    sourceProof: null, checks, externalEvidence, status: 'blocked',
    productionAuthorized: false, customerRecordsRead: false, authenticatedModelRequests: 0,
    billingWrites: false, crmWrites: false, providerApiCalls: 0,
    unverified: ['paid-entitlement', 'paid-idempotency-replay', 'first-provider-delivery', 'cross-tenant-data-isolation', 'billing', 'crm-delivery']
  };
  let config, lifecycle;
  function result(id, status, reason) { checks.push({ id, status, ...(reason ? { reason } : {}) }); }
  try {
    config = configuration(env); report.origin = config.origin;
    report.sourceProof = receipts.sourceProof(receipts.readReceipt(env.AD_ASTRA_PUBLIC_QA_SOURCE_PROOF_FILE, env.AD_ASTRA_PUBLIC_QA_SOURCE_PROOF_SHA256, read), config, now());
    result('deployed-source-binding', 'accepted-external-evidence', 'protected-reviewed-provider-readback; not re-queried by this script');
  } catch { result('source-and-synthetic-scope', 'blocked', 'missing-or-invalid-bound-source-proof-or-synthetic-identity'); return report; }
  try {
    if (env.AD_ASTRA_PUBLIC_QA_LIFECYCLE_FILE) lifecycle = receipts.readReceipt(env.AD_ASTRA_PUBLIC_QA_LIFECYCLE_FILE, env.AD_ASTRA_PUBLIC_QA_LIFECYCLE_SHA256, read);
  } catch (error) {
    if (error.code !== 'ENOENT' && error.message !== 'reviewed_receipt_missing') result('lifecycle-receipt-integrity', 'fail', 'protected-receipt-digest-or-json-invalid');
  }
  async function request(endpoint, { token, method = 'POST', body } = {}) {
    if (!['/api/session', '/api/models', '/api/ask'].includes(endpoint) || (endpoint === '/api/ask' && token)) throw Error('qa_scope_denied');
    const headers = { Accept: 'application/json', Origin: config.origin, 'X-Ad-Astra-Request': 'public-v1' };
    if (env.AD_ASTRA_PUBLIC_QA_PROTECTION_BYPASS) headers['x-vercel-protection-bypass'] = env.AD_ASTRA_PUBLIC_QA_PROTECTION_BYPASS;
    if (token) headers.Authorization = 'Bearer ' + token;
    if (body) headers['Content-Type'] = 'application/json';
    if (endpoint === '/api/ask') headers['Idempotency-Key'] = crypto.randomUUID();
    const response = await transport(config.origin + endpoint, { method, headers, body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual', cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(10000) });
    const data = await json(response);
    if (endpoint === '/api/session' && data.protocol !== receipts.SESSION_PROTOCOL) throw Error('public_session_protocol_mismatch');
    if (endpoint !== '/api/models' && !/(?:^|,)\s*no-store(?:,|$)/i.test(response.headers.get('cache-control') || '')) throw Error('public_response_cacheable');
    return { status: response.status, data };
  }
  async function check(id, work) {
    try { await work(); result(id, 'pass'); } catch { result(id, 'fail', 'public-contract-check-failed; no response body retained'); }
  }
  await check('public-agent-catalog', async () => {
    const response = await request('/api/models', { method: 'GET' });
    if (response.status !== 200 || !Array.isArray(response.data.agents)
      || response.data.agents.length !== catalog.length || new Set(response.data.agents.map(agent => agent.id)).size !== catalog.length
      || catalog.some(agent => !response.data.agents.some(actual => actual.id === agent.id && actual.name === agent.name && actual.defaultMode === agent.defaultMode))) throw Error('catalog_mismatch');
  });
  await check('unauthenticated-session-denied', async () => {
    const response = await request('/api/session');
    if (response.status !== 401 || response.data.authenticated !== false) throw Error('anonymous_not_denied');
  });
  await check('forged-session-denied', async () => {
    const response = await request('/api/session', { token: 'invalid.synthetic.token' });
    if (response.status !== 401 || response.data.authenticated !== false) throw Error('forged_not_denied');
  });
  await check('unauthenticated-ask-denied-before-execution', async () => {
    const response = await request('/api/ask', { body: { question: 'Synthetic public protocol QA. Do not perform any action.', mode: 'ask', agentId: 'guide' } });
    if (response.status !== 401 || !['authentication_required', 'authentication_invalid'].includes(response.data.error)) throw Error('unauthenticated_ask_not_denied');
  });
  let current;
  try { current = receipts.identity(env.AD_ASTRA_PUBLIC_QA_CURRENT_TOKEN, config, now()); }
  catch { result('authenticated-session', 'blocked', 'fresh-protected-Clerk-token-for-bound-synthetic-subject-required'); }
  if (current) {
    report.syntheticIdentity = { subjectHash: current.subjectHash };
    await check('authenticated-session', async () => {
      const response = await request('/api/session', { token: env.AD_ASTRA_PUBLIC_QA_CURRENT_TOKEN });
      if (response.status !== 200 || response.data.authenticated !== true) throw Error('member_not_authenticated');
    });
    // A repeated valid bearer is allowed by the session protocol. This is not
    // a paid request replay or evidence for the AI idempotency contract.
    await check('valid-session-repeat', async () => {
      const response = await request('/api/session', { token: env.AD_ASTRA_PUBLIC_QA_CURRENT_TOKEN });
      if (response.status !== 200 || response.data.authenticated !== true) throw Error('repeat_not_authenticated');
    });
  }
  for (const [kind, variable, state, id] of [
    ['session-revocation', 'AD_ASTRA_PUBLIC_QA_REVOKED_TOKEN', 'current', 'revoked-session-replay-denied'],
    ['natural-expiry', 'AD_ASTRA_PUBLIC_QA_EXPIRED_TOKEN', 'expired', 'naturally-expired-session-denied']
  ]) {
    let identity, proof;
    try {
      identity = receipts.identity(env[variable], config, now(), state);
      proof = receipts.lifecycleProof(lifecycle, kind, config, identity, now());
    } catch { result(id, 'unverified', 'actual-reviewed-lifecycle-receipt-and-bound-Clerk-token-required'); report.unverified.push(kind); continue; }
    externalEvidence.push(proof);
    await check(id, async () => {
      const response = await request('/api/session', { token: env[variable] });
      if (response.status !== 401 || response.data.authenticated !== false) throw Error('old_token_still_accepted');
    });
  }
  try {
    externalEvidence.push(receipts.lifecycleProof(lifecycle, 'account-recovery', config, null, now()));
    result('account-recovery', 'accepted-external-evidence', 'actual-reviewed-recovery-receipt; not reperformed by this script');
  } catch { result('account-recovery', 'unverified', 'actual-reviewed-recovery-receipt-required'); report.unverified.push('account-recovery'); }
  report.status = checks.some(check => check.status === 'fail') ? 'fail' : checks.some(check => check.status === 'blocked') ? 'blocked'
    : checks.some(check => check.status === 'unverified') ? 'partial' : 'pass';
  report.acceptance = 'requires-independent-public-component-review; never-authorizes-production';
  return report;
}
async function main(env = process.env) {
  let report;
  try {
    const root = path.join(__dirname, '..');
    const sha = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    const dirty = cp.execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root, encoding: 'utf8' }).trim();
    if (dirty || sha !== env.AD_ASTRA_PUBLIC_QA_SHA) throw Error('source_not_clean_or_sha_mismatch');
    report = await run(env);
  } catch {
    report = { schema: 'ad-astra-public-customer-qa/v1', component: receipts.COMPONENT, identityPlane: 'public-clerk',
      publicSha: receipts.SHA.test(env.AD_ASTRA_PUBLIC_QA_SHA || '') ? env.AD_ASTRA_PUBLIC_QA_SHA : null,
      status: 'blocked', checks: [{ id: 'reviewed-checkout', status: 'blocked', reason: 'clean-exact-public-checkout-required' }],
      productionAuthorized: false, customerRecordsRead: false, providerApiCalls: 0 };
  }
  try { receipts.writeReport(report, env.AD_ASTRA_PUBLIC_QA_OUTPUT || path.join(process.cwd(), '.release-evidence/public-customer-qa')); }
  catch { console.error('PUBLIC_CUSTOMER_QA_BLOCKED: evidence could not be saved; existing evidence was not overwritten.'); return 1; }
  console.log(JSON.stringify({ schema: report.schema, component: report.component, identityPlane: report.identityPlane, publicSha: report.publicSha, status: report.status, productionAuthorized: false }));
  return report.status === 'pass' ? 0 : report.status === 'fail' ? 1 : 2;
}
module.exports = { run, configuration, main };
if (require.main === module) main().then(code => { process.exitCode = code; }).catch(() => { console.error('PUBLIC_CUSTOMER_QA_BLOCKED'); process.exitCode = 1; });
