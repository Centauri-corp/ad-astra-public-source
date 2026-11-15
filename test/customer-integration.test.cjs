'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const families=require('../config/public-product-families.json').families;
const {buildCustomerIntegration,selectCustomerDirection}=require('../lib/customer-integration');
const handler=require('../api/customer-integration');
const integration=buildCustomerIntegration(families);
function call(url,host='adastra.global',method='GET'){
 const headers={};let data='';
 const res={statusCode:200,setHeader(k,v){headers[k.toLowerCase()]=v},end(v){data=v}};
 handler({url,method,headers:{host}},res);
 return {status:res.statusCode,body:JSON.parse(data),headers};
}
test('all six families bind to existing offers and agents, never activate runtime',()=>{
 assert.equal(integration.families.length,6);
 const expected=new Set(families.map(f=>f.id));
 for(const f of integration.families){
  assert.ok(expected.has(f.id));assert.ok(f.offers.length>0&&f.agents.length>0);
  assert.ok(f.offers.every(o=>o.availability==='preview-only'));
  assert.ok(f.agents.every(a=>a.availability==='preview-only'));
  assert.equal(f.customerAccess,'blocked-until-verified-session-and-entitlement');
  assert.equal(f.routes.customer,'/platform/');
 }
 assert.equal(integration.liveModelExecution,false);assert.equal(integration.liveBilling,false);
});
test('product entry is a preview direction, never an entitlement or AI action',()=>{
 const result=selectCustomerDirection(integration,'creative-studio','creator');
 assert.equal(result.allowed,true);assert.equal(result.agentId,'creator');
 assert.equal(result.runsAI,false);assert.equal(result.grantsEntitlement,false);
 assert.equal(result.requiresVerifiedSession,true);
 assert.equal(selectCustomerDirection(integration,'not-a-product','creator').allowed,false);
 assert.throws(()=>buildCustomerIntegration(families,{productionAccess:true}),/cannot authorize/);
});
test('read-only API returns aligned catalog and safe selection',()=>{
 const all=call('/api/customer-integration');
 assert.equal(all.status,200);assert.equal(all.body.families.length,6);
 const selected=call('/api/customer-integration?family=core-intelligence&agent=guide');
 assert.equal(selected.status,200);assert.equal(selected.body.direction.agentId,'guide');
 assert.equal(selected.body.modelExecutionAuthorized,false);
 assert.equal(call('/api/customer-integration?family=unknown').status,404);
 assert.equal(call('/api/customer-integration?agent=guide').status,400);
 assert.equal(call('/api/customer-integration?family=core-intelligence&family=creative-studio').status,400);
 assert.equal(call('/api/customer-integration?evil=value').status,400);
 assert.equal(call('/api/customer-integration','attacker.example').status,403);
 assert.equal(call('/api/customer-integration','adastra.global','POST').status,405);
 assert.equal(all.headers['cache-control'],'no-store');
});
test('missing product, offer or agent mapping fails closed',()=>{
 assert.throws(()=>buildCustomerIntegration(families.slice(1)),/Six governed/);
 assert.throws(()=>buildCustomerIntegration([...families.slice(0,5),families[0]]),/duplicate product/);
 assert.throws(()=>buildCustomerIntegration([...families.slice(0,5),{id:'unknown-family',name:'Unbound'}]),/No governed bindings/);
});
