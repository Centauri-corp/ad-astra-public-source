'use strict';

// Stable protocol marker for the customer-budget bridge. The public source may
// describe the protocol but cannot self-authorize production spending.
function createClient() {
  return Object.freeze({
    protocol: 'ad-astra-customer-budget/v1',
    productionAccepted: false,
    reserve: async () => ({ allowed: false, reason: 'budget_bridge_not_accepted' })
  });
}
module.exports = { createClient };
