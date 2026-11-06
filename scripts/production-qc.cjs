'use strict';

// This is intentionally fail-closed. It combines reverse checks of the
// deployed public surface with source-level invariants and requires explicit,
// externally-produced evidence for every irreversible release gate.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const origin = process.env.AD_ASTRA_QC_ORIGIN || 'https://adastra.global';
const failures = [];
const notes = [];
const requirePass = (condition, message) => { if (!condition) failures.push(message); };

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

async function request(route, options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ad-astra-qc-'));
  const bodyPath = path.join(directory, 'body');
  const args = [
    '--silent', '--show-error', '--max-time', '20', '--max-redirs', '0',
    '--output', bodyPath, '--write-out', '%{http_code}\n%{redirect_url}\n',
  ];
  if (options.method) args.push('--request', options.method);
  for (const [name, value] of Object.entries(options.headers || {})) args.push('--header', `${name}: ${value}`);
  if (options.body !== undefined) args.push('--data-raw', options.body);
  args.push(new URL(route, origin).toString());
  try {
    const result = execFileSync('curl', args, { encoding: 'utf8' });
    const [statusText, redirect] = result.trimEnd().split('\n');
    const status = Number(statusText);
    return {
      response: { status, headers: { get(name) { return name.toLowerCase() === 'location' ? redirect || null : null; } } },
      body: fs.readFileSync(bodyPath, 'utf8'),
    };
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

async function publicSurfaceChecks() {
  const platform = await request('/platform/');
  requirePass(platform.response.status >= 200 && platform.response.status < 300, `/platform/ must be 2xx (got ${platform.response.status})`);

  const legacy = await request('/customer/');
  const legacyLocation = legacy.response.headers.get('location');
  let legacyTarget;
  try { legacyTarget = legacyLocation ? new URL(legacyLocation, origin) : null; } catch { legacyTarget = null; }
  requirePass(legacy.response.status === 308, `/customer/ must be HTTP 308 (got ${legacy.response.status})`);
  requirePass(legacyTarget?.origin === origin && legacyTarget.pathname === '/platform/', '/customer/ must redirect only to the same-origin /platform/');

  const protectedLegacy = await request('/api/customer-platform');
  let protectedTarget;
  try { protectedTarget = protectedLegacy.response.headers.get('location') ? new URL(protectedLegacy.response.headers.get('location')) : null; } catch { protectedTarget = null; }
  requirePass(protectedTarget?.hostname === 'vercel.com' && protectedTarget.pathname === '/sso-api', 'legacy customer API must remain behind the protected Vercel boundary');

  const status = await request('/api/status');
  requirePass(status.response.status === 200, `/api/status must be HTTP 200 (got ${status.response.status})`);
  let statusBody;
  try { statusBody = JSON.parse(status.body); } catch { statusBody = null; }
  requirePass(statusBody && typeof statusBody.available === 'boolean', '/api/status must return the documented JSON contract');
  if (statusBody?.available === true && process.env.AD_ASTRA_PRODUCTION_ACTIVATION_VERIFIED !== 'true') {
    failures.push('/api/status reports live AI available without explicit production activation evidence');
  }
  if (statusBody?.available === false) notes.push('live engine is paused');

  for (const route of ['/.env', '/api/brain']) {
    const blocked = await request(route);
    requirePass(blocked.response.status === 404, `${route} must remain HTTP 404 (got ${blocked.response.status})`);
  }

  const unauthenticated = await request('/api/ask', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin,
      'sec-fetch-site': 'same-origin',
      'x-ad-astra-request': 'public-v1',
    },
    body: JSON.stringify({ question: 'QC unauthenticated request' }),
  });
  requirePass(unauthenticated.response.status === 401, `/api/ask unauthenticated request must be HTTP 401 (got ${unauthenticated.response.status})`);

  const crossOrigin = await request('/api/ask', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://evil.example',
      'sec-fetch-site': 'cross-site',
      'x-ad-astra-request': 'public-v1',
    },
    body: JSON.stringify({ question: 'QC cross-origin request' }),
  });
  requirePass(crossOrigin.response.status === 403, `/api/ask cross-origin request must be HTTP 403 (got ${crossOrigin.response.status})`);
}

