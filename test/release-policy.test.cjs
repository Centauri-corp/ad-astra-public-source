'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { validateReleasePolicy, validateReleaseFiles } = require('../scripts/validate-release-policy.cjs');
const root = path.resolve(__dirname, '..');
const files = ['release-policy.json', 'public/release-manifest.json', 'public/experience-manifest.json', 'vercel.json'];
const baseline = files.map(file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')));
const clone = () => structuredClone(baseline);
const validate = input => validateReleasePolicy(...input);

test('withheld preview policy validates without publishing private operational fields', () => {
  assert.doesNotThrow(() => validate(clone()));
  assert.doesNotThrow(() => validateReleaseFiles(root));
});

for (const key of ['externalWrites', 'externalCrmWrites', 'outboundSends', 'automaticPublication', 'billingEnabled', 'liveAiEnabled', 'customerProvisioning']) {
  test(`release policy rejects missing, enabled or malformed ${key}`, () => {
    for (const value of [undefined, true, null, 'false', 0, {}]) {
      const input = clone();
      if (value === undefined) delete input[0][key]; else input[0][key] = value;
      assert.throws(() => validate(input));
    }
  });
}

for (const key of ['schemaVersion', 'releaseScope', 'customerAccess', 'automationMode', 'independentReleaseApprovalRequired']) {
  test(`release policy requires the exact ${key} boundary`, () => {
    for (const value of [undefined, null, false, 'unverified']) {
      const input = clone();
      if (value === undefined) delete input[0][key]; else input[0][key] = value;
      assert.throws(() => validate(input));
    }
  });
}

test('release policy rejects unknown keys and non-object policies', () => {
  const input = clone(); input[0].approvalRecorded = true;
  assert.throws(() => validate(input));
  for (const value of [null, [], true, 'approved']) {
    const invalid = clone(); invalid[0] = value;
    assert.throws(() => validate(invalid));
  }
});

for (const index of [1, 2]) {
  test(`public manifest ${index} cannot enable, omit or misrepresent public boundaries`, () => {
    for (const value of [undefined, true, null, 'false']) {
      for (const key of ['publicLaunchEnabled', 'externalWrites']) {
        const input = clone(), target = key === 'externalWrites' ? input[index].publicBoundary : input[index];
        if (value === undefined) delete target[key]; else target[key] = value;
        assert.throws(() => validate(input));
      }
    }
    const input = clone(); input[index].publicBoundary.backendOperations = 'public';
    assert.throws(() => validate(input));
    for (const key of ['growthAutomation', 'autonomousOperations', 'customerBudgetBridge', 'customerPortal']) {
      const privateData = clone(); privateData[index][key] = {};
      assert.throws(() => validate(privateData));
    }
    const portal = clone(); portal[index].contentSurfaces.customerPortal = 'available';
    assert.throws(() => validate(portal));
  });
}

test('engine availability and static output configuration fail closed', () => {
  for (const value of [undefined, true, null, 'false']) {
    const input = clone();
    if (value === undefined) delete input[1].engineAvailable; else input[1].engineAvailable = value;
    assert.throws(() => validate(input));
  }
  for (const directory of [undefined, '.', '../', 'lib']) {
    const input = clone(); input[3].outputDirectory = directory;
    assert.throws(() => validate(input));
  }
  for (const value of [undefined, true, null, 'false']) {
    const input = clone(); input[3].git.deploymentEnabled = value;
    assert.throws(() => validate(input));
  }
});

test('withheld customer access rejects missing, duplicate or changed redirects', () => {
  for (const index of [0, 1, 2]) {
    const missing = clone(); missing[3].redirects.splice(index, 1);
    assert.throws(() => validate(missing));
    const changed = clone(); changed[3].redirects[index].destination = '/customer-live/';
    assert.throws(() => validate(changed));
    const duplicate = clone(); duplicate[3].redirects.push(duplicate[3].redirects[index]);
    assert.throws(() => validate(duplicate));
  }
});

test('file validation rejects missing/malformed policy, missing manifests and public copies', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'ad-astra-release-policy-'));
  try {
    fs.mkdirSync(path.join(fixture, 'public'));
    const restore = () => files.forEach((file, index) => fs.writeFileSync(path.join(fixture, file), JSON.stringify(baseline[index])));
    restore(); assert.doesNotThrow(() => validateReleaseFiles(fixture));
    for (const file of files) {
      fs.unlinkSync(path.join(fixture, file));
      assert.throws(() => validateReleaseFiles(fixture));
      restore();
    }
    fs.writeFileSync(path.join(fixture, 'release-policy.json'), '{');
    assert.throws(() => validateReleaseFiles(fixture)); restore();
    fs.copyFileSync(path.join(fixture, 'release-policy.json'), path.join(fixture, 'public/release-policy.json'));
    assert.throws(() => validateReleaseFiles(fixture));
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('CI and deployment build both run every source test and the policy-backed release check', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const config = baseline[3];
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8');
  for (const command of [pkg.scripts.test, config.buildCommand, workflow]) assert.ok(command.includes('node --test test/*.test.cjs'));
  assert.ok(config.buildCommand.includes('node scripts/check-release.cjs'));
  assert.ok(config.buildCommand.includes('node scripts/redis-acceptance.cjs'));
  assert.ok(workflow.includes('node scripts/check-release.cjs'));
  const checker = fs.readFileSync(path.join(root, 'scripts/check-release.cjs'), 'utf8');
  assert.ok(checker.includes('validateReleaseFiles(root)'));
});

test('actual release-check CLI fails before PASS for missing or enabled restricted settings', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'ad-astra-release-cli-'));
  try {
    fs.mkdirSync(path.join(fixture, 'public'));
    fs.mkdirSync(path.join(fixture, 'scripts'));
    for (const file of ['check-release.cjs', 'validate-release-policy.cjs']) {
      fs.copyFileSync(path.join(root, 'scripts', file), path.join(fixture, 'scripts', file));
    }
    for (const key of ['externalWrites', 'externalCrmWrites', 'outboundSends', 'automaticPublication', 'billingEnabled', 'liveAiEnabled', 'customerProvisioning']) {
      for (const value of [undefined, true]) {
        const input = clone();
        if (value === undefined) delete input[0][key]; else input[0][key] = value;
        files.forEach((file, index) => fs.writeFileSync(path.join(fixture, file), JSON.stringify(input[index])));
        const result = spawnSync(process.execPath, [path.join(fixture, 'scripts/check-release.cjs')], { encoding: 'utf8', timeout: 5000 });
        assert.ifError(result.error);
        assert.equal(result.status, 1, key);
        assert.match(result.stderr, /Release policy keys|release-policy\.json/);
        assert.doesNotMatch(result.stdout, /AD_ASTRA_STATIC_RELEASE_PASS/);
      }
    }
    files.forEach((file, index) => fs.writeFileSync(path.join(fixture, file), JSON.stringify(baseline[index])));
    fs.unlinkSync(path.join(fixture, 'release-policy.json'));
    const missing = spawnSync(process.execPath, [path.join(fixture, 'scripts/check-release.cjs')], { encoding: 'utf8', timeout: 5000 });
    assert.ifError(missing.error);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /ENOENT.*release-policy\.json/);
    assert.doesNotMatch(missing.stdout, /AD_ASTRA_STATIC_RELEASE_PASS/);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
