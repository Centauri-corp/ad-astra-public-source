'use strict';
// Static output keeps the product overview usable without JavaScript or WebGL.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const catalog = require('../config/public-product-families.json');
const ids = ['core-intelligence', 'creative-studio', 'specialist-intelligence', 'business-commerce', 'developer-platform', 'autonomous-workflows'];
const modes = ['ask', 'research', 'create', 'learn', 'explore'];
assert.equal(catalog.schema, 'ad-astra-public-product-families/v1');
assert.equal(catalog.scope, 'public-family-descriptions-only');
assert.equal(catalog.availability, 'in-development');
assert.deepEqual(catalog.families.map(f => f.id), ids);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cards = catalog.families.map((family, index) => {
  assert.ok(['cyan', 'champagne', 'cobalt'].includes(family.accent));
  assert.ok(family.modes.length && new Set(family.modes).size === family.modes.length);
  for (const mode of family.modes) assert.ok(modes.includes(mode), `Unknown mode: ${mode}`);
  const links = family.modes.map(mode => `<a href="/#tab-${mode}">${escape(mode[0].toUpperCase() + mode.slice(1))}</a>`).join('');
  return `    <article class="family-card accent-${family.accent}" id="${family.id}" aria-labelledby="${family.id}-title">
      <div class="family-art art-${index + 1}" aria-hidden="true"><i></i><i></i><i></i><span></span></div>
      <p class="eyebrow">0${index + 1} / IN DEVELOPMENT</p>
      <h2 id="${family.id}-title">${escape(family.name)}</h2>
      <p class="family-summary">${escape(family.summary)}</p>
      <dl><dt>Designed for</dt><dd>${escape(family.audience)}</dd><dt>Intended outcome</dt><dd>${escape(family.outcome)}</dd></dl>
      <p class="family-motif">${escape(family.motif)}</p>
      <div class="mode-links" aria-label="${escape(family.name)} modes">${links}</div>
    </article>`;
}).join('\n');
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Products | AD ASTRA</title>
  <meta name="description" content="Explore six AD ASTRA product families and how Ask, Research, Create, Learn and Explore connect to your work. Product experiences are in development.">
  <meta name="robots" content="noindex,follow">
  <link rel="canonical" href="https://adastra.global/products/">
  <link rel="stylesheet" href="/markets/style.css">
  <link rel="stylesheet" href="/products/style.css">
</head>
<body>
<a class="skip-products" href="#main">Skip to products</a>
<header><a class="brand product-brand" href="/" aria-label="AD ASTRA home"><img src="/assets/brand/ad-astra-mark.svg" width="40" height="40" alt="">AD ASTRA</a><nav aria-label="Primary"><a href="/products/" aria-current="page">Products</a><a href="/markets/">Solutions</a><a href="/pricing/">Plans</a><a href="/agent/">Astra Polaris</a></nav></header>
<main class="market-shell" id="main">
  <section class="market-hero" aria-labelledby="products-title"><p class="eyebrow">AD ASTRA / PRODUCT DIRECTIONS</p><h1 id="products-title">Find your<br><em>next direction.</em></h1><p class="lead">Six product families. Five ways to think. Start with the work you want to do.</p><p>Ask, Research, Create, Learn and Explore describe ways of working. The families below organize the experiences we are developing around those modes.</p><p class="preview-note">These are product directions in development. They are not available for purchase or activation, and do not establish regional availability.</p><a class="button" href="/platform-preview/">View the workspace design</a></section>
  <nav class="family-jump" aria-label="Product families">${catalog.families.map(f => `<a href="#${f.id}">${escape(f.name)}</a>`).join('')}</nav>
  <section class="family-grid" aria-label="Six product families">
${cards}
  </section>
  <aside class="market-note"><strong>Your judgment stays central</strong><p>Specialist directions do not replace qualified professional advice. Workflow and developer directions do not grant autonomous execution or API access.</p><p><a href="/pricing/">Review plan direction</a> · <a href="/markets/">Explore proposed solutions</a></p></aside>
</main>
<footer><span>AD ASTRA · Human-directed discovery</span><a href="/">Back to AD ASTRA</a></footer>
</body>
</html>
`;
const output = path.join(root, 'public/products/index.html');
if (process.argv.includes('--check')) {
  assert.equal(fs.readFileSync(output, 'utf8'), html, 'Product overview drifted; run npm run products:build');
  console.log('AD_ASTRA_PRODUCTS_PASS families=6 modes=5 availability=in-development');
} else {
  fs.mkdirSync(path.dirname(output), {recursive:true});
  fs.writeFileSync(output, html);
  console.log('Built the static six-family AD ASTRA product overview.');
}
