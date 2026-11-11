'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/subscription-status');

async function responseFor(environment,upstream){
 const oldFetch=global.fetch,oldEnvironment=process.env.VERCEL_ENV;
 let body='',status=200;
 global.fetch=async()=>Response.json(upstream);
 process.env.VERCEL_ENV=environment;
 try{
  const response={setHeader(){},set statusCode(value){status=value;},end(value){body=value;}};
  await handler({method:'GET'},response);
  return {status,body:JSON.parse(body)};
 }finally{global.fetch=oldFetch;if(oldEnvironment===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=oldEnvironment;}
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
 const ready=await responseFor('production',{environment:'production',checkoutEnabled:true,activationEnabled:true,frameworkDeployed:true});
 assert.equal(ready.body.available,true);
});
