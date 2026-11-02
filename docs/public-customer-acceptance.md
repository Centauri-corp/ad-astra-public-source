# AD ASTRA: acceptance from the public journey backward

Date: 2026-11-02. Scope: the existing AD ASTRA public project. The website remains Coming Soon; the film remains withheld until its separate release review. A successful build is not a customer launch decision.

| Public outcome | Immediate boundary | Required evidence before opening service | Current repair |
| --- | --- | --- | --- |
| Understand what is available | Homepage and customer access CTA | Coming Soon copy, canonical destination, no unsupported availability claims | Public entry points to `/access/`; status page is readable without JavaScript |
| Explore the intelligence vision | `/intelligence/` and `/brain/` | Pages render, links resolve, conceptual graphics do not claim active inference | Informational pages restored; remain noindex |
| Control the visual experience | Hero and global motion control | Ended video offers one-click replay; pause, reduced motion, Save-Data and failure states remain usable | Deterministic media-event behavior regressions included |
| Reach an authorized workspace | Canonical origin and private access handler | Actual-host redirect/cookie testing, valid identity and entitlement checks, readable failure states | Knowledge visit no longer automatically redirects; private content remains hidden; legacy paid-access handler preserved |
| Submit a request only when service is available | UI availability and server release gate | Default-disabled input; all five release flags and verified server authentication; negative tests | Submit is disabled before availability loads; existing server gates are unchanged |
| Receive an authorized, useful result | Tenant, subscription, model and orchestration services | Positive and denied tenant/entitlement tests, evidence-quality review, job recovery and production model acceptance | Remains a release dependency; this public repair does not claim it is complete |
| Pay and operate within approved limits | Billing, quotas and shared expenditure controls | Verified billing and refunds; enforceable cross-vendor $500/month ceiling | Existing endpoint budget/quota checks preserved; they do not prove the shared monthly ceiling |
| Watch the released film | Approved master, audio, rights, captions and website playback | Exact export approval, synchronized playback, accessibility, source clearance | Public film stays withheld; private film QA is separate |

## Immutable source and private handoff

The repair begins at production commit `6ab3f97f322bbe17f874b6db350f0b337c8abfc4`. Authentication, quotas, release gates and provider-call code are retained byte for byte. Original images and videos are inherited from the same Git tree.

The project-level `/platform` rewrite is intentionally not replaced by the newer Clerk-only page: the pinned Daylight handler also enforces paid entitlements. The retrievable Daylight source is incomplete and has no canonical Git commit metadata. Complete immutable source and positive/negative entitlement tests are required before rebuilding it or changing its redirect boundary. General-public availability links now use the same-origin `/access/` page without silently entering this legacy handoff.

## Acceptance scope

`npm test` includes the unchanged security tests, motion-state regressions and public-journey checks. Media events are deterministic fixtures: they verify controller behavior, not real video decoding or physical-device acceptance. The deployment build still requires static privacy/release checks, complete link/asset integrity and real Redis acceptance. No gate is set to true as a substitute for evidence, and no paid model is invoked by the tests.

Hosted browser, mobile/Safari/VoiceOver, real customer onboarding, tenant/entitlement, billing, cross-vendor expenditure and final film creative acceptance remain explicit release requirements.
