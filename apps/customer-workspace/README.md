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

No authentication library or database has been provisioned here. The existing foundation's **Clerk identity direction is preserved as a pending contract**, not replaced by Supabase Auth. Any future Supabase persistence/vector work must first define verified identity-to-tenant mapping, server-derived authorization, RLS policies and real two-tenant acceptance. A local fixture or graph checkpoint is not a provider receipt or independent approval.

## Next controlled increment

1. Review the exact source commit and this preview's desktop/mobile behavior independently.
2. Integrate the approved identity/session path and server-derived tenant context; verify sign-in, expiry, recovery, logout and authorization before enabling customer access.
3. Add approved retrieval and model execution behind the existing release/usage/permission boundaries. Replace synthetic events only with documented execution statuses, never private reasoning.
4. Accept tenant isolation, cost limits, cancellation/error paths, audit redaction and data retention before enabling persistence or privileged actions.
5. Obtain exact-candidate human release authorization and follow the existing controlled deployment/promotion process. This package does not clear prior external release gates.

The AD ASTRA navy/cyan/gold visual system and canonical orbital mark are reused from the public source. The graph library attribution is retained. No new external artwork or third-party product branding is copied.
