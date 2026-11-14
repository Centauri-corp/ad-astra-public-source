# Ad Astra — Website & Customer Experience

This is the dedicated delivery project for Ad Astra's public website and customer experience. It remains inside the existing public source repository so product definitions, design, engineering and release have one reviewable history. It does not create a second production repository or a new model gateway.

The entry point is [project.json](project.json). The controlled public release candidate is PR #39, descending from merged PR #38 and the owner-selected PR #36 base before review. Existing private engine, provider, CRM, identity and billing authorities stay private.

## One vertical delivery chain

Company and foundation contracts → product families → actual model/agent/offer contracts → customer journeys → brand and selected artwork → page implementation → backend acceptance → technical and visual review → exact-source release → continuing improvement.

Each public route belongs to a page group and journey stage. The generated project report covers every route in the release ledger and connects it to its source, product families, primary visual role and acceptance state. A new route without ownership or a new model without a customer-experience binding fails the project audit.

The public contract currently distinguishes the foundation integration, capability offers, customer agents and sector profiles. Their counts and descriptions are derived from the existing catalogs. Discovery of additional provider models never makes them customer-ready. Provider admission, capabilities, safety, pricing and real acceptance evidence must precede an availability claim.

## Graphics standard

[visual-standard.json](visual-standard.json) governs art direction, color tokens, responsive delivery, motion and review. [asset-selections.json](asset-selections.json) selects the current candidate artwork and preserves the original provenance records. Generated compatibility files keep the existing page builders aligned with this project.

The intended experience uses physically grounded cinematic artwork, optical glass, restrained titanium and a neural spiral with a clear human purpose. Images need deliberate lighting, material depth, clean edges, controlled contrast and useful mobile composition. Product pages explain an outcome and lead into the platform. Diagrams support that explanation; abstract decoration cannot substitute for a usable product.

DJI and Apple are quality references. Their branding and assets are not copied. Generic humanoid heads and the old static portal mockup are retired from primary website use. Original source masters and previously accepted private references remain preserved.

The desktop master target is 3200 pixels wide. Current review exports can be smaller; the report shows actual decoded dimensions and byte counts. An enlarged export must disclose enhancement and original resolution. No output is labelled native 4K merely because it was resized.

## One consolidated visual review

[visual-review.json](visual-review.json) records the actual owner decision against the current website fingerprint. It starts pending. Review the desktop and mobile page set, the selected assets and rights evidence, and all eight criteria: story alignment, cinematic craft, product clarity, brand consistency, desktop composition, mobile composition, typography/contrast, and motion/fallbacks. Each score must be at least 4/5. A high average cannot hide one failed criterion.

This is the existing visual acceptance obligation expressed as one review bundle. Source CI, browser checks and human visual acceptance retain distinct evidence. The independent code review and applicable customer/provider release requirements remain governed by the canonical release policy.

## Resources and ongoing design evolution

[resources.json](resources.json) consolidates source, media, CMS and provider references with their observation and selection status. Preserve private media and CMS drafts. A provider connection, generation receipt or CMS approval label does not itself accept this website candidate.

[evolution-backlog.json](evolution-backlog.json) is the ordered work queue for the existing hourly graphics and development owners. Each iteration reproduces a customer-impact issue, advances one useful item, records before/after evidence, verifies the affected flow and commits a bounded source change. Reuse valid evidence when inputs have not changed. Coordinate one in-flight candidate; avoid duplicate generation, empty commits and competing site writers.

Graphics owns the creative evidence and handoff. Website engineering integrates accepted source changes. Independent review and the release owner retain their existing responsibilities. Scheduling an upgrade does not publish a live website or activate AI, billing, CRM, indexing or outreach.

## Development commands

```sh
npm run website:build
npm run website:audit
npm test
node scripts/audit-browser.cjs
node scripts/accept-platform-preview.cjs
npm run website:promotion-check
```

The browser audit uses the loopback server from `scripts/serve-audit.cjs`. Set `AD_ASTRA_PROJECT_REPORT` to save the complete JSON project report. `website:promotion-check` intentionally fails while the consolidated visual review is incomplete or stale. The production build enforces this same visual review; protected previews stay available for review. Visual acceptance does not approve any other release scope.

Completion means a useful, coherent customer journey with accepted graphics and real backend evidence where the experience requires it. The project must not report the full website as visually accepted, globally available or revenue-ready while those outcomes remain unverified.
