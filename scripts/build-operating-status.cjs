'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {operatingStatus} = require('../lib/operating-status');
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Static output is a conservative fallback; it does not inherit build secrets
// or call the readiness function. The browser performs a fresh GET at runtime.
const cards = operatingStatus(false).services.map(service => `    <article class="availability-card" data-service="${service.id}" aria-labelledby="${service.id}-title">
      <div class="availability-heading"><h2 id="${service.id}-title">${escape(service.name)}</h2><span class="availability-state" data-state="${service.state}">${escape(service.label)}</span></div>
      <p data-description>${escape(service.description)}</p>${service.href ? `\n      <a href="${escape(service.href)}">Explore ${escape(service.name)} <span aria-hidden="true">→</span></a>` : ''}
    </article>`).join('\n');
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Product availability | AD ASTRA</title>
  <meta name="description" content="See the current AD ASTRA website, engine, product, workspace, CRM and subscription availability.">
  <meta name="robots" content="noindex,follow">
  <link rel="canonical" href="https://adastra.global/status/">
  <link rel="stylesheet" href="/markets/style.css">
  <link rel="stylesheet" href="/products/style.css">
  <link rel="stylesheet" href="/status/style.css">
  <script defer src="/status/status.js"></script>
</head>
<body>
<a class="skip-products" href="#main">Skip to availability</a>
<header><a class="brand product-brand" href="/" aria-label="AD ASTRA home"><img src="/assets/brand/ad-astra-mark.svg" width="40" height="40" alt="">AD ASTRA</a><nav aria-label="Primary"><a href="/products/">Products</a><a href="/markets/">Solutions</a><a href="/pricing/">Plans</a><a href="/status/" aria-current="page">Availability</a></nav></header>
<main class="market-shell" id="main">
  <section class="market-hero" aria-labelledby="availability-title"><p class="eyebrow">AD ASTRA / AVAILABILITY</p><h1 id="availability-title">Know where<br><em>things stand.</em></h1><p class="lead">See what you can explore and which services are still being prepared.</p><p>Availability follows the current release configuration. A preview lets you explore the design; it does not provide customer access.</p></section>
  <div class="availability-update"><p id="availability-update" role="status" aria-live="polite">Showing development availability.</p><button id="availability-refresh" class="button" type="button" hidden>Refresh availability</button></div>
  <noscript><p>JavaScript is disabled. The development statuses below remain available; current engine availability cannot be refreshed.</p></noscript>
  <section class="availability-grid" aria-label="Service availability">
${cards}
  </section>
  <p class="availability-note">These statuses describe product availability. They are not a service uptime measurement.</p>
</main>
<footer><span>AD ASTRA · Human-directed discovery</span><a href="/products/">Explore product directions</a></footer>
</body>
</html>
`;
const file = path.join(__dirname, '../public/status/index.html');
if (process.argv.includes('--check')) {
  assert.equal(fs.readFileSync(file, 'utf8'), html, 'Operating status page drifted; run npm run status:build');
  console.log('AD_ASTRA_OPERATING_STATUS_PASS services=7 fallback=development');
} else {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file, html);
  console.log('Built the AD ASTRA operating status page.');
}
