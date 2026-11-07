'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Source policy for the withheld customer release. These are required boundaries,
// not observations of provider state, acceptance receipts or release approval.
const required = Object.freeze({
  schemaVersion: 1,
  releaseScope: 'public-informational-preview',
  customerAccess: 'withheld',
  automationMode: 'private-scheduled-read-only-audit',
  externalWrites: false,
  externalCrmWrites: false,
  outboundSends: false,
  automaticPublication: false,
  billingEnabled: false,
  liveAiEnabled: false,
  customerProvisioning: false,
  independentReleaseApprovalRequired: true
});

function object(value, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
}

function validateReleasePolicy(policy, manifest, experience, config) {
  object(policy, 'release-policy.json');
  assert.deepEqual(Object.keys(policy).sort(), Object.keys(required).sort(), 'Release policy keys must be complete and recognized');
  for (const [key, expected] of Object.entries(required)) {
    assert.equal(policy[key], expected, `release-policy.json.${key} must remain ${JSON.stringify(expected)}`);
  }
  object(manifest, 'release manifest');
  object(experience, 'experience manifest');
  for (const [label, document] of [['release manifest', manifest], ['experience manifest', experience]]) {
    assert.equal(document.publicLaunchEnabled, false, `${label}: public launch must remain disabled`);
    object(document.publicBoundary, `${label}.publicBoundary`);
    assert.equal(document.publicBoundary.externalWrites, false, `${label}: external writes must remain disabled`);
    assert.equal(document.publicBoundary.backendOperations, 'hidden', `${label}: backend operations must stay private`);
    for (const key of ['growthAutomation', 'autonomousOperations', 'customerBudgetBridge']) {
      assert.ok(!Object.hasOwn(document, key), `${label}: ${key} belongs outside public output`);
    }
    assert.ok(!Object.hasOwn(document, 'customerPortal'), `${label}: withheld customer portal must not be advertised`);
    assert.ok(!Object.hasOwn(document.contentSurfaces || {}, 'customerPortal'), `${label}: withheld customer portal surface must not be advertised`);
  }
  assert.equal(manifest.engineAvailable, false, 'Release manifest: engine must remain unavailable');
  object(config, 'Vercel configuration');
  assert.equal(config.outputDirectory, 'public', 'Only the public directory may be static output');
  assert.equal(config.git?.deploymentEnabled, false, 'Automatic Git deployments must remain disabled');
  for (const [source, destination] of [['/platform/:path*', '/'], ['/knowledge/:path*', '/agent/'], ['/sign-in/:path*', '/']]) {
    const redirects = config.redirects?.filter(item => item.source === source);
    assert.equal(redirects?.length, 1, `Exactly one withheld-customer redirect is required for ${source}`);
    assert.equal(redirects[0].destination, destination, `Withheld-customer redirect changed for ${source}`);
  }
}

function validateReleaseFiles(root) {
  const policyFile = path.join(root, 'release-policy.json');
  assert.equal(fs.lstatSync(policyFile).isSymbolicLink(), false, 'Release policy must be a private regular file');
  assert.equal(fs.statSync(policyFile).isFile(), true, 'Release policy must be a regular file');
  assert.equal(fs.existsSync(path.join(root, 'public/release-policy.json')), false, 'Release policy must not be copied into public output');
  const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
  validateReleasePolicy(read('release-policy.json'), read('public/release-manifest.json'), read('public/experience-manifest.json'), read('vercel.json'));
}

module.exports = { validateReleasePolicy, validateReleaseFiles };
