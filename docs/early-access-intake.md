# AD ASTRA early-access intake

Status: public lead intake enabled; customer accounts, subscriptions, outbound automation and model execution remain gated.

The website posts consented early-access requests to the pinned Supabase Edge Function `astra-early-access` on project `wewznejqpnsmiwkbozgw`. The deployed function is version 3 with source hash `57eb18b257e1cc14d4c061e9ae0fd456ed5229f6158b5fc243bd205089d8c4ed` and `verify_jwt=false`, which is required because the intake is available before customer authentication. The function implements its own exact-origin allowlist, CORS preflight, 4 KiB streamed body limit, strict field allowlist, honeypot handling, email/consent validation, per-client and global rate limiting, no-store responses and fixed server-side RPC destinations.

The browser receives no Supabase service credential, database key, CRM identifier or AI-provider credential. The Edge Function uses the server-provided service-role credential only to invoke `astra_public_lead_rate_limit` and `astra_public_lead_intake`. Database privileges for those RPCs are restricted to `postgres` and `service_role`; CRM tables are not granted to anonymous or authenticated clients.

A successful request upserts a consented `crm_contacts` record and creates at most one open early-access opportunity for the same contact/source. It does not send email, activate advertising, create a paid entitlement, start billing, open a workspace or call a model.

Release verification must prove the form in Chromium and WebKit, confirm the production custom domain is still assigned to the intended deployment, inspect Edge Function errors after deployment and preserve the separate source-controlled block on public AI execution.
