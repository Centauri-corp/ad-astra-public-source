# AD ASTRA interactive workspace — first implementation increment

Implemented 2026-11-10 in `apps/customer-workspace`, on branch `codex/interactive-workspace-20261110`. Parent website candidate: `c6b8b22dd550da3c6e7275b014a2edab40404447` (public PR #33). That newer candidate was fast-forwarded before handoff; its marketing pages, API/library surfaces, Vercel settings and source-integrity inventory remain unchanged by this increment.

The new package combines Next.js App Router / TypeScript, AI SDK UI streaming, React Flow and Tailwind. Its AD ASTRA visual system and canonical mark align with the existing website. A split chat/workflow interface provides three fixed scenarios, seven read-only nodes, event highlights, a step inspector, fictional reference labels, an accessible list, mobile layout, reduced-motion behavior, cancellation, retry and memory clearing.

This is **synthetic scenario implementation**, not customer service activation. No language model, real retrieval, private reasoning, CRM record, external action, billing or persistent conversation is used. Typed text is not transmitted; only an allowlisted scenario ID and temporary UUID reach the demo endpoint. No credentials were obtained or stored. Live chat and graph mutation endpoints deny execution independently of browser controls.

## Verification

- Existing website/release suite: **37 passed**; all 109 inventoried website/API/library files retain their checked fingerprint.
- Workspace contract suite: **11 passed**, including graph/event ordering, terminal states, foreign-event rejection, bounded inputs, origin checks and default-off configuration.
- Built-server runtime gates: **2 passed**. The workspace returns 404 by default and under `VERCEL_ENV=production`, even with the preview flag enabled. Live chat returns 503 and graph writes return 403 in both cases.
- Final browser suite: **13 passed** using local Chromium against the optimized production build. Earlier repeated runs also passed. Covered fixed scenario streaming, all seven node states, no typed-text/history transmission, escaped markup, no external browser requests/storage, mid-stream cancellation, network failure/retry, premature EOF/retry, reload clearing, modal focus isolation, read-only graph controls and responsive widths 320/390/768/1440.
- Strict TypeScript/Next type generation and optimized build passed. Dependency audit reported **0 known vulnerabilities** at the time of checking.
- Desktop and mobile screenshots were visually inspected. Local evidence is retained in ignored `LStra/evidence/workspace-desktop.png`, `workspace-completed.png` and `workspace-mobile.png`; these are not public uploads or production receipts.

The new secret-free CI job repeats type generation, contracts, build, runtime-denial tests and browser QA. No workflow deploys this package. See `apps/customer-workspace/README.md` for exact commands and configuration.

## Not cleared by this increment

Authentication remains an unaccepted Clerk integration direction; no identity provider was replaced or provisioned. Supabase persistence, tenant mapping/RLS, authenticated tenant isolation, provider/model execution, cost acceptance, rights, commercial/regional evidence and independent exact-candidate approval are not certified by these local tests. The preview origin check is not authentication. Graph checkpoints do not impersonate independent approval.

Next: independent source/visual review, then approved identity and server-derived tenant integration with protected QA. Only accepted provider execution/data/usage evidence and final human release authorization can support controlled production promotion. No merge, domain/DNS/indexing change, production deployment, CRM write, billing operation, outreach or public activation occurred.
