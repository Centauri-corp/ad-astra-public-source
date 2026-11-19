'use strict';

// Public engine remains fail-closed until the shared ledger is independently
// verified. This module is deliberately policy-only; it never authorizes spend.
module.exports = Object.freeze({
  sharedLedgerIntegrated: false,
  productionAccepted: false,
  authorize() { return { allowed: false, reason: 'provider_budget_not_accepted' }; }
});
