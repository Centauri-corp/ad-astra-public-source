# AD ASTRA cinematic neural model graphics enhancement

## Implemented (development only)

This change extends the existing site-wide Astra Polaris Three.js cinematic scene without creating a replacement assistant or changing the intelligence provider.

- **Cinematic corona:** a transparent additive shader-based Fresnel neural halo; intensity follows actual idle/listening/requesting/speaking activity events, not speculative model reasoning.
- **Motion layers:** independent orbital sweep and distributed, instanced satellites that add spatial depth and visual parallax without hundreds of individual draw calls.
- **Emotional tone:** bounded color shifts for listening and speaking; no biometric inference.
- **Performance:** 48 satellites for compact scenes and 96 for larger scenes; uses existing renderer, animation scheduler, reduced-motion and page-visibility safeguards.
- **Continuity:** same 3D scene remains within existing public navigation flow; no new canvas lifecycle or audio permissions are introduced.

## Verification and production gates

1. Run existing website build, integrity manifest generation, `npm test`, Playwright companion tests.
2. Capture real desktop and mobile browser screenshots and verify shader compiles on WebGL2 and legacy fallbacks.
3. Confirm no context leaks across route changes; test WebGL context loss, reduced motion, low power and repeat mount/dispose.
4. Benchmark GPU frame times and memory before selecting higher-quality postprocessing or cinematic assets.
5. Independent code-owner review, CEO visual acceptance, exact commit evidence and explicit production authorization remain mandatory.

The enhancement is **not** a MetaHuman, mocap actor, lip-synced avatar, or deployed Unreal scene. These are separate gated stages.
