const MAX_BYTES = 1_000_000;
const json = (body, status = 200) => Response.json(body, {
  status,
  headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}
});

function subscriptionId(invoice) {
  const legacy = invoice?.subscription;
  const modern = invoice?.parent?.subscription_details?.subscription;
  const id = value => typeof value === 'string' ? value : value?.id;
  const oldId = id(legacy);
  const newId = id(modern);
  if (modern != null && invoice.parent.type !== 'subscription_details') return null;
  if (oldId && newId && oldId !== newId) return null;
  const selected = newId || oldId;
  return typeof selected === 'string' && /^sub_[A-Za-z0-9_]{1,124}$/.test(selected) ? selected : null;
}

async function readBody(request) {
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BYTES)) {
    return {error: json({error: 'Too large'}, 413)};
  }
  const reader = request.body?.getReader();
  if (!reader) return {bytes: new Uint8Array()};
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) {
        await reader.cancel();
        return {error: json({error: 'Too large'}, 413)};
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return {bytes};
}

async function verifySignature(bytes, header, secret, now) {
  if (!header || !secret) return false;
  const fields = header.split(',').map(part => part.trim().split('=', 2));
  const timestamps = fields.filter(([key]) => key === 't').map(([, value]) => value);
  if (timestamps.length !== 1 || !/^\d+$/.test(timestamps[0])) return false;
  const timestamp = Number(timestamps[0]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now() / 1000 - timestamp) > 300) return false;
  const prefix = new TextEncoder().encode(`${timestamp}.`);
  const signed = new Uint8Array(prefix.byteLength + bytes.byteLength);
  signed.set(prefix); signed.set(bytes, prefix.byteLength);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, signed));
  return fields.filter(([name]) => name === 'v1').some(([, value]) => {
    if (!/^[0-9a-f]{64}$/i.test(value ?? '')) return false;
    let difference = 0;
    for (let i = 0; i < digest.length; i++) difference |= digest[i] ^ Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
    return difference === 0;
  });
}

export function createStripeWebhook({getEnv, fetchImpl = fetch, now = Date.now}) {
  return async request => {
    if (request.method !== 'POST') return json({error: 'Method not allowed'}, 405);
    const secret = getEnv('STRIPE_WEBHOOK_SECRET');
    if (getEnv('ASTRA_STRIPE_WEBHOOK_ACCEPTED') !== 'true' || !secret) {
      return json({error: 'Billing webhook release gate is closed'}, 503);
    }
    const mode = getEnv('STRIPE_LIVEMODE') ?? 'true';
    if (!['true', 'false'].includes(mode)) return json({error: 'Billing environment unavailable'}, 503);
    if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
      return json({error: 'JSON required'}, 415);
    }
    let bytes;
    try {
      const body = await readBody(request);
      if (body.error) return body.error;
      bytes = body.bytes;
    } catch { return json({error: 'Invalid body'}, 400); }
    if (!(await verifySignature(bytes, request.headers.get('stripe-signature'), secret, now))) {
      return json({error: 'Invalid signature'}, 400);
    }
    let event;
    try { event = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)); }
    catch { return json({error: 'Invalid JSON'}, 400); }
    if (!event || typeof event !== 'object' || event.livemode !== (mode === 'true')) {
      return json({error: 'Billing environment mismatch'}, 400);
    }
    if (event.type !== 'invoice.paid') return json({received: true, accepted: false});
    const invoice = event.data?.object;
    const subscription = subscriptionId(invoice);
    const occurred = Number.isSafeInteger(event.created) && event.created >= 0 ? new Date(event.created * 1000) : null;
    if (!/^evt_[A-Za-z0-9_]{1,124}$/.test(event.id ?? '') || invoice?.object !== 'invoice' ||
        invoice.status !== 'paid' || !subscription || !occurred || !Number.isFinite(occurred.getTime())) {
      return json({error: 'Stripe event contract invalid'}, 400);
    }
    const base = getEnv('SUPABASE_URL');
    const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (!base || !serviceKey) return json({error: 'Webhook reconciliation unavailable'}, 503);
    try {
      const response = await fetchImpl(`${base}/rest/v1/rpc/astra_stripe_record_event`, {
        method: 'POST',
        headers: {apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({p_source_event_id: event.id, p_event_type: event.type,
          p_provider_subscription_id: subscription, p_occurred_at: occurred.toISOString()}),
        redirect: 'error', signal: AbortSignal.timeout(12000)
      });
      if (!response.ok || (await response.json())?.accepted !== true) {
        return json({error: 'Subscription mapping unavailable'}, 503);
      }
      return json({received: true, accepted: true});
    } catch { return json({error: 'Webhook reconciliation unavailable'}, 503); }
  };
}
