# Website evolution review candidate

The Open Horizon candidate adds a connected website and portal design under
`/evolution/`. It is not a customer launch or a replacement for the current homepage.

The foundation contains 88 information pages, six navigation groups, three
portal layout directions, 15 customer work contexts, 24 sector profiles, and
seven continental perspectives. Sector profiles personalize the existing
Astra Polaris foundation model; they do not add inference endpoints.
Antarctica is a research perspective, not a commercial territory.

`public/evolution/build-manifest.json` inventories the 96 generated artifacts
with SHA-256 hashes. `test/website-evolution.test.cjs` checks their bytes,
complete inventory, route evidence, and model alignment. Every candidate route
is held, uses `noindex,follow`, and remains outside the production sitemap.

Existing public API code, identity code, homepage, release flags, and deployment
redirects are unchanged. `/platform/` and `/sign-in/` redirect to the homepage;
the existing Clerk implementation does not establish available onboarding.
Candidate copy labels that boundary as release-held. The only deployment
configuration addition applies no-index and no-store headers to `/evolution`.

Run `npm test` and `npm run check` from this checkout. Local checks pass with
Node 24.22.1. The paired integration audit also checks all 88 routes and 97
local link targets, Chromium at four widths, the deployed CSP, and the
namespaced dynamic 3D import without external browser requests.

Publication requires independent review, accepted route and legal evidence,
an exact candidate deployment receipt, and human release authorization.
Customer execution, live billing, and global availability are not enabled.
