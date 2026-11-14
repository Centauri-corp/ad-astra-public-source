# Cinematic customer experience

The homepage uses a self-hosted Three.js neural sculpture as its primary moving
artwork. The original geometry combines a folded optical-glass cortex, interior
light pathways and a champagne spiral. A procedural studio environment supplies
reflections without third-party textures or model downloads.

Motion starts on capable devices, pauses through the visible control, stops
when the hero is outside the viewport or the document is hidden, and falls back
to the selected native 4K artwork when WebGL, data preferences or reduced motion
require it. Pointer movement adjusts perspective. Research/Create/Plan controls
change the artwork's light palette; they do not execute an AI request.

Shared native Products and Solutions dropdowns link directly to the existing
catalog. Keyboard navigation, Escape/focus behavior and unscripted links remain
available. Cross-document transitions use the browser API when supported, with
a short nonblocking fallback and a reduced-motion override.

`node scripts/audit-cinematic-home.cjs` verifies a full-size rendered canvas,
changing rendered pixels, stable pixels after pause, mobile controls, static
fallback and absence of provider traffic. The existing 45-route browser audit
remains the source for route/accessibility regressions. Screenshot evidence is
design-review material, not human visual acceptance or hardware certification.

This change is a visual successor to `9c50752` on the same PR #39 release chain.
The new exact source must be reviewed on its own. No live inference, voice
activation, paid access, CRM action, indexing or public promotion is enabled by
the visual layer. Its next publication is a protected review preview.
