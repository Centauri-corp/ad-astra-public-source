# AD ASTRA public candidate reconciliation — 5 November 2026

This candidate combines staged graphics/resource/budget work from `f9055831f5691b6e313fe3176c1e36ff8f066f05` with current production homepage wording from `ed3fc6ded8ccb057b178b30126b8abed493ebe66` and the customer access/CSP repair in `7cf516ed3d822ac58d2b48555f39eb7221ce9b4b`.

The existing production branch and staged candidate diverged from common ancestor `1a651f47bf6fa0e68702b68594bfd4cdf1d56f90`. The production-only change was in the homepage; its three-way merge applied without conflict. The access route, mode-selection script, tests and noindex response rule were then included. The exact merged homepage structured-data hash is permitted by CSP and protected by a regression test.

All six public test entry files and the static privacy/release check passed locally. The access repair separately passed Chromium checks at 320/768/1440 pixels and hosted production smoke tests. Those checks do not imply full browser acceptance of this larger combined candidate. Repeat the candidate's exact-commit browser, accessibility, live resource API and recovery checks before promotion.

The focused access/CSP repair is already deployed separately as `dpl_C7LQQgHD4MJJh7G4wCbeJz8ZAr5J`. This combined candidate is not promoted. The public engine remains paused. Shared budget bridge acceptance, actual customer authentication/entitlements, provider receipts, film acceptance and independent release review remain outstanding. Existing release flags were not replaced with invented evidence.
