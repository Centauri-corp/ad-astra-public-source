# AD ASTRA visual development reconciliation — 2026-11-05

The dates in the first column preserve the development history supplied by the
owner. Asset upload timestamps, CMS status fields, source commits and release
acceptance are separate evidence. An older design or a record named "approved"
does not establish approval for the current production artifact.

| Development stage / reported dates | Evidence found | Candidate disposition and remaining gap |
|---|---|---|
| Original Orbital Identity / October 12–14 | Sanity retains an orbital-logo source uploaded October 26. Its SHA-1 `07e1cbc4d07653f3e79a8aaf9a08d3046285f595` matches the current 2112×784 transparent logo byte for byte. Orbital posters and five experience modes are in source. | Preserve the verified original logo. The original creative dates need separate source evidence. |
| Neural Sphere & Human Mind OS / October 18–23 | Human Mind OS framework and acceptance-milestone records exist from October 12; original-sphere source snapshots were uploaded October 27. Current neural controls are in `public/home-experience-neural.js`. | Retain the historical snapshots as private sources. The public visualization is conceptual and does not represent live inference telemetry. |
| Daylight Glass Foundation / October 20–25 | Daylight landing, brand-board and orbital artwork assets were uploaded October 20. The canonical visual-system record from October 25 retains a release-blocked status. | Preserve the palette and artwork evidence. Responsive implementation and current-version approval must be established for each restored asset. |
| New Horizon Cinematic V5.8 / October 24–26 | The V5.8 graphics brief exists from October 26. Sanity holds MP4 previews and responsive variants. Current source contains a film study, orbital/horizon clips and static posters. | Film premiere remains withheld. Archived previews do not establish rights, captions, audio or playback acceptance for a new premiere. |
| AD ASTRA Observatory 4.0.1 / October 27 | A WebP image exists in the media inventory, but the reviewed inventory has no GLB asset and the queried history records do not identify this exact release. | Exact Observatory version, GLB bytes, source and acceptance remain unverified. Do not substitute an unrelated model. |
| R45 Cinematic Production / October 31 | R45 briefs and QA records exist from October 31; the rebuild manifest was updated November 3. Story, scene-provenance and neural-VFX gates remain blocked; several motion/audio gates are not tested. | Preserve the private development record. The current source cannot represent R45 as a completed public film. |
| Neural Intelligence Architecture / November 2–3 | Commits `a79e129` and `f48c58d` contain product-led pathways and local neural controls; UTC commit dates overlap the reported Pacific dates. | Integrated in the candidate with bounded rendering, keyboard controls, reduced motion and static fallbacks. |
| Product Graphics Vertical / November 2–3 | Six product families and 25 product directions are represented in the product/home experience source. | Product-category navigation is implemented; a complete approved graphics package for every product is not established by the source registry. |
| Graphics & Neural Experience Program / November 3–4 | The procedural hero and shared public-page system appear in `f9f5da6`, `555e2e6` and `d2ddc4c`. PR #26 adds private artifact verification and graphics evidence controls. | PR #26 is reconciled into the candidate while preserving the access, homepage and billing-source fixes. |
| Production Reconciliation & Audit / November 4–5 | Candidate lineage includes the production access/CSP repair, shared-budget controls, accessibility repairs and guarded Stripe source. Current diagnostics show missing graphics/video evidence and unreconciled model costs. | Technical checks and production authorization remain separate. Exact-commit review, customer acceptance, provider-cost reconciliation and rollback proof are still required. |

## Inventory and boundaries

The connected Sanity project `6a4vgjc9` returned 22 image assets and 17 file
assets in the private `production` dataset, and no media assets in
`ad-astra-cognitive`. This does not authorize publishing private source archives.
The selected graphics history contains both draft and published document
versions with differing statuses; their original timestamps and states are
retained in the private audit record.

The current public source has nine media files: one PNG logo, six JPEGs and two
MP4 clips. Its actual content and checksums are distinct from historical design
manifests. The local procedural neural experience is not a NeRF/3DGS service,
and no customer-facing AGI/ASI capability is implied by the graphics.

## Graphics evidence repair

Storage descriptors, streamed verification receipts and QA now bind the same
tenant, version and SHA-256 content. Encoded storage paths are rejected. A
complete offline snapshot reports evidence consistency only; it cannot declare
production eligibility or authorize a release.

## Browser runtime

GTK/WebKit dependencies are installed in a workspace-only runtime from signed
Debian 13 package indexes. The local WebKit bundle wrapper was adjusted to
preserve the inherited library path. Playwright's global `ldconfig` discovery
does not see workspace libraries, so local runs use its documented host-check
override after verifying real library loading and a successful WebKit launch.
Browser assertions remain enabled. The repository CI uses its normal browser
dependency installation and does not inherit this local runtime override.
