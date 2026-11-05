'use strict';

// The client protocol and handler plumbing exist, but no audited customer
// bridge, canonical customer/tenant binding, provider receipt reconciliation or
// cross-service acceptance is established. Environment flags cannot establish
// those facts. Preserve this source-controlled block until all are verified.
const PROVIDERS = Object.freeze({
  'openai-direct': Object.freeze({
    sharedLedgerIntegrated: false,
    clientProtocolImplemented: true,
    requiredCurrency: 'USD',
    requiredMonthlyCeilingCents: 50000,
    reason: 'shared_monthly_ledger_customer_bridge_acceptance_pending'
  })
});
function isProviderBudgetIntegrated(provider) {
  return Object.hasOwn(PROVIDERS,provider) && PROVIDERS[provider].sharedLedgerIntegrated === true;
}
module.exports = {isProviderBudgetIntegrated, PROVIDERS};
