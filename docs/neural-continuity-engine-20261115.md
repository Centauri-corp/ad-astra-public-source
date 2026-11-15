# AD ASTRA neural continuity and voice intelligence — development contract

## Existing assets reused

The existing **Astra Polaris** public companion already mounts one DOM host and a Three.js cinematic sculpture, retains the canvas over supported same-origin public route transitions, handles route disposal, and uses authenticated `/api/ask` SSE with server verification. Existing `voice.js` gates speech dictation to on-device recognition when supported, requires user microphone interaction and provides local synthesized speech only where an on-device voice is available.

## Implemented in this branch

1. One route-to-visual-domain mapping: Origin, Knowledge, Industry, Data, Time and available workspace environments.
2. One deterministic voice navigation allowlist. Examples: `Astra, go to products`, `show me the intelligence`, `navigate to services`.
3. Recognized allowed navigation commands use the existing publicNavigation controller and therefore retain the companion/scene where the destination is supported. Unsupported voice commands do **not** navigate to external websites or account/billing/backend endpoints.
4. The persisted scene receives domain-specific mode transitions while existing on-device speech/AI request activity continues to animate visible state.
5. A bounded CSS aura palette follows the domain and audio state, with reduced-motion fallback.
6. Added pure module tests for route semantics, intent validation and disallowed command cases.

## Known limitations, not claims of completion

- This is not Unreal Engine rendering in the browser. Unreal remains an isolated asset/cinematic authoring pipeline; WebGL Three.js is the live site render.
- The visual itself is a stylized neural sculpture, not an actual face with phoneme-based lip sync, full-body mocap or contextual facial animation. That requires licensed character assets, viseme timings and a validated animation adapter.
- The browser requires a supported on-device speech capability for voice input and speaking. No silent fallback to cloud voice is allowed.
- The existing browser-navigation controller only preserves the scene on approved public documents. Auth, checkout and account routes retain full-page navigation and re-verification.
- Some scene families in the canonical Graphics Intelligence Core still lack GPU visual adapters.
- Browser access, runtime AI availability, protected identity/session, and live speech are not independently verified from this source commit.
- Source-integrity fingerprints and generated site files must be regenerated using the existing build and review process, never bypassed.

## Next acceptance steps

1. Execute `node --test test/neural-continuity.test.cjs`, then full `npm test` and the existing Playwright companion regression suite.
2. Test a real authenticated account: consented microphone -> local transcript -> voice navigation -> persisted scene -> authenticated AI question -> server-verified completed answer -> optional local spoken reply; all with network-off and unsupported-device fallbacks.
3. Capture Chromium + Safari iOS visual diffs, GPU render lifecycle, route transitions, repeated mount/dispose, context-loss recovery and reduced-motion audit.
4. Add semantic 3D staging and composited glTF/Unreal-derived visuals after cross-browser and licensing approvals.
5. Add viseme-driven speech facial animation only after voice output contracts expose trusted timings, while preserving visible text as an equal alternative.
6. Collect exact-SHA CI evidence, independent review, CEO cinematic approval and explicit production authorization; production remains HOLD.

This branch adds functionality to the existing one-system architecture; it does not create a replacement companion, model route, or production deployment.
