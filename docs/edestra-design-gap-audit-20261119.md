# Edestra Website Graphics & Design Gap Audit — 2026-11-19

Source: dedicated branch `integration/edestra-unified-graphics-20261119` based on public PR #47, which itself descends from public PR #46. This is a **source audit**, not browser screenshots or production validation.

## Implemented and retained on this branch
- Existing public customer workspace candidate and Edestra `/life/` route.
- Source-exact import from public PR #41 (deterministic scene compiler, capability budgets, tests and docs). No new unapproved public GPU runtime.
- Opt-in and bounded Canvas 2D visual atmosphere on `/life/`; reduced motion remains static, canvas is decorative/hidden from assistive technology, no external calls.
- `noindex,follow` aligns with existing `scripts/check-release.cjs` secondary-page policy; no production promotion changes.

## Source-confirmed website design gaps
| ID | Priority | Evidence | Correction / test |
|---|---|---|---|
| UX-01 | P0 | Public PR #46 and dependent PR #47 are still separate unreviewed candidates | Review one exact combined SHA with independent QA; do not merge #47 and #46 independently |
| UX-02 | P0 | `vercel.json` has `git.deploymentEnabled=false` and launch manifest marks publicLaunchEnabled=false | Retain fail closed; use staged approved artifact and release receipt before alias/publication |
| UX-03 | P1 | Main homepage has multiple neural/intelligence controls, film and navigation, while `/life/` is new and not present in approved main | Inspect entire route graph, first-value CTA and support paths on mobile/desktop |
| UX-04 | P1 | `/life/` mobile header hides discovery links at widths below 800px and shows Sign in only | Restore an accessible mobile navigation for knowledge/markets/plans, with tested keyboard/touch |
| UX-05 | P1 | `/life/` uses a Unicode-star brand wordmark rather than canonical orbital brand asset | Align logo/mark with rights-reviewed brand-system token; fallback text remains accessible |
| UX-06 | P1 | Existing homepage and Life page use differing palette/typography expressions and scene treatment | Reconcile against `projects/website-customer-experience/visual-standard.json`; avoid unrelated robot/stock art |
| UX-07 | P1 | Graphics PR #41–45 were authored on different branches with alternative renderer paths | One renderer/scene-contract selection; no auto-merges; semantic review of shader, voice, Unreal and V5 diffs |
| UX-08 | P1 | Motion field had no opt-in control before this branch; now opt-in via accessible button | Review media preference changes and offscreen pause on real devices |
| UX-09 | P1 | Core compiler and budget tests were separate PR #41; imported on this branch | Run full tests and check actual policy integration; imported code is not an active GPU renderer |
| UX-10 | P2 | Life page's three product journeys link to the generic `/workspace/`, not individually activated experiences | Confirm validated workspace routing deep links, then use feature-specific destinations if supported |
| UX-11 | P2 | Life page uses repeated panel/grid presentation in journey sections despite full-bleed editorial visual charter | Visual director to approve or replace with open spatial composition; do not mistake CSS for acceptance |
| UX-12 | P2 | Source text includes customer trust claims; consent/legal/support and actual platform availability have not been fully evidenced | Legal/product copy review to distinguish planned from live |

## Critical unverified acceptance (do not claim pass)
- Responsive at 320/390/768/1440, typography contrast on actual hero crops, touch target sizing, focus states, zoom/reflow.
- Screen-reader flow, keyboard and voice alternatives; iOS Safari and Android Chrome; browser Console and no-JS fallback.
- Visual content rights/provenance and hero asset dimensions; no image used as false runtime screenshot.
- Core Web Vitals target mobile LCP <=2.5s, INP <=200ms, CLS <=0.1 using real or representative evidence.
- Verify all routes and assets exist in the *exact staged artifact*, not just filenames in a pending PR.
- Authenticated DayFlow/LearnPath/CareerStep workflows, payments/CRM, Sanity privacy, GitHub effective protections and Supabase approval.
- Existing visual PRs #42 (Unreal) and #44 (shader) are experimental; neither compilation nor GPU tests are proven.

## Dependency and merge order
1. Resolve corporate P0 #127 GitHub rule enforcement and #129 Sanity privacy, with exact-owner evidence.
2. Verify PR #46 workspace foundation; select exact public target from PR #47 and this dedicated graphics branch.
3. Verify imported graphics contract & tests, approve brand/asset rights, visual parity.
4. Complete mobile navigation and user journeys, then device and accessibility QA.
5. Freeze exact public/internal SHAs and provider build; independent review; final Supabase+CEO receipt before publishing.

**Disposition:** REVIEW_CANDIDATE / PRODUCTION_HOLD. Source additions are reversible and do not authorize deployment or billable operation.
