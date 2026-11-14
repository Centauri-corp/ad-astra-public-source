#!/usr/bin/env node
'use strict';

/** Offline, single-browser, finite-frame native CGI renderer. No app integration. */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'public/assets/neural-master');
const SCENE = path.join(__dirname, 'lib/neural-master-scene.mjs');
const THREE_ROOT = path.resolve(path.dirname(require.resolve('three')), '..');
const THREE_VERSION = JSON.parse(fs.readFileSync(path.join(THREE_ROOT, 'package.json'), 'utf8')).version;
const PRESETS = Object.freeze({
  landscape: { width: 3840, height: 2160, dpr: 1, composition: 'landscape' },
  panoramic: { width: 3840, height: 1600, dpr: 1, composition: 'landscape' },
  portrait: { width: 1080, height: 1920, dpr: 2, composition: 'portrait' },
  retina: { width: 1440, height: 810, dpr: 2, composition: 'landscape' },
  preview: { width: 1600, height: 900, dpr: 1, composition: 'landscape' },
});
const BOUNDS = Object.freeze({ maxPixels: 8294400, maxDimension: 3840, timeoutMs: 180000, processTimeoutMs: 600000, maxOutputBytes: 64 * 1024 * 1024, maxRequests: 128, maxModuleBytes: 4 * 1024 * 1024 });
const FLAGS = ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--disable-background-networking', '--disable-component-update', '--no-first-run', '--js-flags=--max-old-space-size=2048'];
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const relative = file => path.relative(ROOT, file).split(path.sep).join('/');
function validatePreset(preset) {
  if (!preset || !['landscape', 'portrait'].includes(preset.composition) || ![1, 2].includes(preset.dpr) ||
      ![preset.width, preset.height].every(n => Number.isInteger(n) && n > 0) ||
      Math.max(preset.width, preset.height) * preset.dpr > BOUNDS.maxDimension ||
      preset.width * preset.height * preset.dpr * preset.dpr > BOUNDS.maxPixels) throw new Error('Invalid or unbounded native render preset');
  return preset;
}

function parseArgs(args) {
  const options = { presets: ['landscape'], output: OUTPUT };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--all') options.presets = ['landscape', 'panoramic', 'portrait', 'retina'];
    else if (args[i] === '--preset' && Object.hasOwn(PRESETS, args[i + 1])) options.presets = [args[++i]];
    else if (args[i] === '--variant' && /^[a-z][a-z0-9-]{0,40}$/.test(args[i + 1] || '')) options.output = path.join(OUTPUT, args[++i]);
    else if (args[i] === '--help') return { help: true };
    else throw new Error(`Unknown argument or invalid value: ${args[i]}`);
  }
  return options;
}

