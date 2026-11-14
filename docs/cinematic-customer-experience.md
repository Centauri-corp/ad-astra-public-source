# Cinematic customer experience

The homepage uses a self-hosted Three.js neural sculpture as its primary moving
artwork. The original geometry combines a folded optical-glass cortex, interior
light pathways and a champagne spiral. A procedural studio environment supplies
reflections without third-party textures or model downloads.

The current selection authority is
`projects/website-customer-experience/project.json` on PR #39, with artwork
selected in `asset-selections.json` and source roles recorded in `resources.json`
in that project directory. PR #38 and the older generated stills remain
historical references; they do not select or approve this candidate.

The neural assets have distinct source roles:

- **Native still master:** `scripts/render-neural-master.cjs` renders
  `scripts/lib/neural-master-scene.mjs`. Source hashes, seed and native pixel
  evidence are in `public/assets/neural-master/manifest.json`.
  `scripts/build-neural-master-delivery.cjs` derives the existing AVIF package,
  pinned in `public/assets/neural-master/delivery/manifest.json`. The selected
  desktop/mobile candidates are `neural-core-3840.avif` (3840×2160) and
  `neural-core-1600.avif` (1600×900) in that delivery directory. The older
  `public/assets/experience/neural-core-{800,1600}.webp` files derive from a
  different 1672×941 generated image; their original provenance is preserved.
- **Live homepage hero:** `public/neural/cinematic-home.js` loads the separate
  procedural scene in `public/neural/cinematic-scene.js`. It shares the still
  package's art direction; it is not the offline master renderer or proof of
  identical geometry or pixels.
- **Legacy workspace/intelligence study:** `public/neural/experience.js` loads
  `public/neural/scene.js`, with markup from
  `scripts/lib/neural-experience.cjs` and workspace integration in
  `scripts/build-neural-workspace.cjs`. These remain separate from the homepage
  cinematic hero.
- **Company study:** `public/neural/company-scene.js` supplies the company-page
  interactive sculpture through `public/homepage-experience.js` and the geometry
  rendered by `scripts/render-company-motion.cjs`. The existing twelve-second
  study is registered by `config/company-motion-study.json`: the 960×540,
  24 fps H.264 `public/assets/brand/ad-astra-neural-study.mp4`, its same-basename
  JPEG poster and English descriptive VTT. It has no audio stream. The homepage
  and company page expose this study through a separate controlled player.

Motion starts on capable devices, pauses through the visible control, stops
when the hero is outside the viewport or the document is hidden, and falls back
to the selected native 4K artwork when WebGL, data preferences or reduced motion
require it. Pointer movement adjusts perspective. Research/Create/Plan controls
change the artwork's light palette; they do not execute an AI request.

The existing `public/assets/ad-astra-runway-orbital-motion.mp4` remains in the
homepage markup with playback disabled; the selected native still supplies the
actual WebGL fallback. The horizon study mapped to `/film/`
in `config/public-graphics-alignment.json` is also distinct from the twelve-second
company study. None selects the final film: `film.selectedMaster` remains null
in the asset registry, and final-film/public-premiere gates remain unchanged.
The sixty-second company film still awaits a selected cut, picture/sound
decisions, rights review and acceptance. The native stills and all studies remain
candidates under the existing visual review, with no owner acceptance inferred.

Shared native Products and Solutions dropdowns link directly to the existing
catalog. Keyboard navigation, Escape/focus behavior and unscripted links remain
available. Cross-document transitions use the browser API when supported, with
a short nonblocking fallback and a reduced-motion override.

`node scripts/audit-cinematic-home.cjs` verifies a full-size rendered canvas,
changing geometry and GPU drawing, zero WebGL drawing/clearing after pause,
decoded image stability, mobile controls, runtime/static reduced-motion
fallback and absence of provider traffic. Byte-identical PNG crops are not a
valid WebGL freeze signal: the crop also includes foreground text rasterization.
The existing 45-route browser audit
remains the source for route/accessibility regressions. Screenshot evidence is
design-review material, not human visual acceptance or hardware certification.

This change is a visual successor to `9c50752` on the same PR #39 release chain.
The new exact source must be reviewed on its own. No live inference, voice
activation, paid access, CRM action, indexing or public promotion is enabled by
the visual layer. Its next publication is a protected review preview.
