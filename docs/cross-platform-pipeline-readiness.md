# AD ASTRA cross-platform pipeline readiness

Status: development integration, not production approval or an activated customer service.

## Implemented service boundary

- Supabase: service-only read RPC `astra_pipeline_readiness_v1()` wraps existing private diagnostics, with SECURITY INVOKER, an empty search path and explicit anon/authenticated EXECUTE revocation. Migration: `add_server_only_pipeline_readiness_rpc_v1`. No rows, release settings or asset approvals are changed. Service-role execution and denied client calls were verified.
- Sanity: five draft `astraIntegrationStage` documents in private dataset `production`, group `graphics-pipeline-v1`. Creative metadata is intent, not approval. The adapter binds each read to document revisions and returns a digest, not draft contents.
- GitHub: read the exact PR #24 head, recorded reviews and named check runs. A submitted approval is not proof of reviewer eligibility; protected-branch merge remains authoritative.
- Vercel: bind the deployment ID to the expected project/team and source SHA. READY staging does not become production acceptance.
- Catalyst: organization discovery was blocked by connector safety checks. No org/project identity was verified and no resources were provisioned. The adapter returns a blocked result and never dispatches work. This package does not scaffold a Catalyst application or invent its initialization files.

## Private HTTP endpoint

`GET /api/pipeline-readiness` is absent (404) by default. Enabling it requires explicit server-side `AD_ASTRA_PIPELINE_AUDIT_ENABLED=true`, one verified Clerk subject in `AD_ASTRA_PIPELINE_REVIEWER_SUBJECT`, and the existing verified session middleware. Ordinary signed-in customers remain denied. HEAD performs authorization without provider work. POST and query parameters are rejected. Responses are private/no-store and noindex. An in-process 15-second cache deduplicates authorized reads; it is not a durable quota or production monitoring service.

## Secret provisioning

Provision credentials only in the approved server environment; do not paste them into chat or commit them. The endpoint stays disabled until an authorized deployment reviewer validates these bindings:

- `AD_ASTRA_PIPELINE_SUPABASE_SECRET`: server credential for the installed RPC; never a frontend key.
- `AD_ASTRA_PIPELINE_SANITY_READ_TOKEN`: read access to the private dataset.
- `AD_ASTRA_PIPELINE_GITHUB_READ_TOKEN`: optional repository-read token for public GitHub metadata.
- `AD_ASTRA_PIPELINE_VERCEL_READ_TOKEN`: read access to the bound Vercel project/team.
- `AD_ASTRA_PIPELINE_REVIEW_SHA`: exact PR head SHA; rebind only after source review.
- `AD_ASTRA_PIPELINE_DEPLOYMENT_ID`: exact reviewed staging deployment.

No new credential values were retrieved, generated or set by this implementation. Runtime cross-service acceptance is pending secure provisioning and a real reviewer session. Synthetic fixtures prove adapter behavior only.

## Tests and inspection

Run `npm test`, `npm run check`, and `npm run integration:audit -- --strict`. Without server credentials the audit returns explicit blockers and strict mode exits 2, not a fabricated success. Adapters enforce fixed origins, no redirects, bounded responses, timeouts, exact source binding, freshness, and sanitized failures. The only HTTP POST is the read-only Supabase RPC with an empty argument object.

## Remaining release gates

Real asset bytes and independent reviews, video acceptance, unresolved model costs, current budget evidence, eligible independent GitHub review and exact-main production-target acceptance remain mandatory. Neither this API nor Sanity metadata can authorize release, model spending, CRM writes, outreach, billing, film premiere or automatic publication.

## Rollback

Keep the endpoint disabled and revert this source commit through review. To remove only the additive database adapter after checking callers: `DROP FUNCTION public.astra_pipeline_readiness_v1();`. Leave the underlying private diagnostics view and all asset/customer records intact. Sanity documents remain unpublished drafts and can be retained as the development record.
