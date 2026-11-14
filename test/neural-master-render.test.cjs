'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { PRESETS, BOUNDS, validatePreset, parseArgs, createRenderServer } = require('../scripts/render-neural-master.cjs');
const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'public/assets/neural-master');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = async () => JSON.parse(await fs.readFile(path.join(ASSETS, 'manifest.json'), 'utf8'));

test('render interface rejects unsafe/unbounded requests before launching Chromium', () => {
  assert.deepEqual(parseArgs(['--all']).presets, ['landscape', 'panoramic', 'portrait', 'retina']);
  for (const args of [['--preset', '4k-upscale'], ['--variant', '../escape'], ['--variant', '/tmp'], ['--width', '100000'], ['--preset'], ['--all', '--fetch', 'https://example.com']]) assert.throws(() => parseArgs(args));
  for (const value of [null, {}, { ...PRESETS.landscape, dpr: 2 }, { ...PRESETS.landscape, width: NaN }, { ...PRESETS.landscape, width: 3841 }, { ...PRESETS.landscape, composition: 'unknown' }]) assert.throws(() => validatePreset(value));
  for (const value of Object.values(PRESETS)) assert.equal(validatePreset(value), value);
  assert.equal(BOUNDS.maxPixels, 3840 * 2160);
});

test('local render server serves only scene/import graph and never project data', async () => {
  const runtime = await createRenderServer();
  try {
    const html = await fetch(runtime.origin);
    assert.equal(html.status, 200);
    assert.match(html.headers.get('content-security-policy'), /connect-src 'none'/);
    assert.match(await html.text(), /"three":"\/vendor\/build\/three.module.js"/);
    const script = await fetch(runtime.origin + '/scene.mjs');
    assert.equal(script.status, 200);
    const bytes = Buffer.from(await script.arrayBuffer());
    assert.equal(hash(bytes), hash(await fs.readFile(path.join(ROOT, 'scripts/lib/neural-master-scene.mjs'))));
    for (const url of ['/package.json', '/.git/config', '/public/assets/experience/neural-core-1600.webp', '/vendor/build/three.module.js?external=1', '/vendor/%2e%2e/package.json']) assert.notEqual((await fetch(runtime.origin + url)).status, 200, url);
    assert.equal((await fetch(runtime.origin, { method: 'POST' })).status, 403);
    // The request counter imposes a hard ceiling, including across pages.
    while (runtime.requests.length < BOUNDS.maxRequests) await fetch(runtime.origin);
    assert.equal((await fetch(runtime.origin)).status, 429);
  } finally { await new Promise(resolve => runtime.server.close(resolve)); }
});

test('published master records CGI disclosure, source hashes, recipe, physical lighting, and no external requests', async () => {
  const m = await manifest();
  assert.equal(m.schema, 'ad-astra.neural-master.provenance.v1');
  assert.equal(m.classification, 'Original procedural CGI');
  assert.equal(m.approval.humanApproved, false);
  assert.equal(m.approval.integration, 'not-integrated');
  assert.deepEqual(m.network.externalRequests, []);
  assert.deepEqual(m.network.rejectedLocalRequests, []);
  assert.equal(m.runtime.three, '0.187.0');
  assert.ok(m.sources.some(s => s.path === 'scripts/render-neural-master.cjs'));
  assert.ok(m.sources.some(s => s.path === 'scripts/lib/neural-master-scene.mjs'));
  for (const source of m.sources) {
    assert.ok(!source.path.startsWith('/') && !source.path.split('/').includes('..'));
    // Package scripts changed during integration; preserve its exact captured
    // bytes without rewriting historical render evidence or rerendering pixels.
    const sourcePath=source.path==='package.json'?'projects/website-customer-experience/render-inputs/package.json':source.path;
    const bytes = await fs.readFile(path.join(ROOT, sourcePath));
    assert.equal(bytes.length, source.bytes, source.path);
    assert.equal(hash(bytes), source.sha256, source.path);
    if(source.path==='package.json'){
      const captured=JSON.parse(bytes),current=JSON.parse(await fs.readFile(path.join(ROOT,'package.json'),'utf8'));
      assert.deepEqual(current.dependencies,captured.dependencies);
      assert.deepEqual(current.devDependencies,captured.devDependencies);
    }
  }
  for (const a of m.artifacts) {
    const recipe = a.proof.recipe;
    assert.deepEqual(recipe.rasterInputs, []);
    assert.match(recipe.disclosure, /Not AI inference, human brain telemetry/);
    assert.equal(recipe.seed, 401913);
    assert.equal(recipe.materials.cortex.ior, 1.46);
    assert.ok(recipe.lighting.lights.length >= 4);
    assert.equal(a.proof.camera.projectionMatrix.length, 16);
    assert.equal(recipe.rendering.animationFrames, 0);
    assert.ok(a.proof.stats.sceneTriangles <= recipe.limits.maxTriangles);
    assert.ok(a.proof.stats.calls <= recipe.limits.maxDrawCalls);
    assert.ok(a.proof.stats.memory.textures <= recipe.limits.maxTextures);
    assert.ok(a.proof.renderMs < BOUNDS.timeoutMs);
    assert.equal(a.proof.glError, 0);
  }
});

test('native PNG, same-size WebP, DPR targets and one-to-one detail crops agree with recorded pixel proof', async () => {
  const m = await manifest();
  assert.deepEqual(m.artifacts.map(a => a.preset), ['landscape', 'panoramic', 'portrait', 'retina']);
  for (const a of m.artifacts) {
    const expected = PRESETS[a.preset], d = a.proof.dimensions;
    const width = expected.width * expected.dpr, height = expected.height * expected.dpr;
    for (const actual of [a.dimensions.width, d.canvasWidth, d.drawingBufferWidth, d.composerWidth, a.pixelProof.decodedWidth]) assert.equal(actual, width, a.preset);
    for (const actual of [a.dimensions.height, d.canvasHeight, d.drawingBufferHeight, d.composerHeight, a.pixelProof.decodedHeight]) assert.equal(actual, height, a.preset);
    assert.equal(d.requestedDPR, expected.dpr);
    assert.equal(d.browserDPR, expected.dpr);
    assert.equal(d.transmissionScale, 1);
    const records = new Map();
    for (const file of a.files) {
      const bytes = await fs.readFile(path.join(ROOT, file.path));
      assert.equal(bytes.length, file.bytes);
      assert.equal(hash(bytes), file.sha256);
      const meta = await sharp(bytes).metadata();
      assert.equal(meta.width, file.width); assert.equal(meta.height, file.height);
      records.set(file.path.endsWith('detail-1to1.png') ? 'crop' : meta.format, bytes);
    }
    const raw = await sharp(records.get('png')).removeAlpha().raw().toBuffer();
    assert.equal(hash(raw), a.pixelProof.rawRGBSha256);
    const originalCrop = await sharp(records.get('png')).extract(a.pixelProof.crop).removeAlpha().raw().toBuffer();
    const savedCrop = await sharp(records.get('crop')).removeAlpha().raw().toBuffer();
    assert.ok(originalCrop.equals(savedCrop), 'Detail proof must be original pixels, never enlarged');
    assert.ok(a.pixelProof.cropPixelDifferenceFraction > 0.03, 'Reject blank/missing subject');
    assert.ok(a.pixelProof.cropWhiteClipFraction < 0.04, 'Reject blown-out core');
    if (a.preset !== 'portrait') assert.ok(a.pixelProof.upperLeftDarkPixelFraction > 0.98, 'Preserve quiet copy area');
  }
});
