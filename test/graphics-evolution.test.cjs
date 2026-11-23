'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('the public scene registry maps to the shared renderer and shipped fallback art', () => {
  const publicRoot = path.join(__dirname, '..', 'public');
  const manifest = JSON.parse(fs.readFileSync(path.join(publicRoot, 'graphics', 'evolution-manifest.json'), 'utf8'));
  const engine = fs.readFileSync(path.join(publicRoot, 'graphics', 'cinematic-journey.js'), 'utf8');
  assert.equal(manifest.version, 1);
  assert.deepEqual(manifest.scenes.map(scene => scene.index), [0, 1, 2]);
  assert.equal(new Set(manifest.scenes.map(scene => scene.id)).size, 3);
  assert.match(engine, /ad-astra:scene-change/);
  for (const scene of manifest.scenes) {
    assert.match(scene.asset, /^\/assets\/[a-z0-9-]+\.(png|jpg|webp)$/);
    assert.ok(fs.existsSync(path.join(publicRoot, scene.asset.slice(1))), scene.asset);
    assert.ok(scene.alt && scene.source && scene.status === 'public-review');
  }
  for (const page of ['index.html', 'products/index.html']) {
    const html = fs.readFileSync(path.join(publicRoot, page), 'utf8');
    assert.match(html, /graphics\/evolution\.js/);
    assert.match(html, /data-cinematic-host/);
  }
});
