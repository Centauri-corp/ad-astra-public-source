# Public upgrade promotion reconciliation — 2026-11-04

This is a source and QA handoff, not authorization or a claim of live promotion.

## Reconciled source

- Live baseline: `1a651f47bf6fa0e68702b68594bfd4cdf1d56f90`, deployment `dpl_Ca5Lbwfmd6RDhKmb9YJpy1Uis4hZ`.
- PR #23: `f48c58d08db036938bddd0d4fb15d83e1ea0a202` — product-led homepage, three procedural 3D modes, 42 resource candidates / 12 domains, read-only resource policy/API, current live page content.
- Original PR #24: `91ef4ba77068f4321b55894c508c474bc251f182` — bounded hero canvas, initially based on older main. Its existing preview MUST NOT be promoted: it omits newer live and PR #23 changes.
- This merge incorporates PR #23 into PR #24 without replacing the live source tree with the older main snapshot.
- The informational `/products/` HTML/CSS is adapted from PR #22 at `45c0ac0d174eba0f73d1f1f9b83b8f21cb0f103d`. Its unavailable early-access/contact/legal destinations were removed; product availability stays private development. The rest of PR #22 is NOT merged or approved by this selection.

## Fixes and tests

The hero field now remains above the playing video and below the text/shade, pauses without jumping back to its first frame, respects the existing film pause boundary, and falls back to the poster when canvas construction fails. Its status text may wrap at intermediate widths. No network, inference or telemetry dependency was added.

New browser tests exercise real pixels, pause/resume, unavailable-canvas fallback, actual HTTP availability of homepage destinations, and the 25-direction / six-family product catalog at 320/768/1440px. Existing homepage/resource tests cover five widths, keyboard interaction, reduced motion, and resource access without JavaScript.

- Public unit/policy tests: 27 passed locally.
- Release/privacy/indexing scan: passed locally.
- Chromium: all 19 distinct scenarios passed locally across the initial suite and targeted rerun after repairing missing product routes.
- WebKit: local runtime lacks required system libraries; exact-commit CI installs them and must pass before promotion.
- Browser dependencies are now lockfile-pinned and installed using `npm ci`.

These checks do not establish authenticated customer E2E, model activation, media rights or independent creative approval.

## Release order

1. Review PR #24's merged source and exact-commit security, homepage and resource browser checks.
2. Obtain the independent write-capable GitHub review required by protected main. Chat authorization does not replace this review.
3. Merge protected main; record the resulting SHA (not the pre-merge candidate SHA).
4. Stage a production-target build without assigning the domain. Test that exact build: homepage, products, resources, resource API, paused status API, security headers and canonical/www behavior.
5. Keep the live deployment above as rollback; promote only the tested production build, then verify the live aliases and endpoints.

Public inference, checkout, external connector execution, CRM writes, outbound sending, film premiere and automatic publication remain disabled. Homepage-only indexing remains in force. A READY preview or passing tests do not remove these restrictions.
