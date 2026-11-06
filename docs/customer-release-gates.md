# Customer release gates

The public site at `adastra.global` is a different Vercel project from the private Foundation operator site. Keep Foundation deployment protection enabled. Do not turn on live AI just because `/api/status` is reachable.

## Current hold

As checked on 2026-11-06, `https://adastra.global/platform/` returns HTTP 302 to `vercel.com/sso-api` for the protected `ad-astra-daylight` deployment. A customer's Clerk account cannot pass that Vercel deployment-level check. The routing rule `ad-astra-customer-platform-continuity-v517` also rewrites `/customer/` and `/api/customer-platform` to Daylight. The latter contains a paid-access handler that has not been completely audited here. Do not remove the rewrite or open Daylight to the public until that handler is reviewed, preserved or migrated, and tested.

## Implemented application guards

The public AI endpoint verifies a short-lived Clerk-signed token, requires the exact `ad_astra_entitlements` array to contain `live_ai`, and checks release flags before reserving quota or invoking a model. A missing, misspelled or browser-forged claim fails closed. The new `AD_ASTRA_CUSTOMER_ENTITLEMENTS_VERIFIED=true` flag is an operator attestation, not a substitute for per-customer entitlement. Its absence keeps `/api/status` unavailable.

The trusted identity provider must provision `ad_astra_entitlements` from server-controlled customer access records, never from client-writable metadata. Confirm how upgrades, expiry, refunds, cancellation and organization membership change that claim. The present public source has no billing webhook, entitlement synchronization or live two-customer acceptance evidence. Until those exist, leave the new flag unset or false.

## Promotion sequence

1. Review the exact production commit and Daylight paid-access handler, identify the authoritative customer/tenant and billing source, and record an independent security review.
2. Implement server-controlled entitlement issuance and revocation, with two test accounts in different states. Verify an entitled account succeeds and an unentitled account gets 403 before quota/model calls. Test a stale token after entitlement removal (the current token maximum lifetime is five minutes).
3. Preserve or migrate the paid-access handler. Stage the route change, test a customer Clerk sign-in at `adastra.global/platform/` without Vercel SSO, and test direct API access, signed-out access and cross-account isolation. Do not alter Foundation SSO.
4. Stage a production build without assigning the domain; run the full browser → API → entitlement → quota → provider → response flow, budget acceptance and rollback drill. Promote only the tested build after independent review and authorized release approval.

`npm test` and `npm run check` cover code-level guards. Run `npm run smoke:customer-route` to detect a customer path rewritten to Vercel SSO. These checks do not prove live customer sign-in, paid entitlement lifecycle, cross-tenant isolation or provider cost reconciliation.
