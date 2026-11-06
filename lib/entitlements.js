'use strict';
// This claim must be set by the trusted identity provider, never by the browser.
function hasLiveAiEntitlement(claims) {
  return Array.isArray(claims?.ad_astra_entitlements) &&
    claims.ad_astra_entitlements.includes('live_ai');
}
module.exports = { hasLiveAiEntitlement };
