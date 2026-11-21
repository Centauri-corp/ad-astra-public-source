'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root,'public/products/index.html'),'utf8');
const js = fs.readFileSync(path.join(root,'public/products/app.js'),'utf8');
const css = fs.readFileSync(path.join(root,'public/products/style.css'),'utf8');

test('product stage has exactly four named selection buttons', () => {
  const ids = [...html.matchAll(/<button\b[^>]*data-product-direction="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(ids,['beyond-physics','astra-lumen','neural-visual-experience','governed-workflows']);
});
test('stage supports explicit keyboard interaction and accessible state', () => {
  for(const key of ['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End']) assert.ok(js.includes(key));
  assert.match(js,/aria-pressed/);
  assert.match(js,/aria-label/);
  assert.match(js,/Object\.hasOwn/);
});
test('visual selector has focus, mobile and reduced-motion fallbacks', () => {
  assert.match(css,/\.stage-controls button:focus-visible/);
  assert.match(css,/\.stage-controls button\[aria-pressed="true"\]/);
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
