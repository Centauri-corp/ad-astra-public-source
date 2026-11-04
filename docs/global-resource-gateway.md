# AD ASTRA Global Knowledge & Resource Gateway

Status: source implementation candidate. This document and its registry do not activate provider connectors, public inference, paid access, medical decision support, engineering certification, legal representation or autonomous external actions.

## Implemented in source

- A versioned 42-resource registry covering twelve public knowledge domains.
- Explicit ownership across AD ASTRA Divisions 2, 6, 11, 13 and 14.
- Five Phase 1 read-only connector candidates with `not-connected` status.
- A fail-closed query and evidence-envelope library.
- A public read-only `/api/resources` catalog endpoint that performs no external network request.
- A noindex `/resources/` preview explaining the domains, safeguards and integration sequence.
- Node and Chromium/WebKit acceptance tests.

## Safety properties

- Remote provider content is always data, never trusted instructions.
- The API accepts only fixed catalog filters and cannot fetch an arbitrary URL.
- All resources begin at `discovered`; public visibility does not imply commercial rights or production approval.
- Medical content is educational only. Engineering and geotechnology results require professional review. Legal and civic content requires jurisdiction and effective-date context. Arts assets require per-object rights review.
- No provider API keys, paid model calls, storage commitments or external writes are included.

## Production path

1. Pass complete source, commercial and browser acceptance on the exact commit.
2. Independently review every Phase 1 provider's endpoint, identity, terms, commercial use, attribution, rate limits and outage behavior.
3. Implement one connector at a time behind authenticated staging, with normalized evidence envelopes and cost controls.
4. Verify tenant isolation, provider failure behavior, logs and a connector disable switch.
5. Stage a production build without changing the canonical domains.
6. Run protected hosted QA and obtain independent product, security/legal and release approval.
7. Promote only the exact accepted deployment, preserving the previous deployment for rollback.

The current live domain remains a separate deployment until those steps are complete.
