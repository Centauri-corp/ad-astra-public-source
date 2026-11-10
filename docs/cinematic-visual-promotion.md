# Ad Astra cinematic visual promotion

This document keeps the homepage visual system in one promotion order.

## Experience direction

The homepage follows a product-led cinematic sequence: arrive through a calm hero, understand the human-directed boundary, choose a customer path, scan the product constellation, then open a motion study or product detail. This borrows the useful interaction pattern of premium product sites such as DJI.com without copying its brand, assets, layout, or content.

## Asset order

1. `ad-astra-hero-cinematic-4mp.png` — Adobe-generated 2688×1536 homepage candidate.
2. `ad-astra-product-ecosystem-v1.png` — product-family constellation candidate.
3. `ad-astra-voice-motion-v1.png` — voice and motion study candidate.
4. `ad-astra-runway-orbital-motion.mp4` — existing motion fallback for the homepage.
5. `ad-astra-horizon-motion.mp4` — existing horizon motion study.

All candidate stills are locally stored files in `public/assets/` and are indexed in `public/assets/visual-manifest.json`. Local storage or generated provenance does not establish rights acceptance. Posters, descriptions and captions for the two recorded motion studies refer to the actual clips, separately from the new voice and product stills. Captions end within the measured 10.042-second and 6.042-second durations.

## External resource alignment

| Resource | Current role | Promotion state | Required next action |
| --- | --- | --- | --- |
| Adobe | High-resolution hero artwork | Candidate generated and copied locally | Human visual review, then approve or replace |
| Runway | Motion-study source and intended new cinematic render | Connected; 34 credits reported on 2026-11-10. The previous render was rejected for insufficient credits, not a zero balance | Review reusable footage first; obtain a successful generation receipt if a replacement is commissioned |
| invideo | Homepage and mission-film edit/export projects | Two projects located; existing 15.5-second and 40-second 1080p exports recovered privately. New generation balance is zero | Review the exact export, audio, branding and rights; optimize web delivery before wiring it into the site |
| Sanity | Private editorial source and existing internal reviewed-content adapter | Both connections resolve to the same account. Both Ad Astra datasets are private; no active/scheduled release was returned | Reconcile selected artwork with the editorial brief; obtain explicit publication acceptance for selected content |

The scoped Sanity query returned six non-draft records marked `approved-for-public`, one marked `internal-approved`, and eight with `status: approved`. These are document statuses, not approval of this website commit. The public website remains a versioned static export; no private CMS response is shipped to visitors.

## Recovered film review

The [homepage film project](https://invideo.io/@zoheb-943543/ad-astra-intelligence-beyond-limits-homepage-film) contains completed exports:

- [15.5-second loop](https://invideo.io/@zoheb-943543/ad-astra-intelligence-beyond-limits-homepage-film/notebook/seq-8.1): 1920×1080, 24 fps, 27,724,842 bytes. SHA-256 `1670409d3826edee921b4682ce2d62528c4f50a92ca0a49e1b717e4fdaf0c74e`.
- [40-second master](https://invideo.io/@zoheb-943543/ad-astra-intelligence-beyond-limits-homepage-film/notebook/seq-7.1): 1920×1080, 24 fps, 74,302,836 bytes. SHA-256 `950e9774153510894163a7f089a320bfa20b556e7ccb3f792e22c67c94b88016`.

Provider notes describe these as silent; both containers include an AAC audio stream. Listening/level verification remains necessary. Agent acceptance is recorded separately from human release approval. The loop's current size is unsuitable for default homepage delivery.

The [mission-film project](https://invideo.io/@zoheb-943543/ad-astra-mission-possibilities-future-new-horizon-film) has 216 export pages in the returned inventory. Its latest R46 exports are private QA; earlier briefs record rejected revisions. An export count is not a count of unique approved masters. Preserve them privately until the selected exact revision is reviewed.

## Source reconciliation

The previous local candidate `0e26374` diverged from the shared PR branch. This increment applies its artwork and customer experience changes on top of shared source `3b9a0be`, retaining the intelligence page, customer workspace, protected session implementation, routing and source-integrity checks.

The older Sanity sphere brief requests preserving a specific reference master, while this new artwork explores a human-profile direction. Treat these as distinct visual candidates; a generated image is not the identical sphere reference. Resolve this selection during visual review before promotion.

A byte mismatch between fetched HTML and working source alone does not identify the live deployed commit or prove an incorrect domain alias. Verify deployment metadata independently before drawing that conclusion.

## Release boundary

This change is a source release candidate. It does not change DNS, indexing, billing, CRM writes, outreach, customer access, or live production. The homepage remains `noindex` and the motion studies remain explicitly labelled as previews until the independent review and production gates are complete.

AGI and ASI remain engineering-development and research workstreams. The visual layer is a simulation and does not claim deployed AGI, ASI, live telemetry, or autonomous execution.
