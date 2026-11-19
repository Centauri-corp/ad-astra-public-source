# Ad Astra public site and customer workspace candidate

The public project is `prj_FX8QO3TIqUNAfFR4enz0bALmjeg1` in team `team_5xblMPo2zEBjbz4KPmeDVHPr`, with canonical domain `adastra.global`. Git deployments remain disabled. A source merge does not activate customer execution or establish production acceptance.

## One customer surface

`/workspace/` provides DayFlow (`day`), LearnPath (`learn`) and CareerStep (`career`) through one Clerk account session. Results, history, citations and provider-usage state come from the canonical customer runtime. Customers can reopen sessions, load older results and download the loaded results as text. `/platform/` and `/knowledge/` redirect to this workspace. The Astra Polaris graphics and conceptual market profiles remain available at `/agent/`; they do not establish additional live products.

The browser calls `/api/workspace`. The previous `/api/ask` route is a compatibility entry into the same governed handler and now requires the same product/input contract. It has no separate model execution path. Both server routes call only the fixed `astra-customer-workspace-production` or `astra-customer-workspace-development` endpoint in the configured Supabase project, using protocol `ad-astra-customer-workspace/v1`.

The public server forwards the customer's verified Clerk JWT and a server-only `AD_ASTRA_CUSTOMER_WORKSPACE_SECRET`. The browser cannot supply a tenant, model, price, release approval or operator credential. The backend verifies the current Clerk session, binds it to canonical customer membership and checks product access, release state, model routing and budget before creating work.

Both environment namespaces remain bound to the existing subscription authority in project `wewznejqpnsmiwkbozgw`. The isolated QA project `kkhnczalxgkjysuhfpmh` is for schema and function validation; it does not become customer identity or subscription authority by passing those checks. Public and backend JWT verifiers require issuer `https://clerk.adastra.global`, audience `ad-astra-workspace` and authorized party `https://adastra.global`. Ordinary preview-host Clerk tokens are rejected. Real signed-in staging acceptance therefore needs an approved same-origin setup; synthetic preview checks do not satisfy it.

## Admission and recovery

New execution requires `AD_ASTRA_CUSTOMER_RUNTIME_ENABLED=true`, valid authenticated Clerk configuration, the fixed bridge configuration, durable Redis admission and all five existing verification flags:

- `AD_ASTRA_ENABLE_LIVE_AI`
- `AD_ASTRA_SPEND_BUDGET_VERIFIED`
- `AD_ASTRA_DURABLE_RATE_LIMIT_VERIFIED`
- `AD_ASTRA_RUNTIME_AUTH_REVIEWED`
- `AD_ASTRA_SECURITY_REVIEW_APPROVED`

The flags are necessary local controls. They cannot substitute for accepted backend release evidence. `AD_ASTRA_SUBSCRIPTION_ENVIRONMENT` must be exactly `production` or `development`; development results cannot satisfy production acceptance. The bridge secret is never emitted in the public build or responses.

Every run requires an idempotency key. Before new-work admission, the public handler performs a read-only recovery with that key and the original product, session, inputs and question. Only an explicit missing-request response can proceed to a new run. An existing outcome remains recoverable during a hold without another provider execution or public quota reservation. A changed payload under the same key is a conflict. Recovery still requires the original customer's current authorized membership. The browser's **Check last request** action uses the original retained payload, including an originally absent session ID.

Saved results can be read while new execution is closed, subject to current authorization. Signing out or switching accounts clears private browser state and invalidates in-flight responses. Inputs, results and tokens are not persisted in browser storage by the workspace.

The existing Redis policy retains 12 attempts per customer per rolling hour and a shared maximum $10 daily public admission allowance. Its $0.02 reservation per new attempt is a conservative admission control, not an actual provider-cost receipt or a guarantee about the selected backend model. The canonical backend separately reserves against its authoritative model ledger and reconciles actual provider usage. Uncertain outcomes retain their reservation; no layer automatically retries provider generation. Provider costs displayed in the workspace are explicitly separate from customer invoices.

Public run handling has a 55-second aggregate deadline inside a 60-second function. Backend reads are capped at 12 seconds per transport call; run transport uses the smaller of 50 seconds or the remaining aggregate time. A timeout is an uncertain outcome, never evidence that no work occurred. Recovery and saved history are the supported ways to check it. Responses are streamed under a 1 MiB limit and projected onto the customer contract, with at most 50 session summaries and 10 turns per history page.

## Verification and release boundary

`npm test` runs every public test, including adversarial authentication/admission cases, bridge validation, idempotent recovery, the three workspace journeys, history/export, pending outcomes, account changes and sign-out races. These use synthetic identities and backend fixtures. `npm run check` validates public privacy, canonical routes, index controls and retained preview boundaries. The Vercel build also runs real Redis acceptance using disposable random keys; that separate check requires the intended runtime configuration. No local test makes a paid model call.

Synthetic checks do not establish real Clerk sign-in, provider settlement, subscription webhook completion, production routing or a ready customer release. Those require evidence from the exact staged release, with the matching backend, migrations, policies and runtime settings. Keep `productionAccepted`, `publicLaunchEnabled` and `engineAvailable` false until that evidence is accepted.

Stage without assigning production domains, verify the exact deployment and current alias, then use the governed promotion path. Preserve the actual preceding live deployment as rollback evidence at promotion time. The old isolated repair's `dpl_GUQqWJ3jTy9f73XqfQFvmbqhnHUy` identifier is historical provenance, not a current rollback claim.

Customer and supporting routes remain nonindexed while page approval is unresolved. Film playback stays withheld. Private Sanity data, operator consoles, unreleased drafts and provider credentials are outside the public surface. Public source tests and the GitHub workflow do not carry production deployment credentials.
