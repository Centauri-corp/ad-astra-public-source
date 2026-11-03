# AD ASTRA Public Site — Codex Agent Instructions

This is the **public informational website and early-access experience**, not the private Intelligence OS or its customer-inference runtime. Follow the existing repository source and release contracts; these instructions do not grant deployment or payment approvals.

## Source-of-truth and project isolation

- Repository: `zohebkhanfiji-ux/ad-astra-public-source`.
- Vercel public project: `prj_FX8QO3TIqUNAfFR4enz0bALmjeg1` in **team `team_5xblMPo2zEBjbz4KPmeDVHPr`**. Never use the private Intelligence Foundation project `prj_Xp4ChPgnGc5AivH69sQtT89vyFkS` (different team `team_Sth5QRQV27xdek3gwROdfjSJ`).
- Canonical cross-repository release ledger: https://github.com/zohebkhanfiji-ux/ad-astra-internal-source/issues/18. Editorial approval in the private AD ASTRA Sanity project, engineering provenance in GitHub, runtime in Vercel, and CRM/financial reality in Supabase/provider receipts must remain distinct.
- A Vercel production build can originate from a feature branch. **Inspect the exact live deployment SHA before branching**; `main` is not automatically the live source of truth. Never overwrite the live website from a stale branch.
- As of the recorded November 2026 baseline, the live informational deployment was `dpl_3nc8Jkbe578cRRA1Uq63WcbrtiZ2` (commit `58d4375de1a9dd62694a9e982c845f9692339747`). Re-check this at task time; it is not a perpetual target.

## Bounded Codex coding workflow

1. Select the smallest authorized task, inspect relevant source, open PRs, target branch, live Vercel deployment and known failed CI. Check if a fix already exists on a different unmerged branch before writing another.
2. Preserve public Coming Soon claims, real `/access/` consent intake, explicit closed enrollment, secure preview sign-in, `noindex` route controls, CSP and operational status messaging unless their specific release gate is accepted.
3. Make incremental, reviewable source/test changes; keep assets, HTML routes, API code and configuration consistent. Do not edit the private OS, EA-VOLT or CRC-COMMAND from this repository.
4. Verify with `npm test`, `npm run check`, the Vercel build check, and the complete browser suite (`test/browser`, Chromium **and** WebKit). Do not weaken actual MP4 natural-end/replay checks simply to get CI GREEN. Include a11y, mobile widths, keyboard/focus, opt-in and denial-path checks for affected journeys.
5. Build a protected Vercel preview against the **correct public project**, pinning the commit. Do not assign `adastra.global` until the exact candidate is reviewed, accepted and staged as a production build with rollback.
6. Report commit, PR, CI job IDs, protected deployment ID, runtime receipts, and whether independent reviewer/owner authorization is complete. Unknown or blocked checks are `NOT_TESTED`; do not assert launch completion from source tests alone.

## Customer and safety gates

- Public information and consented early-access requests may be live; **live paid subscriptions, customer self-enrollment, invoices, model inference, unverified CRM write-sync, paid advertising and outbound outreach remain blocked** until their independent release gates pass.
- No public provider/model request without a signed-in, authorized tenant/customer entitlement, verified cross-vendor admission and settlement, safe quotas and the **$500 USD/month shared infrastructure ceiling**.
- Do not turn a planning price ($99/mo or $5,000/mo), proposed MRR, pipeline or anonymous signup into a deployed offer or a real payment link. Revenue claims require billing-provider receipts.
- Keep Clerk/session verification, anti-open redirect behavior, workspace isolation, consent/opt-out, rate limits, source-integrity checks and a valid rollout/rollback path. Never expose service-role keys, private model credentials or internal tenant data in public files.
- Film and graphics may publish only after media provenance, rights/creative approval, real browser playback and release acceptance. A draft export or a private review API is insufficient.
- No production deployment, public inference, marketing spend or approval-bypass is implied by an instruction to “resolve” a code issue. Act on reviewable code, require scoped human approvals for external side effects, and keep the working site online.

## Definition of done for Codex changes

**Changed files + exact commit + relevant tests + build/preview evidence + explicit release state + next owner action.** Separate source completion from verified production acceptance. If a test fails twice, diagnose its trace or root cause rather than repeatedly rerunning it. Never call a scheduler an always-on worker without a durable execution receipt.
