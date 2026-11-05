# AD ASTRA graphics production evidence contract

This is a development-pass code package, not a production approval.

## Trusted evidence flow

Sanity creative brief -> private graphics/video worker -> real storage bytes -> read-only server SHA-256 verification -> independent source and rights review -> version-bound human approval -> QA -> protected GitHub main commit -> exact-commit CI -> production-target staging without domain assignment -> smoke tests and rollback evidence -> final human promotion.

No public browser, self-authored JSON, placeholder image or synthetic test fixture constitutes trusted asset evidence. The audit checker accepts an optional offline JSON snapshot solely to validate internal consistency. The actual backend must retrieve and verify source records independently.

Run node scripts/graphics-readiness.cjs for a BLOCKED report when no evidence is present; add --strict for a nonzero exit when release gates fail. Unit tests cover missing assets, rights, cross-tenant data, hash mismatches, pending model costs, stale budgets, CI drift, self-review and prohibited public execution flags.

The private Supabase diagnostics view astra_private.pipeline_readiness_diagnostics remains server-only. Keep its SELECT privilege unavailable to anon/authenticated. Do not fabricate approved graphics_versions, graphics_previews or video_review_evidence to obtain GREEN.

This patch never changes public AI, subscriptions, billing, provider spending, CRM writes, external publication, or customer access. It cannot merge protected main or promote a Vercel domain.
