# Billing webhook remediation — 2026-11-05

The deployed `stripe-webhook` v1 reads the legacy `invoice.subscription` field.
Stripe moved this reference to `invoice.parent.subscription_details.subscription`
in API version 2025-03-31.basil. The versioned function source now accepts both
locations, including expanded references, and rejects conflicting mappings.

Source: https://docs.stripe.com/api/invoices/object#invoice_object-parent-subscription_details-subscription

The handler verifies a signature over the bounded raw body, requires the
configured live/test environment, and calls the existing tenant-bound,
idempotent `astra_stripe_record_event` RPC. It records `invoice.paid` receipts
only. It does not create subscriptions, grant entitlements, charge customers,
or activate the billing release flag.

Run `node --test test/stripe-webhook.test.cjs` before review. The deployed
function and this source must be reconciled through the release process.
Required secret names are `STRIPE_WEBHOOK_SECRET` and
`SUPABASE_SERVICE_ROLE_KEY`; use provider-managed secret storage. The existing
`ASTRA_STRIPE_WEBHOOK_ACCEPTED` gate remains mandatory. `STRIPE_LIVEMODE`
defaults to `true`; use a separate test deployment when setting it to `false`.

Activation still requires a Stripe endpoint, signing-secret installation,
authoritative tenant/subscription mappings, paid-event replay acceptance,
subscription cancellation/delinquency entitlement handling, and independent
release approval. The database query on 2026-11-05 returned zero subscriptions,
zero provider subscription mappings, and zero Stripe receipts.
