'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const now = 1793908800000;
const secret = 'whsec_local_fixture_only';
const env = {STRIPE_WEBHOOK_SECRET: secret, ASTRA_STRIPE_WEBHOOK_ACCEPTED: 'true',
  SUPABASE_URL: 'https://billing-fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-key'};
const invoice = {object: 'invoice', status: 'paid', parent: {type: 'subscription_details', subscription_details: {subscription: 'sub_fixture'}}};
const event = () => ({id: 'evt_fixture', type: 'invoice.paid', livemode: true, created: now / 1000, data: {object: structuredClone(invoice)}});
async function setup(overrides = {}, receipt = {accepted: true}) {
  const {createStripeWebhook} = await import('../supabase/functions/stripe-webhook/handler.mjs');
  const calls = [];
  const handler = createStripeWebhook({getEnv: key => ({...env, ...overrides})[key], now: () => now,
    fetchImpl: async (url, options) => { calls.push({url, body: JSON.parse(options.body)}); return Response.json(receipt); }});
  return {handler, calls};
}
async function request(value, timestamp = now / 1000) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const digest = Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`))).toString('hex');
  return new Request('https://fixture.invalid/webhook', {method: 'POST', headers: {'Content-Type': 'application/json', 'stripe-signature': `t=${timestamp},v1=${digest}`}, body});
}
test('current Stripe subscription parent is reconciled through the tenant-bound RPC', async () => {
  const {handler, calls} = await setup(); assert.equal((await handler(await request(event()))).status, 200);
  assert.equal(calls.length, 1); assert.equal(calls[0].body.p_provider_subscription_id, 'sub_fixture');
  assert.equal(calls[0].body.p_source_event_id, 'evt_fixture');
});
test('legacy and expanded subscription references are supported', async () => {
  for (const expanded of [false, true]) {
    const {handler, calls} = await setup(); const e = event(); delete e.data.object.parent;
    e.data.object.subscription = expanded ? {id: 'sub_legacy'} : 'sub_legacy';
    assert.equal((await handler(await request(e))).status, 200); assert.equal(calls[0].body.p_provider_subscription_id, 'sub_legacy');
  }
});
test('conflicting subscription references fail before database access', async () => {
  const {handler, calls} = await setup(); const e = event(); e.data.object.subscription = 'sub_other';
  assert.equal((await handler(await request(e))).status, 400); assert.equal(calls.length, 0);
});
test('closed release gate or absent signing secret prevents reconciliation', async () => {
  for (const override of [{ASTRA_STRIPE_WEBHOOK_ACCEPTED: 'false'}, {STRIPE_WEBHOOK_SECRET: undefined}]) {
    const {handler, calls} = await setup(override); assert.equal((await handler(await request(event()))).status, 503); assert.equal(calls.length, 0);
  }
});
test('bad signatures and expired or duplicated timestamps are rejected', async () => {
  const {handler, calls} = await setup();
  for (const header of ['t=1,v1=bad', `t=${now / 1000},t=${now / 1000},v1=bad`]) {
    const r = await request(event()); r.headers.set('stripe-signature', header); assert.equal((await handler(r)).status, 400);
  }
  assert.equal((await handler(await request(event(), now / 1000 - 301))).status, 400); assert.equal(calls.length, 0);
});
test('test-mode events cannot reach production reconciliation', async () => {
  const {handler, calls} = await setup(); const e = event(); e.livemode = false;
  assert.equal((await handler(await request(e))).status, 400); assert.equal(calls.length, 0);
});
test('unsupported events are acknowledged without accounting or provisioning', async () => {
  const {handler, calls} = await setup(); const e = event(); e.type = 'customer.updated';
  const r = await handler(await request(e)); assert.deepEqual(await r.json(), {received: true, accepted: false}); assert.equal(calls.length, 0);
});
test('invalid invoice identity, status and date cannot create a receipt', async () => {
  for (const mutate of [e => e.id = 'bad', e => e.created = 1e20, e => e.data.object.status = 'open', e => delete e.data.object.parent]) {
    const {handler, calls} = await setup(); const e = event(); mutate(e);
    assert.equal((await handler(await request(e))).status, 400); assert.equal(calls.length, 0);
  }
});
test('malformed JSON and oversized bodies are rejected before the RPC', async () => {
  const {handler, calls} = await setup(); assert.equal((await handler(await request('{'))).status, 400);
  assert.equal((await handler(await request('x'.repeat(1_000_001)))).status, 413); assert.equal(calls.length, 0);
});
test('unmapped subscriptions keep the webhook unsuccessful for provider retry', async () => {
  const {handler} = await setup({}, {accepted: false}); assert.equal((await handler(await request(event()))).status, 503);
});
test('database duplicate receipts remain successfully acknowledged', async () => {
  const {handler} = await setup({}, {accepted: true, duplicate: true}); assert.equal((await handler(await request(event()))).status, 200);
});
