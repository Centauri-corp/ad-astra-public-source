'use strict';
const {test,after}=require('node:test'),assert=require('node:assert/strict');
const bridge=require('../lib/shared-budget'),fixture=require('./fixtures/customer-budget.cjs');
const originalEnv={...process.env},originalFetch=global.fetch;
const input={authorization:'Bearer synthetic.jwt.fixture',idempotencyKey:'test-request-001',requestHash:'a'.repeat(64),requestId:'11111111-1111-4111-8111-111111111112',agentId:'guide',mode:'ask'};
after(()=>{process.env=originalEnv;global.fetch=originalFetch;});
test('only a pinned HTTPS bridge and protected server credential are accepted',()=>{
 Object.assign(process.env,fixture.env,{AD_ASTRA_MODEL_GATEWAY_MODE:'production'});
 for(const url of ['http://abcdefghijklmnopqrst.supabase.co/functions/v1/astra-customer-budget',fixture.url+'?token=x',fixture.url+'/../stripe-webhook',fixture.url.replace('.supabase.co','.supabase.co.evil.invalid'),fixture.url.replace('https://','https://user:pass@')]){
  process.env.AD_ASTRA_CUSTOMER_BUDGET_URL=url;assert.throws(bridge.configuration);
 }
 Object.assign(process.env,fixture.env,{AD_ASTRA_MODEL_GATEWAY_MODE:'production'});assert.equal(bridge.configuration().url,fixture.url);
});
test('bounded admission requires a fresh hash-bound exact response; unknown decisions fail closed',async()=>{
 Object.assign(process.env,fixture.env,{AD_ASTRA_MODEL_GATEWAY_MODE:'production'});
 const valid=fixture.allowance({body:JSON.stringify({...input,environment:'production'})});
 for(const value of [{...valid,allowed:'true'},{...valid,requestHash:'b'.repeat(64)},{...valid,expiresAt:Date.now()-1},
  {...valid,expiresAt:Date.now()+60000},{...valid,extra:'untrusted'}, {protocol:bridge.PROTOCOL,allowed:false,reason:'unpaid',secret:'x'}]){
  global.fetch=async()=>Response.json(value);await assert.rejects(()=>bridge.createClient().reserve(input));
 }
 global.fetch=async()=>Response.json(valid);assert.equal((await bridge.createClient().reserve(input)).allowed,true);
 for(const response of [new Response('x'.repeat(2049),{headers:{'content-type':'application/json'}}),new Response('{}',{status:503}),new Response('{}')]){
  global.fetch=async()=>response;await assert.rejects(()=>bridge.createClient().reserve(input));
 }
});
test('bridge sends no caller-selected tenant, entitlement, plan, amount or prompt',async()=>{
 Object.assign(process.env,fixture.env,{AD_ASTRA_MODEL_GATEWAY_MODE:'production'});
 global.fetch=async(url,init)=>{assert.equal(url,fixture.url);assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');
  assert.equal(init.headers['X-Ad-Astra-Bridge-Secret'],fixture.env.AD_ASTRA_CUSTOMER_BUDGET_SECRET);
  assert.deepEqual(JSON.parse(init.body),{protocol:bridge.PROTOCOL,idempotencyKey:input.idempotencyKey,requestHash:input.requestHash,requestId:input.requestId,agentId:'guide',mode:'ask',environment:'production'});
  return Response.json(fixture.allowance(init));};
 await bridge.createClient().reserve({...input,tenant:'spoofed',plan:'unlimited'});
});
test('online session check is side-effect-free and rejects revoked or unverified replies',async()=>{
 Object.assign(process.env,fixture.env);
 global.fetch=async(url,init)=>{assert.equal(url,fixture.url);assert.deepEqual(JSON.parse(init.body),{protocol:'ad-astra-customer-session/v1'});return Response.json({protocol:'ad-astra-customer-session/v1',authenticated:true});};
 assert.equal(await bridge.createClient().verifySession(input.authorization),true);
 global.fetch=async()=>Response.json({error:'unauthorized'},{status:401});assert.equal(await bridge.createClient().verifySession(input.authorization),false);
 for(const value of [{authenticated:true},{protocol:'ad-astra-customer-session/v1',authenticated:true,subject:'private'},{}]){
  global.fetch=async()=>Response.json(value);await assert.rejects(()=>bridge.createClient().verifySession(input.authorization));
 }
});
