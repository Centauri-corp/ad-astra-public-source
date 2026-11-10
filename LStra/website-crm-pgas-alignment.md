# AD ASTRA website, CRM and product architecture alignment

Audit date: November 9, 2026 (America/Los_Angeles). Live website checks were made during this task. This document distinguishes observed production behavior from the changes on this source branch.

## Observed production status

- `https://adastra.global/` returns HTTP 200. The verified Vercel domain points to production deployment `dpl_5kbS1Cn2RAjr97HynF6u1snCfEkv`, built from public-source commit `563bfab472ea51a42ed0d32be1472fd1f67f881a` on `work`.
- The live homepage SHA-256 is `eb58155d03c43f310d9020ceff36ee28da300f53836ee341c6960990d85ff09b`, matching that commit's `public/index.html`.
- `GET /api/status` returns HTTP 200 with `available:false` and the message that the live engine is paused for release checks. The live release manifest also reports engine availability and public launch as false. This is an informational public preview, not accepted customer/revenue operation.
- Homepage canonical is `https://adastra.global/`, with `index,follow`. Robots permits public pages and disallows `/api/`. The sitemap lists only `/`. The inspected agent, platform, markets, pricing and film pages are `noindex,follow`. These directives do not establish actual search-engine indexing or ranking.
- `/pricing/` explicitly says plans are not for sale and prices are to be confirmed. `/privacy/`, `/terms/` and `/support/` return HTTP 404, and no links to them were found in the homepage footer. Approved policy and support destinations are needed before customer onboarding.
- Live homepage copy uses Astra Lumen; `/agent/` uses Astra Polaris. The stable API identifier remains `astra-lumen`; changing its identifier is not part of this naming correction.
- The homepage prompt changes a local visual field and makes no model request. Voice changes visual states; it is not an accepted conversational voice product. Browser SpeechRecognition is used without requiring local processing, so the existing claim that audio stays in the browser is not substantiated by the implementation.
- Desktop (1440px) and mobile (390px) browser checks found no horizontal overflow or uncaught JavaScript errors. Reduced-motion video elements were paused. Lazy images loaded when scrolled into view; unrequested hidden-menu images were not counted as broken. This is a bounded smoke check, not a full accessibility, performance, security or browser acceptance audit.

## CRM automation status

- The canonical Catalyst Development health endpoint returns HTTP 200 (`ready`, `human-approved-draft-only`). Anonymous `/crm/status` returns HTTP 401. Neither result demonstrates a completed CRM transaction or tenant data isolation.
- The latest Catalyst tenant QA run is `42732785826`; the latest customer auth QA run is `42732789623`. Both failed preflight on merge commit `1a82e7ad0f1bb92e3c9fcfefcb2e5f9cff8562e0`. Their logs reported missing protected inputs. These are historical failures; this audit did not read secret values or assert their current presence.
- Internal `config/experience-growth-contract.json` and `agent/lib/growth-automation.ts` identify the implemented scheduler as a read-only audit. `executionStatus` is `not-implemented`; `lead-intake` and `outreach-review-queue` are not implemented. The configuration does not establish actual 24/7 execution.
- Internal full-platform QC defines a 30-minute GitHub schedule, but the workflow run list returned no executions for that workflow during this check. Running schedules require observed execution/alert receipts before uptime can be claimed.
- `config/online-presence-seo-traffic-flow.json` describes Catalyst Job Scheduling/Signals, whereas the implemented growth heartbeat uses an eve schedule. Choose and verify ownership of each job, deployment, retry and alert; these two descriptions are not proof of two deployed schedulers.
- No customer records, contacts or CRM payloads were accessed. The 5,000 monthly enrollment number remains a planning target with no verified acquisition or paid-enrollment result in this audit.

## Architecture implemented on this branch

The public overview derives from the six PGAS product pods in internal-source commit `318fc520685df55422404ec078e16f50ae392b43`. The internal catalog contains 25 private draft definitions with no verified releases. Their private rows are not copied to the public website.

