# Ad Astra graphics reconciliation — controlled P0/P1 baseline
Date: 2026-11-21
Status: REVIEW ONLY — no production authorization

## Immutable source evidence
- Public repository: Centauri-corp/ad-astra-public-source at 3cf065ce15dc945e36996ee64c80065d0767d269.
- Internal repository: Centauri-corp/ad-astra-internal-source at 0daa1cc36fcf30385da8047aa22445eb62df6a33.
- Public Vercel staging deployment: dpl_A1uGLNGCQs9zY8R37ZvYLXUukmft (READY is not functional acceptance).
- Parallel Vercel preview: dpl_6mzox9ygz5FvDQ6JtfjJFSZJkRt2.
- Public Vercel git.deploymentEnabled=false. Do not change in this audit.

## File-level reconciliation
1. public/index.html: multiple journey/graphics scripts, inline Lumen styles and static portrait/video composition. Audit script initialization order, overlap, mobile positioning and reduced-motion behavior.
2. public/app.js: accessible tab, navigation and mode changes. Preserve keyboard behavior and text-first fallback.
3. lib/graphics-intelligence-core.cjs: seven-system deterministic scene AST, static-by-default, explicit activation, provenance, no private identifiers. This is the candidate canonical public scene semantics.
4. lib/products-solutions-graphics.cjs: separate product scene schema and visual palette. Introduce a versioned adapter and unify tokens only after contract tests; do not silently replace schemas.
5. Internal graphics workers and operator views: private-only boundaries. Public publishing must use reviewed, licensed, immutable assets and never expose private tenant or operator data.

## Decision and implementation order
- P0: inventory exact files, scripts, scene assets, imports and GitHub branch deltas; record dependency graph and SHA.
- P1: implement an adapter from products-solutions scene v1 to graphics-scene v1 with explicit product semantics; retain backwards compatibility and add unit tests.
- P2: choose one public journey controller, remove duplicate event handlers only after regression tests; ensure semantic navigation works without GPU.
- P3: progressive WebGL renderer as an optional adapter; static fallback first, explicit motion activation, keyboard/touch support and GPU budget.
- P4: mobile layout and visual comparison against DJI's product-storytelling principles, not copied assets.
- P5: public asset rights/provenance review and CRC approval receipts; no operator endpoints or private identifiers in client bundle.
- P6: test navigation, accessibility, performance, auth boundaries, billing/CRM sandbox, and security headers.
- P7: test exact SHA on staged production build, smoke test and rehearse rollback.
- P8: CRC single consolidated release approval after all gates; do not promote before then.

## Acceptance evidence still missing
- Exact-commit repository-wide import and route inventory.
- Browser screenshots and motion/interaction regression on desktop/mobile.
- Public/private scene adapter contract tests and production bundle audit.
- Performance and accessibility results.
- Supabase, Clerk, Stripe, Zoho, Sanity and asset provenance verification.
- Staged production smoke test and rollback evidence.

## Safety
No production promotion, automatic publication, external CRM writes, customer charges, secret retrieval or bypass of approvals. This document is a reconciliation checkpoint, not evidence of passing gates.