async function createRenderServer() {
  const threeRoot = THREE_ROOT;
  const loadedSources = new Map();
  const sourceCache = new Map();
  const requests = [];
  const rejected = [];
  const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><style>html,body{margin:0;background:#020710;overflow:hidden}canvas{display:block;width:100vw;height:100vh}</style><script type="importmap">{"imports":{"three":"/vendor/build/three.module.js","three/addons/":"/vendor/examples/jsm/"}}</script></head><body><canvas id="master" aria-label="Original procedural CGI glass neural sculpture"></canvas><script type="module">
import { renderNeuralMaster } from '/scene.mjs';
window.renderMaster = async options => {
  const result = await renderNeuralMaster({canvas:document.getElementById('master'),...options});
  window.masterResult = result;
  return result.proof;
};
</script></body></html>`;
  const server = http.createServer(async (req, res) => {
    try {
      if (requests.length >= BOUNDS.maxRequests) { res.writeHead(429); return res.end(); }
      const url = new URL(req.url, 'http://127.0.0.1');
      if (req.method !== 'GET' || url.search || /%|\\|\0/.test(url.pathname)) { rejected.push(req.url); res.writeHead(403); return res.end(); }
      requests.push(url.pathname);
      if (url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'" });
        return res.end(page);
      }
      let file;
      if (url.pathname === '/scene.mjs') file = SCENE;
      else if (/^\/vendor\/(build\/[a-zA-Z0-9_.-]+\.js|examples\/jsm\/[a-zA-Z0-9_./-]+\.js)$/.test(url.pathname)) {
        file = path.resolve(threeRoot, url.pathname.slice('/vendor/'.length));
        if (!file.startsWith(threeRoot + path.sep) || url.pathname.split('/').includes('..')) file = null;
      }
      if (!file) { rejected.push(req.url); res.writeHead(404); return res.end(); }
      const stat = await fsp.stat(file);
      if (!stat.isFile() || stat.size > BOUNDS.maxModuleBytes) throw new Error('Module exceeds local serving bound');
      const bytes = sourceCache.get(file) || await fsp.readFile(file);
      sourceCache.set(file, bytes);
      loadedSources.set(file, { path: file === SCENE ? relative(file) : 'node_modules/three/' + path.relative(threeRoot, file).split(path.sep).join('/'), bytes: bytes.length, sha256: sha256(bytes) });
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(bytes);
    } catch (error) { res.writeHead(500); res.end('Local module load failed'); }
  });
  server.requestTimeout = 10000; server.headersTimeout = 10000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, origin: `http://127.0.0.1:${server.address().port}`, loadedSources, requests, rejected };
}

async function fileRecord(file, dimensions) {
  const bytes = await fsp.readFile(file);
  return { path: relative(file), bytes: bytes.length, sha256: sha256(bytes), ...dimensions };
}

async function pixelProof(png, expectedWidth, expectedHeight, corePixel) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== expectedWidth || info.height !== expectedHeight) throw new Error('PNG native pixel proof failed');
  const box = { left: Math.max(0, Math.min(expectedWidth - 512, corePixel.x - 256)), top: Math.max(0, Math.min(expectedHeight - 512, corePixel.y - 256)), width: 512, height: 512 };
  let darkLeft = 0, leftCount = 0, subjectCount = 0, subjectDifferences = 0, clipped = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (x < info.width * 0.36 && y < info.height * 0.72) { leftCount++; if (Math.max(r, g, b) < 42) darkLeft++; }
    if (x >= box.left && x < box.left + box.width && y >= box.top && y < box.top + box.height) {
      subjectCount++; if (r >= 250 && g >= 250 && b >= 250) clipped++;
      if (x > box.left) { const j = i - info.channels; if (Math.abs(r - data[j]) + Math.abs(g - data[j + 1]) + Math.abs(b - data[j + 2]) > 12) subjectDifferences++; }
    }
  }
  return { decodedWidth: info.width, decodedHeight: info.height, nativePixels: info.width * info.height, rawRGBSha256: sha256(data), crop: box, cropPixelDifferenceFraction: subjectDifferences / subjectCount, cropWhiteClipFraction: clipped / subjectCount, upperLeftDarkPixelFraction: darkLeft / leftCount, method: 'Decode captured WebGL canvas PNG directly. No resize. 512x512 crops preserve one source pixel per output pixel.' };
}

