const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'products', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'products', 'style.css'), 'utf8');

const products = [
  'Astra Assistant','Astra Research','Astra Write','Astra Translate','Astra Learn','Astra Career','Astra Life',
  'Astra Social','Astra Image Studio','Astra Video Studio','Astra Web Studio','Astra Voice','Astra Documents',
  'Astra Security','Astra Health &amp; Wellness','Astra Science &amp; Space','Astra Finance','Astra Legal &amp; Civic',
  'Astra Business','Astra Marketing','Astra Customer Support','Astra Data Intelligence','Astra Commerce',
  'Astra Developer Platform','Astra Agents'
];

const families = [
  'Core Intelligence','Creative Studio','Specialist Intelligence',
  'Business &amp; Commerce','Developer Platform','Autonomous Workflows'
];

test('public product overview contains the exact 25-product, six-family portfolio', () => {
  assert.equal(products.length, 25);
  assert.equal(families.length, 6);
  for (const product of products) assert.ok(html.includes(`>${product}</li>`), `missing ${product}`);
  for (const family of families) assert.ok(html.includes(`<h2>${family}</h2>`), `missing ${family}`);
  assert.equal((html.match(/class="family-card"/g) || []).length, 6);
});

test('product page is informational, noindex and fail closed for commercial activation', () => {
  assert.match(html, /name="robots" content="noindex,follow"/);
  assert.match(html, /Public AI remains closed/);
  assert.match(html, /No checkout or paid enrollment/);
  assert.match(html, /not a claim of operational capability/i);
  assert.match(html, /Agent or model self-approval/);
  assert.doesNotMatch(html, /buy now|start subscription|available now|live ai responses/i);
  assert.doesNotMatch(html, /<form|payment|checkout\.stripe/i);
});

test('product graphics page includes responsive and reduced-motion treatment', () => {
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(html, /Accessibility/);
  assert.match(html, /reduced-motion/);
  assert.match(html, /9:16 portrait adaptation/);
});
