'use strict';
const {configuration} = require('./auth');
const {dailyBudget,redisConfig} = require('./quota');
const workspace = require('./customer-workspace');
const FLAGS = ['AD_ASTRA_ENABLE_LIVE_AI','AD_ASTRA_SPEND_BUDGET_VERIFIED','AD_ASTRA_DURABLE_RATE_LIMIT_VERIFIED','AD_ASTRA_RUNTIME_AUTH_REVIEWED','AD_ASTRA_SECURITY_REVIEW_APPROVED'];
function workspaceReady() {
  if (!FLAGS.every(flag=>process.env[flag]==='true') || process.env.AD_ASTRA_CUSTOMER_RUNTIME_ENABLED!=='true') return false;
  try {
    configuration();dailyBudget();redisConfig();workspace.configuration();
    return true;
  } catch {return false;}
}
// Local configuration is necessary, never sufficient: each execution also asks
// the canonical runtime for current customer and release authorization.
module.exports = {ready:workspaceReady,workspaceReady,FLAGS};
