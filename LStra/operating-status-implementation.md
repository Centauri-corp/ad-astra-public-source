# AD ASTRA operating status implementation

This increment implements public availability reporting in the existing website candidate. It does not enable the services it describes.

## Shared source and behavior

`lib/operating-status.js` owns the public service labels and descriptions. The generated `/status/` page and the read-only `/api/operating-status` endpoint use that same registry. The endpoint uses the existing engine readiness function and additionally checks the source release manifest and customer entry routes before calling the engine available.

The registry covers:

| Surface | Current candidate status |
| --- | --- |
| Public website | Preview |
| Astra Polaris engine | Paused |
| Six product families | In development |
| Customer workspace | Preview |
| CRM automation | In development |
| Subscriptions/payments | In development |
| Outbound messaging | Paused |

Engine readiness cannot turn the CRM, billing, product or outreach states green. The endpoint returns only public descriptions, local navigation links, status labels and the time the response was generated. It performs no provider calls, reads no customer records, and returns no configuration values, tenant IDs, gate internals or credentials. `/api/status` keeps its existing response contract for older pages.

## Customer experience

Visitors can reach availability from the homepage preview indicator, homepage footer, product overview and Astra Polaris page. The page is readable without JavaScript, with static development statuses and an explicit note that runtime availability cannot be refreshed. With JavaScript enabled it requests the current release state and offers a manual refresh. Network errors, invalid responses and duplicate service records restore conservative fallback statuses and show a retry message; a previous Available badge is not left displayed as current after refresh failure.

Status wording describes product availability, not measured provider health or uptime. The page is registered as a pending public route with noindex metadata and headers. Release, billing, CRM, outreach and approved-indexing flags are unchanged.

## Verification

`npm test` checks deterministic generation for products and status, all public route/release invariants, the existing security suite and operating-status tests. The additional tests cover readiness/release/route conditions, isolation between capability statuses, API field allowlisting and response headers, GET/HEAD-only behavior, browser refresh failure and malformed responses.

Local browser acceptance covers desktop/mobile layout, static no-JavaScript content, live metadata retrieval, manual refresh and network failure fallback. These are development checks; deployment and production acceptance remain separate.
