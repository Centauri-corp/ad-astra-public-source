# CRC / Ad Astra — DJI.com + SpaceX.com end-to-end UX and graphics benchmark
Audit date: 2026-11-21 (US Pacific). Scope: public-facing reference surfaces only. This is a benchmark for the EXISTING public PR #61 and CRC release train, not a new website, authority, video master or approval queue.

## Reference and evidence log
- DJI home: https://www.dji.com/
- DJI RS 5 product: https://www.dji.com/rs-5
- DJI specs: https://www.dji.com/rs-5/specs
- DJI video hub: https://www.dji.com/rs-5/video
- DJI downloads: https://www.dji.com/rs-5/downloads
- DJI live homepage/product browser: https://agent.tinyfish.ai/runs/efcd882f-901a-433e-8c4b-0ecdff2a7b93
- DJI live video/product browser: https://agent.tinyfish.ai/runs/23781138-d858-441f-9cba-baa92021909e
- SpaceX home: https://www.spacex.com/
- SpaceX Starship: https://www.spacex.com/vehicles/starship
- SpaceX Falcon 9: https://www.spacex.com/vehicles/falcon-9
- SpaceX launches: https://www.spacex.com/launches
- SpaceX human spaceflight: https://www.spacex.com/humanspaceflight
- SpaceX live homepage/Starship browser: https://agent.tinyfish.ai/runs/a58a4606-9965-4864-82f4-ae9acfbfbaba
- SpaceX launches/vehicles browser: https://agent.tinyfish.ai/runs/265fea60-8790-46cd-9b4b-d80d1edb4a44 (additional mission checks may remain pending at audit commit)
- User-uploaded astronomy reference: 59.7 second 910x512 phone capture showing third-party *Our Planet II* television footage. **REFERENCE ONLY. No reuse of its pixels, audio, titles or documentary identity.**
- User's existing Ad Astra 40s silent master and 15.5s loop: https://invideo.io/@zoheb-943543/ad-astra-intelligence-beyond-limits-homepage-film/tree/main/seq-6.1
- Existing single film brief: https://invideo.io/@zoheb-943543/ad-astra-intelligence-beyond-limits-homepage-film/briefs/2
- Existing 90s original storyboard/rights guard: `config/ad-astra-original-cinematic-film.v1.json`

## DJI observed — product-first architecture
1. Global categories/regions: drones, handheld, power, enterprise/agriculture/delivery, content, support, store; international language/country selector.
2. RS 5 product hero: original recognizable device, short positioning line, Watch Video modal; product exists visually before a deep explanation.
3. Local sticky product nav: Compare, Camera/Lens Compatibility, Specs, Video, Downloads, FAQ.
4. Feature density is staged: SIX summary features FIRST, active-tracking example carousel, THEN individual performance/controls/battery/axis/compatibility/SDK chapters and claims footnotes. **Cards are acceptable as summary/proof navigation; cards alone are not the product experience.**
5. Film player audit: approximately 2:25, user-initiated dark modal, poster, play/pause, timeline, volume, CC, fullscreen, selectable video quality (480p/720p/1080p/4K seen across inspections), Escape/close. The exact modal frontend code and hosting origin must not be copied.
6. Asset evidence: web-optimized images, media on dedicated CDN hostnames, caption/poster resources; support/downloads/video hub split from marketing story; store/account separate from brand brochure.
7. Sales proof: real device dimensions, measured payload, charge time, motor/algorithm claims tied to footnotes, compatibility and manuals.
8. Accessibility: alt/focus/keyboard and mobile screen-reader quality not completely tested; presence of ARIA, accessibility links and CC is not an independently audited WCAG pass.

## SpaceX observed — mission-first architecture
1. Full-bleed launch/space imagery, near-black ground, strong white typography, purposeful CTA, identifiable vehicles not abstract concept art.
2. Current navigation hierarchy observed: Vehicles -> Starship/Dragon/Falcon 9/Falcon Heavy/Starfall; Human Spaceflight -> Space Station/Earth Orbit/Moon/Mars; Starlink; Starshield; SpaceXSI; Terafab; Company; Shop.
3. Starship page contains four Swiper-style media groups: 4 vehicle/engine overview slides, 4 capability slides, 2 reusability/refilling slides, 3 Starbase/factory/test slides. These are **named engineering subjects**, not generically animated canvases.
4. Falcon 9 has detailed vehicle metrics, reusable flight story, stage/engine/landing-leg information. Starship explains vehicle + booster and Raptor differences; technical data supplies credible product proof.
5. Human Spaceflight links cinematic mission storytelling to destination tabs, examples, technical facts and mission inquiry. Launches page provides upcoming/completed status, dates, filters, mission search and records. Company/careers/shop are secondary destinations.
6. The observed homepage included a Starship Flight 15 hero dated Nov 13–14 and a dynamic countdown. As of Nov 21 those dates are past, while an external dated report says launch occurred Nov 13. Treat stale/cached presentation as a data-freshness audit candidate, NOT proof of a specific backend failure. Require real-time status checks in Ad Astra.
7. Photo subjects, measured figures and mission footage are evident. SpaceX's specific internal JS framework, CGI software, rendering engine, backend databases, analytics pipelines and private data contracts are NOT knowable from read-only page observation.
8. Swiper classes, media file paths, interactive nav and countdown were visible; actual mobile layout/performance/keyboard sequence were not verified.

