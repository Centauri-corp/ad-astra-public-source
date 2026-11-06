'use strict';
const { configuration } = require('./auth');
const { dailyBudget, redisConfig } = require('./quota');
const FLAGS = ['AD_ASTRA_ENABLE_LIVE_AI','AD_ASTRA_SPEND_BUDGET_VERIFIED','AD_ASTRA_DURABLE_RATE_LIMIT_VERIFIED','AD_ASTRA_RUNTIME_AUTH_REVIEWED','AD_ASTRA_SECURITY_REVIEW_APPROVED','AD_ASTRA_CUSTOMER_ENTITLEMENTS_VERIFIED'];
function ready() {
  if (!FLAGS.every(flag => process.env[flag] === 'true')) return false;
  try {
    configuration(); dailyBudget(); redisConfig();
    return Boolean(process.env.OPENAI_API_KEY) && process.env.OPENAI_MODEL === 'gpt-4.1-mini-2025-04-14';
  } catch { return false; }
}
module.exports = { ready, FLAGS };
