'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const style = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');

test('hero graphics upgrade preserves truthful, accessible fallback behavior', () => {
  assert.match(index, /id="neural-field" class="neural-field" aria-hidden="true"/);
  assert.match(index, /class="hero-image"[^>]+fetchpriority="high"/);
  assert.match(index, /PROCEDURAL FIELD \/ STATIC FALLBACK READY/);
  assert.match(app, /getContext\('2d', \{alpha:true\}\)/);
  assert.match(app, /prefers-reduced-motion/);
  assert.match(app, /cancelAnimationFrame/);
  assert.match(app, /IntersectionObserver/);
  assert.doesNotMatch(app, /telemetry|inference|model weights/i);
  assert.match(style, /\.neural-field\{/);
});
