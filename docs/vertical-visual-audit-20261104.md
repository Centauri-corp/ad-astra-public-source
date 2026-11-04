# Public visual and navigation audit — 2026-11-04

Scope: informational candidate in PR #24, continuing reconciled live lineage at
`5439d15debd29493756cdefe79f4c737a2828f0e`. This is not production-promotion evidence.

## Reproduced and repaired

- Product-model pixels continued changing while reduced-motion/Pause was active.
  Scene time now advances only in an active animation frame; paused/offscreen/hidden
  canvases cancel their frame loop. Browser back/forward restoration resumes correctly.
- A throwing/unavailable 2D context aborted homepage initialization and removed the
  product and solution navigation. Canvas failure now leaves readable fallback status,
  disables unavailable model controls and preserves the rest of the page.
- The resource catalog footer linked to an absent `/trust/` route. It now links to
  the existing release-controls section on the same page.
- Browser CI now checks every generated public HTML page for canonical/indexing
  policy and existing local destinations, not just homepage links.
- Secondary public pages now share `public/page-evolution.css`: a bounded orbital
  visual system, responsive decorative layers, card depth treatment and explicit
  reduced-motion behavior. It is local presentation only and does not imply live
  telemetry, model-generated artwork or external data access.

## Local verification

- 28 public source/security tests passed; static release checker passed.
- 9 targeted Chromium browser tests passed after the shared visual-system change,
  including actual canvas pixel freeze/resume,
  failed-canvas recovery, responsive widths, keyboard navigation, no-JS catalog,
  and all 29 static HTML page routes.
- WebKit requires the GitHub runner's system dependencies. Local Chromium is not
  substituted for exact-commit Chromium and WebKit CI acceptance.

## Preserved boundaries

Home-only indexing; public AI and paid enrollment disabled; provider connectors
inactive; film premiere withheld; neural graphics are local illustrations, not
measured model telemetry. No private operational data is added to public assets.

## Release order

Pass exact-head CI and independent review → protected merge → record merged SHA →
build production target without assigning domains → smoke-test that exact build →
promote → verify canonical/www, paused APIs and rollback. A preview URL or this
document does not authorize promotion or customer-service activation.
