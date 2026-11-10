# AD ASTRA discovery workspace

First isolated implementation increment: a Next.js App Router / TypeScript workspace combining AI SDK UI streaming and a React Flow execution diagram. It is an interactive **synthetic scenario preview**, not a production intelligence service.

The repository's existing public marketing site, root Vercel configuration, public API and deployment aliases are unchanged. This application is a separate package; do not change the root deployment's framework or output directory to expose it.

## Run and verify

Use Node **24.22.1** and the committed lockfile. From this directory:

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build
npm run test:runtime
npx playwright install --with-deps chromium
npm run test:browser
npm run preview:start
```

Open `http://127.0.0.1:4176`. `npm run preview` starts the development preview instead. The preview scripts set only non-secret local configuration. Browser tests start and stop their own production-build preview if the port is free; they may reuse an existing local preview outside CI. Screenshots and failure artifacts are saved under the repository's ignored `LStra/evidence/` directory.

The root repository's `npm test` separately verifies the unchanged marketing and public API release boundaries. CI runs both packages, the production-build runtime gates and browser tests; CI never deploys this application.

## Vertical boundaries

- `components/workspace.tsx`: memory-only chat, three scenario selectors, cancellation, retry, clear, source labels, step inspector, responsive canvas/list views and modal preview notes.
- `components/workflow-graph.tsx`: seven fixed workflow nodes, status highlights and reduced-motion-aware edges. Dragging, connecting, deletion and workflow editing are disabled. The list is the accessible alternative to the diagram.
- `lib/contract.ts`: versioned, allowlisted event contract and ordered state reducer. Foreign runs, malformed payloads and duplicates are ignored; sequence gaps, invalid transitions and incomplete streams cannot produce success. Run IDs are correlation only, never authorization.
- `app/api/demo/route.ts`: AI SDK UI message stream with fixed text and transient workflow events. The request accepts **only** a scenario ID and temporary run UUID. No typed question, chat history, tenant, role or credentials are sent. Unknown fields and inputs above 256 bytes are rejected.
- `app/api/chat/route.ts`: always denies live customer execution with HTTP 503.
- `app/api/graphs/route.ts`: all mutation methods deny with HTTP 403; a browser-supplied admin role does not grant access.
- `lib/preview-policy.ts`: disabled by default. Explicit preview configuration requires a loopback HTTP origin or a staging HTTPS `*.vercel.app` origin; the demo endpoint also checks the exact configured origin, same-site metadata and preview header. These checks limit the demo; **they are not customer authentication**.
- `proxy.ts` and `next.config.ts`: per-response script nonce CSP, no-store, noindex/nofollow, anti-framing and disabled camera/microphone/location permissions. Inline style permission supports React Flow positioning; production scripts do not permit `unsafe-eval` or `unsafe-inline`.

Typed text is escaped plain React text and remains only in the current tab's memory. Clearing or reloading discards it. There is no analytics, local storage, conversation persistence, provider call, retrieval, external tool execution, real approval, CRM access or billing. Reference labels are fictional samples, not citations. The diagram shows workflow states, not private model reasoning, neural weights, AGI or ASI.

## Preview configuration, not release authorization

`AD_ASTRA_WORKSPACE_PREVIEW=true` plus `AD_ASTRA_WORKSPACE_ORIGIN=<exact origin>` enables the non-production preview. **`VERCEL_ENV=production` always denies it even when that flag is set.** An unset or invalid configuration returns HTTP 404. Do not copy any secrets into these values, expose API keys to React, or point this package at `adastra.global`.

### Hosted review build

Use a separate Vercel preview project with Root Directory `apps/customer-workspace`, Next.js and Node 24.x. The package's own `vercel.json` installs the lockfile, checks types/contracts and builds. Git auto-deployment stays disabled; never repoint the existing marketing project to this package.

For that isolated project set only `AD_ASTRA_WORKSPACE_PREVIEW=true` on the **Preview** target. With `VERCEL=1` and `VERCEL_ENV=preview`, the origin may be derived from Vercel's validated `VERCEL_URL` deployment hostname. An explicit `AD_ASTRA_WORKSPACE_ORIGIN` takes precedence—even an invalid/empty explicit value fails closed. Request `Host`/forwarding headers never select the trusted origin. Use the exact deployment URL supplied for review; another alias is not implicitly authorized for demo POST requests.

