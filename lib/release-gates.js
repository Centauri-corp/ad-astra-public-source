'use strict';
const { configuration } = require('./auth');
const { dailyBudget, redisConfig } = require('./quota');
const release = require('../public/release-manifest.json');
const routing = require('../vercel.json');
const { CONTRACT, validateCatalog, validateRelease } = require('./model-validation');
const { publicModels, publicMarketProfiles } = require('./model-catalog');
const { configuration: customerBudgetConfiguration } = require('./shared-budget');
const { GATEWAY_CONTRACT } = require('./model-gateway');
const FLAGS = ['AD_ASTRA_ENABLE_LIVE_AI','AD_ASTRA_SPEND_BUDGET_VERIFIED','AD_ASTRA_DURABLE_RATE_LIMIT_VERIFIED','AD_ASTRA_RUNTIME_AUTH_REVIEWED','AD_ASTRA_SECURITY_REVIEW_APPROVED'];
function ready() {
  // Runtime switches alone cannot authorize a customer request while the
  // reviewed source still describes a marketing preview or closes access.
  if (release.publicLaunchEnabled !== true || release.engineAvailable !== true ||
      routing.redirects.some(rule => ['/platform/:path*', '/sign-in/:path*'].includes(rule.source))) return false;
  if (!FLAGS.every(flag => process.env[flag] === 'true')) return false;
  try {
    validateCatalog(publicModels(), publicMarketProfiles()); validateRelease(release);
    configuration(); dailyBudget(); redisConfig(); customerBudgetConfiguration();
    return Boolean(process.env.AD_ASTRA_MODEL_GATEWAY_URL && process.env.AD_ASTRA_MODEL_GATEWAY_TOKEN)
      && process.env.AD_ASTRA_MODEL_GATEWAY_CONTRACT === GATEWAY_CONTRACT;
  } catch { return false; }
}
module.exports = { ready, FLAGS };
