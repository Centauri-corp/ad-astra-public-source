# AD ASTRA — P2 cinematic human-control upgrade (review-only)

Parent: Centauri Renewables Corporation (CRC). Existing consolidated public candidate: PR #58, branch `review/universal-stage-lumen-homepage`. All production release authority remains in CRC Command and independent Supabase governance.

## Implemented in one source unit

- Shared Arrival / Science / Solutions stage keeps scene changes functional without WebGL2, under reduced motion, and on data-saver devices.
- Explicit reset view button and keyboard control on canvas (arrow-key camera control; +/- zoom; Home reset; pre-WebGL left/right cycle static scenes).
- Scene selections persist **only a scene identifier** in sessionStorage; no customer profile, voice, billing, private research or AI prompt storage is added by this upgrade.
- Four product direction choices now select existing scene layers through a public-only DOM event without starting GPU or triggering provider APIs.
- Visible active product direction status; homepage direct navigation to existing scientific studio.
- Responsive 44px touch targets and separate visual states; static editorial fallback retained.
- Original WebGL2 renderer, 3D scientific study and five-chapter navigation remain intact.

## Evidence required for public launch

Run `node --test test/*.test.cjs`, `node scripts/check-release.cjs` and the protected Vercel preview build against the **exact** branch SHA. Perform real browser desktop/mobile visual and accessibility acceptance; verify static fallback on no-WebGL, data-saving and reduced-motion devices. Preserve `publicLaunchEnabled=false`, noindex policy, no customer activation, billing or CRM writes until Supabase independent source-bound approval and CEO MFA decision.

No production domain, DNS, secret, backend, legal or payment change is authorized by this source upgrade.
