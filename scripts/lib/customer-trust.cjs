'use strict';
const assert = require('node:assert/strict');
const {head, footer, esc, applySharedShell} = require('./site-shell.cjs');

const TRUST_ROUTES = Object.freeze(['/privacy/', '/terms/', '/security/', '/support/']);
const labels = ['Privacy', 'Terms', 'Security', 'Support'];
const text = value => typeof value === 'string' && value.trim() === value && value.length > 0;
const nullableText = value => value === null || text(value);
const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/;
// Generated pages and their config are disclosures, never external evidence.
function evidence(ref) {
  if (!text(ref)) return false;
  const normalized = ref.replace(/^https?:\/\/[^/]+/, '').replace(/^public\//, '/').split(/[?#]/)[0].replace(/index\.html$/, '');
  return !TRUST_ROUTES.includes(normalized) && !/^\/?config\/customer-trust\.json(?:#|$)/.test(normalized);
}
function validate(config) {
  assert.equal(config.schema, 'ad-astra-customer-trust/v1');
  assert.equal(config.scope, 'source-backed-trust-preview');
  assert.equal(config.routeLedger, 'public/route-release-evidence.json');
  for (const key of ['publicTradingName', 'billingMerchantLegalName', 'website', 'mailingAddress', 'mailingAddressAuthority']) assert.ok(text(config.business[key]), 'Missing business field: ' + key);
  for (const key of ['operatorLegalName', 'operatorRelationship', 'operatorEvidenceRef']) assert.ok(nullableText(config.business[key]), 'Invalid operator field: ' + key);
  for (const key of ['publicPhone', 'phoneEvidenceRef', 'email', 'emailVerificationEvidenceRef', 'routingEvidenceRef', 'availabilityNotice', 'serviceEvidenceRef']) assert.ok(nullableText(config.support[key]), 'Invalid support field: ' + key);
  if (config.support.email !== null) assert.ok(emailPattern.test(config.support.email) && config.support.email.length <= 254, 'Invalid support email');
  if (config.support.publicPhone !== null) assert.match(config.support.publicPhone, /^\+?[\d ()-]{7,30}$/, 'Invalid public phone');
  for (const key of ['version', 'effectiveDate', 'retentionNotice', 'rightsNotice', 'providerProcessingNotice', 'commercialNotice', 'evidenceRef']) assert.ok(nullableText(config.policy[key]), 'Invalid policy field: ' + key);
  if (config.policy.effectiveDate !== null) {
    assert.match(config.policy.effectiveDate, /^\d{4}-\d{2}-\d{2}$/);
    const date = new Date(config.policy.effectiveDate);
    assert.ok(Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === config.policy.effectiveDate, 'Invalid effective date');
  }
  assert.ok(evidence(config.business.providerRecord.evidenceRef), 'Missing provider record provenance');
  assert.equal(config.business.providerRecord.provider, 'Stripe');
  for (const id of ['identity', 'access', 'conversation', 'voice', 'billing', 'accounting', 'availability']) {
    assert.ok(text(config.practices[id]), 'Missing customer disclosure: ' + id);
    const source = config.sources.find(source => source.id === id);
    assert.ok(source?.refs.length && source.refs.every(text), 'Missing disclosure sources: ' + id);
  }
  assert.equal(new Set(config.sources.map(source => source.id)).size, config.sources.length, 'Duplicate source IDs');
  return true;
}
function verifiedOperator(config) {
  const b = config.business;
  return text(b.operatorLegalName) && text(b.operatorRelationship) && evidence(b.operatorEvidenceRef);
}
function verifiedEmail(config) {
  return config.support.emailStatus === 'verified' && emailPattern.test(config.support.email || '') && evidence(config.support.emailVerificationEvidenceRef);
}
function verifiedPolicy(config) {
  const p = config.policy;
  return p.status === 'verified' && ['version', 'effectiveDate', 'retentionNotice', 'rightsNotice', 'providerProcessingNotice', 'commercialNotice'].every(key => text(p[key])) && evidence(p.evidenceRef);
}
function operationalSupport(config) {
  const s = config.support;
  // A configured phone/postal address can serve as the contact. Email is optional.
  const contact = (text(s.publicPhone) && evidence(s.phoneEvidenceRef)) || (text(config.business.mailingAddress) && evidence(config.business.mailingAddressAuthority)) || verifiedEmail(config);
  return s.status === 'operationally-verified' && contact && evidence(s.routingEvidenceRef) && text(s.availabilityNotice) && evidence(s.serviceEvidenceRef);
}
function paidSalesReadiness(config, ledger, {routeExists = () => false} = {}) {
  validate(config);
  const missing = [];
  if (config.business.status !== 'billing-merchant-verified' || !evidence(config.business.providerRecord.evidenceRef)) missing.push('Verified billing merchant business record');
  if (!verifiedPolicy(config)) missing.push('Verified, versioned privacy and commercial policies, including provider processing, retention and customer requests');
  if (!operationalSupport(config)) missing.push('Verified operational contact routing, support availability and service evidence; configured phone/postal details alone are insufficient');
  const required = ['contentAndClaims', 'brandAndRights', 'seoTechnicalQa', 'accessibilityResponsiveQa', 'privacyAndAnalyticsQa', 'independentReview', 'humanReleaseAuthorization'];
  const ledgerValid = ledger?.schema === 'ad-astra-public-route-release-evidence/v1' && Array.isArray(ledger.routes) && Array.isArray(ledger.approvedRoutes) && Array.isArray(ledger.requiredRouteGates) && required.every(gate => ledger.requiredRouteGates.includes(gate));
  if (!ledgerValid) missing.push('Valid existing route release ledger and required gates');
  const routes = TRUST_ROUTES.map(route => {
    const present = routeExists(route) === true;
    const records = ledgerValid ? ledger.routes.filter(record => record.path === route) : [];
    const record = records.length === 1 ? records[0] : null;
    const gates = ledgerValid ? ledger.requiredRouteGates : required;
    const missingGates = gates.filter(gate => record?.gates?.[gate]?.status !== 'accepted' || !evidence(record.gates[gate].evidenceRef));
    const accepted = Boolean(ledgerValid && record?.decision === 'approved' && ledger.approvedRoutes.includes(route) && missingGates.length === 0 && (!record.missingGates || record.missingGates.length === 0));
    if (!present) missing.push('Missing generated route: ' + route);
    if (!accepted) missing.push('Existing release gates unresolved: ' + route);
    return {route, present, accepted, missingGates};
  });
  return {scope: 'customer-trust-prerequisites-only', ready: missing.length === 0, missing, routes,
    boundary: 'Evidence metadata must reflect real operating records. This validator does not authorize billing or replace hosted acceptance, independent review, regional qualification or the existing release controls.'};
}

const paragraph = value => '<p>' + esc(value) + '</p>';
const link = (href, label) => '<a href="' + esc(href) + '">' + esc(label) + '</a>';
function policyNotice(config, key, holding) {
  return paragraph(verifiedPolicy(config) ? config.policy[key] : holding);
}
function businessDisclosure(config) {
  const b = config.business;
  return paragraph('The Stripe-verified billing merchant is ' + b.billingMerchantLegalName + ', with the public trading name ' + b.publicTradingName + '.') +
    paragraph(verifiedOperator(config) ? 'Service operator: ' + b.operatorLegalName + '. ' + b.operatorRelationship : 'This identifies the billing merchant. The service operator and responsibility for personal information remain to be confirmed in the complete policy.');
}
function contacts(config) {
  const b = config.business, s = config.support;
  let html = '<dl class="trust-contacts"><div><dt>Mailing address</dt><dd><address>' + esc(b.mailingAddress) + '</address></dd></div>';
  if (s.publicPhone && evidence(s.phoneEvidenceRef)) html += '<div><dt>Configured public phone</dt><dd>' + link('tel:' + s.publicPhone.replace(/[^+\d]/g, ''), s.publicPhone) + '</dd></div>';
  if (verifiedEmail(config)) html += '<div><dt>Verified email contact</dt><dd>' + link('mailto:' + s.email, s.email) + '</dd></div>';
  html += '</dl>';
  html += paragraph(operationalSupport(config) ? s.availabilityNotice : 'The mailing address and configured public phone are contact details. Monitoring, request handling and response availability have not yet been verified. No response-time commitment is offered.');
  if (!verifiedEmail(config)) html += paragraph('A verified support email has not been published.');
  return html;
}
function sectionsFor(config, route) {
  const fact = id => paragraph(config.practices[id]);
  switch (route) {
    case '/privacy/': return [
      ['scope', 'What this notice covers', paragraph('This preview explains the website and the current account, text conversation, optional voice and billing designs. It describes known practices while the complete privacy notice is being verified. These trust pages contain no tracking, forms or chat input. Visiting them does not send a question to an AI service.') + paragraph('Delivering a website still involves processing connection information by hosting services. This page does not promise that hosting or service providers retain no data.')],
      ['information', 'What information is used', fact('identity') + fact('conversation') + fact('accounting') + paragraph('Use only information you have permission to share. Avoid passwords, payment card details and sensitive personal or confidential material in questions.')],
      ['voice', 'Your voice stays optional', fact('voice') + paragraph('Speech availability and local processing depend on your browser, device and installed speech features. The page does not start the microphone automatically.')],
      ['providers', 'Where providers are involved', paragraph('Clerk supports account sign-in, Stripe supports hosted billing management, and a configured AI provider processes question text when a permitted request is sent. These providers process the information needed for their part of the service.') + policyNotice(config, 'providerProcessingNotice', 'Provider processing and retention depend on the applicable service configuration and provider policies. We do not promise zero provider retention or that all processing takes place on your device. The complete provider disclosures are still being verified.')],
      ['retention', 'History, retention and requests', policyNotice(config, 'retentionNotice', 'A conversation that is not saved as history is different from account, billing, security and usage records. Retention periods, deletion limits and provider handling are still being verified; no fixed retention or deletion deadline is stated here.') + policyNotice(config, 'rightsNotice', 'The process for privacy, access, export and deletion requests is still being confirmed. A monitored request channel and applicable handling details must be published before new paid access opens. The contact details below do not establish an operating privacy request service.') + '<p>Review ' + link('/support/', 'contact details and support availability') + ' before sending a request. Do not include identity documents, passwords or conversation content in an initial inquiry.</p>'],
      ['responsibility', 'Business and contact details', businessDisclosure(config) + contacts(config)]
    ];
    case '/terms/': return [
      ['scope', 'A preview of service conditions', fact('availability') + paragraph('These conditions are provided for review. They do not establish a paid service agreement, confirm a launch region or promise access to a product. The legal operator, final commercial terms and effective policy date remain to be confirmed.')],
      ['use', 'Use with care and permission', paragraph('Use the service only for material you are entitled to share. Keep sign-in details private, use your own authorized account and respect other people’s privacy. Do not use the service to attempt unauthorized access, evade service limits or cause harm.') + fact('access')],
      ['answers', 'Review the answer before acting', paragraph('AI-generated responses can be inaccurate, incomplete or out of date. The current text interface cannot browse the web, retrieve your documents, analyze uploaded images or verify citations. Research and creative profiles help with text planning and briefs.') + paragraph('Review important claims against reliable sources. Medical, legal, financial and other consequential decisions need appropriate qualified advice and human judgment. No result, professional outcome or uninterrupted service is promised.')],
      ['billing', 'Plans, payment and existing accounts', policyNotice(config, 'commercialNotice', 'Plan information is under review. Final prices, renewal, cancellation and refund conditions must be disclosed before a purchase is offered. No refund restriction, governing law or dispute venue is established by this preview.') + fact('billing') + '<p>' + link('/account/billing/', 'Review account billing') + '. Where Stripe-hosted management is available, review the details presented there before confirming a change. Existing billing access is separate from opening new subscriptions.</p>'],
      ['control', 'Sending, voice and stopping', fact('conversation') + fact('voice') + paragraph('Stop ends microphone activity, playback and the local request where possible. If a provider has already accepted a request, stopping may not prevent processing or usage. Stopping a request does not cancel a subscription; use account billing to review available subscription controls.')],
      ['operator', 'Merchant, operator and policy status', businessDisclosure(config) + paragraph('These service conditions remain a preview until operator responsibility and the complete policy are verified. No paid offer follows from this page being available.') + contacts(config)]
    ];
    case '/security/': return [
      ['scope', 'Understand the current boundary', paragraph('This page describes controls in the current service design. It is not a security certification, audit report or guarantee that every hosted flow has been accepted for customer use. Check product availability before relying on a service.') + fact('availability')],
      ['access', 'Account and workspace access', fact('identity') + fact('access') + paragraph('A visible page or selected plan does not grant access. Requests that cannot establish permission or available capacity are denied. Protect your account and review unexpected account or billing activity.')],
      ['data', 'Questions and usage records', fact('conversation') + fact('accounting') + paragraph('The AI provider must process the question to produce an answer. Private usage records without question text do not imply that providers retain no data. See the privacy notice for the current disclosure and unresolved retention details.')],
      ['voice-billing', 'Voice and hosted billing', fact('voice') + fact('billing') + paragraph('Use account billing to reach the hosted management flow. Never put card details or account credentials into a question or a security report.')],
      ['report', 'If you notice a security concern', paragraph('Do not attempt to access another person’s account or data. Avoid sharing credentials, private records or a full conversation when describing a concern. A useful initial report identifies the affected page, approximate time and a short description of what happened.') + paragraph('A monitored security reporting channel and response arrangements have not yet been verified. The phone and postal details below are configured contacts, not an incident response promise. This page does not offer a bug bounty or a guaranteed response time.') + contacts(config)],
      ['next', 'Related information', '<p>Read ' + link('/privacy/', 'Privacy') + ' for information handling, ' + link('/support/', 'Support') + ' for current contact availability, and ' + link('/status/', 'Service status') + ' for product availability. Service status is not an uptime or security assurance.</p>']
    ];
    case '/support/': return [
      ['available', 'What you can do today', paragraph('Explore the website, product directions and workspace design preview. Customer AI access and new paid subscriptions remain subject to release checks. This page provides guidance and configured contact details; a staffed support service is not yet confirmed.') + '<p>' + link('/status/', 'Check product availability') + ' before trying a customer feature. That page describes service availability, not an uptime measurement or a support response guarantee.</p>'],
      ['account', 'Account and billing help', fact('billing') + '<p>Start with ' + link('/account/billing/', 'account billing') + ' for existing subscription details and available management options. Use ' + link('/sign-in/', 'sign-in') + ' if your session has ended. If access cannot be verified, the service may remain unavailable; this page does not bypass account checks.</p>' + paragraph('Review a change and its effect in the hosted billing flow before confirming it. Do not share passwords, payment card numbers, verification codes or identity documents in a support inquiry.')],
      ['conversation', 'Questions and voice', paragraph('If a question cannot be sent, check your sign-in, subscription access and current availability. A failed or stopped request does not create an answer. Avoid repeatedly sending the same question when its outcome is uncertain.') + fact('voice') + paragraph('Use the Stop control to end microphone activity, playback and the local request. You can continue with text when local voice is unsupported.')],
      ['contact', 'Contact details and availability', businessDisclosure(config) + contacts(config) + paragraph('These details are not confirmation of staffed phone support, an in-person support desk, emergency assistance or a service-level commitment. Support ownership and operational routing must be verified before paid sales.')],
      ['requests', 'Privacy or security requests', '<p>Read ' + link('/privacy/', 'Privacy') + ' for the current data disclosure and ' + link('/security/', 'Security') + ' for guidance on reporting a concern. Request handling and a monitored channel are still being verified.</p>' + paragraph('For an initial inquiry, describe the issue briefly and give the affected page and approximate time. Keep sensitive information out of the message. Do not send private account records or a complete prompt history.')]
    ];
    default: throw new Error('Unknown trust route: ' + route);
  }
}

const pageDetails = {
  '/privacy/': ['Privacy', 'Your information.\nA clearer view.', 'Understand current account, text, voice, provider processing and retention boundaries in the Ad Astra privacy preview.'],
  '/terms/': ['Terms', 'Know the conditions.\nChoose with care.', 'Review Ad Astra service conditions, AI limitations, billing management and the commercial details still being verified.'],
  '/security/': ['Security', 'Understand the safeguards.\nKnow their limits.', 'Review current Ad Astra account, access and information safeguards, their limits and security contact availability.'],
  '/support/': ['Support', 'Find your next step.\nKnow where to turn.', 'Find Ad Astra account billing guidance, product availability and configured contact details with clear support limits.']
};
const css = `/* Generated by scripts/build-customer-trust.cjs. Shared brand, text-first trust pages. */
body.customer-trust{background:var(--cx-background);color:var(--cx-text);line-height:1.75}
.trust-page{max-width:1440px;margin:0 auto;padding:0 clamp(24px,6vw,100px) 90px}
.trust-nav{display:flex;flex-wrap:wrap;gap:8px 32px;padding:24px 0;border-bottom:1px solid var(--hairline)}
.trust-nav a{display:inline-flex;align-items:center;min-height:44px;color:var(--subtle);text-decoration:none;font-size:13px}
.trust-nav a[aria-current=page]{color:var(--text);text-decoration:underline;text-underline-offset:8px}
.trust-hero{padding:clamp(48px,7vw,100px) 0 48px;max-width:1050px}
.trust-page .trust-hero h1{font-size:clamp(42px,5.8vw,84px);line-height:1.08;letter-spacing:-.055em;text-wrap:balance}
.trust-hero h1 span{display:block;color:var(--subtle)}
.trust-page .trust-hero .body-copy{margin-top:28px;max-width:620px;font-size:17px}
.trust-holding{border-top:1px solid var(--hairline);border-bottom:1px solid var(--hairline);padding:22px 0;display:grid;grid-template-columns:200px 1fr;gap:16px 40px}
.trust-holding strong{color:var(--champagne);font-weight:400;font-size:13px}.trust-holding p{color:var(--subtle);font-size:14px;max-width:760px}
.trust-layout{display:grid;grid-template-columns:200px minmax(0,1fr);gap:40px;padding-top:48px}
.trust-contents{font-size:13px}.trust-page .trust-contents p{color:var(--champagne);margin-bottom:12px}.trust-contents ol{list-style:none;margin:0;padding:0}.trust-contents a{display:flex;align-items:center;min-height:44px;color:var(--subtle);text-decoration:none;line-height:1.5;padding:8px 0}
.trust-contents a:hover,.trust-nav a:hover{color:var(--text)}
.trust-sections{min-width:0;max-width:780px}.trust-section{padding:0 0 40px;scroll-margin-top:32px}.trust-section+.trust-section{border-top:1px solid var(--hairline);padding-top:36px}
.trust-page .trust-section h2{font-size:clamp(25px,2.5vw,34px);line-height:1.25;letter-spacing:-.035em;margin-bottom:20px;color:var(--text)}
.trust-page .trust-section p{font-size:16px;line-height:1.85;color:var(--subtle);margin:16px 0 0;overflow-wrap:anywhere}.trust-section a{color:var(--text);text-underline-offset:4px}.trust-section a:hover{color:var(--ice)}
.trust-contacts{margin:24px 0 0;border-left:1px solid var(--champagne);padding-left:22px}.trust-contacts div+div{margin-top:16px}.trust-contacts dt{color:var(--champagne);font-size:12px}.trust-contacts dd{margin:5px 0 0;font-size:16px;overflow-wrap:anywhere}.trust-contacts address{font-style:normal;max-width:390px}
.trust-page a:focus-visible{outline:2px solid var(--ice);outline-offset:5px}
@media(max-width:760px){.trust-page{padding-bottom:48px}.trust-nav{gap:4px 26px;padding:16px 0}.trust-hero{padding-top:48px}.trust-page .trust-hero .body-copy{font-size:16px}.trust-layout,.trust-holding{grid-template-columns:minmax(0,1fr);gap:20px}.trust-layout{padding-top:32px}.trust-contents{border-bottom:1px solid var(--hairline);padding-bottom:24px}.trust-contents a{min-height:44px}.trust-page .trust-section p{font-size:16px}.trust-sections{max-width:100%}}
@media(prefers-reduced-motion:reduce){html:has(.customer-trust){scroll-behavior:auto}}
`;
function trustFiles(config) {
  validate(config);
  const files = new Map([['public/trust/style.css', css]]);
  for (const route of TRUST_ROUTES) {
    const [title, heading, description] = pageDetails[route];
    const [first, second] = heading.split('\n');
    const sections = sectionsFor(config, route);
    const navigation = TRUST_ROUTES.map((href, i) => '<a href="' + href + '"' + (href === route ? ' aria-current="page"' : '') + '>' + labels[i] + '</a>').join('');
    const contents = sections.map(([id, name]) => '<li>' + link('#' + id, name) + '</li>').join('');
    const body = sections.map(([id, name, content]) => '<section class="trust-section" id="' + id + '" aria-labelledby="' + id + '-title"><h2 id="' + id + '-title">' + esc(name) + '</h2>' + content + '</section>').join('\n');
    const version = verifiedPolicy(config) ? 'Policy version ' + config.policy.version + ' · Effective ' + config.policy.effectiveDate : 'Policy preview · Details under review';
    const html = head(route, title, description).replace('class="experience-site"', 'class="experience-site customer-trust"') +
      '<main id="main" class="trust-page"><nav class="trust-nav" aria-label="Customer trust">' + navigation + '</nav>' +
      '<section class="trust-hero" aria-labelledby="trust-title"><p class="eyebrow">AD ASTRA / ' + esc(title) + '</p><h1 id="trust-title">' + esc(first) + '<span>' + esc(second) + '</span></h1><p class="body-copy">' + esc(description) + '</p></section>' +
      '<aside class="trust-holding" aria-label="Policy status"><strong>' + esc(version) + '</strong><p>These disclosures are available for review. They do not open new paid subscriptions or establish an operating support service. Check availability before relying on a customer feature.</p></aside>' +
      '<div class="trust-layout"><nav class="trust-contents" aria-label="On this page"><p>On this page</p><ol>' + contents + '</ol></nav><div class="trust-sections">' + body + '</div></div></main>' + footer() + '</body></html>\n';
    files.set('public' + route + 'index.html', applySharedShell(html.replace('</head>', '<link rel="stylesheet" href="/trust/style.css"></head>'), route));
  }
  return files;
}
module.exports = {TRUST_ROUTES, validate, trustFiles, paidSalesReadiness, verifiedEmail};
