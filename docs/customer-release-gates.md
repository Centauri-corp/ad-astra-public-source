# Customer release gates

The public site at `adastra.global` is a different Vercel project from the private Foundation operator site. Keep Foundation deployment protection enabled. Do not turn on live AI just because `/api/status` is reachable.

## Current hold

As checked on 2026-11-06, `https://adastra.global/platform/` is served by the public customer project and returns HTTP 200. Legacy `/customer/` URLs return a same-origin HTTP 308 redirect to `/platform/`. The routing rule `ad-astra-customer-platform-continuity-v517` keeps only `/api/customer-platform` on the protected Daylight deployment; that legacy handler remains behind Vercel SSO and is not the public customer API. Do not open Daylight or route paid AI access through that handler until it is independently reviewed, preserved or migrated, and tested.

## Implemented application guards

The public AI endpoint verifies a short-lived Clerk-signed token, requires the exact `ad_astra_entitlements` array to contain `live_ai`, and checks release flags before reserving quota or invoking a model. A missing, misspelled or browser-forged claim fails closed. `AD_ASTRA_CUSTOMER_ENTITLEMENTS_VERIFIED=true` and `AD_ASTRA_STRIPE_BILLING_VERIFIED=true` are operator attestations, not substitutes for a per-customer entitlement. Either flag being absent keeps `/api/status` unavailable.

The trusted identity provider must provision `ad_astra_entitlements` from server-controlled customer access records, never from client-writable metadata. Confirm how upgrades, expiry, refunds, cancellation and organization membership change that claim. The present public source has no billing webhook, entitlement synchronization or live two-customer acceptance evidence. Until those exist, leave the new flag unset or false.

## Stripe billing hold

The AD ASTRA Stripe account was checked on 2026-11-06: it had two live-mode monthly prices, no subscriptions, and no webhook endpoints. Both products were labelled `sandbox` in metadata and described as sandbox-only despite `livemode=true`. The Supabase project `ad-astra-intelligence-os` had zero subscriptions and zero entitlement events, and `billing_live` was false. Its deployed `stripe-webhook` handles only `invoice.paid` for a pre-existing subscription mapping and records a receipt; it does not provision a customer or entitlement. No checkout or live sale should be enabled on this evidence.

Keep `AD_ASTRA_STRIPE_BILLING_VERIFIED` unset or false until a separate Stripe sandbox has exercised an authenticated customer-to-tenant binding, subscription creation and renewal, failed payment, cancellation, refund, dispute and fraud-warning handling, idempotent webhook delivery, entitlement issuance/revocation, and stale-token expiry. The production webhook endpoint must be installed and its signature-verified event delivery confirmed before setting the flag true. Live prices and tax handling need product-owner review; Stripe Tax must not be assumed to collect tax without applicable registrations. Never place Stripe or Supabase secret keys in browser code or a committed file.

## Promotion sequence

1. Review the exact production commit and Daylight paid-access handler, identify the authoritative customer/tenant and billing source, and record an independent security review.
2. Implement server-controlled entitlement issuance and revocation, with two test accounts in different states. Verify an entitled account succeeds and an unentitled account gets 403 before quota/model calls. Test a stale token after entitlement removal (the current token maximum lifetime is five minutes).
3. Preserve or migrate the paid-access handler. Stage the route change, test a customer Clerk sign-in at `adastra.global/platform/` without Vercel SSO, and test direct API access, signed-out access and cross-account isolation. Do not alter Foundation SSO.
4. Stage a production build without assigning the domain; run the full browser → API → entitlement → quota → provider → response flow, budget acceptance and rollback drill. Promote only the tested build after independent review and authorized release approval.

`npm test` and `npm run check` cover code-level guards. Run `npm run smoke:customer-route` to verify the public platform, legacy redirect, protected legacy handler boundary and status endpoint. These checks do not prove live customer sign-in, paid entitlement lifecycle, cross-tenant isolation or provider cost reconciliation.

`npm run qc:production` is the promotion gate. It reverse-checks the deployed public routes, security blocks, paused status, unauthenticated and cross-origin API behavior, static privacy rules, source ordering (release gate → entitlement → quota → provider), pinned model controls and every external evidence flag. It must remain blocked until the secure CI environment supplies true values for the Supabase, Stripe, Clerk, two-account isolation, independent-review, CRM/Catalyst and exact-preview evidence variables. Never set those variables merely to force a pass.
