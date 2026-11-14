'use strict';
// Offline source evidence only: no credentials, network, inference or release writes.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const { CONTRACT, validateCatalog, validateRelease } = require('../lib/model-validation');
const { publicModels, publicMarketProfiles } = require('../lib/model-catalog');
const { verify } = require('./website-source-integrity.cjs');
const root = path.join(__dirname, '..');
function evidence() {
  const release = JSON.parse(fs.readFileSync(path.join(root, 'public/release-manifest.json'), 'utf8'));
  const counts = validateCatalog(publicModels(), publicMarketProfiles()); validateRelease(release);
  const inventory = verify(root, JSON.parse(fs.readFileSync(path.join(root, 'config/website-source-integrity.json'), 'utf8')));
  const commit = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const dirty = cp.execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: root, encoding: 'utf8' }).trim().length > 0;
  return {
    schema: 'ad-astra-model-validation-evidence/v1', observedAt: new Date().toISOString(),
    scope: 'offline-catalog-release-source-alignment-not-model-quality-or-production-acceptance',
    comparisonCommit: commit, worktreeClean: !dirty, sourceFingerprint: inventory.fingerprint,
    deploymentFiles: inventory.files.length, catalogReleaseSourceContract: 'passed', ...counts,
    providerResponseValidation: 'implemented; exercise through the synthetic regression tests, not this command',
    publicModel: { id: CONTRACT.productId, name: CONTRACT.publicName, capabilityClass: 'bounded-narrow-ai-integration' },
    modes: [...CONTRACT.modes], profilesAreIndependentModels: false,
    agiAvailable: false, asiAvailable: false,
    customerActivation: { sourceEnabled: release.publicLaunchEnabled === true && release.engineAvailable === true, runtimeVerified: false },
    evidenceLimits: { liveProviderCalls: 0, accuracyEvaluated: false, safetyPromptEvaluationPerformed: false,
      domainCertificationVerified: false, multilingualPerformanceEvaluated: false, tenantIsolationVerified: false,
      productionCapacityCertified: false, independentReview: false, releaseAuthorized: false },
  };
}
if (require.main === module) {
  try {
    if (process.argv.length !== 2) throw new Error('Usage: node scripts/validate-models.cjs');
    console.log(JSON.stringify(evidence(), null, 2));
  } catch { console.error('AD_ASTRA_MODEL_VALIDATION_HOLD: source/model contract failed'); process.exitCode = 1; }
}
module.exports = { evidence };
