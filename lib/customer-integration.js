'use strict';
// AD ASTRA customer integration: one governed, public-safe route from a product
// family to approved catalog concepts. No identity, payment, or model grants.
const assert=require('node:assert/strict');
const binding=require('../projects/website-customer-experience/model-experience.json');
const {publicOffers}=require('./offer-catalog');
const {publicCustomerAgents}=require('./customer-agent-catalog');
const {publicModels}=require('./model-catalog');
const ROUTES=Object.freeze({discover:'/products/',preview:'/platform-preview/',customer:'/platform/',access:'/sign-in/',plans:'/pricing/',status:'/status/'});
const slug=/^[a-z][a-z0-9-]{1,55}$/;
function buildCustomerIntegration(families,{productionAccess=false}={}){
 assert.equal(productionAccess,false,'Public source cannot authorize customer access');
 assert.ok(Array.isArray(families)&&families.length===6,'Six governed product families required');
 assert.ok(Object.values(binding.production).every(v=>v===false),'Customer provider activation is release-gated');
 const catalogOffers=new Map(publicOffers().map(x=>[x.id,x]));
 const catalogAgents=new Map(publicCustomerAgents().map(x=>[x.id,x]));
 const catalogModels=new Map(publicModels().map(x=>[x.id,x]));
 const ids=new Set();
 const records=families.map(family=>{
  assert.ok(slug.test(family.id)&&!ids.has(family.id),'Invalid or duplicate product family');
  ids.add(family.id);
  const offerBindings=binding.offers.filter(o=>o.familyIds.includes(family.id));
  const agentBindings=binding.agents.filter(a=>a.familyIds.includes(family.id));
  assert.ok(offerBindings.length&&agentBindings.length,'No governed bindings for '+family.id);
  const offers=offerBindings.map(o=>{
   const catalog=catalogOffers.get(o.offerId);
   assert.ok(catalog&&catalog.availability==='development-preview'&&catalog.entitlement==='release-gate-required','Unapproved offer '+o.offerId);
   return {id:catalog.id,name:catalog.name,roleId:o.roleId,availability:'preview-only'};
  });
  const agents=agentBindings.map(a=>{
   const agent=catalogAgents.get(a.agentId),model=catalogModels.get(a.modelId);
   assert.ok(agent&&model&&agent.availability==='development-preview'&&agent.entitlement==='release-gate-required','Unapproved model or agent');
   assert.ok(offers.some(o=>o.id===a.offerId),'Agent offer not mapped to family');
   return {id:agent.id,name:agent.name,modelId:model.id,mode:agent.defaultMode,availability:'preview-only'};
  });
  return Object.freeze({
   id:family.id,name:family.name,
   routes:Object.freeze({detail:'/products/'+family.id+'/',preview:ROUTES.preview,customer:ROUTES.customer,access:ROUTES.access}),
   offers:Object.freeze(offers),agents:Object.freeze(agents),
   customerAccess:'blocked-until-verified-session-and-entitlement',
   intent:'discover-and-preview',
   modelExecutionAuthorized:false,billingAuthorized:false
  });
 });
 return Object.freeze({schema:'ad-astra-customer-integration/v1',environment:'public-preview',
  routeAuthority:ROUTES,experience:'shared-neural-visual-identity',
  catalogOwnership:'existing-product-offer-agent-model-catalogs',
  customerEntry:'verified-session-and-tenant-required',
  productionAccess:false,liveModelExecution:false,liveBilling:false,
  families:Object.freeze(records)});
}
function selectCustomerDirection(integration,familyId,agentId){
 const family=integration?.families?.find(x=>x.id===familyId);
 if(!family)return Object.freeze({allowed:false,reason:'unrecognized-product',route:ROUTES.discover});
 const agent=family.agents.find(x=>x.id===agentId)||family.agents[0];
 return Object.freeze({allowed:true,familyId:family.id,agentId:agent.id,
  previewRoute:family.routes.preview,accountRoute:family.routes.access,
  customerRoute:family.routes.customer,requiresVerifiedSession:true,
  runsAI:false,grantsEntitlement:false});
}
module.exports={ROUTES,buildCustomerIntegration,selectCustomerDirection};
