'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/neural-v5.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/neural-v5.js'), 'utf8');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

test('V5 assets are mounted in public HTML exactly once', () => {
  assert.equal((html.match(/\/neural-v5\.js/g) || []).length, 1);
  assert.equal((html.match(/\/neural-v5\.css/g) || []).length, 1);
  assert.match(html, /<section class="hero"/);
  assert.match(html, /id="hero-title"/);
});
test('existing navigation and customer entry points preserved', () => {
  for (const route of ['/platform/', '/knowledge/', '/markets/', '/pricing/']) assert.ok(html.includes(route), route);
  assert.match(html, /class="skip"/);
  assert.match(html, /aria-label="Main navigation"/);
});
test('V5 JS parses on Node and honors self-hosted CSP', () => {
  new vm.Script(js, {filename:'neural-v5.js'});
  assert.doesNotMatch(js, /eval\s*\(|new Function|fetch\s*\(|https?:\/\//);
  assert.match(vercel.headers[0].headers.find(x => x.key === 'Content-Security-Policy').value, /script-src 'self'/);
});
test('V5 is decorative, responsive and accessible', () => {
  assert.match(js, /setAttribute\('aria-hidden', 'true'\)/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /@media\s*\(max-width:\s*700px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(js, /prefers-reduced-motion/);
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /visibilitychange/);
  assert.match(js, /devicePixelRatio/);
});
test('no automatic Git production deployment permitted', () => {
  assert.equal(vercel.git.deploymentEnabled, false);
  assert.equal(vercel.outputDirectory, 'public');
});
test('no 3D, voice or live intelligence capability falsely exposed by this change', () => {
  assert.doesNotMatch(js, /getUserMedia|SpeechRecognition|AudioContext|WebGLRenderingContext/);
  assert.doesNotMatch(js, /localStorage|sessionStorage|document\.cookie/);
});
