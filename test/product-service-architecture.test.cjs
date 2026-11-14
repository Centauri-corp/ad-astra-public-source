'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('../config/public-product-families.json');
const { productServiceArchitecture } = require('../scripts/lib/product-service-architecture.cjs');

const root = path.resolve(__dirname, '..');

test('every public product direction has one solution context and existing governed capability mapping', () => {
  const architecture = productServiceArchitecture(catalog);
  const represented = architecture.serviceAreas.flatMap(area => area.familyIds);
  assert.deepEqual(represented.sort(), catalog.families.map(family => family.id).sort());
  assert.equal(new Set(represented).size, catalog.families.length);
  for (const family of architecture.families) {
    assert.ok(family.offers.length, family.id + ' needs a capability direction');
    assert.ok(family.agents.length, family.id + ' needs a customer role');
    assert.ok(family.serviceArea.id, family.id + ' needs a solution context');
  }
});

test('product detail and solutions surfaces render the complete public architecture without a live claim', () => {
  const architecture = productServiceArchitecture(catalog);
  const services = fs.readFileSync(path.join(root, 'public/services/index.html'), 'utf8');
  assert.match(services, /Three work contexts\.\s*<br><span>Six product directions\.<\/span>/);
  assert.match(services, /This is a public design architecture\. It does not activate customer access, AI execution, billing, CRM, outreach, professional services or regional availability\./);
  for (const area of architecture.serviceAreas) {
    assert.ok(services.includes(`id="solutions-${area.id}"`));
    for (const family of area.families) assert.ok(services.includes(`href="/products/${family.id}/"`));
  }
  for (const family of architecture.families) {
    const html = fs.readFileSync(path.join(root, 'public/products', family.id, 'index.html'), 'utf8');
    assert.ok(html.includes(`data-product-architecture="${family.id}"`));
    assert.ok(html.includes(`href="/services/#solutions-${family.serviceArea.id}"`));
    for (const offer of family.offers) assert.ok(html.includes(offer.name));
    for (const agent of family.agents) assert.ok(html.includes(agent.name));
    assert.ok(html.includes('no customer capability is active'));
  }
});
