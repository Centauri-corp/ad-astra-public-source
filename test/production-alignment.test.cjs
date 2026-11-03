'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'public', 'film-launch-v2.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'production-alignment.css'), 'utf8');
const notFound = fs.readFileSync(path.join(root, 'public', '404.html'), 'utf8');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

const families = [
  'Core Intelligence',
  'Creative Studio',
  'Specialist Intelligence',
  'Business &amp; Commerce',
  'Developer Platform',
  'Autonomous Workflows'
];

test('homepage enhancement exposes products in desktop, mobile and chapter navigation', () => {
  assert.match(script, /products-nav-link/);
  assert.match(script, /products-mobile-nav/);
  assert.match(script, /#products-overview/);
  assert.match(script, /footer\.querySelector|footer=document\.querySelector/);
  assert.match(script, /href=\"\/products\/\"/);
});

test('homepage product overview contains all six families and exact portfolio total', () => {
  assert.match(script, /25 DIRECTIONS · SIX FAMILIES/);
  for (const family of families) assert.ok(script.includes(family), `missing ${family}`);
  assert.match(script, /01 \/ 07 DIRECTIONS/);
  assert.match(script, /02 \/ 06 DIRECTIONS/);
  assert.match(script, /03 \/ 05 DIRECTIONS/);
  assert.match(script, /04 \/ 05 DIRECTIONS/);
  assert.match(script, /05 \/ 01 DIRECTION/);
  assert.match(script, /06 \/ 01 DIRECTION/);
});

test('homepage product enhancement remains informational and performs no external action', () => {
  assert.match(script, /Public AI inference, paid enrollment, checkout, automatic publication and unbounded autonomous actions remain disabled/);
  assert.doesNotMatch(script, /fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|navigator\.sendBeacon/);
  assert.doesNotMatch(script, /buy now|available now|start subscription/i);
});

test('new production styles cover responsive and reduced-motion behavior', () => {
  assert.match(css, /@media\(max-width:980px\)/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /home-products-grid/);
  assert.match(css, /not-found-shell/);
});

test('branded 404 is crawl-safe and provides bounded recovery routes', () => {
  assert.match(notFound, /name="robots" content="noindex,nofollow"/);
  assert.match(notFound, /Page not found \| AD ASTRA/);
  for (const route of ['/', '/products/', '/brain/', '/trust/', '/access/#early-access-title']) {
    assert.ok(notFound.includes(`href="${route}"`), `missing recovery route ${route}`);
  }
  assert.match(notFound, /customer AI engine remains paused/i);
});

test('Vercel applies explicit noindex response headers to product directions', () => {
  const rule = vercel.headers.find(entry => String(entry.source).includes('products'));
  assert.ok(rule, 'products route missing from Vercel header rules');
  assert.ok(rule.headers.some(header => header.key === 'X-Robots-Tag' && header.value === 'noindex, follow'));
  assert.equal(vercel.git.deploymentEnabled, false);
});
