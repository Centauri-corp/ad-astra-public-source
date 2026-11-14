'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const SHA = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;
const ISSUER = 'https://clerk.adastra.global';
const SESSION_PROTOCOL = 'ad-astra-customer-session/v1';
const COMPONENT = 'public-marketing-site';
const REPOSITORY = 'Centauri-corp/ad-astra-public-source';
function fail(code) { throw Error(code); }
function origin(value, environment) {
  let url; try { url = new URL(value); } catch { fail('invalid_qa_origin'); }
  if (url.href !== url.origin + '/' || url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash
    || !['preview', 'production'].includes(environment)
    || (environment === 'production' ? url.hostname !== 'adastra.global' : !/^[a-z0-9][a-z0-9-]*\.vercel\.app$/.test(url.hostname))) fail('invalid_qa_origin');
  return url.origin;
}
function readReceipt(file, hash, read = file => fs.readFileSync(file)) {
  if (!file || !HASH.test(hash || '')) fail('reviewed_receipt_missing');
  const bytes = read(file);
  if (bytes.length > 32768 || digest(bytes) !== hash) fail('reviewed_receipt_digest_mismatch');
  let value; try { value = JSON.parse(bytes.toString('utf8')); } catch { fail('reviewed_receipt_invalid'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('reviewed_receipt_invalid');
  return value;
}
function evidence(value) {
  let url; try { url = new URL(value); } catch { fail('invalid_evidence_url'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
    || !['github.com', 'vercel.com'].includes(url.hostname) || url.pathname === '/') fail('invalid_evidence_url');
  return url.href;
}
function bound(value, config, now) {
  if (value.component !== COMPONENT || value.repository !== REPOSITORY || value.publicSha !== config.publicSha
    || value.origin !== config.origin || value.environment !== config.environment
    || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(value.reviewer || '') || value.reviewState !== 'approved') fail('receipt_scope_mismatch');
  const age = now - Date.parse(value.observedAt);
  if (!Number.isFinite(age) || age < -30000) fail('receipt_observation_invalid');
  // Exact source/deployment/artifact binding persists until changed or revoked.
  // An expiry belongs to an explicit receipt policy, never a default review TTL.
  if (value.revoked === true || value.revokedAt !== undefined) fail('receipt_revoked');
  if (value.revoked !== undefined && typeof value.revoked !== 'boolean') fail('receipt_revocation_invalid');
  if (value.expiresAt !== undefined && (typeof value.expiresAt !== 'string'
    || !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= now)) fail('receipt_expired');
  evidence(value.evidenceUrl);
}
function sourceProof(value, config, now) {
  bound(value, config, now);
  if (value.schema !== 'ad-astra-reviewed-source-proof/v1' || value.provider !== 'vercel'
    || value.providerCommitSha !== config.publicSha || !/^dpl_[A-Za-z0-9]{8,100}$/.test(value.deploymentId || '')
    || value.basis !== 'provider-source-readback') fail('source_proof_invalid');
  return { deploymentId: value.deploymentId, publicSha: value.publicSha, observedAt: value.observedAt,
    evidenceUrl: evidence(value.evidenceUrl), verification: 'accepted-protected-reviewed-receipt-not-live-reverified' };
}
function identity(token, config, now, expectedState = 'current') {
  if (typeof token !== 'string' || token.length > 12000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) fail('qa_token_invalid');
  let claims; try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')); } catch { fail('qa_token_invalid'); }
  const seconds = Math.floor(now / 1000), audiences = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (claims?.iss !== ISSUER || !audiences.includes('ad-astra-workspace') || claims.azp !== 'https://adastra.global'
    || !/^user_[A-Za-z0-9]+$/.test(claims.sub || '') || !/^sess_[A-Za-z0-9]+$/.test(claims.sid || '')
    || !HASH.test(config.subjectHash || '') || digest(claims.sub) !== config.subjectHash
    || !['iat', 'nbf', 'exp'].every(key => Number.isSafeInteger(claims[key]))
    || claims.exp <= claims.iat || claims.exp - claims.iat > 300
    || claims.iat > seconds + 5 || claims.nbf > seconds + 5
    || (expectedState === 'expired' ? claims.exp > seconds : claims.exp <= seconds)) fail('qa_token_scope_mismatch');
  // Decode only to constrain synthetic traffic; the deployed endpoint verifies signatures.
  return { subjectHash: digest(claims.sub), sessionHash: digest(claims.sid), tokenHash: digest(token), expiresAt: claims.exp * 1000 };
}
function lifecycleProof(bundle, kind, config, identity, now) {
  if (!bundle || bundle.schema !== 'ad-astra-reviewed-public-lifecycle/v1' || !Array.isArray(bundle.receipts)) fail('lifecycle_receipt_missing');
  const matches = bundle.receipts.filter(receipt => receipt.kind === kind);
  if (matches.length !== 1) fail('lifecycle_receipt_missing');
  const receipt = matches[0]; bound(receipt, config, now);
  if (receipt.identityPlane !== 'public-clerk' || receipt.issuer !== ISSUER || receipt.syntheticIdentity !== true
    || receipt.subjectHash !== config.subjectHash || receipt.result !== 'observed-pass'
    || (identity && (receipt.sessionHash !== identity.sessionHash || receipt.tokenHash !== identity.tokenHash))) fail('lifecycle_receipt_invalid');
  if (kind === 'natural-expiry' && (receipt.acceptedBeforeExpiry !== true || receipt.expiredNaturally !== true)) fail('lifecycle_receipt_invalid');
  if (kind === 'session-revocation' && receipt.revocationConfirmed !== true) fail('lifecycle_receipt_invalid');
  if (kind === 'account-recovery' && (receipt.recoveredSessionConfirmed !== true || receipt.oldAccessOutcomeVerified !== true)) fail('lifecycle_receipt_invalid');
  return { kind, evidenceUrl: evidence(receipt.evidenceUrl), observedAt: receipt.observedAt, verification: 'accepted-protected-reviewed-receipt-not-reperformed' };
}
function writeReport(report, output) {
  fs.mkdirSync(output, { recursive: true, mode: 0o700 });
  const filename = path.join(output, 'public-customer-qa.json');
  fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  return filename;
}
module.exports = { digest, origin, readReceipt, sourceProof, identity, lifecycleProof, writeReport, SHA, HASH, ISSUER, SESSION_PROTOCOL, COMPONENT, REPOSITORY };