| Family | Public modes | Visual accent |
| --- | --- | --- |
| Core Intelligence | Ask, Learn, Research | Cyan |
| Creative Studio | Create, Explore | Champagne |
| Specialist Intelligence | Research, Learn, Explore | Cyan |
| Business & Commerce | Ask, Research, Create | Champagne |
| Developer Platform | Create, Research | Cobalt direction |
| Autonomous Workflows | Ask, Create, Explore | Champagne |

- `config/public-product-families.json` is the public-safe family and mode contract, with source provenance and descriptions of audience and intended outcomes.
- `scripts/build-products.cjs` generates a static `/products/` page from that contract. `--check` detects content drift and validates family IDs, mode names and availability state. `npm test` runs this check with existing release/security tests.
- The overview uses the versioned orbital SVG, canonical design colors, distinct static family motifs, 44px link targets, visible focus, responsive cards and reduced-motion scroll behavior. The complete page works without JavaScript and WebGL.
- The homepage's primary action, mobile menu and product section link to the overview. Mode links select the corresponding homepage mode. Customer-facing homepage naming now matches Astra Polaris; existing media paths and the stable model API ID remain intact.
- The model page now discloses the paused engine. Voice copy states that the browser may use its speech provider; error handling stops the microphone meter. No model, CRM or billing execution was introduced.
- `/products/` has a canonical, a pending route-evidence record and `noindex,follow` metadata/headers. No route approval or indexing change was made.

## Remaining development and release order

1. **Product and design:** select one launchable product and audience; approve its specific capability, limits, price, availability and customer acceptance criteria. Map its experience to PGAS Product Systems, Graphics Intelligence and independent release assurance. Extend shared tokens/components and approved media across all pages; reduce homepage research material above the primary customer journey.
2. **Customer and support:** implement the chosen product's loading, empty, failure, usage-limit, entitlement and recovery states. Supply approved privacy, terms, support and contact content. Complete customer authentication, account lifecycle and tenant QA on the exact deployment.
3. **CRM engineering:** implement consented intake, attribution, suppression, deduplication, durable jobs, bounded retries/dead-letter handling, Catalyst-to-Zoho provider receipts and reconciliation. Test replay and failure recovery with synthetic data. Populate protected QA inputs and rerun hosted tests. Identify job owners, prove scheduled runs and alert delivery, then accept any activation separately.
4. **Commercial acceptance:** verify test checkout, signed/replayed webhooks, entitlements, refunds/cancellation, taxes and metering. Measure actual lead-to-activation and paid conversion rather than treating the enrollment goal as a result.
5. **Public release:** accept content, media rights, accessibility/performance and regional claims for the selected scope; freeze the source/deployment and gather independent review, monitoring and rollback evidence. Review search properties and approved sitemap routes before any indexing promotion.

For the next visual increment, retain the approved neural artwork and orbital mark, use one shared typography/color/component system across marketing and the workspace, and drive idle/listening/processing/speaking/error motion from real interface events. Keep research simulations clearly distinct from those operational states. Each final visual needs provenance, rights, file hash, responsive crops, accessible text/captions and an accepted fallback. Proposed web performance acceptance targets are LCP at most 2.5 seconds, INP at most 200 milliseconds and CLS at most 0.1 on the agreed test matrix; this audit did not measure or certify those targets.

The prior internal PR #40 approval belongs to `318fc52`. Public PR #31 remains open at `8bf71f1` without a recorded approval. This branch adds a separate public website increment and does not change either candidate's approval history. No live promotion, CRM write, billing, outreach or indexing action was performed.

## Validation

- Static product generation and route/release preflight passed.
- All 17 existing security tests passed.
- Local Chromium checks at desktop and mobile sizes passed for the six family cards, route metadata, page width, family anchors, cross-page Research mode selection and mobile navigation. No uncaught JavaScript errors were observed.
- With JavaScript disabled, all six family descriptions and navigation remained available.
- Screenshots: `/workspace/LStra/review/ad-astra-products-desktop.png` and `/workspace/LStra/review/ad-astra-products-mobile.png`.

These results verify the source increment. They do not certify customer product availability or CRM automation in production.
