'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/subscription-status');
const sharedBudget=require('../lib/shared-budget');

async function responseFor(environment,upstream){
 const oldFetch=global.fetch,oldEnvironment=process.env.AD_ASTRA_SUBSCRIPTION_ENVIRONMENT;
 let body='',status=200;
 global.fetch=async()=>Response.json(upstream);
 process.env.AD_ASTRA_SUBSCRIPTION_ENVIRONMENT=environment==='production'?'production':'development';
 try{
  const response={setHeader(){},set statusCode(value){status=value;},end(value){body=value;}};
  await handler({method:'GET'},response);
  return {status,body:JSON.parse(body)};
 }finally{global.fetch=oldFetch;if(oldEnvironment===undefined)delete process.env.AD_ASTRA_SUBSCRIPTION_ENVIRONMENT;else process.env.AD_ASTRA_SUBSCRIPTION_ENVIRONMENT=oldEnvironment;}
}
test('sandbox availability cannot be advertised as live subscription availability',async()=>{
 const result=await responseFor('preview',{environment:'development',checkoutEnabled:true,activationEnabled:true,frameworkDeployed:true});
 assert.equal(result.body.available,false);
});
test('public status strips provider configuration and requires complete production availability',async()=>{
 const result=await responseFor('production',{environment:'production',checkoutEnabled:true,activationEnabled:false,frameworkDeployed:true,
  blockers:['private-receipt'],stripe_key:'private-fixture'});
 assert.equal(result.body.available,false);
 assert.ok(!JSON.stringify(result.body).includes('private'));
 const onboardingOnly=await responseFor('production',{environment:'production',checkoutEnabled:true,activationEnabled:true,frameworkDeployed:true});
 assert.equal(onboardingOnly.body.available,false);
 const fixture={environment:'production',checkoutEnabled:true,activationEnabled:true,frameworkDeployed:true,productAvailable:true};
 const held=await responseFor('production',fixture);assert.equal(held.body.available,false,'An unaccepted customer usage bridge must prevent availability claims');
 const original=sharedBudget.createClient;try{sharedBudget.createClient=()=>({productionAccepted:true});const ready=await responseFor('production',fixture);assert.equal(ready.body.available,true);}finally{sharedBudget.createClient=original;}
});
