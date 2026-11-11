'use strict';
const PROTOCOL = 'ad-astra-customer-budget/v1';
const DENIALS = new Set(['paid_access_required', 'request_replayed', 'capacity_reached']);
function configuration() {
  const url = new URL(process.env.AD_ASTRA_CUSTOMER_BUDGET_URL || 'https://unconfigured.invalid');
  const secret = process.env.AD_ASTRA_CUSTOMER_BUDGET_SECRET;
  if (url.protocol !== 'https:' || !/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname)
    || url.port || url.username || url.password || url.search || url.hash
    || url.pathname !== '/functions/v1/astra-customer-budget'
    || typeof secret !== 'string' || secret.length < 32 || secret.length > 4096 || /[\r\n]/.test(secret)) {
    throw new Error('customer_budget_unavailable');
  }
  return { url: url.href, secret };
}
async function boundedJson(response) {
  if (!response.ok || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) {
    await response.body?.cancel(); throw new Error('customer_budget_unavailable');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('customer_budget_unavailable');
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); throw new Error('customer_budget_unavailable'); }
      chunks.push(value);
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
  } finally { reader.releaseLock(); }
}
function createClient() {
  return Object.freeze({
    protocol: PROTOCOL,
    async reserve({ authorization, idempotencyKey, requestHash }) {
      const { url, secret } = configuration();
      if (!/^Bearer [A-Za-z0-9_.-]{1,12000}$/.test(authorization || '')
        || !/^[A-Za-z0-9_-]{8,128}$/.test(idempotencyKey || '') || !/^[a-f0-9]{64}$/.test(requestHash || '')) {
        throw new Error('customer_budget_unavailable');
      }
      // The bridge re-verifies the session and derives tenant/subscription from
      // server-owned bindings. No tenant, plan, amount or entitlement is sent.
      const data = await boundedJson(await fetch(url, {
        method: 'POST', headers: { Authorization: authorization, 'X-Ad-Astra-Bridge-Secret': secret, 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol: PROTOCOL, idempotencyKey, requestHash }),
        redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(6000)
      }));
      if (!data || typeof data !== 'object' || Array.isArray(data) || data.protocol !== PROTOCOL) throw new Error('customer_budget_unavailable');
      if (data.allowed === false && DENIALS.has(data.reason) && Object.keys(data).sort().join(',') === 'allowed,protocol,reason') return data;
      if (data.allowed !== true || Object.keys(data).sort().join(',') !== 'allowed,expiresAt,protocol,requestHash,reservationId'
        || !/^[a-f0-9-]{36}$/.test(data.reservationId || '') || data.requestHash !== requestHash
        || !Number.isSafeInteger(data.expiresAt) || data.expiresAt <= Date.now() || data.expiresAt > Date.now() + 30000) {
        throw new Error('customer_budget_unavailable');
      }
      return data;
    }
  });
}
module.exports = { createClient, configuration, PROTOCOL };
