'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {TRUST_ROUTES, validate, trustFiles, paidSalesReadiness} = require('../scripts/lib/customer-trust.cjs');
const {applySharedShell, footer} = require('../scripts/lib/site-shell.cjs');
const {pageGroupFor, visiblePrimary} = require('../scripts/lib/website-project.cjs');
const config = require('../config/customer-trust.json');
const ledger = require('../public/route-release-evidence.json');
const root = path.join(__dirname, '..');
const clone = value => structuredClone(value);

test('trust generation is deterministic, current and idempotent through the shared shell', () => {
  const files = trustFiles(config);
  assert.deepEqual(files, trustFiles(clone(config)));
  assert.equal(files.size, 5);
  for (const [file, body] of files) {
    assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), body, file);
    if (!file.endsWith('.html')) continue;
    const route = file.replace(/^public/, '').replace(/index\.html$/, '');
    assert.equal(applySharedShell(body, route), body, 'Shell idempotency: ' + route);
    assert.equal(pageGroupFor(route).id, 'customer-trust');
    assert.equal(pageGroupFor(route).textOnly, true);
    assert.equal(visiblePrimary(body, route), null);
  }
});
test('all four routes retain every existing release gate and no release capability changes', () => {
  for (const route of TRUST_ROUTES) {
    const records = ledger.routes.filter(record => record.path === route);
    assert.equal(records.length, 1);
    assert.equal(records[0].decision, 'pending');
    assert.deepEqual(records[0].missingGates, ledger.requiredRouteGates);
    assert.ok(!ledger.approvedRoutes.includes(route));
    assert.ok(footer().includes('href="' + route + '"'));
  }
  assert.equal(ledger.customerProductLaunchEnabled, false);
  assert.equal(ledger.capabilityBoundary.billing, false);
  assert.equal(require('../public/release-manifest.json').publicLaunchEnabled, false);
});
test('customer HTML is static, semantic, local and honest about preview status', () => {
  for (const [file, html] of trustFiles(config)) {
    if (!file.endsWith('.html')) continue;
    const route = file.replace(/^public/, '').replace(/index\.html$/, '');
    assert.equal((html.match(/<main\b/g) || []).length, 1);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok((html.match(/<h2\b/g) || []).length >= 5);
    assert.ok(html.includes('lang="en"'));
    assert.ok(html.includes('name="robots" content="noindex,follow"'));
    assert.ok(html.includes('href="https://adastra.global' + route + '"'));
    assert.ok(html.includes('Policy preview'));
    assert.ok(!/<form\b|<input\b|<textarea\b|<iframe\b|<audio\b|<video\b|\son[a-z]+\s*=/i.test(html));
    assert.deepEqual([...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(match => match[1]), ['/design-system.js','/companion/app.js']);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length);
    for (const match of html.matchAll(/(?:href="#|aria-labelledby=")([^" ]+)"/g)) assert.ok(ids.includes(match[1]), 'Missing target ' + match[1]);
    for (const match of html.matchAll(/(?:href|src)="(\/[^"#]*)(?:#[^"]*)?"/g)) {
      const target = path.join(root, 'public', match[1]);
      assert.ok(fs.existsSync(target), 'Missing local link/asset: ' + match[1]);
    }
    assert.ok(!/ENTER_EMAIL|mailto:|acct_1|operatorEvidenceRef|routingEvidenceRef|evidenceRef|TinyFish|KYC|JWT|Supabase|gateway|\bAGI\b|\bASI\b|legally approved|zero retention|nonrefundable|non-refundable/i.test(html));
  }
});
test('curated merchant and owner-approved address do not establish operator or staffed support', () => {
  assert.equal(config.business.billingMerchantLegalName, 'Ea solar llc');
  assert.equal(config.business.publicTradingName, 'AD ASTRA');
  assert.equal(config.business.providerRecord.accountId, 'acct_1UUszKDxqADfYHCv');
  assert.equal(config.business.operatorLegalName, null);
  assert.equal(config.business.operatorRelationship, null);
  assert.equal(config.business.operatorEvidenceRef, null);
  assert.equal(config.support.email, null);
  assert.equal(config.support.routingEvidenceRef, null);
  assert.equal(config.support.serviceEvidenceRef, null);
  for (const route of ['/privacy/', '/terms/', '/support/']) {
    const html = trustFiles(config).get('public' + route + 'index.html');
    assert.ok(html.includes('Ea solar llc'));
    assert.ok(html.includes('5170 Golden Foothill Parkway, El Dorado Hills, CA 95762, US'));
    assert.ok(html.includes('href="tel:+14159729905"'));
    assert.ok(html.includes('Monitoring, request handling and response availability have not yet been verified'));
  }
});
test('published disclosures have source references and do not turn conversation ephemerality into provider deletion', () => {
  for (const source of config.sources) for (const ref of source.refs) {
    if (!ref.startsWith('owner-session:') && !path.isAbsolute(ref)) assert.ok(fs.existsSync(path.join(root, ref)), ref);
  }
  const html = trustFiles(config).get('public/privacy/index.html');
  for (const disclosure of ['Text is transmitted when you choose Send', 'sends no audio to Ad Astra', 'hashes rather than the text', 'do not promise zero provider retention', 'no fixed retention or deletion deadline']) assert.ok(html.includes(disclosure), disclosure);
  const terms = trustFiles(config).get('public/terms/index.html');
  assert.ok(terms.includes('href="/account/billing/"'));
  assert.ok(terms.includes('Stopping a request does not cancel a subscription'));
});
test('unverified email never appears and verified contact copy is safely escaped', () => {
  const altered = clone(config);
  altered.support.email = 'verified-contact@example.test';
  for (const html of trustFiles(altered).values()) assert.ok(!html.includes(altered.support.email));
  altered.support.emailStatus = 'verified';
  for (const html of trustFiles(altered).values()) assert.ok(!html.includes(altered.support.email));
  altered.support.emailVerificationEvidenceRef = 'protected-contact-delivery-record';
  altered.business.operatorLegalName = '<script>bad()</script>';
  altered.business.operatorRelationship = 'Operator & merchant relationship';
  altered.business.operatorEvidenceRef = 'protected-operator-record';
  altered.business.status = 'verified';
  const html = trustFiles(altered).get('public/support/index.html');
  assert.ok(html.includes('href="mailto:verified-contact@example.test"'));
  assert.ok(html.includes('&lt;script&gt;bad()&lt;/script&gt;'));
  assert.ok(!html.includes('<script>bad()'));
  altered.support.email = 'a@example.test?subject=unsafe';
  assert.throws(() => validate(altered), /Invalid support email/);
});

function verifiedFixture() {
  // Synthetic metadata only. These tests do not create real operating evidence.
  const c = clone(config), l = clone(ledger);
  Object.assign(c.business, {status: 'billing-merchant-verified'});
  Object.assign(c.support, {status: 'operationally-verified', routingEvidenceRef: 'protected/contact-routing-record', availabilityNotice: 'Synthetic service scope', serviceEvidenceRef: 'protected/support-service-record'});
  Object.assign(c.policy, {status: 'verified', version: 'synthetic-v1', effectiveDate: '2026-11-13', retentionNotice: 'Synthetic retention notice', rightsNotice: 'Synthetic request procedure', providerProcessingNotice: 'Synthetic provider notice', commercialNotice: 'Synthetic commercial terms', evidenceRef: 'protected/policy-record'});
  for (const route of TRUST_ROUTES) {
    const record = l.routes.find(record => record.path === route);
    Object.assign(record, {decision: 'approved', missingGates: [], gates: Object.fromEntries(l.requiredRouteGates.map(gate => [gate, {status: 'accepted', evidenceRef: 'protected/' + gate}]))});
    l.approvedRoutes.push(route);
  }
  return {c, l};
}
test('source route presence and configured contact alone leave paid-sales prerequisites held', () => {
  const result = paidSalesReadiness(config, ledger, {routeExists: () => true});
  assert.equal(result.ready, false);
  assert.equal(result.scope, 'customer-trust-prerequisites-only');
  assert.ok(result.routes.every(route => route.present && !route.accepted));
  for (const detail of ['policies', 'operational contact']) assert.ok(result.missing.some(item => item.includes(detail)), detail);
  assert.ok(!result.missing.some(item => item.includes('billing merchant')), 'Authenticated merchant record is sufficient for the business prerequisite');
  assert.equal(paidSalesReadiness(config, ledger).routes[0].present, false, 'Presence must be supplied explicitly');
});
test('verified business, policy and operational routing are independent of existing route acceptance', () => {
  const {c, l} = verifiedFixture();
  const check = () => paidSalesReadiness(c, l, {routeExists: () => true});
  assert.equal(check().ready, true, 'Metadata conformance only, not release authorization');
  for (const [obj, key, empty] of [[c.business, 'status', 'unverified'], [c.support, 'routingEvidenceRef', null], [c.support, 'serviceEvidenceRef', null], [c.support, 'availabilityNotice', null], [c.policy, 'retentionNotice', null], [c.policy, 'providerProcessingNotice', null], [c.policy, 'rightsNotice', null], [c.policy, 'commercialNotice', null], [c.policy, 'version', null], [c.policy, 'effectiveDate', null], [c.policy, 'evidenceRef', null]]) {
    const saved = obj[key]; obj[key] = empty;
    assert.equal(check().ready, false, key);
    obj[key] = saved;
  }
  assert.equal(c.support.email, null, 'Verified phone/postal routing does not require inventing an email');
  assert.equal(c.business.operatorLegalName, null, 'Merchant disclosure does not add a separate operator approval gate');
  assert.equal(paidSalesReadiness(c, ledger, {routeExists: () => true}).ready, false);
  assert.equal(paidSalesReadiness(config, l, {routeExists: () => true}).ready, false);
  assert.equal(paidSalesReadiness(c, l).ready, false, 'Accepted metadata cannot create absent pages');
});
test('missing, duplicated, downgraded and self-referencing route evidence fails closed', () => {
  for (const mutate of [
    l => l.routes.pop(),
    l => l.routes.push(clone(l.routes.find(record => record.path === '/privacy/'))),
    l => l.approvedRoutes.pop(),
    l => l.requiredRouteGates = ['contentAndClaims'],
    l => l.schema = 'unknown',
    l => l.routes.find(record => record.path === '/privacy/').decision = 'pending',
    l => l.routes.find(record => record.path === '/privacy/').gates.independentReview.status = 'missing',
    l => l.routes.find(record => record.path === '/privacy/').gates.contentAndClaims.evidenceRef = '/privacy/',
    l => l.routes.find(record => record.path === '/privacy/').gates.contentAndClaims.evidenceRef = 'https://adastra.global/privacy/?preview=1',
    l => l.routes.find(record => record.path === '/privacy/').gates.contentAndClaims.evidenceRef = 'public/privacy/index.html',
    l => l.routes.find(record => record.path === '/privacy/').gates.contentAndClaims.evidenceRef = null
  ]) {
    const {c, l} = verifiedFixture(); mutate(l);
    assert.equal(paidSalesReadiness(c, l, {routeExists: () => true}).ready, false);
  }
});
test('invalid and incomplete protected configuration cannot generate a reassuring notice', () => {
  for (const mutate of [c => c.policy.retentionNotice = undefined, c => c.policy.effectiveDate = '2026-02-30', c => c.sources = [], c => c.practices.voice = '', c => c.routeLedger = 'new-approval-framework.json']) {
    const altered = clone(config); mutate(altered);
    assert.throws(() => trustFiles(altered));
  }
});
