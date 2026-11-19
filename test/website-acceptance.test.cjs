'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');

test('public entry does not misrepresent a paused intelligence engine as live', () => {
  assert.match(html, /Live responses are paused/i);
  assert.doesNotMatch(html, /Open the live engine/i);
  assert.match(html, /Explore the preview interface/i);
});

test('public entry keeps canonical, accessibility and anchor destinations', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/adastra\.global\/"/);
  assert.match(html, /<a class="skip" href="#main">Skip to content<\/a>/);
  assert.match(html, /<main\b[^>]*id="main"/);
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const inPage = [...html.matchAll(/\bhref="#([^"]+)"/g)].map(match => match[1]);
  for (const anchor of inPage) assert.ok(ids.has(anchor), 'Missing in-page target: ' + anchor);
  assert.doesNotMatch(html, /href=["']javascript:/i);
});

test('API and private routes remain nonindexed by deployment policy', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.equal(config.git.deploymentEnabled, false);
  assert.ok(config.headers.some(rule =>
    rule.source.includes('(api|lib|scripts|test)') &&
    rule.headers.some(header => header.key === 'X-Robots-Tag' && header.value.includes('noindex'))
  ));
});
