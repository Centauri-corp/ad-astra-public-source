# Public shared monthly budget client

## Release status

The public handler now contains reservation and settlement client plumbing.
`openai-direct.sharedLedgerIntegrated` remains **false** in the source-controlled
provider policy. All five existing release flags still apply. No remote bridge,
database change, permission expansion, paid request, or live reservation is
created by this patch. The public Coming Soon state remains in force.

This is a client contract, not evidence of a deployed accounting integration.
`https://wewznejqpnsmiwkbozgw.supabase.co/functions/v1/astra-customer-budget` is a
proposed, pinned function path on the existing AD ASTRA Supabase project. This
patch does not claim the function exists. No alternate endpoint is accepted.

## Implemented request flow

1. Existing server authentication verifies the Clerk session JWT. The release
   gate checks the source policy, legacy flags, and required configuration.
2. The handler requires a UUID `Idempotency-Key`, valid provider credentials,
   and the existing Redis hourly quota and conservative daily reservation.
3. The client requests shared monthly admission before dispatching the provider.
   Its operation key is scoped to the verified issuer and subject; a request hash
   binds the question, mode, fixed model, token limit, and versioned policy.
   The browser cannot supply a tenant, user UUID, provider, model, or cost.
4. The bridge must independently authenticate both the production workload and
   the original customer JWT, resolve canonical membership and entitlement,
   reserve capacity atomically, and issue one dispatch permit for the operation.
   The client checks those bindings, USD, a ceiling no greater than $500/month,
   a two-cent reservation, and a dispatch lease of at most 60 seconds.
5. The handler sends one bounded request to the existing fixed OpenAI endpoint.
   There is no provider retry. Only the provider credential reaches OpenAI;
   workload and customer credentials are sent only to the pinned bridge.
6. The client submits the provider response ID, fixed model, and optional request
   ID for settlement. It never submits monetary cost, pricing, usage totals, or
   an assertion that a cost was verified. The bridge must obtain that evidence
   independently and settle the ledger exactly once.

The original $10/day Redis control remains an additional conservative limit.
It is not shared monthly accounting. Duplicate attempts can consume daily or
hourly capacity even when shared admission rejects a duplicate; no refund is
introduced. The browser retains the same operation key for an uncertain retry
of the same request within that page session. It does not persist prompts or
promise deduplication across page reloads or an intentionally new operation.

## Authentication and transport contract

The bridge URL must exactly match `AD_ASTRA_CUSTOMER_BUDGET_URL`. The client also
requires `VERCEL_ENV=production`, the existing public Vercel project
`prj_FX8QO3TIqUNAfFR4enz0bALmjeg1`, team `team_5xblMPo2zEBjbz4KPmeDVHPr`, and a
current `VERCEL_OIDC_TOKEN` bound to that production project. Workload claims are
locally inspected only to reject misconfiguration; the remote service must
verify the signature with trusted Vercel JWKS and independently enforce issuer,
audience, subject, project, team, environment, and expiry. A supported runtime
token refresh mechanism and actual production claim shape still need acceptance.

Requests use `Authorization: Bearer <workload token>` and the separate
`X-Ad-Astra-Customer-Token` header. Customer JWTs must be independently verified
against the existing Clerk issuer, audience, authorized origin, active session,
and expiry. A service role credential must not be exposed in browser code or
substituted for customer verification. Server mappings must resolve Clerk
subjects to canonical application users and current tenant membership; no
user-editable metadata or fixed operator tenant may establish that membership.

Every response must echo the protocol, fresh request nonce, operation and request
hash, project, provider, model, currency, and verified canonical identity. Bodies
must be JSON and at most 16 KiB. Requests have three-second deadlines, no cache,
and reject redirects. Errors return bounded public codes without tokens,
provider bodies, tenant identities, or monetary details.

The existing private `astra-control` production workload and operator binding
must remain separate. Adding the public project to that private trust policy
does not create a customer authorization boundary and is not part of this work.

## Retry and cost reconciliation requirements

The client rejects a second dispatch using the same in-memory admission. The
remote service must enforce the durable rule across processes: one reservation
and at most one dispatch authorization per scoped operation key, with immutable
request/provider/model/tenant binding. An existing key returns HTTP 409 instead
of another dispatch permit, including when a reservation committed but its
response was lost. A new nonce must never grant a new permit for the same key.

Provider errors, response loss, missing receipts, unavailable independent cost,
and settlement timeouts retain the entire reservation. A completed answer is
returned even when accounting is pending, so a settlement outage does not turn
successful work into an automatic provider retry. `record-unknown` is an
idempotent reconciliation signal; its failure must not release a hold.

A settlement must bind the original reservation and receipt to independently
retrieved, verified provider cost. Monetary values are integer USD cents with
conservative rounding by the service. Unknown cost must never become zero.
Same-receipt retries return the original settlement; different receipts or
conflicting evidence are rejected. A verified cost above the reservation must
be recorded as an overrun and close future execution. Durable reconciliation
must recover receipts and holds after process loss without needing an expired
customer session or repeating the paid request.

## Remaining release dependencies

- Implement and audit the separate customer bridge, canonical identity mapping,
  current session/membership/entitlement checks, and minimal server-only RPC
  privileges. Do not expose private ledger functions directly to customers.
- Prove atomic admission, one dispatch authorization, immutable binding,
  exactly-once settlement, retained holds, month boundaries, and shared $500 USD
  coverage with real database concurrency tests and cross-service acceptance.
- Establish independent exact-cost evidence for the direct OpenAI path. A
  completion ID or model usage response alone is not established monetary
  reconciliation. With the existing `store:false` request, recoverable evidence
  after a process crash must be specifically demonstrated.
- A dedicated customer bridge could instead use the existing metered AI Gateway
  control flow and its independently retrieved generation-cost receipts. That
  requires an audited customer-specific authorization boundary and approved
  provider/model/routing changes; this patch neither makes those changes nor
  broadens private operator trust.
- Verify the workload token lifecycle, real Clerk customer mapping, provider
  credentials and permissions, all existing release reviews, and hosted negative
  tests before replacing the source-controlled false policy. An environment
  flag or a successful synthetic fixture cannot establish those facts.

`test/shared-budget.test.cjs` exercises the real client and handler against
isolated synthetic transports: signed customer authentication, admission denial,
credential and endpoint binding, replay/conflict handling, unknown-cost holds,
settlement validation, and browser retry keys. Its in-memory bridge fixture is
not a deployed service or proof of PostgreSQL concurrency. Tests make no live
reservations, paid provider calls, or remote configuration changes.
