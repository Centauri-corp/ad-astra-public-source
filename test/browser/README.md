# Public browser acceptance

Run from this directory with Node 24:

```sh
npm install --ignore-scripts --no-audit --no-fund
npx --no-install playwright install --with-deps chromium webkit
npm test
```

The GitHub workflow runs pinned Playwright and axe-core versions against the exact
checked-out public source and binary assets. It covers 320, 390, 768, 1024 and
1440 pixel layouts, touch-menu dismissal/focus, conceptual-state keyboard controls,
reduced motion, actual H.264 decoding/pause/end/replay, failed-media controls,
no-JavaScript access information, denied identity and automated WCAG checks.
Screenshots, failed traces, structured accessibility results and browser reports
are retained as review artifacts for seven days. Tests use no CI deployment secret.

The server is a loopback-only static fixture. All customer APIs deliberately deny
access. Identity values in tests are noncredentials and never leave the fixture.
Only the original public Sanity artwork and Google font hosts are allowed off-origin.
This verifies source rendering and interaction, not Vercel routing, real identity,
paid entitlement, billing, tenant isolation or production model execution. WebKit
and touch emulation do not establish physical iPhone/Safari/VoiceOver acceptance.
Incomplete axe checks and screenshot review still require human assessment.
The workflow cannot promote, enable the engine or publish the film.