function sourceChecks() {
  const gates = read('lib/release-gates.js');
  const ask = read('api/ask.js');
  const requiredFlags = [
    'AD_ASTRA_ENABLE_LIVE_AI',
    'AD_ASTRA_SPEND_BUDGET_VERIFIED',
    'AD_ASTRA_DURABLE_RATE_LIMIT_VERIFIED',
    'AD_ASTRA_RUNTIME_AUTH_REVIEWED',
    'AD_ASTRA_SECURITY_REVIEW_APPROVED',
    'AD_ASTRA_CUSTOMER_ENTITLEMENTS_VERIFIED',
    'AD_ASTRA_STRIPE_BILLING_VERIFIED',
  ];
  for (const flag of requiredFlags) requirePass(gates.includes(flag), `release gate missing ${flag}`);
  const readyAt = ask.indexOf('if (!ready())');
  const entitlementAt = ask.indexOf('if (!hasLiveAiEntitlement');
  const reserveAt = ask.indexOf('quota = await reserve(');
  const providerAt = ask.indexOf("https://api.openai.com/v1/chat/completions");
  requirePass(readyAt >= 0 && readyAt < entitlementAt, 'release readiness must precede entitlement evaluation');
  requirePass(entitlementAt >= 0 && entitlementAt < reserveAt, 'entitlement must precede quota reservation');
  requirePass(reserveAt >= 0 && reserveAt < providerAt, 'quota reservation must precede provider dispatch');
  requirePass(ask.includes("model:'gpt-4.1-mini-2025-04-14'"), 'provider model must remain pinned');
  requirePass(ask.includes('max_tokens:700') && ask.includes('store:false'), 'provider request must retain bounded output and no storage');
  const publicText = fs.readdirSync(path.join(root, 'public'), { withFileTypes: true });
  requirePass(publicText.length > 0, 'public release directory must not be empty');
  const privacy = spawnSync(process.execPath, [path.join(__dirname, 'check-release.cjs')], { encoding: 'utf8' });
  requirePass(privacy.status === 0, `static privacy check failed: ${(privacy.stderr || privacy.stdout || '').trim()}`);
}

function evidenceChecks() {
  const evidence = [
    ['AD_ASTRA_SUPABASE_SECURITY_ADVISORS_GREEN', 'Supabase security advisors green'],
    ['AD_ASTRA_SUPABASE_LIFECYCLE_MIGRATION_APPLIED', 'Supabase lifecycle migration applied'],
    ['AD_ASTRA_STRIPE_WEBHOOK_DELIVERY_VERIFIED', 'Stripe production webhook delivery verified'],
    ['AD_ASTRA_STRIPE_SANDBOX_LIFECYCLE_ACCEPTED', 'Stripe sandbox lifecycle acceptance passed'],
    ['AD_ASTRA_CLERK_ENTITLEMENT_ACCEPTED', 'Clerk entitlement provisioning acceptance passed'],
    ['AD_ASTRA_CUSTOMER_TWO_ACCOUNT_ACCEPTED', 'two-account customer isolation acceptance passed'],
    ['AD_ASTRA_INDEPENDENT_REVIEW_APPROVED', 'independent human review approved'],
    ['AD_ASTRA_CRM_PRODUCTION_VERIFIED', 'CRM/Catalyst production verification passed'],
    ['AD_ASTRA_VERCEL_PREVIEW_REVIEWED', 'exact Vercel preview reviewed'],
  ];
  for (const [name, description] of evidence) {
    if (process.env[name] !== 'true') failures.push(`${description} (${name})`);
  }
}

(async () => {
  try {
    sourceChecks();
    await publicSurfaceChecks();
  } catch (error) {
    failures.push(`QC execution error: ${error.message}`);
  }
  evidenceChecks();
  if (failures.length) {
    console.error('AD_ASTRA_PRODUCTION_QC_BLOCKED');
    for (const failure of failures) console.error(`- ${failure}`);
    for (const note of notes) console.error(`note: ${note}`);
    process.exitCode = 1;
  } else {
    console.log('AD_ASTRA_PRODUCTION_QC_PASS');
    for (const note of notes) console.log(`note: ${note}`);
  }
})();
