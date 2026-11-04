'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '../public', file), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));

function signInFixture({clerk, verify = async () => {}, query = ''} = {}) {
  const status = {textContent: ''};
  const mount = {attributes: {}, setAttribute(key, value) {this.attributes[key] = value;}};
  const retry = {hidden: true, addEventListener(name, callback) {this[name] = callback;}};
  const timers = new Map();
  const redirects = [];
  let nextTimer = 0;
  const context = {
    URL, URLSearchParams,
    location: {origin: 'https://adastra.global', search: query, replace: value => redirects.push(value)},
    document: {getElementById: id => ({'sign-in-status': status, 'sign-in': mount, 'sign-in-retry': retry}[id])},
    window: {Clerk: clerk, setTimeout(callback) {timers.set(++nextTimer, callback); return nextTimer;}, clearTimeout(id) {timers.delete(id);}},
  };
  vm.runInNewContext(read('auth-navigation.js'), context);
  context.window.adAstraVerifySession = verify;
  vm.runInNewContext(read('sign-in/app.js'), context);
  return {context, status, mount, retry, timers, redirects};
}

test('public product projection contains no private planning or saleable prices', () => {
  const projection = JSON.parse(read('offer-directions.json'));
  assert.deepEqual(Object.keys(projection).sort(), ['checkoutEnabled', 'cta', 'directions', 'message', 'offers', 'paidEnrollmentOpen', 'status']);
  assert.equal(projection.paidEnrollmentOpen, false);
  assert.equal(projection.checkoutEnabled, false);
  assert.deepEqual(projection.offers, []);
  assert.deepEqual(projection.directions.map(item => item.name), ['AI Pro', 'Business Agents', 'Enterprise Intelligence OS']);
  for (const item of projection.directions) {
    assert.deepEqual(Object.keys(item).sort(), ['audience', 'availability', 'checkout_enabled', 'name', 'price']);
    assert.equal(item.price, null); assert.equal(item.checkout_enabled, false); assert.equal(item.availability, 'in_development');
  }
  assert.doesNotMatch(JSON.stringify(projection), /revenue|budget|monthly_price|monthly_limit|target|supabase|sanity|zoho|stripe|\$\s*\d/i);
});

test('customer entry links resolve to the actual consent form and existing preview route', () => {
  assert.match(read('access/index.html'), /id="early-access-title"/);
  for (const route of ['pricing', 'contact', 'services', 'trust', 'sign-in', 'platform', 'knowledge']) {
    const html = read(`${route}/index.html`);
    assert.match(html, /href="\/access\/#early-access-title"/, route);
    assert.match(html, /noindex,follow/, route);
  }
  assert.match(read('platform/index.html'), /id="platform-sign-out" hidden/);
  assert.match(read('sign-in/index.html'), /id="sign-in-retry"[^>]*hidden/);
});

test('sign-in limits the UI to existing accounts and a sanitized same-origin return', async () => {
  let options;
  const fixture = signInFixture({query: '?return=https%3A%2F%2Fevil.example%2F', clerk: {session: null, load: async () => {}, mountSignIn(node, value) {options = value;}}});
  await tick();
  assert.equal(options.forceRedirectUrl, '/platform/');
  assert.equal(options.fallbackRedirectUrl, '/platform/');
  assert.equal(options.withSignUp, false); assert.equal(options.transferable, false);
  assert.equal(options.signUpUrl, '/access/#early-access-title');
  assert.equal(options.waitlistUrl, '/access/#early-access-title');
  assert.deepEqual(fixture.redirects, []); assert.equal(fixture.retry.hidden, true);
  assert.match(fixture.status.textContent, /existing authorized preview account/);
  assert.equal(fixture.mount.attributes['aria-busy'], 'false');
});

test('an existing browser session must pass server verification before redirect', async () => {
  let verified = 0;
  const fixture = signInFixture({query: '?return=%2Fknowledge%2F%3Fmode%3Dresearch%23ask-ad-astra', clerk: {session: {}, load: async () => {}}, verify: async () => {verified++;}});
  await tick();
  assert.equal(verified, 1); assert.deepEqual(fixture.redirects, ['/knowledge/?mode=research#ask-ad-astra']);
  const rejected = signInFixture({clerk: {session: {}, load: async () => {}}, verify: async () => {throw new Error('private-provider-detail');}});
  await tick();
  assert.deepEqual(rejected.redirects, []); assert.equal(rejected.retry.hidden, false);
  assert.match(rejected.status.textContent, /could not be verified/);
  assert.doesNotMatch(rejected.status.textContent, /private-provider-detail/);
});

test('missing or hanging sign-in providers leave a recoverable status and early-access fallback', async () => {
  const missing = signInFixture();
  await tick();
  assert.equal(missing.retry.hidden, false); assert.deepEqual(missing.redirects, []);
  let mounted = false;
  missing.context.window.Clerk = {load: async () => {}, session: null, mountSignIn() {mounted = true;}};
  await missing.retry.click();
  assert.equal(mounted, true); assert.equal(missing.retry.hidden, true);
  const hanging = signInFixture({clerk: {load: () => new Promise(() => {})}});
  await tick();
  assert.equal(hanging.mount.attributes['aria-busy'], 'true');
  for (const callback of hanging.timers.values()) callback();
  await tick();
  assert.equal(hanging.retry.hidden, false); assert.equal(hanging.mount.attributes['aria-busy'], 'false');
  assert.match(hanging.status.textContent, /request early access/); assert.deepEqual(hanging.redirects, []);
});
