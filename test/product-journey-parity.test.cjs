'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PRODUCT_SCENES } = require('../lib/products-solutions-graphics.cjs');

test('each product direction appears once and matches the source model', () => {
  const page = fs.readFileSync(path.join(__dirname, '../public/products/index.html'), 'utf8');
  const panels = [...page.matchAll(/<details [^>]*data-product-direction="([^"]+)"[^>]*>[\s\S]*?<\/details>/g)];
  assert.deepEqual(panels.map(match => match[1]), Object.keys(PRODUCT_SCENES));
  for (const [html, id] of panels) {
    const scene = PRODUCT_SCENES[id];
    for (const field of ['title', 'description', 'motif', 'role']) assert.ok(html.includes(scene[field]), id + ' ' + field);
    assert.ok(html.includes(scene.provenance === 'synthetic' ? 'Synthetic demonstration' : 'Concept preview'));
  }
  assert.ok(page.indexOf('id="science-preview"') < page.indexOf('data-next-journey'));
});
