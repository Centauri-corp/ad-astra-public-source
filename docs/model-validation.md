# Ad Astra model validation

This implements catalog, release-claim and provider-response admission checks. It is not a model-quality benchmark, independent approval, provider certification or permission to launch.

## Actual architecture

The public catalog describes **one foundation integration**, Astra Polaris (stable product ID `astra-lumen`), with five interaction modes and 24 sector profiles. Profiles are configurations/product directions over that integration, not 24 separately trained models. The website continues to present Ad Astra as a customer-facing intelligence platform. Unachieved AGI and ASI are not advertised as available products.

`lib/model-validation.js` validates the normalized product alias and bounded response shape; the private gateway owns provider-snapshot and generation-receipt verification. Neither provider identity nor credentials are returned by the public catalog. `publicModels()` and `publicMarketProfiles()` project only allowlisted properties and return detached mode lists.

## Enforced checks

- Catalog count, stable ID/name/role, five exact modes, 24 distinct profile IDs/names and their shared foundation binding.
- Public projections contain no extra fields, provider configuration or executable markup.
- Release metadata agrees with the catalog and cannot change AGI/ASI to achieved/available or fabricate live intelligence telemetry.
- The gated engine still verifies origin, authentication, release switches and durable budget/quota before its single provider request.
- Provider output must be bounded JSON, valid UTF-8, the normalized product alias, one assistant completion with `finish_reason=stop`, no function/tool invocation or refusal payload, bounded nonempty answer text, and coherent bounded token usage.
- Malformed, truncated, substituted, tool-bearing, oversized or ambiguous responses fail closed. No partial answer, automatic retry, quota refund, raw provider error or hidden reasoning is published.
- Invalid catalog metadata returns a generic non-cacheable 503. The public API explicitly distinguishes profiles from models and disclaims customer availability, certification and AGI/ASI availability.

The response validator does **not** prove that an answer is true, safe, useful, unbiased, professionally qualified or free of prompt injection. A pinned model response is not a semantic correctness certificate.

## Reproducible evidence

Run `npm test` for the complete source/security regression suite, including adversarial model-contract fixtures. All provider, identity and quota responses in these tests are synthetic; no API keys or live inference are required. Fixtures are not passed off as provider receipts.

Run `npm run models:validate` for a machine-readable, network-free observation bound to the Git comparison commit, clean/dirty status and deployed-surface fingerprint. It validates catalog/release/source alignment; it does not itself execute the response regression suite or a live model. The same check is included in `npm run check`.

Keep generated reports outside the source commit, in the protected LStra review directory. A dirty-tree result is not evidence that its bytes belong to the comparison commit. Freeze the source, retain the test log and exact fingerprint, and require the final independent reviewer to review that candidate.

## Remaining live acceptance

1. Confirm the existing provider credential and pinned snapshot in protected runtime metadata without exporting credentials. These changes do not create, rotate or install keys.
2. Independently review the exact source and fixture assumptions before any secret-bearing deployment or workflow.
3. Run authenticated synthetic customer/tenant and entitlement/budget acceptance on that candidate, including denial and cancellation cases.
4. Within an explicitly approved spend limit, run actual provider evaluations for all five modes, unsupported/private-source claims, citations, safety/refusal handling, multilingual behavior, latency and cost. Require domain-qualified review for medical, legal, financial or defense use cases. Do not claim these evaluations are complete from contract tests.
5. Bind the observed results and reviewer decision to the candidate/fingerprint. Only then consider the scoped production activation.

Public indexing, Google/Bing ownership verification, CRM delivery, billing and outreach remain separate release concerns. This change does not mark those gates accepted or enable a customer subscription.
