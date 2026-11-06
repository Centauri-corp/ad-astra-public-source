# AD ASTRA production repair

Canonical target: Zoheb Khan team `team_5xblMPo2zEBjbz4KPmeDVHPr`, public project `prj_FX8QO3TIqUNAfFR4enz0bALmjeg1`, domain `adastra.global`.

This source was isolated from the matching live deployment `dpl_GUQqWJ3jTy9f73XqfQFvmbqhnHUy`. The 49 public files were compared byte for byte before repair. No Energy America or private Sanity source is included.

Build validation runs local adversarial tests, static privacy/SEO checks, and real Redis acceptance using disposable random test keys. Tests never call a paid model. Redis tests must pass before Vercel marks the build READY. Automatic Git deployments remain disabled.

All five existing verification flags must be exactly true to permit a model call. Never set a flag as a substitute for evidence. Authentication uses the existing Clerk issuer and the configured `ad-astra-workspace` audience. A real signed-in Clerk acceptance test and runtime security review remain required. Synthetic unit JWTs do not complete that review.

The owner authorized a maximum $10 daily model budget on 23 October 2026. Configure `AD_ASTRA_DAILY_BUDGET_MICRO_USD=10000000`. Reserve $0.02 per attempted call atomically in Redis, with no refunds after ambiguous provider failures. The same ledger covers all environments and deployments. Per-user quota is 12 attempts in a rolling hour from first request. Budget resets at midnight UTC using Redis time. No model retries. The only allowed model is `gpt-4.1-mini-2025-04-14`, at most 16,384 conservative input tokens and 700 output tokens. Verify current pricing before enabling; reviewed rates $0.40 input/$1.60 output per million tokens. This controls this endpoint, not other applications using the same provider account.

Stage a production build without assigning domains, verify its exact deployment, recheck current alias for concurrent changes, then promote. Preserve the prior deployment and reassert manual domain assignment. The prior live-AI deployment contains weaker controls; use it only for urgent site recovery with AI explicitly disabled and a new tested build if required.

Home is the only indexable route in this repair. The public Astra Lumen agent surface and supporting market pages remain noindex while approval is unresolved. Customer portal routes redirect away from the public experience. Film stays withheld. Private Sanity datasets and v2 design drafts are not published.

The GitHub verification workflow is source only until pushed to a dedicated verified repository and required branch checks are configured. It deliberately has no production deployment credential.
