'use strict';
// Offline fixture only. Never imported by runtime or deployed public assets.
const url='https://abcdefghijklmnopqrst.supabase.co/functions/v1/astra-customer-budget';
const gatewayUrl='https://abcdefghijklmnopqrst.supabase.co/functions/v1/astra-model-gateway';
const env={AD_ASTRA_CUSTOMER_BUDGET_URL:url,AD_ASTRA_CUSTOMER_BUDGET_SECRET:'synthetic-budget-bridge-secret-32-characters'};
function allowance(init){const input=JSON.parse(init.body);return {protocol:'ad-astra-customer-budget/v2',allowed:true,
 requestHash:input.requestHash,requestId:input.requestId,agentId:input.agentId,mode:input.mode,environment:input.environment,
 role:'customer-text',policyVersion:'ad-astra-customer-text/2026-11-13',maxCostCents:2,maxInputTokens:16384,maxOutputTokens:700,
 reservationId:'11111111-1111-4111-8111-111111111111',expiresAt:Date.now()+20000};}
module.exports={url,gatewayUrl,env,allowance};
