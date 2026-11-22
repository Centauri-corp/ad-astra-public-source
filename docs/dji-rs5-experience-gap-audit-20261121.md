# Ad Astra vs DJI RS 5 — Website and cinematic production gaps

**Scope:** Public Ad Astra preview `dfe05527e42b75ef1e4f785c1edb46cda75fa42b` compared with the publicly observed DJI RS 5 website and in-page "Watch Video" experience (2026-11-21). This is a **benchmark, not a claim of visual parity**.

**Implementation:** The PR #61 `/experience/` route is an original Ad Astra demonstration, using existing authorized Ad Astra website media. It is independent of the user-approved homepage visual SHA and must be tested before any promotion. DJI videos, screenshots, trademarks and code have not been copied.

## Product-quality gap matrix

| Priority | Dimension | Current Ad Astra | DJI RS 5 benchmark | Required improvement | Acceptance evidence |
|---|---|---|---|---|---|
| P0 | Recognizable product imagery | Procedural globe, brain/neural artwork; no verified realistic product imagery | Hero shows actual RS 5 gimbal with camera and photography-oriented realism | Model/film original, accurate Ad Astra customer-facing product/solution visuals with licensed source assets | Art-direction review, 3 asset/source-rights receipts, high-DPI desktop/mobile acceptance |
| P0 | Feature demonstrations | Four conceptual directions; synthetic sample surface | Feature-specific product video and many feature demonstration sections | 3–5 tangible solution demonstrations with real screen/state flows and correct factual labels | Interactive functional tests and tested example-driven use cases |
| P0 | Film | Existing atmospheric MP4 reused in multiple places, prior `/film/` is storyboard/gated | RS 5 opt-in 2:24 modal video with dedicated poster and control bar | Original Ad Astra hero film, multi-shot, story arc, captions/audio and usable fullscreen on all devices | Rights+captions, browser playback tests, poster/keyframe review and film signoff |
| P0 | Cross-page visual journey | Multiple independent WebGL canvases and Canvas 2D simulation; no single camera state across routes | Premium continuity through art direction, product-level hierarchy and specialized visuals | One scene-state/camera contract, preloaded stage handoff across Home→Journey→Products→Science | Route transition E2E, device tests, GPU recovery, no visual reset flashes |
| P0 | Technical story truth | Synthetic study explicitly non-measured, product claims intentionally limited | RS 5 physical specifications and demonstrable capabilities tied to purchase path | Measurable feature/spec or clear preview labeling for Ad Astra's real, launchable offers | Content fact-check, lifecycle acceptance with governance |
| P1 | Scroll choreography | Simple section and observer-linked scene switching, no verified cinematic shot timeline | Feature narratives, zoom-out and product close-ups | Art-directed scroll chapters, camera/keyframe timelines, user interrupt and motion preferences | Deterministic timeline QA with smooth input/reduced-motion/mobile |
| P1 | Video playback productization | Native MP4 controls, one existing rendition, static poster; PR #61 adds modal | Quality menu (480p to 4K), subtitles and branded player, seek and fullscreen | Create multiple original renditions, optional adaptive streaming with captions; keep native robust fallback | Bandwidth/network tests, caption and seek proof, no surprise autoplay |
| P1 | Product hierarchy and journey | Generic product categories and "concept preview" messaging, weak actionable differentiation | Sticky product bar, features, specs, comparisons, clear buying path | Clear landing pages for Astra Lumen, neural visualization and governed workflows with precise use cases, pricing availability and single CTA | Task-completion studies; truthful pricing and user-flow evidence |
| P1 | Real-world use and proof | No validated testimonial/example showcase in current preview | Photographic real-world use and feature evidence | Approved case demos, controlled synthetic labels where applicable, provenance-backed media | Asset rights, human review, zero misleading claims |
| P1 | Mobile, a11y, low-power GPUs | Responsive CSS present; live 390px, focus/screen reader and low-power render unverified | Premium responsive retail-site benchmark; device behavior not measured in reference audit | Device matrix: 390/768/1440, contrast, focus, caption, reduced-motion, no-WebGL, DPR & frame budget | Automated browser and real-device receipts |
| P1 | Visual system consistency | Multiple visual frameworks (static hero, WebGL2 stage, 2D scientific grid, media) | Consistent photographic/brand treatment per product | Unified material, typography, scale, color and transition tokens; reusable stage API and reviewable asset registry | Snapshot and route-level visual QA |
| P1 | Back-end to frontend journey | Server handlers exist, but live subscriptions/workspace remain gated | Customer-facing commerce and support path in DJI | Complete runtime test of governed login, APIs, tenant isolation, billing TEST lifecycle and CRM readback | CI + provider sandbox receipts + independent release approval |
| P2 | Site completeness and global navigation | Partial categories and pricing; release noindex | Full categories, help, support, buy/enterprise forms and legal footer | Per-region offers, support, docs, accurate division/product taxonomy, release-controlled SEO | Content completeness matrix and external accessibility |
| P2 | Continuous improvement | Multiple review branches/PRs and graphics modules | Highly maintained product-campaign model | Integrate original film and graphics into one exact-source CRC production pipeline; no parallel approval system | One frozen paired SHA, CI artifact fingerprint, monitored Vercel staging, final Supabase decision |

## Chronological one-unit implementation and release gate

1. **A0** Preserve the user-approved homepage visual baseline `dfe05527...`; the new film route is a new review candidate, not a retroactive approval.
2. **A1** Clear rights and factual provenance for every public image/video and storyboard assets.
3. **A2** Develop higher-fidelity original Ad Astra cinematic scenes and a coherent spatial stage architecture.
4. **A3** Build product-specific narratives and functionality inside the existing frontend + backend web app.
5. **A4** Integrate opt-in film player and scroll-chapter experience; use accessible browser-native controls as baseline, enhance as budget allows.
6. **A5** Execute exact-SHA unit/paired CI, visual 390/768/1440, keyboard, reduced-motion, bandwidth, GPU and signed-in customer QA.
7. **A6** Stage exact production-configuration artifact without public domain; prove security, commercial provider and fallback tests.
8. **A7** Accept one independently verified Supabase release case and one authenticated CEO action for exact artifact; promote only that identical build.
9. **A8** Smoke-test the live domain, monitor errors and retained rollback.

**No performance score, photoreal parity, 4K asset, independent license, signed deployment, external billing or production launch can be claimed solely from these PR assets.**
