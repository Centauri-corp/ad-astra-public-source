'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const projection = JSON.parse(read('public/offer-directions.json'));
// This is an explicit public allowlist, not a copy of the private commercial contract.
assert.deepEqual(Object.keys(projection).sort(), ['checkoutEnabled', 'cta', 'directions', 'message', 'offers', 'paidEnrollmentOpen', 'status']);
assert.equal(projection.status, 'coming_soon');
assert.equal(projection.paidEnrollmentOpen, false);
assert.equal(projection.checkoutEnabled, false);
assert.equal(projection.message, 'Plans are being prepared. Paid enrollment is not open.');
assert.deepEqual(projection.offers, []);
assert.deepEqual(projection.cta, {kind: 'early_access', label: 'Request early access', href: '/access/#early-access-title'});
assert.deepEqual(projection.directions, [
  {name: 'AI Pro', audience: 'individual', availability: 'in_development', price: null, checkout_enabled: false},
  {name: 'Business Agents', audience: 'business', availability: 'in_development', price: null, checkout_enabled: false},
  {name: 'Enterprise Intelligence OS', audience: 'enterprise', availability: 'in_development', price: null, checkout_enabled: false},
]);
const pricing = read('public/pricing/index.html');
for (const direction of projection.directions) {
  assert.ok(pricing.includes(`<h2>${direction.name}</h2>`), `Missing visible direction: ${direction.name}`);
  assert.ok(pricing.includes(`data-product-direction="${direction.audience}"`));
}
assert.equal((pricing.match(/class="plan-status">In development/g) || []).length, 3);
assert.doesNotMatch(pricing, /<h2>(Free|Plus|Pro)<\/h2>|\$\s*\d|buy\.stripe\.com|checkout\.stripe\.com/i);
assert.match(pricing, /Paid enrollment is not open/);
for (const route of ['pricing', 'services', 'contact', 'trust', 'access', 'sign-in', 'platform', 'knowledge']) {
  const html = read(`public/${route}/index.html`);
  assert.ok(html.includes(`href="https://adastra.global/${route}/"`), `Canonical missing: ${route}`);
  assert.ok(html.includes('content="noindex,follow"'), `Indexing gate missing: ${route}`);
  assert.ok(html.includes('href="/access/#early-access-title"'), `Customer entry missing: ${route}`);
}
assert.doesNotMatch(read('public/contact/index.html'), /before public intake is enabled|No contact.*form/);
assert.match(read('public/access/index.html'), /id="early-access-title"/);
assert.match(read('public/sign-in/app.js'), /forceRedirectUrl: returnPath/);
assert.match(read('public/sign-in/app.js'), /withSignUp: false/);
assert.match(read('public/sign-in/app.js'), /transferable: false/);
assert.match(read('public/sign-in/app.js'), /adAstraVerifySession/);
console.log('AD_ASTRA_PUBLIC_COMMERCIAL_PASS directions=3 prices=withheld enrollment=closed entry=early-access');
