'use strict';
// Offline fixture only. Never imported by runtime or deployed public assets.
const url='https://abcdefghijklmnopqrst.supabase.co/functions/v1/astra-customer-budget';
const env={AD_ASTRA_CUSTOMER_BUDGET_URL:url,AD_ASTRA_CUSTOMER_BUDGET_SECRET:'synthetic-budget-bridge-secret-32-characters'};
function allowance(init){return {protocol:'ad-astra-customer-budget/v1',allowed:true,
  requestHash:JSON.parse(init.body).requestHash,reservationId:'11111111-1111-4111-8111-111111111111',expiresAt:Date.now()+20000};}
module.exports={url,env,allowance};
