'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const registryPath = path.join(root, 'config', 'ad-astra-command-models.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const askSource = fs.readFileSync(path.join(root, 'api', 'ask.js'), 'utf8');

const failures = [];
const fail = (message) => failures.push(message);

if (registry.releaseStatus !== 'production_hold') fail('release status must remain production_hold');
if (registry.customerInferenceVerified !== false) fail('customer inference cannot be marked verified by this registry');
if (registry.publicCatalogEnabled !== false || registry.checkoutEnabled !== false) fail('public catalog and checkout must remain disabled');
if (!Array.isArray(registry.models) || registry.models.length < 1) fail('model registry is empty');

for (const model of registry.models) {
  if (model.publicUse === true && (model.executionVerified !== true || registry.releaseStatus !== 'production_green')) {
    fail(`${model.surface} cannot be public without verified execution and a green release status`);
  }
}

const publicModel = registry.models.find((model) => model.surface === 'public-guided-engine');
if (!publicModel || publicModel.modelId !== 'gpt-4.1-mini-2025-04-14') fail('public model configuration drifted');
if (!askSource.includes("model:'gpt-4.1-mini-2025-04-14'")) fail('api/ask.js model does not match the registry');
for (const mode of ['ask', 'research', 'create', 'learn', 'explore']) {
  if (!new RegExp(`\\b${mode}:`).test(askSource)) fail(`api/ask.js is missing guided mode ${mode}`);
}

if (failures.length) {
  console.error(`AD_ASTRA_COMMAND_REGISTRY_FAILED: ${failures.join('; ')}`);
  process.exitCode = 1;
} else {
  console.log(`AD_ASTRA_COMMAND_REGISTRY_PASS models=${registry.models.length} public_use=0 release=${registry.releaseStatus}`);
}
