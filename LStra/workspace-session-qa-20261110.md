# AD ASTRA — session and tenant-scope QA increment

Implemented on `codex/workspace-session-boundary-20261110`, following exact parent `f86afeb3e1211d8029f7d3d0b9819c436666300a` (PR #34). The previous candidate remains unchanged for its own review. All source and local evidence are retained in this LStra worktree.

## Story and implementation

A reviewer opens preview boundaries, explicitly checks server configuration metadata and sees whether session verification is configured for QA—not whether customers are approved. A separate bodyless same-origin handshake verifies a short-lived Clerk bearer token without calling account/customer APIs. Signed claims establish a personal or active-organization scope, while all customer/commercial execution remains closed.

- `components/access-readiness.tsx` reads `/api/access-status` on demand with credentials omitted. Its strict response parser refuses activation claims, malformed metadata and stale success after a failed refresh.
- `server/session.ts` uses pinned `@clerk/backend` 3.27.0 and an integrity-protected public PEM. RS256 signature, exact foundation issuer/audience, authorized party, dates, five-minute maximum lifetime, session IDs/state and legacy/v2 organization structure are validated. Unsupported header key references, delegation, machine tokens and ambiguous organization claims fail closed. No remote key/record lookup or secret-key fallback is used.
- `POST /api/session` denies body/query identity fields, cross-site requests and absent/invalid configuration. Its reply omits the token, subject, session ID, tenant namespace and raw SDK errors. Stalled bodies are bounded. Verification does not grant customer access.
- `sameVerifiedScope` accepts only in-process principals produced by successful verification, compares server-supplied scope metadata and rejects cross-scope, cloned and expired principals. It is not a database permission/membership resolver.
- `server-only` boundaries plus compiled-client scanning prevent verifier configuration and signing fixtures from entering browser JavaScript. Fixture private keys are generated in memory, not committed or saved.
- Preview modal placement, bounded height and scrolling were corrected; the new panel was inspected at desktop and mobile sizes.

## Acceptance evidence

The existing website's 37 source/security/release tests and 109-file source-integrity fingerprint remain unchanged. The workspace has 25 contract/session tests, four optimized-build/runtime checks and 16 browser scenarios. These cover signature and claim forgery, same-kid key separation, personal/organization scope separation, expiry, input bounds, configuration status parsing/redaction and the preserved chat/graph privacy boundaries. Production is denied even with valid local QA configuration; a configured non-production compiled server can verify a locally signed fixture token while still reporting `customerAccess:false` and `providerQaAccepted:false`.

Type generation, strict TypeScript and optimized build are checked. Dependency audit reported zero known vulnerabilities at this check. The existing secret-free CI repeats these commands; it never deploys the app. Local screenshots are stored in ignored `LStra/evidence/workspace-access-readiness.png` and `workspace-access-readiness-mobile.png`.

## Explicitly unresolved external acceptance

Local cryptographic fixtures are **not provider receipts or real two-tenant database QA**. The foundation Clerk issuer contract has not been provider-verified in this environment, which reports no configured credentials. The following remain separate requirements:

1. Independent review of the exact new candidate and approved protected Development/QA configuration. PR #34 had no independent review when this increment began.
2. Real provider sign-in/recovery and immediate logout/revocation QA. Offline token verification only detects expiry and signed state; it cannot observe provider revocation before expiry.
3. Canonical identity-to-tenant membership mapping, resource permissions, database row policies and authenticated two-tenant datastore tests. Signed scope namespaces are not Catalyst/Supabase tenant UUIDs and are not used for any real data query here.
4. Provider key rotation/operational QA, approved model execution, usage/cost limits, commercial/regional/rights evidence and final release authorization.

Protected setup names and exact commands are documented in `apps/customer-workspace/README.md`; values must not be posted in chat or exposed via `NEXT_PUBLIC_*`. No account was provisioned, no personal customer record was accessed and no existing external gate is marked accepted by this increment. No merge, production promotion, domain/DNS/indexing change, billing/CRM write or outreach occurred.
