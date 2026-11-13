# Public customer protocol QA

This is the public **Clerk bearer** lane. The private Supabase cookie workflow is separate evidence and cannot satisfy it. Run only against a reviewed, exact public commit with authorized synthetic identities. The manual workflow does not launch, bill, write to CRM, revoke an account or send an authenticated AI request.

The conversation generator derives seven profile options from the public catalog. It supports text explanations, research planning and visual briefs only. Images, retrieval and verified citations are unavailable. The client sends agentId/mode and requires the answer event to echo both; all stream events must match the server request ID. The backend stream owner must include agentId on answer events. Rebuild the final platform page and source inventory after integration.

Use ?agentId=researcher&mode=research#ask-ad-astra on an already signed-in platform. Unknown or duplicate values fall back to a supported selection with a notice. The existing sign-in return-path sanitizer currently preserves only mode; its owner must add catalog-validated agentId preservation before claiming the selection survives sign-in.

## Protected inputs

Create a GitHub Environment named public-customer-qa, with the genuine independent reviewer and candidate-branch restrictions. Never paste tokens in source, receipts or chat.

Variables: AD_ASTRA_PUBLIC_QA_URL (credential-free HTTPS origin with trailing slash), AD_ASTRA_PUBLIC_QA_ENVIRONMENT (preview or production), AD_ASTRA_PUBLIC_QA_SYNTHETIC_IDENTITY=true, AD_ASTRA_PUBLIC_QA_SUBJECT_SHA256, AD_ASTRA_PUBLIC_QA_SOURCE_PROOF_SHA256 and optional AD_ASTRA_PUBLIC_QA_LIFECYCLE_SHA256. Workflow SHA comes from github.sha. Production origin is restricted to https://adastra.global/; previews use an exact *.vercel.app origin. This permits protocol testing; it grants no production promotion.

Secrets: AD_ASTRA_PUBLIC_QA_CURRENT_TOKEN (fresh actual Clerk JWT, at most five-minute lifetime), optional REVOKED_TOKEN and EXPIRED_TOKEN with the same prefix, optional AD_ASTRA_PUBLIC_QA_PROTECTION_BYPASS, AD_ASTRA_PUBLIC_QA_SOURCE_PROOF_JSON and optional AD_ASTRA_PUBLIC_QA_LIFECYCLE_JSON. Each token must belong to the authorized synthetic subject hash. Obtain JWTs through the authorized Clerk test-session flow; this script does not handle customer passwords or create identities.

For a local invocation use the same names, plus AD_ASTRA_PUBLIC_QA_SHA, AD_ASTRA_PUBLIC_QA_SOURCE_PROOF_FILE, optional AD_ASTRA_PUBLIC_QA_LIFECYCLE_FILE and an output directory. SHA-256 hashes cover the exact receipt file bytes, including whitespace. The CLI requires a clean exact checkout and writes exclusive sanitized evidence; do not run against a dirty development tree.

## Reviewed evidence schemas

Source proof fields: schema=ad-astra-reviewed-source-proof/v1, component=public-marketing-site (the release bundle's public component), repository=Centauri-corp/ad-astra-public-source, publicSha, origin (without trailing slash), environment, provider=vercel, providerCommitSha (same SHA), deploymentId (actual dpl_ ID), basis=provider-source-readback, observedAt, evidenceUrl, reviewer and reviewState=approved.

The protected digest pins an independently collected and reviewed provider read-back, not a developer-authored claim. Both SHAs, component, deployment origin, environment and observation validity are checked. Exact-source/artifact evidence has no default daily review expiry: it remains usable until its scope changes or it is revoked. Optional revoked=true or revokedAt invalidates it; expiresAt is honored only when explicitly present under the receipt owner's expiry policy. Invalid or future observations are rejected (30-second clock tolerance). Actual JWT expiry and session revocation remain live checks. The QA script **does not independently query the provider** and labels this accepted external evidence rather than freshly verified provenance. Keep the actual underlying provider receipt linked; a fabricated or self-approved JSON document is not acceptable evidence.

Lifecycle bundle: schema=ad-astra-reviewed-public-lifecycle/v1 and receipts array. Each receipt has kind (session-revocation, natural-expiry or account-recovery), the same component/repository/publicSha/origin/environment/reviewer/reviewState/observedAt/evidenceUrl fields, identityPlane=public-clerk, issuer=https://clerk.adastra.global, syntheticIdentity=true, subjectHash and result=observed-pass. Revocation/expiry additionally bind sessionHash and tokenHash (SHA-256), not raw token values. Revocation requires revocationConfirmed=true; expiry requires acceptedBeforeExpiry=true and expiredNaturally=true; recovery requires recoveredSessionConfirmed=true and oldAccessOutcomeVerified=true. These must come from actual observed tests, not generated flags.

Public session responses must identify protocol=ad-astra-customer-session/v1, including 401 denials. Missing or older protocol markers cannot satisfy this QA lane. The backend uses the side-effect-free bridge to check live session revocation; the QA never treats legacy JWT signature validation alone as that contract. Revocation tests replay an unexpired, actually revoked token at POST /api/session and require 401. A session endpoint that still accepts a revoked JWT will fail this check. Expiry requires an actual previously accepted token and a reviewed natural-expiry receipt, then repeats the expired token request. Recovery is reported as accepted reviewed external evidence, never as executed by this CLI. Recovery and other lifecycle receipts retain exact-source validity without requiring a fresh human review every 24 hours.

## Results and limits

Exit 0 means the scoped public session checks passed and all required lifecycle receipts were accepted. Exit 1 means a tested contract failed; exit 2 means blocked or partial evidence. Missing recovery/expiry/revocation is unverified and cannot create a green pass. All outcomes require independent public-component review and retain productionAuthorized=false.

The script tests the hosted catalog, unauthenticated and forged POST bearer sessions, an unauthenticated ask denial, a valid session and a repeat of that same valid bearer. Repeating a valid session is allowed and is **not** paid-request idempotency evidence. No authenticated /api/ask is sent. Paid entitlement, duplicate AI admission, tenant isolation, delivery, billing and CRM remain explicitly unverified by this lane. Only sanitized reports are uploaded; raw receipts and tokens are not artifacts.

Offline checks: node --test test/engine-stream.test.cjs test/public-customer-qa.test.cjs. Browser fixture: node scripts/accept-agent-selection.cjs (Playwright Chromium installed). No generated pages or inventory are updated by these focused checks.