## Do NOT infer from the reference websites
- No evidence that either site uses Unreal Engine, Houdini, a specific proprietary WebGL scene system, or a given backend language/framework for the observed effect. Those are Ad Astra PROPOSED authoring choices.
- Read-only browser inspection cannot recover source scenes, 3D geometry, original media licenses, API secrets, private release workflows, reliable p75 performance metrics or authenticated flow security.
- Do not copy DJI or SpaceX footage, music, trademarks, shaders, HTML/CSS or brand-specific animations. Reimplement reusable **interaction patterns** using original Ad Astra assets.

## Ad Astra mismatch at PR #61 — exact source inspection
- Existing homepage uses an independently approved visual direction and currently references `assets/ad-astra-runway-orbital-motion.mp4` over `assets/astra-lumen-neural-brain.png`, and a procedural WebGL2 globe; this is not photoreal cinematic Earth footage.
- `/experience/` uses `assets/ad-astra-horizon-motion.mp4`, an opt-in film modal, original static art and a separate synthetic projected 3D demonstration; it does not show a 90s original flagship film.
- Existing invideo 40s master + 15.5s loop exist as separate exports. They have not been matched to the exact deployed source filenames by content hash/rights receipt; integration status is **NOT VERIFIED**, not proven.
- `/products/` contains four editorial chapters and also a large secondary indexed atlas (4 flagships, 12 capabilities, 3 Life candidates, 15 market directions). Individual product pages contain local concept previews, not verified paid customer outcome proof.
- Existing 90s film shot list is `ARCHITECTURE_ONLY_NOT_RENDERED`; current public release flags/checkout/customer execution remain closed. A passing GitHub source test and Vercel preview do not constitute a world-class visual acceptance.

## One chronological original production sequence (no additional repo/approval)
0. **C00 Rights and truthful claims** — original assets only, media ownership/licensing, scientific model synthetic vs measured proof, stable brand source of truth.
1. **C01 Film source inventory** — reconcile existing original 40s master, 15.5s loop, public MP4 filenames, poster/VTT, hashes, rights, duration, aspect ratio; fail closed for unknown sources.
2. **C02 Shot and 3D asset engineering** — 90s master F01–F08 from current manifest: stellar corona, real Earth orbit, human intent, four distinct product workspaces, brand CTA. Original CGI from Unreal Sequencer or Blender/Houdini, plus factual interface recordings. Offline 4K finishing.
3. **C03 Cutdown derivation** — derive a poster-led 15.5s silent seamless homepage hero loop (recognizable subject in first frame), a 30s film, 6s bumper, and product-specific clips from master. Never just accelerate a 90s film.
4. **C04 Delivery media packaging** — authenticated rights/approval receipt; 1080p/720p encodes + 4K opt-in if available, mobile reframes, adaptive source selection, poster, captions, transcript and audio controls. No autoplay with sound.
5. **C05 One website scene director** — shared semantic scene IDs, camera pose/time handoffs and data-driven original video across homepage -> /experience/ -> /products/ -> 4 flagship pages -> /scientific/. Only opt-in interactive WebGL scenes where real 3D exists; provide static & low-bandwidth fallback.
6. **C06 Product proof and navigation** — DJI-style each product: named identity/hero, demonstrable useful action, evidence, truthful technical details, comparison, product support, governed customer CTA. SpaceX-style engineering research pages use real validated models and measurable outcomes.
7. **C07 Full stack operational boundaries** — approved CMS media rights/status via Sanity; public API calls gated by authentication/tenant rules; CRM/Stripe lifecycle only after sandbox evidence; the portfolio index remains secondary.
8. **C08 Device and quality evidence** — inspect original render at 390px iPhone, tablet and 1440px desktop; keyboard, screen reader, captions, reduced-motion, save-data, decode/GPU budget, video close+focus; visible consistent color/art direction. Target CWV p75: LCP <=2.5s, CLS <=0.1, INP <=200ms (targets, NOT MEASURED).
9. **C09 One CRC release authority** — exact-SHA CI, source rights, staging production build without domain, asset hash receipts, rollback, CMS permissions, independent Supabase CRC release case, then only approved identical-artifact promotion to public domain and observability.

## Visual creative standard / pass–fail examples
- FAIL: default homepage hero is a reused concept head+abstract procedural globe with no original hero-grade subject film.
- FAIL: products share a generic texture or avatar instead of four distinct visual identities and useful demonstrations.
- FAIL: animation calls itself full 3D when it is 2D projected canvas, or claims scientific measurement from synthetic data.
- FAIL: product pages end before proof, limitations, technical detail and valid customer CTA.
- FAIL: video autoplay sound, ignore reduced motion, block keyboard close, fail captions, crop subject on mobile.
- FAIL: green CI + READY deployment labeled CGI/world-class visual PASS with no actual reviewed screenshot/video.
- PASS (only with evidence): verified original footage and rights, differentiated shots, correct film cutdowns, real interactive 3D where claimed, coherent transitions, desktop/mobile visual review, product proof, technical & security receipts, exact-artifact release approval.

This file is a coding and visual acceptance contract for the EXISTING branch. It is not an assertion that the unrendered film or public deployment has passed.
