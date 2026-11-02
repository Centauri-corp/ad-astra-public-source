'use strict';

// Admission is source-controlled. The legacy direct OpenAI endpoint has only
// its Redis daily budget; it is not connected to the private shared monthly
// reservation/settlement ledger. Environment flags cannot establish that link.
// Replace this blocked registration only alongside the actual authenticated
// adapter, reconciliation implementation and cross-service acceptance evidence.
const PROVIDERS = Object.freeze({
  'openai-direct': Object.freeze({
    sharedLedgerIntegrated: false,
    requiredCurrency: 'USD',
    requiredMonthlyCeilingCents: 50000,
    reason: 'shared_monthly_ledger_adapter_missing'
  })
});
function isProviderBudgetIntegrated(provider) {
  return Object.hasOwn(PROVIDERS,provider) && PROVIDERS[provider].sharedLedgerIntegrated === true;
}
module.exports = {isProviderBudgetIntegrated, PROVIDERS};
