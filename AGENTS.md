# AD ASTRA / CRC — Coding Agent Instructions

These instructions are for Codex and other coding agents working in this repository.

## 1. Authoritative user requirement

Build a **single coherent, cinematic, premium product experience** for Ad Astra. The visual quality benchmark is the live DJI RS 5 product showcase, especially product-first art direction, large cinematic scenes, clearly differentiated products, restrained typography, thoughtful transitions, meaningful demonstrations and responsive motion.

**Do not claim that Ad Astra has achieved the DJI standard simply because TypeScript/Node tests or a Vercel deployment pass.** Visual acceptance and production acceptance are separate facts. Do not reuse or embed DJI-owned footage, branding, source code or protected creative assets.

## 2. One continuous graphics production unit

Preserve the existing public repository `Centauri-corp/ad-astra-public-source`, the private CRC governor `Centauri-corp/ad-astra-internal-source`, the established Vercel project, and the existing Supabase release authority. Do not create additional repositories, parallel graphics launches, schedulers, duplicate approvers or competing product catalogs.

Required order inside this single codebase:

1. Art direction and approved media provenance.
2. Shared cinematic graphics state, scene transitions, video and accessible fallbacks.
3. Full-width editorial product storytelling on the public site.
4. Real, explicitly bounded product interactions tied to the existing frontend/backend.
5. Desktop/mobile, keyboard, reduced-motion, GPU/performance and content-accuracy QA.
6. Exact-SHA CI, protected Vercel preview, and independent CRC production-gate verification.

The visual-review baseline for the original homepage was PR #58 at `dfe05527e42b75ef1e4f785c1edb46cda75fa42b`; **that approval does not apply to changed source or grant production authorization**.

## 3. Products and Solutions — presentation rules

`/products/` must begin with one full-width product-led hero and **four immersive editorial chapters**:

- Beyond Physics — evidence and scientific investigation.
- Astra Lumen — human-directed learning.
- Neural Visual Experience — genuinely interactive, accurately labeled synthetic visual models.
- Governed AI Workflows — identity, permission boundaries and human oversight.

Each chapter needs its own strong composition, specific human outcome, truthful demonstration and direct link to the detailed product page.

**Never put a dense card grid, the twelve-capability taxonomy, or the fifteen-market list ahead of the cinematic four-product journey.** Keep that material available in the secondary `#technical-foundation` atlas for specialists. Do not delete it merely to make the landing page look minimalist.

Do not mistake glowing wireframes, repeated generic concept art or decorative CSS parallax for finished high-fidelity product design. The present media is transitional. For a true flagship treatment, commission or generate original product-specific media with documented usage rights, product context, detailed shot direction and tested delivery formats. Do not assert rights or factual demonstrations without evidence.

## 4. Design fidelity is a release gate, not a marketing claim

Before calling a graphics candidate DJI-level or visually production-ready, collect *actual* evidence for:

- Product-specific, high-fidelity, original media with confirmed rights.
- One coherent visual narrative and purposeful transitions, including meaningful static fallback.
- Real mobile (390px), tablet, wide desktop, keyboard, screen-reader, reduced-motion and low-power GPU behavior.
- Images, film, captions and assets resolving without layout failure; measured core performance and memory budgets.
- Working links through /products/, all four product pages, /experience/, /scientific/, /pricing/ and /workspace/.
- Explicit creative acceptance for the **exact candidate commit**, not an earlier build.

Automated DOM/CI tests can assert structure and behavior; **they cannot establish artistic quality**. No passing status should infer an unobserved browser/device or user approval.

## 5. Engineering and release safeguards

- Preserve the original homepage implementation unless a scoped creative edit is explicitly approved.
- Keep customer operations, checkout, outbound CRM, indexing and AI execution disabled until authoritative release gates pass.
- No client-side secrets, synthetic human approvals, fake Stripe receipts, or bypass of Supabase governance.
- Sanity-controlled content may be private only if access denial is verified; public ACLs remain a blocker.
- Maintain exact-SHA source check, protected preview, independent release authorization and tested rollback.
- Before making sweeping visual changes, inspect existing HTML, CSS, JS, assets and tests. Implement one coherent replacement, not another cumulative stack of card systems.

## 6. Test rules

`test/editorial-products-journey.test.cjs` guards primary cinematic structure, the secondary atlas, progressive motion and release boundaries. Any change that moves the dense catalog in front of the product story must fail review.

The acceptable status vocabulary is **implemented**, **CI passed**, **browser-verified**, **visual-review accepted**, **production authorized**. Never collapse these statuses into one "100%" indicator.

**When blocked, report exact evidence, not a reassuring approximation.**

## Code Review Rules

### P0 — Visual acceptance must not be inferred from successful code checks
- Flag any change that labels the website "DJI-level", "visual PASS" or "100% production" solely from GitHub CI or Vercel READY. A passing deployment proves code availability, not realistic media, direction, or observed mobile quality. The safe path is evidence from the rendered exact-SHA candidate and the existing CRC release case.

### P1 — Do not revert the customer experience to a card-first catalog
- Flag movement of the 4 flagship product stories or original cinematic hero below the 4+12+3+15-card technical index, or replacing distinct product-specific storytelling with repeated generic glowing-head art. The safe path is hero → four immersive editorial chapters → product details, with the dense taxonomy available only on demand in the secondary atlas.

### P1 — Preserve the governed execution boundary
- Flag any film, scene, product link or client-side script that activates production AI, checkout, CRM, private Sanity data or releases permissions without server-side entitlement, tenant authorization and the existing Supabase release decision. The safe path is opt-in local demonstrations and independently authorized backend operations only.