async function render(options) {
  const runnerSources = await Promise.all([__filename, path.join(ROOT, 'package.json')].map(async file => { const bytes = await fsp.readFile(file); return { path: relative(file), bytes: bytes.length, sha256: sha256(bytes) }; }));
  await fsp.mkdir(options.output, { recursive: true });
  const staging = await fsp.mkdtemp(path.join(options.output, '.render-'));
  let runtime;
  let browser, watchdog;
  const artifacts = [], failures = [], blockedRequests = [], consoleMessages = [];
  try {
    runtime = await createRenderServer();
    browser = await chromium.launch({ headless: true, args: FLAGS, timeout: 25000 });
    watchdog = setTimeout(() => { browser.close().catch(() => {}); }, BOUNDS.processTimeoutMs);
    for (const name of options.presets) {
      const preset = validatePreset(PRESETS[name]);
      const width = preset.width * preset.dpr, height = preset.height * preset.dpr;
      const context = await browser.newContext({ viewport: { width: preset.width, height: preset.height }, deviceScaleFactor: preset.dpr, serviceWorkers: 'block', offline: false });
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin === runtime.origin) return route.continue();
        blockedRequests.push(url.origin + url.pathname); return route.abort('blockedbyclient');
      });
      const page = await context.newPage();
      page.setDefaultTimeout(BOUNDS.timeoutMs);
      page.on('pageerror', e => failures.push(e.message));
      page.on('console', msg => { if (['error', 'warning'].includes(msg.type())) consoleMessages.push({ type: msg.type(), text: msg.text().slice(0, 1500) }); });
      console.log(`Rendering ${name}: ${width}x${height} native pixels (CSS ${preset.width}x${preset.height} @${preset.dpr}x)`);
      await page.goto(runtime.origin, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForFunction(() => typeof window.renderMaster === 'function');
      let renderTimer, proof;
      try {
        proof = await Promise.race([
          page.evaluate(p => window.renderMaster(p), preset),
          new Promise((_, reject) => { renderTimer = setTimeout(() => reject(new Error('Native render exceeded 180000ms budget')), BOUNDS.timeoutMs); }),
        ]);
      } finally { clearTimeout(renderTimer); }
      const dims = proof.dimensions;
      if (dims.browserDPR !== preset.dpr || [dims.canvasWidth, dims.drawingBufferWidth, dims.composerWidth].some(n => n !== width) || [dims.canvasHeight, dims.drawingBufferHeight, dims.composerHeight].some(n => n !== height)) throw new Error(`Native target mismatch: ${JSON.stringify(dims)}`);
      const encoded = await page.evaluate(() => document.getElementById('master').toDataURL('image/png').split(',')[1]);
      const png = Buffer.from(encoded, 'base64');
      if (png.length > BOUNDS.maxOutputBytes) throw new Error('PNG exceeds output byte bound');
      const base = `neural-master-${name}-${width}x${height}`;
      const pngPath = path.join(staging, base + '.png');
      const webpPath = path.join(staging, base + '.webp');
      await fsp.writeFile(pngPath, png);
      await sharp(png).withIccProfile('srgb').webp({ quality: 94, effort: 6 }).toFile(webpPath);
      const pixel = await pixelProof(png, width, height, proof.corePixel);
      const cropPath = path.join(staging, base + '-detail-1to1.png');
      await sharp(png).extract(pixel.crop).png().toFile(cropPath);
      artifacts.push({ preset: name, dimensions: { width, height }, proof, pixelProof: pixel, stagingFiles: [pngPath, webpPath, cropPath] });
      console.log(`Rendered in ${proof.renderMs}ms; ${proof.stats.sceneTriangles} scene triangles; ${proof.stats.calls} draw calls; left quiet pixels ${(100 * pixel.upperLeftDarkPixelFraction).toFixed(1)}%`);
      await page.evaluate(() => window.masterResult.dispose());
      await context.close();
    }
    if (failures.length || blockedRequests.length || runtime.rejected.length || consoleMessages.some(m => m.type === 'error')) throw new Error(`Render errors: ${JSON.stringify({ failures, blockedRequests, rejected: runtime.rejected, consoleMessages })}`);
    // Publish only after all requested renders have succeeded. No approval is fabricated.
    const files = [];
    for (const artifact of artifacts) {
      const { stagingFiles, ...record } = artifact;
      record.files = [];
      for (const staged of stagingFiles) {
        const final = path.join(options.output, path.basename(staged));
        await fsp.rename(staged, final);
        const dimensions = /detail-1to1/.test(final) ? { width: 512, height: 512, operation: 'extract only; no resampling' } : { ...artifact.dimensions, operation: final.endsWith('.webp') ? 'same-size WebP encoding from native PNG' : 'direct WebGL canvas PNG; no resampling' };
        record.files.push(await fileRecord(final, dimensions));
      }
      files.push(record);
    }
    const sourceFiles = [...runtime.loadedSources.values(), ...runnerSources].sort((a, b) => a.path.localeCompare(b.path));
    const manifest = {
      schema: 'ad-astra.neural-master.provenance.v1', generatedAt: new Date().toISOString(), classification: 'Original procedural CGI',
      description: 'New seeded 3D glass neural sculpture rendered from geometry at the recorded native pixel dimensions. No source raster, image editing, raster upscaling, AI inference, or brain telemetry.',
      approval: { status: 'not-requested', humanApproved: false, integration: 'not-integrated' },
      reproduction: `node scripts/render-neural-master.cjs ${options.presets.length > 1 ? '--all' : '--preset ' + options.presets[0]}${options.output === OUTPUT ? '' : ' --variant ' + path.basename(options.output)}`,
      runtime: { node: process.version, chromium: browser.version(), playwright: require('playwright/package.json').version, three: THREE_VERSION, sharp: sharp.versions, launchArgs: FLAGS },
      bounds: BOUNDS, sources: sourceFiles, network: { policy: 'Loopback server only; external page requests aborted; no external asset dependencies', requests: [...new Set(runtime.requests)].sort(), externalRequests: blockedRequests, rejectedLocalRequests: runtime.rejected },
      consoleMessages, artifacts: files,
    };
    const manifestName = options.presets.length > 1 ? 'manifest.json' : `manifest-${options.presets[0]}.json`;
    await fsp.writeFile(path.join(staging, manifestName), JSON.stringify(manifest, null, 2) + '\n');
    await fsp.rename(path.join(staging, manifestName), path.join(options.output, manifestName));
    console.log(`Provenance: ${relative(path.join(options.output, manifestName))}`);
    return manifest;
  } finally {
    clearTimeout(watchdog);
    await browser?.close();
    if (runtime) await new Promise(resolve => runtime.server.close(resolve));
    await fsp.rm(staging, { recursive: true, force: true });
  }
}

if (require.main === module) {
  Promise.resolve().then(() => {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) return console.log('Usage: node scripts/render-neural-master.cjs [--preset landscape|panoramic|portrait|retina|preview | --all] [--variant name]\nFinite native CGI render. Existing dependencies only. Outputs under public/assets/neural-master/.');
    return render(options);
  }).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
}
module.exports = { PRESETS, BOUNDS, validatePreset, parseArgs, createRenderServer, pixelProof, render };
