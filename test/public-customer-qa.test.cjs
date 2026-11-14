'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { run, configuration } = require('../scripts/public-customer-qa.cjs');
const receipts = require('../scripts/lib/public-qa-receipts.cjs');
const catalog = require('../lib/customer-agent-catalog').publicCustomerAgents();
const time = Date.parse('2026-11-13T18:00:00Z'), sha = 'a'.repeat(40), origin = 'https://public-qa.vercel.app';
function token(exp, sid, overrides = {}) {
  const claims = { iss: receipts.ISSUER, aud: 'ad-astra-workspace', azp: 'https://adastra.global', sub: 'user_syntheticQA', sid,
    iat: exp - 120, nbf: exp - 120, exp, ...overrides };
  return [Buffer.from('{"alg":"RS256"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'syntheticSignature'].join('.');
}
function fixture() {
  const env = { AD_ASTRA_PUBLIC_QA_URL: origin + '/', AD_ASTRA_PUBLIC_QA_ENVIRONMENT: 'preview',
    AD_ASTRA_PUBLIC_QA_SHA: sha, AD_ASTRA_PUBLIC_QA_SYNTHETIC_IDENTITY: 'true',
    AD_ASTRA_PUBLIC_QA_SUBJECT_SHA256: receipts.digest('user_syntheticQA'),
    AD_ASTRA_PUBLIC_QA_CURRENT_TOKEN: token(time / 1000 + 60, 'sess_currentQA'),
    AD_ASTRA_PUBLIC_QA_REVOKED_TOKEN: token(time / 1000 + 60, 'sess_revokedQA'),
    AD_ASTRA_PUBLIC_QA_EXPIRED_TOKEN: token(time / 1000 - 60, 'sess_expiredQA'),
    AD_ASTRA_PUBLIC_QA_PROTECTION_BYPASS: 'PRIVATE_BYPASS_MARKER',
    AD_ASTRA_PUBLIC_QA_SOURCE_PROOF_FILE: 'source-proof', AD_ASTRA_PUBLIC_QA_LIFECYCLE_FILE: 'lifecycle' };
  const base = { component: receipts.COMPONENT, repository: receipts.REPOSITORY, publicSha: sha, origin, environment: 'preview',
    reviewer: 'independent-reviewer', reviewState: 'approved', observedAt: new Date(time - 1000).toISOString(), evidenceUrl: 'https://github.com/Centauri-corp/ad-astra-public-source/actions/runs/123' };
  const source = { ...base, schema: 'ad-astra-reviewed-source-proof/v1', provider: 'vercel', providerCommitSha: sha,
    deploymentId: 'dpl_syntheticSource123', basis: 'provider-source-readback' };
  const config = configuration(env);
  const lifecycle = { schema: 'ad-astra-reviewed-public-lifecycle/v1', receipts: [
    ...[['session-revocation', env.AD_ASTRA_PUBLIC_QA_REVOKED_TOKEN, 'current'], ['natural-expiry', env.AD_ASTRA_PUBLIC_QA_EXPIRED_TOKEN, 'expired']].map(([kind, jwt, state]) => ({
      ...base, kind, identityPlane: 'public-clerk', issuer: receipts.ISSUER, syntheticIdentity: true, subjectHash: config.subjectHash,
      result: 'observed-pass', sessionHash: receipts.identity(jwt, config, time, state).sessionHash, tokenHash: receipts.digest(jwt),
      ...(kind === 'session-revocation' ? { revocationConfirmed: true } : { acceptedBeforeExpiry: true, expiredNaturally: true })
    })),
    { ...base, kind: 'account-recovery', identityPlane: 'public-clerk', issuer: receipts.ISSUER, syntheticIdentity: true,
      subjectHash: config.subjectHash, result: 'observed-pass', recoveredSessionConfirmed: true, oldAccessOutcomeVerified: true }
  ] };
  const files = new Map(), calls = [];
  function sync() {
    files.set('source-proof', Buffer.from(JSON.stringify(source))); files.set('lifecycle', Buffer.from(JSON.stringify(lifecycle)));
    env.AD_ASTRA_PUBLIC_QA_SOURCE_PROOF_SHA256 = receipts.digest(files.get('source-proof'));
    env.AD_ASTRA_PUBLIC_QA_LIFECYCLE_SHA256 = receipts.digest(files.get('lifecycle'));
  }
  sync();
  let mutate = () => {};
  const deps = { now: () => time, read: filename => { if (!files.has(filename)) throw Error('PRIVATE_MISSING_FILE'); return files.get(filename); },
    transport: async (url, init) => {
      calls.push({ url, init });
      let status, body;
      if (url.endsWith('/api/models')) { status = 200; body = { agents: catalog }; }
      else if (url.endsWith('/api/ask')) { assert.equal(init.headers.Authorization, undefined); status = 401; body = { error: 'authentication_required' }; }
      else { const jwt = init.headers.Authorization?.slice(7); status = jwt === env.AD_ASTRA_PUBLIC_QA_CURRENT_TOKEN && jwt !== 'invalid.synthetic.token' ? 200 : 401; body = { protocol: receipts.SESSION_PROTOCOL, authenticated: status === 200 }; }
      const reply = { status, body, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } };
      mutate(reply, url, init); return new Response(JSON.stringify(reply.body), { status: reply.status, headers: reply.headers });
    } };
  return { env, source, lifecycle, files, calls, sync, deps, mutate: fn => { mutate = fn; } };
}
test('full scoped fixture verifies the public POST bearer lane and retains explicit external evidence', async () => {
  const f = fixture(), report = await run(f.env, f.deps);
  assert.equal(report.status, 'pass'); assert.equal(report.identityPlane, 'public-clerk');
  assert.equal(report.component, 'public-marketing-site'); assert.equal(report.publicSha, sha);
  assert.equal(report.sourceProof.verification, 'accepted-protected-reviewed-receipt-not-live-reverified');
  assert.equal(report.externalEvidence.length, 3); assert.equal(report.authenticatedModelRequests, 0);
  assert.equal(report.productionAuthorized, false); assert.equal(report.providerApiCalls, 0);
  assert.ok(report.unverified.includes('paid-idempotency-replay'));
  assert.ok(f.calls.every(({ url, init }) => url.startsWith(origin + '/api/') && init.redirect === 'manual' && init.cache === 'no-store' && init.credentials === 'omit'));
  assert.ok(f.calls.filter(({ url }) => url.endsWith('/api/session')).every(({ init }) => init.method === 'POST' && init.headers.Origin === origin && init.headers['X-Ad-Astra-Request'] === 'public-v1'));
  assert.ok(!JSON.stringify(report).includes(f.env.AD_ASTRA_PUBLIC_QA_CURRENT_TOKEN));
  assert.ok(!JSON.stringify(report).includes('PRIVATE_BYPASS_MARKER'));
  assert.ok(!JSON.stringify(report).includes('sess_currentQA'));
});
test('missing source proof blocks every hosted request', async () => {
  const f = fixture(); delete f.env.AD_ASTRA_PUBLIC_QA_SOURCE_PROOF_SHA256;
  assert.equal((await run(f.env, f.deps)).status, 'blocked'); assert.equal(f.calls.length, 0);
});
test('wrong source SHA, component, environment, origin and invalid future read-back cannot count as source proof', async () => {
  for (const change of [{ providerCommitSha: 'b'.repeat(40) }, { component: 'private-operator' }, { environment: 'production' },
    { origin: 'https://adastra.global' }, { reviewer: '' }, { observedAt: new Date(time + 30001).toISOString() }, { observedAt: 'invalid' }, { basis: 'declared-config-only' }]) {
    const f = fixture(); Object.assign(f.source, change); f.sync();
    assert.equal((await run(f.env, f.deps)).status, 'blocked'); assert.equal(f.calls.length, 0);
  }
});
test('tampered reviewed source receipt cannot use the protected pinned digest', async () => {
  const f = fixture(); f.files.set('source-proof', Buffer.from(JSON.stringify({ ...f.source, deploymentId: 'dpl_unreviewed123' })));
  assert.equal((await run(f.env, f.deps)).status, 'blocked'); assert.equal(f.calls.length, 0);
});
test('unsafe origins and missing synthetic binding stop before tokens can leave', async () => {
  for (const change of [{ AD_ASTRA_PUBLIC_QA_URL: 'https://evil.example/' }, { AD_ASTRA_PUBLIC_QA_URL: origin + '/?secret=x' },
    { AD_ASTRA_PUBLIC_QA_URL: 'https://user:pass@public-qa.vercel.app/' }, { AD_ASTRA_PUBLIC_QA_ENVIRONMENT: 'production' },
    { AD_ASTRA_PUBLIC_QA_SYNTHETIC_IDENTITY: 'false' }]) {
    const f = fixture(); Object.assign(f.env, change);
    assert.equal((await run(f.env, f.deps)).status, 'blocked'); assert.equal(f.calls.length, 0);
  }
});
test('missing lifecycle evidence yields partial, never invented recovery/expiry/revocation passes', async () => {
  const f = fixture(); delete f.env.AD_ASTRA_PUBLIC_QA_LIFECYCLE_FILE;
  const report = await run(f.env, f.deps);
  assert.equal(report.status, 'partial');
  for (const id of ['account-recovery', 'naturally-expired-session-denied', 'revoked-session-replay-denied']) assert.equal(report.checks.find(row => row.id === id).status, 'unverified');
});
test('private Supabase cookie response cannot satisfy public session acceptance', async () => {
  const f = fixture(); f.mutate((reply, url) => { if (url.endsWith('/api/session')) reply.body = { email: 'PRIVATE_CUSTOMER_MARKER', authMode: 'supabase' }; });
  const report = await run(f.env, f.deps); assert.equal(report.status, 'fail');
  assert.ok(!JSON.stringify(report).includes('PRIVATE_CUSTOMER_MARKER'));
});
test('revoked unexpired token still accepted by hosted endpoint fails rather than claiming logout completed', async () => {
  const f = fixture(); f.mutate((reply, url, init) => { if (init.headers.Authorization?.endsWith(f.env.AD_ASTRA_PUBLIC_QA_REVOKED_TOKEN)) { reply.status = 200; reply.body = { protocol: receipts.SESSION_PROTOCOL, authenticated: true }; } });
  const report = await run(f.env, f.deps); assert.equal(report.status, 'fail');
  assert.equal(report.checks.find(row => row.id === 'revoked-session-replay-denied').status, 'fail');
});
test('expiry proof must match the actual token, session and subject and attest a previously accepted naturally expired token', async () => {
  for (const change of [{ tokenHash: 'f'.repeat(64) }, { sessionHash: 'e'.repeat(64) }, { acceptedBeforeExpiry: false }, { expiredNaturally: false }, { identityPlane: 'private-supabase' }]) {
    const f = fixture(); Object.assign(f.lifecycle.receipts[1], change); f.sync();
    const report = await run(f.env, f.deps);
    assert.equal(report.status, 'partial'); assert.equal(report.checks.find(row => row.id === 'naturally-expired-session-denied').status, 'unverified');
  }
});
test('wrong subject, expired current token and swapped issuer cannot be used for authenticated hosted QA', async () => {
  for (const replacement of [token(time / 1000 - 1, 'sess_currentQA'), 'invalid.synthetic.token',
    token(time / 1000 + 60, 'sess_currentQA', { sub: 'user_other' }),
    token(time / 1000 + 60, 'sess_currentQA', { iss: 'https://private-supabase.invalid' }),
    token(time / 1000 + 60, 'sess_currentQA', { aud: 'private-operator' }),
    token(time / 1000 + 60, 'sess_currentQA', { azp: origin })]) {
    const f = fixture(); f.env.AD_ASTRA_PUBLIC_QA_CURRENT_TOKEN = replacement;
    const report = await run(f.env, f.deps); assert.equal(report.status, 'blocked');
    assert.equal(f.calls.filter(({ init }) => init.headers.Authorization === 'Bearer ' + replacement).length, replacement === 'invalid.synthetic.token' ? 1 : 0);
  }
});
test('redirects, cached sessions and provider/proxy errors fail without retaining response bodies', async () => {
  for (const kind of ['redirect', 'cache', 'html', 'outage']) {
    const f = fixture(); f.mutate((reply, url) => { if (url.endsWith('/api/session')) {
      if (kind === 'redirect') reply.status = 302;
      if (kind === 'cache') reply.headers['Cache-Control'] = 'public, max-age=100';
      if (kind === 'html') reply.headers['Content-Type'] = 'text/html';
      if (kind === 'outage') reply.status = 503;
      reply.body = { error: 'PRIVATE_PROXY_MARKER' };
    } });
    const report = await run(f.env, f.deps);
    assert.equal(report.status, 'fail'); assert.ok(!JSON.stringify(report).includes('PRIVATE_PROXY_MARKER'));
  }
});
test('catalog drift cannot satisfy the seven-agent hosted check', async () => {
  const f = fixture(); f.mutate((reply, url) => { if (url.endsWith('/api/models')) reply.body.agents = catalog.slice(1); });
  const report = await run(f.env, f.deps); assert.equal(report.status, 'fail');
  assert.equal(report.checks.find(row => row.id === 'public-agent-catalog').status, 'fail');
});
test('a configured lifecycle path without any reviewed receipt is unverified rather than a fabricated pass',async()=>{
 const f=fixture();delete f.env.AD_ASTRA_PUBLIC_QA_LIFECYCLE_SHA256;
 const report=await run(f.env,f.deps);assert.equal(report.status,'partial');
 assert.ok(report.unverified.includes('account-recovery'));
});
test('malformed or oversized public responses and transported exception details remain redacted',async()=>{
 for(const kind of ['malformed','oversized','throw']){
  const f=fixture();f.deps.transport=async()=>{if(kind==='throw')throw Error('PRIVATE_TRANSPORT_MARKER');return new Response(kind==='malformed'?'{PRIVATE_TRANSPORT_MARKER':'x'.repeat(16385),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});};
  const report=await run(f.env,f.deps);assert.equal(report.status,'fail');assert.ok(!JSON.stringify(report).includes('PRIVATE_TRANSPORT_MARKER'));
 }
});
test('exact source and recovery receipts remain valid beyond a day without a new owner review',async()=>{
 const f=fixture(),older=new Date(time-45*86400000).toISOString();
 f.source.observedAt=older;
 for(const receipt of f.lifecycle.receipts)receipt.observedAt=older;
 f.sync();const report=await run(f.env,f.deps);
 assert.equal(report.status,'pass');assert.equal(report.sourceProof.observedAt,older);
 assert.equal(report.externalEvidence.find(row=>row.kind==='account-recovery').observedAt,older);
});
test('explicit receipt revocation or policy expiry invalidates scope without imposing a default TTL',async()=>{
 for(const change of [{revoked:true},{revokedAt:new Date(time-1000).toISOString()},{expiresAt:new Date(time-1).toISOString()},{expiresAt:'invalid'}]){
  const f=fixture();Object.assign(f.source,change);f.sync();
  assert.equal((await run(f.env,f.deps)).status,'blocked');assert.equal(f.calls.length,0);
 }
 const f=fixture();f.source.expiresAt=new Date(time+60000).toISOString();f.sync();
 assert.equal((await run(f.env,f.deps)).status,'pass');
 const recovered=fixture();recovered.lifecycle.receipts[2].revoked=true;recovered.sync();
 assert.equal((await run(recovered.env,recovered.deps)).status,'partial');
});
test('legacy stateless session responses and wrong bridge protocols cannot pass public online-session QA',async()=>{
 for(const protocol of [undefined,'ad-astra-customer-session/v0','ad-astra-customer-budget/v2']){
  const f=fixture();f.mutate((reply,url)=>{if(url.endsWith('/api/session')){if(protocol===undefined)delete reply.body.protocol;else reply.body.protocol=protocol;}});
  const report=await run(f.env,f.deps);assert.equal(report.status,'fail');
  assert.equal(report.sessionProtocol,'ad-astra-customer-session/v1');
  assert.equal(report.checks.find(row=>row.id==='authenticated-session').status,'fail');
 }
});
