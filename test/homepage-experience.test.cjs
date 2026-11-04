'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const runtimeFiles = [
  'public/home-experience-data.js',
  'public/home-experience-ui.js',
  'public/home-experience-neural.js',
  'public/home-experience.js'
];
const runtime = runtimeFiles.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
const styles = [
  'public/home-experience.css',
  'public/home-neural.css'
].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
const loader = fs.readFileSync(path.join(root, 'public/knowledge/experience-links.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/experience-manifest.json'), 'utf8'));

const productIds = [
  'core-intelligence',
  'creative-studio',
  'specialist-intelligence',
  'business-commerce',
  'developer-platform',
  'autonomous-workflows'
];
const solutionIds = [
  'research-knowledge',
  'creative-production',
  'customer-operations',
  'enterprise-intelligence',
  'earth-space',
  'engineering-industry'
];

test('homepage loader is root-scoped, ordered and preserves workspace mode routing', () => {
  assert.match(loader, /ROOT_PATHS = new Set\(\['\/', '\/index\.html'\]\)/);
  assert.match(loader, /home-experience\.css/);
  assert.match(loader, /home-neural\.css/);
  for (const file of runtimeFiles) assert.match(loader, new RegExp(file.split('/').pop().replace('.', '\\.')));
  assert.match(loader, /reduce\(\(chain, src\) => chain\.then/);
  assert.match(loader, /Open ' \+ mode/);
  assert.doesNotMatch(loader, /fetch\(|XMLHttpRequest|WebSocket|sendBeacon/);
});

test('homepage defines six product families and six solution pathways', () => {
  for (const id of productIds) assert.match(runtime, new RegExp("id: '" + id + "'"));
  for (const id of solutionIds) assert.match(runtime, new RegExp("id: '" + id + "'"));
  assert.equal(manifest.homepageExperience.productFamilies, 6);
  assert.equal(manifest.homepageExperience.productDirections, 25);
  assert.equal(manifest.homepageExperience.solutionPathways, 6);
  assert.deepEqual(manifest.productExperience.families.map((item) => item.id), productIds);
  assert.deepEqual(manifest.productExperience.solutions, solutionIds);
});

test('neural model is local, bounded and explicitly non-telemetry', () => {
  assert.match(runtime, /const nodeCount = 78/);
  assert.match(runtime, /data-model="knowledge"/);
  assert.match(runtime, /data-model="agents"/);
  assert.match(runtime, /data-model="earth"/);
  assert.match(runtime, /NO LIVE TELEMETRY/);
  assert.match(runtime, /prefers-reduced-motion: reduce/);
  assert.match(runtime, /ResizeObserver/);
  assert.match(runtime, /IntersectionObserver/);
  assert.doesNotMatch(runtime, /fetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage/);
  assert.equal(manifest.visualArchitecture.threeD.liveModelTelemetry, false);
  assert.equal(manifest.visualArchitecture.threeD.externalPromptTransmission, false);
  assert.equal(manifest.publicLaunchEnabled, false);
});

test('customer experience preserves explicit release and professional boundaries', () => {
  assert.match(runtime, /No card implies general availability/);
  assert.match(runtime, /guided preview/i);
  assert.match(runtime, /private development/i);
  assert.match(runtime, /professional review/i);
  assert.equal(manifest.productExperience.availabilityLanguageRequired, true);
  assert.equal(manifest.productExperience.nonfunctionalControlsForbidden, true);
  assert.equal(manifest.growthAutomation.externalCrmWrites, false);
  assert.equal(manifest.growthAutomation.outboundSends, false);
  assert.equal(manifest.growthAutomation.automaticPublication, false);
});

test('responsive and accessibility contracts are represented in source', () => {
  assert.match(runtime, /stage\.setAttribute\('role', 'region'\)/);
  assert.match(runtime, /aria-live/);
  assert.match(runtime, /aria-pressed/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media \(max-width: 480px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /min-height: 2\.65rem/);
});
