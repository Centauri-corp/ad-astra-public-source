# Ad Astra neural experience and CRM automation

This document records the initial controlled-scene increment. The next source increment is documented in [Voice and engine-event integration](voice-engine-integration.md); its optional device-local voice and guarded request transport do not activate CRM or the public customer release.

## Implemented increment

The Intelligence page now offers an explicit-load, self-hosted Three.js neural scene. It combines a physical glass-like core, reflective metallic spiral geometry, a node lattice, orbital forms and studio lighting. Pointer and labelled keyboard-operable controls adjust a bounded view; automatic motion can be paused. Reduced-motion users start with a still view and manual controls. The scene stops rendering when hidden or offscreen and releases GPU resources on teardown or context loss.

This is first-party procedural concept geometry, not a trained neural-rendering asset, a clinical brain model, model weights, a reconstruction of AI reasoning or a finished photorealistic character. Visual and rights acceptance remain separate. The cinematic film and full voice conversation are not implemented by this increment.

The existing static artwork remains the initial experience and fallback for no JavaScript, failed module loading or unavailable WebGL. The two Three.js modules load only after an explicit action. They are pinned to version 0.187.0, hosted first-party and accompanied by the MIT license and a source-derived hash inventory.

## Engine connection: exact boundary

The new connection panel makes an explicit, bounded GET request to `/api/operating-status`. It validates the schema, full service set, allowlisted states and timestamp; stale or failed checks become unknown. It shows engine, CRM, billing and outreach availability without exposing provider credentials or customer records.

The live engine remains release-gated. There is **no authenticated engine activity stream** in this increment. No local animation or status response is presented as a real customer AI task, subscription entitlement or CRM receipt. Future request animation must be connected to authenticated, tenant-bound request events with request correlation, sequence validation, cancellation, expiry and safe disconnect behavior. Do not connect fabricated browser events to a “live thinking” indicator.

Voice is not enabled. Its later implementation requires explicit microphone consent, clear recording and stop controls, a text equivalent, privacy/retention decisions, and accepted audio/engine transport. No speech-recognition or microphone API is invoked here.

## CRM identification

The retained CRM is **Zoho CRM in Energy America, LLC**, with an explicitly isolated **Ad Astra tenant**. The execution bridge is the existing **Catalyst `astra-crm-bridge` project** and `astra_crm_bridge` function. This selection preserves the owner's earlier tenancy decision; it does not change organization ownership, create a second CRM or grant write rights.

Configuration-only provider checks on November 11, 2026 confirmed the retained organization and expected bridge project. The workflow-rule metadata search for names containing “Astra” returned no matching rules and no further pages. The bridge's **Development** scheduled-job list was empty. These are scoped findings: they do not prove that every automation in the entire organization or production environment is absent.

Source inspection identified:

| Layer | Existing implementation | What is not established |
| --- | --- | --- |
| Lead qualification | Checks tenant context, feed freshness, verified consent, expiry, region approval and suppression; prepares review-required draft references | No accepted live inbound adapter or durable draft/dispatch feed is established by that module |
| Monthly enrollment | Deduplicates first-paid and activation receipts, rejects conflicting or incomplete inputs, keeps the 5,000/month target separate from actuals | No accepted complete billing/activation feed or verified live enrollment count |
| CRM delivery | Server-side bridge with write-rights flags, field/organization checks, durable claim/finalization and uncertain-outcome reconciliation | Current deployed source, protected configuration and authenticated tenant-isolation QA are not accepted here |
| Growth scheduler | Source contains a read-only growth heartbeat and prepared cadence plans | Source definitions are not evidence of deployed executions, successful CRM deliveries or 24/7 lead acquisition |
| Outreach | Denied by the current source/release boundary | No sender/audience/message/region approval or live sending acceptance |

The prepared cadence plan proposes consented lead drafts every five minutes, reconciliation every fifteen minutes, hourly exception review and a monthly finance close. It explicitly reports `prepared-not-deployed`, no external writes and no outbound sends. An existing source-defined heartbeat is also read-only; it must not be described as an activated acquisition system.

## CRM resolution order

1. Verify the exact deployed bridge source and protected configuration using redacted provider receipts; never copy credentials into this repository or a public artifact.
2. Pass authenticated two-tenant isolation, authorization and synthetic intake QA on the exact candidate. A shared CRM organization requires enforced tenant boundaries, not merely a tenant name.
3. Connect durable, verified inbound consent and enrollment feeds, with idempotent checkpoints, suppression rechecks, retry limits and a reconciliation path.
4. Verify CRM field mappings and owned-record writes in protected QA; preserve provider and audit receipt references without exposing customer records in readiness reports.
5. Obtain exact-candidate independent approval and final release authorization, then deploy the approved scheduler and confirm run history and exception handling.
6. Enable only the approved workflows. Outreach requires a separate approved sender, purpose, audience, content, region, cadence and budget. Signup or a preview interaction is not marketing permission.

Nothing in this increment enables CRM writes, creates leads, sends outreach, bills customers or changes regional availability. The provider checks were metadata-only. A reachable account, a local passing test or an empty Development job list is not a production acceptance receipt.

## Build alignment

The prior Vercel install command said no dependencies were required despite a dependency-backed test suite. The source configuration now uses the checked lockfile with `npm ci --include=dev --ignore-scripts --no-audit --no-fund`. Build-time dependencies are included explicitly even if the build environment sets `NODE_ENV=production`. Automatic Git deployment remains disabled. This is a source fix, not a deployment or permission change.

Run `npm run neural:build` to regenerate the vendor inventory, the existing experience build to regenerate Intelligence, then refresh the website source inventory. Run `npm test` and both browser audits before review. WebGL QA may use Chromium software rendering; this does not establish performance on customers' mobile GPUs. Human visual review, manual accessibility, representative-device performance and exact-candidate independent review remain required before publication.
