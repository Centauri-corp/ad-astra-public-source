# AD ASTRA customer production boundary

Status: **implemented source candidate; live engine remains paused**

The public engine now contains the client side of a durable tenant-budget
admission protocol:

- Clerk authentication is reverified by the private bridge.
- The Vercel workload is pinned to the exact production project and team.
- Every logical request carries one UUID operation key.
- A shared $500 monthly ledger must reserve capacity before provider dispatch.
- Customer membership and paid entitlement are resolved server-side.
- Provider cost settlement must come from independent receipt evidence.
- Unknown provider outcomes retain their reservation and are never retried
  automatically.

The source-controlled provider policy remains sharedLedgerIntegrated false.
That value cannot be changed by an environment variable. It may change only
after the private bridge, identity mapping, billing/entitlement workflow,
provider receipt feed, cross-tenant tests and exact customer E2E have independent
acceptance evidence.

Codex and Ollama are not customer models in this release. Codex is a development
and audit workstream. Ollama is a local evaluation option with no production
runtime evidence in this release environment.
