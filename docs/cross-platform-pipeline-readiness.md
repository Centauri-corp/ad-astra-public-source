# AD ASTRA cross-platform pipeline readiness

Status: development integration, not production approval or an activated customer service.

## Current release lane

PR #25 (`audit/comprehensive-reconciliation-20261105`) supersedes PR #24. This integration preserves its exact `c896213c5752a0e0d044f1bcac4d37355dbc9a8a` tree, including Safari resolution, customer-access, CSP, webhook compatibility and hardened graphics evidence changes. Only the new diagnostic adapters, tests, documentation, exact applied migration, npm test entry and function duration are added. PR #27 previously integrated these adapters into the older graphics branch; both histories are retained. No public HTML, frontend script, image, media file, authentication implementation or billing implementation is replaced by this reconciliation.

## Implemented service boundary

- Supabase: service-only read RPC `astra_pipeline_readiness_v1()` wraps existing private diagnostics, with SECURITY INVOKER, an empty search path and explicit anon/authenticated EXECUTE revocation. Migration `20261105201242_add_server_only_pipeline_readiness_rpc_v1` is already installed. Service-role execution and denied client calls were verified. No rows, release settings or asset approvals are changed.
- Sanity: five draft `astraIntegrationStage` documents in private dataset `production`, group `graphics-pipeline-v1`. Creative metadata is intent, not approval. Reads bind to document revisions and return a digest, not draft contents.
- GitHub: read the exact PR #25 head, recorded reviews and named check runs. A submitted approval is not proof of reviewer eligibility; protected-branch merge remains authoritative.
- Vercel: bind deployment ID to the expected project/team and source SHA. READY staging is not production acceptance.
- Catalyst: organization discovery was blocked by connector safety checks. No org/project identity was verified; no resources were provisioned. The adapter returns blocked and never dispatches. This package does not invent Catalyst initialization files.

## Private HTTP endpoint

`GET /api/pipeline-readiness` returns 404 by default. Enabling it requires explicit server-side `AD_ASTRA_PIPELINE_AUDIT_ENABLED=true`, one verified Clerk subject in `AD_ASTRA_PIPELINE_REVIEWER_SUBJECT`, and existing verified session middleware. Ordinary signed-in customers remain denied. HEAD authorizes without provider work; POST and query parameters are rejected. Responses are private/no-store and noindex. A 15-second in-process cache deduplicates authorized reads; it is not a durable quota or monitoring service.

## Secure provisioning

Configure credentials directly in the approved server environment, never in chat, browser code or Git. Runtime acceptance is pending a real reviewer session and secure setup of:

- `AD_ASTRA_PIPELINE_SUPABASE_SECRET`: server credential for the RPC.
- `AD_ASTRA_PIPELINE_SANITY_READ_TOKEN`: read access to private editorial contracts.
- `AD_ASTRA_PIPELINE_GITHUB_READ_TOKEN`: optional repository-read token.
- `AD_ASTRA_PIPELINE_VERCEL_READ_TOKEN`: read access to the bound project/team.
- `AD_ASTRA_PIPELINE_REVIEW_SHA`: exact PR #25 head; rebind only after source review.
- `AD_ASTRA_PIPELINE_DEPLOYMENT_ID`: exact reviewed staging deployment.

No credential values were retrieved, generated or set by this implementation. Missing configuration remains a blocker, not success.

## Tests

Run `npm test`, `npm run check`, and `npm run integration:audit -- --strict`. All inherited access/security/webhook/graphics suites are retained alongside 18 new adapter/API tests. Without configuration the CLI makes no provider requests, reports blockers, and exits 2 in strict mode. Fixtures establish behavior, not real connected acceptance. Fixed origins, no redirects, bounded JSON, timeouts, source SHA checks, freshness and redacted errors are enforced. The only POST is the read-only Supabase RPC with `{}` arguments.

## Release and rollback

Real asset bytes and independent reviews, video acceptance, unresolved model costs, current budget evidence, eligible GitHub review and exact-main production acceptance remain separate requirements. This API cannot authorize spending, CRM writes, outreach, billing, film premiere or publication.

Rollback source through a reviewed revert with the endpoint disabled. Remove only the additive RPC after checking callers using `DROP FUNCTION public.astra_pipeline_readiness_v1();`; retain the private view and all records. Sanity contracts remain unpublished drafts.
