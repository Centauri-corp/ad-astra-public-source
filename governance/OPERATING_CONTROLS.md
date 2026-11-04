# AD ASTRA Governance and Production Controls

Status: PROPOSED — operational and legal appointments are not certified by this document. This change contains no production activation, secret, budget increase or data migration.

## Decision rights
| Decision | Accountable role | Required review | Execution rule |
|---|---|---|---|
| Legal entity, intercompany agreement, IP transfer | CRC authorized board / legal signatory | Counsel and finance | Verify signed documents, explicit scope and approvals |
| Product roadmap / customer-facing copy | Chief Product Officer | Marketing, legal, security as applicable | Editorial QA and approved publication |
| Model release / AI agent permissions | Chief AI Officer | CTO and Security | Evidence-based gates; never set verification flags without testing |
| Application architecture / API contracts | CTO | Architecture Office and Security | Versioned contracts, negative tests and rollback |
| CRM lead routing | CRO | Privacy/Data Governance | Tenant-specific source of truth and consent checks |
| External marketing send / paid ads | CRO | Legal, privacy and finance | Human approval, suppression checks and recorded spending limit |
| Financial commitment / subscription reconciliation | CFO | Authorized delegate | Confirm authoritative processor records; no CRM-only activations |
| Production release and domain promotion | CTO | Independent QA + Security + release approver | Reviewed commit, passing checks, tested staged production, rollback |
| Incident escalation | Security Lead or SRE (incident commander assigned) | Relevant executive | Log, severity and time-to-escalate; postmortem |

## Four cross-cutting offices
- **Enterprise Architecture Office** under CTO: publishes decision records, service boundaries and canonical API contracts. No authority to bypass release review.
- **Data Governance Office** under Security/Legal, with CTO data steward: schema, lineage, access classification, purpose limitation, retention and deletion.
- **Independent Quality & Release Assurance** reporting acceptance results independently to executive release approver: evidence inventory, end-to-end and negative tests.
- **Program Management Office** under COO: dependencies, milestones, owner assignments, open decisions and risk register.

## RACI boundary
One **Accountable** executive per division must be named through a verified appointment. A blank assignment is a blocker, never inferred from titles. Responsible implementers execute within delegated authority; CTO, Security and QA provide required independent reviews according to risk. Board and CRC-COMMAND receive visibility without inheriting unrelated tenant privileges.

## Canonical data contracts
- `lead.created`: tenant_id, lead_id, source, timestamp, lawful_contact_basis, consent_state and idempotency_key.
- `lead.qualified`: owner, scoring_version, reason_codes, timestamp and consent_state.
- `demo.booked`: confirmed scheduling reference and assigned human owner.
- `contract.signed`: signed contract reference, legal_entity, delegated signatory and billing organization.
- `invoice.paid`: validated payment-provider webhook ID, signed event verification, price and billing customer ID.
- `customer.activated`: independent identity, entitlement verification and organization ID.
- `subscription.renewed`: reconciled provider event with subscription ID.
Every event must include schema_version, producer, environment and trace_id. Consumer operations are idempotent, with retry/backoff and dead-letter review. No public API may trust client-provided tenant IDs without authenticated authorization. CRM and Stripe may disagree temporarily: Stripe is authoritative for payment events, the identity provider for signed-in identity, the application database for permissions, and CRM for sales stages.

## Release acceptance and fail-closed policy
Before marking **GREEN**, collect: legal appointment/delegation evidence; tenant-isolation and negative-access tests; Clerk signed-in runtime auth tests; durable quota and shared-budget tests; provider cost policy; CRM and Stripe end-to-end reconciliation; consent/unsubscribe tests; content indexability review; data backup/restore evidence; SRE on-call and incident drill; independent code review, protected-main required checks; exact staged-production artifact browser acceptance; alias change log and rollback candidate. Missing evidence = NOT VERIFIED. Do not flip `AD_ASTRA_ENABLE_LIVE_AI` or the four other release verification flags merely because a management checklist says complete. Do not enable ads, paid enrollments, or outbound email without their own approval.

## Global 24/7 operations
- Intake and monitoring may run continuously; human support availability is not assumed.
- Regions: Americas, EMEA, APAC; define regional owners, SLAs, lawful marketing practices and escalation rosters before claiming human 24/7 coverage.
- Each lead route must enforce data minimization, suppression, dedupe, consent, regional compliance and reversible enrichment.
- Indexing remains subject to documented public-release controls: homepage-only indexing until specific pages receive approval.
- Keep CRC businesses legally and technically separate with approved service contracts and tenant boundaries.

## Financial boundaries
Do not modify configured deployment limits. Preserve the previously documented AD ASTRA infrastructure ceiling, specific model endpoint daily quota, explicit human approval for advertising and all paid external actions. Model provider-account spending may exceed application quotas if another app uses that provider account; finance must reconcile provider invoices.
