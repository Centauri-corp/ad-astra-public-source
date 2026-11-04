# AD ASTRA public visual experience - 2026-11-03

## Scope

Upgrade the public informational product experience on the existing production-pass branch. This is not an inference, account, billing, film-premiere or autonomous-agent release.

Base inspected: `3d30919ae2553b9c7d7cf4d2a409bcadf322066a`, PR #17. The security changes added after `13dcb1c` are retained. Homepage HTML, original film/media, neural artwork URL, API handlers, consent-intake code, sign-in code, CSP, robots, deployment configuration and shared budget controls are not modified.

## Implemented

- `/brain/`: responsive editorial layout with the original neural artwork, bounded decorative Canvas filaments/particles, six manually selected conceptual states, pause and intensity controls.
- Drawing is capped at 30 fps and device-pixel ratio 1.5. Reduced motion, data saving, page visibility and offscreen status suppress animation. Missing Canvas or imagery leaves a truthful static fallback.
- Three prewritten research/creative/planning examples, each with four manually advanced stages: intent, evidence, reasoning, oversight. Every example discloses its limits; there are no model requests, prompts, account writes, telemetry or storage.
- Shared informational-page styling is introduced by one import in `public/markets/style.css`. The original stylesheet remainder is preserved byte-for-byte. Header, navigation, typography and focus treatment are aligned without changing page routes or availability statements.

## Verification

- Eight focused Node tests passed locally on Node 22.16.0.
- Thirteen offline Chromium UI checks passed, including 320/390/768/1024/1440 layouts, keyboard, all example stages, pause, intensity, offscreen suspension, no-JavaScript and data-saving behavior.
- Local browser networking was restricted; offline rendering used the exact HTML/CSS/JS. The remote original image could not load, so its explicit error fallback was checked. These checks are not authenticated hosted acceptance or original-media visual approval.
- The new `test/browser/neural-experience.spec.cjs` extends the existing Chromium and WebKit suite. Existing actual MP4 natural-end/replay, sign-in, early-access and accessibility tests are unchanged.
- Full provider CI, protected preview and independent visual acceptance must be recorded for the final commit before release.

## Release boundary

Use only existing public Vercel project `prj_FX8QO3TIqUNAfFR4enz0bALmjeg1`, team `team_5xblMPo2zEBjbz4KPmeDVHPr`. Keep deployment protection and the mainline production gate. Do not assign public domains or mark live AI, film, paid enrollment or customer operations ready from a visual preview.