`GET /api/preview` exposes only the provider-supplied, validated source commit (or null) and fixed synthetic/closed-service flags. When available, the workflow footer links to that exact GitHub commit. Deployment metadata is not release approval. Hosting this synthetic review build does not require or enable provider keys, authenticated customer data, billing, CRM or live AI. Platform deployment protection remains in place; authorized reviewers may need to sign in to Vercel.

The existing foundation's **Clerk identity direction is preserved**, not replaced by Supabase Auth. The server-only session verifier is implemented for QA; provider sign-in and customer access are not accepted. No database or identity account has been provisioned. Any future persistence/vector work must first define verified identity-to-tenant mapping, server-derived authorization, row policies and real two-tenant acceptance. A local fixture or graph checkpoint is not a provider receipt or independent approval.

## Session and tenant-scope QA increment

`POST /api/session` is a bodyless, same-origin bearer-token handshake. With explicit non-production QA configuration it uses the pinned `@clerk/backend` 3.27.0 verifier and a server-side public PEM, without remote key lookup, secret-key fallback or account/record API calls. It validates RS256 signature, issuer, audience, exact authorized party, numeric dates, maximum five-minute token lifetime, user/session IDs and session state. Delegated/machine tokens and ambiguous organization claims are refused. Cookie-only calls, query/body tenant fields and forged role headers cannot substitute for verified identity. The response contains only authentication outcome, scope type and closed release flags—not tokens or account/tenant identifiers.

The signed session determines a **personal or active-organization scope namespace**, supporting Clerk legacy and v2 claims. `sameVerifiedScope` rejects different namespaces, cloned/forged principals and expired principals. These namespaces are **not** Catalyst/Supabase tenant UUIDs or database memberships. Before querying real data, a reviewed server-side membership resolver must map this identity to the canonical tenant, enforce resource permissions and apply database row policies. No data store or customer record is accessed by this increment.

The following protected server configuration is required for QA only:

- `AD_ASTRA_WORKSPACE_PREVIEW=true` and `AD_ASTRA_WORKSPACE_ORIGIN=<exact loopback or staging origin>`.
- `AD_ASTRA_WORKSPACE_SESSION_QA=true`.
- `AD_ASTRA_AUTH_ISSUER=https://clerk.adastra.global` and `AD_ASTRA_AUTH_AUDIENCE=ad-astra-workspace`, preserving the existing foundation contract. This does not establish that the provider/domain has been accepted.
- `CLERK_JWT_KEY=<the approved provider's public PEM>`. Configure it securely in the protected Development/QA environment, never in React or a `NEXT_PUBLIC_*` variable. This verifier does not need a Clerk secret API key.

Do not use the locally generated test key as provider evidence or configure production from it. Public-key rotation must be owner-controlled; an absent, invalid or undersized key fails closed. `VERCEL_ENV=production` denies the preview and handshake even with all QA values present.

`GET /api/access-status` returns allowlisted configuration metadata only; the preview notes panel reads it on demand without an Authorization token, prompt or identity payload. Same-origin platform cookies are included so Vercel-protected previews can work; they are never interpreted as customer authentication by the demo/status endpoints or as a substitute for the session handshake's required bearer token. `qa-configured` does **not** mean accepted, authenticated, tenant-isolated or live. The client rejects metadata that attempts to claim activation. Customer access, provider QA acceptance, persistence and privileged actions remain false.

Fixtures create ephemeral RSA keys in memory. Their signatures and two-scope checks establish local code behavior only. Offline verification cannot detect provider-side session revocation before token expiry; sign-in, recovery, immediate logout/revocation, key rotation and authenticated two-tenant database QA remain required before a customer release. No sign-in UI or provider logout flow is claimed by this package.

## Next controlled increment

1. Review the exact source commit and this preview's desktop/mobile behavior independently.
2. Connect approved provider sign-in and the canonical tenant membership resolver to the QA session boundary; verify sign-in, expiry, recovery, immediate logout/revocation and database authorization before enabling customer access.
3. Add approved retrieval and model execution behind the existing release/usage/permission boundaries. Replace synthetic events only with documented execution statuses, never private reasoning.
4. Accept tenant isolation, cost limits, cancellation/error paths, audit redaction and data retention before enabling persistence or privileged actions.
5. Obtain exact-candidate human release authorization and follow the existing controlled deployment/promotion process. This package does not clear prior external release gates.

The AD ASTRA navy/cyan/gold visual system and canonical orbital mark are reused from the public source. The graph library attribution is retained. No new external artwork or third-party product branding is copied.
