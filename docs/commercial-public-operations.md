# Public commercial journey

This candidate is based on production commit `464d9b5e77739914e3d93eec42df5ce8c5abc68c`.

## Public behavior

- The plans page describes AI Pro, Business Agents and Enterprise Intelligence OS as product directions in development. No price, purchase action or availability promise is published.
- Informational navigation, planned product cards and unavailable preview states link to `/access/#early-access-title`.
- The existing consented early-access form remains the request endpoint. A successful receipt does not claim account creation, subscription enrollment or changed communication preferences. Failed requests preserve input and can be retried.
- Existing authorized preview users can sign in. Return paths are allowlisted, existing sessions require server verification, implicit sign-up is disabled in the mounted sign-in UI, and provider failures have a bounded retry state. Provider enrollment policy is separately controlled by the identity provider.
- The private platform and knowledge workspace retain their authentication and AI availability gates. Signed-out visitors do not see a Sign out action.
- Contact, privacy and release status describe the actual intake and the limits of preview access. No support inbox or service commitment is invented.

## Source controls

`public/offer-directions.json` is the public allowlist projection. It contains only planned names, audiences, availability, null prices, closed checkout/enrollment flags and the early-access CTA. It must not be replaced with an internal commercial or billing contract.

`scripts/check-commercial.cjs` asserts that projection and the visible plans page agree. The assertion runs in the source workflow, browser acceptance workflow and Vercel build. Existing release, authentication, shared budget, CSP and Redis acceptance checks remain in place.

The sitemap still contains only the home and company routes. Existing noindex route headers and canonical URLs are preserved; the public projection is also noindex and no-store. Media and hero design are unchanged from the base tree.

## Verification

Run `npm test` and `npm run check`. The full repository asset tree is required for `node scripts/site-integrity.cjs` and the existing media tests.

The browser acceptance workflow runs Chromium and WebKit with blocked external providers and explicit fixtures. New journeys cover planned product → consent validation → service failure → successful receipt, contact → intake → privacy, signed-out workspace fallbacks, sign-in failure/retry and sanitized returns, and a server-verified preview with AI execution still closed. It also records responsive screenshots and automated accessibility results. These tests create no real lead, account, charge or provider request.

Release to production remains a separate, explicit review step. A passing candidate does not enable paid enrollment, model execution, campaigns or spending.
