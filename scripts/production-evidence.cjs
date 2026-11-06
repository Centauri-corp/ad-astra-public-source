'use strict';

// Production evidence is supplied as a protected CI secret, never committed
// to the public repository. This validates observations; it does not activate
// the engine or change any provider state.
const REQUIRED_GATES = [
  'supabaseSecurity',
  'supabaseLifecycle',
  'stripeWebhookDelivery',
  'stripeSandboxLifecycle',
  'clerkEntitlement',
  'customerTwoAccount',
  'independentReview',
  'crmProduction',
  'vercelPreviewReviewed',
];

const HTTPS = /^https:\/\/[^\s]+$/;
const SHA = /^[0-9a-f]{40}$/i;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const DEFAULT_MAX_AGE_MS = 72 * 60 * 60 * 1000;

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function gateError(gate, message) {
  return `${gate}: ${message}`;
}

function validateGate(gate, value, now, maxAgeMs, operator) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [gateError(gate, 'attestation object is required')];
  if (value.status !== 'PASS') errors.push(gateError(gate, 'status must be PASS'));
  if (!hasText(value.source)) errors.push(gateError(gate, 'source is required'));
  if (!HTTPS.test(String(value.evidenceUrl || ''))) errors.push(gateError(gate, 'evidenceUrl must be HTTPS'));
  const observedAt = Date.parse(value.observedAt);
  if (!Number.isFinite(observedAt)) errors.push(gateError(gate, 'observedAt must be an ISO timestamp'));
  else {
    if (observedAt > now + MAX_CLOCK_SKEW_MS) errors.push(gateError(gate, 'observedAt is in the future'));
    if (now - observedAt > maxAgeMs) errors.push(gateError(gate, 'evidence is stale'));
  }
  if (gate === 'independentReview') {
    if (!hasText(value.reviewer)) errors.push(gateError(gate, 'reviewer is required'));
    if (hasText(operator) && value.reviewer === operator) errors.push(gateError(gate, 'reviewer must differ from operator'));
    if (value.source !== 'github') errors.push(gateError(gate, 'source must be github'));
    if (!hasText(value.reviewId)) errors.push(gateError(gate, 'reviewId is required'));
  }
  if (gate === 'customerTwoAccount') {
    if (!hasText(value.accountA) || !hasText(value.accountB)) errors.push(gateError(gate, 'two account identifiers are required'));
    if (value.accountA === value.accountB) errors.push(gateError(gate, 'accountA and accountB must differ'));
  }
  if (gate === 'stripeWebhookDelivery' && !hasText(value.receiptId)) errors.push(gateError(gate, 'provider receiptId is required'));
  if (gate === 'vercelPreviewReviewed' && !hasText(value.deploymentId)) errors.push(gateError(gate, 'deploymentId is required'));
  return errors;
}

function validateProductionEvidence(evidence, options = {}) {
  const now = options.now || Date.now();
  const maxAgeMs = options.maxAgeMs || DEFAULT_MAX_AGE_MS;
  const errors = [];
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return ['production evidence must be an object'];
  if (evidence.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!hasText(evidence.repository)) errors.push('repository is required');
  if (options.expectedRepository && evidence.repository !== options.expectedRepository) errors.push('repository does not match expected repository');
  if (!SHA.test(String(evidence.commit || ''))) errors.push('commit must be a full Git SHA-1');
  if (options.expectedCommit && evidence.commit !== options.expectedCommit) errors.push('commit does not match expected release commit');
  if (!hasText(evidence.operator)) errors.push('operator is required');
  if (!evidence.gates || typeof evidence.gates !== 'object' || Array.isArray(evidence.gates)) errors.push('gates object is required');
  for (const gate of REQUIRED_GATES) errors.push(...validateGate(gate, evidence.gates?.[gate], now, maxAgeMs, evidence.operator));
  return errors;
}

function syntheticEvidence(now = new Date().toISOString()) {
  const base = { status: 'PASS', observedAt: now, source: 'test', evidenceUrl: 'https://example.test/evidence' };
  return {
    schemaVersion: 1,
    repository: 'example/repository',
    commit: 'a'.repeat(40),
    operator: 'release-operator',
    gates: {
      supabaseSecurity: base,
      supabaseLifecycle: base,
      stripeWebhookDelivery: { ...base, receiptId: 'evt_test' },
      stripeSandboxLifecycle: base,
      clerkEntitlement: base,
      customerTwoAccount: { ...base, accountA: 'account-a', accountB: 'account-b' },
      independentReview: { ...base, source: 'github', reviewer: 'independent-reviewer', reviewId: 'review_test' },
      crmProduction: base,
      vercelPreviewReviewed: { ...base, deploymentId: 'dpl_test' },
    },
  };
}

function readFromEnvironment() {
  const raw = process.env.AD_ASTRA_RELEASE_EVIDENCE_JSON;
  if (!raw) return { errors: ['AD_ASTRA_RELEASE_EVIDENCE_JSON is required'] };
  try {
    const evidence = JSON.parse(raw);
    const errors = validateProductionEvidence(evidence, {
      expectedRepository: process.env.GITHUB_REPOSITORY || undefined,
      expectedCommit: process.env.AD_ASTRA_RELEASE_COMMIT || undefined,
    });
    return { evidence, errors };
  } catch (error) {
    return { errors: [`evidence JSON is invalid: ${error.message}`] };
  }
}

if (require.main === module) {
  if (process.argv.includes('--self-test')) {
    const now = Date.now();
    const evidence = syntheticEvidence(new Date(now).toISOString());
    if (validateProductionEvidence(evidence, { now }).length) process.exitCode = 1;
    const sameAccount = { ...evidence, gates: { ...evidence.gates, customerTwoAccount: { ...evidence.gates.customerTwoAccount, accountB: 'account-a' } } };
    if (!validateProductionEvidence(sameAccount, { now }).some(error => error.includes('accountA and accountB must differ'))) process.exitCode = 1;
    const sameReviewer = { ...evidence, gates: { ...evidence.gates, independentReview: { ...evidence.gates.independentReview, reviewer: evidence.operator } } };
    if (!validateProductionEvidence(sameReviewer, { now }).some(error => error.includes('reviewer must differ'))) process.exitCode = 1;
    if (process.exitCode) throw new Error('production evidence self-test failed');
    console.log('AD_ASTRA_PRODUCTION_EVIDENCE_CONTRACT_TEST_PASS fail_closed=true');
  } else {
    const result = readFromEnvironment();
    if (result.errors.length) {
      console.error(`AD_ASTRA_PRODUCTION_EVIDENCE_BLOCKED (${result.errors.length})`);
      for (const error of result.errors) console.error(`- ${error}`);
      process.exitCode = 1;
    } else console.log('AD_ASTRA_PRODUCTION_EVIDENCE_PASS');
  }
}

module.exports = { REQUIRED_GATES, validateProductionEvidence, syntheticEvidence };
