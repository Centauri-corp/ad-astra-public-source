'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../api/subscription-status');
const source=require('../public/release-manifest.json');
const complete={environment:'production',checkoutEnabled:true,activationEnabled:true,frameworkDeployed:true};
async function responseFor({target='production',deployment='production',released=true,method='GET',upstream=complete,failure=false,response}={}){
 let body='',status,requests=[];const headers={};
 const handler=createHandler({environment:()=>({AD_ASTRA_SUBSCRIPTION_ENVIRONMENT:target,VERCEL_ENV:deployment}),releaseReady:()=>released,
  request:async(url,options)=>{requests.push({url,options});if(failure)throw new Error('private-provider-error');return response||Response.json(upstream);}});
 await handler({method},{setHeader(k,v){headers[k]=v;},set statusCode(v){status=v;},end(v){body=v;}});
 return {status,body:body?JSON.parse(body):null,headers,requests};
}
test('paused source and missing configuration never query a provider or advertise enrollment',async()=>{
 for(const options of [{released:false},{target:null},{target:'invalid'},{deployment:null}]){
  const r=await responseFor(options);assert.equal(r.status,200);assert.equal(r.body.available,false);assert.equal(r.requests.length,0);
 }
 assert.equal(source.engineAvailable,false);assert.equal(source.publicLaunchEnabled,false);
});
test('preview cannot query production and production cannot query development',async()=>{
 for(const options of [{deployment:'preview'},{deployment:'development'},{target:'development'}]){
  const r=await responseFor(options);assert.equal(r.body.available,false);assert.equal(r.requests.length,0);
 }
 const r=await responseFor({target:'development',deployment:'preview',upstream:{...complete,environment:'development'}});
 assert.equal(r.body.available,false);assert.equal(r.requests.length,1);assert.match(r.requests[0].url,/astra-subscriptions-development\/status$/);
});
test('a matching production target and all provider conditions are required; extra metadata is stripped',async()=>{
 for(const field of ['frameworkDeployed','checkoutEnabled','activationEnabled'])assert.equal((await responseFor({upstream:{...complete,[field]:false}})).body.available,false);
 const r=await responseFor({upstream:{...complete,blockers:['private-receipt'],secret:'private-fixture'}});
 assert.deepEqual(r.body,{market:'US-CA',environment:'production',available:true,frameworkDeployed:true});
 assert.equal(r.requests[0].options.redirect,'error');assert.equal(r.requests[0].options.cache,'no-store');
 assert.equal(r.headers['Cache-Control'],'no-store');assert.equal(r.headers['X-Robots-Tag'],'noindex, nofollow');
});
test('ambiguous, malformed, oversized or unavailable upstreams fail closed without leaking errors',async()=>{
 for(const options of [{failure:true},{upstream:{...complete,environment:'development'}},{upstream:{...complete,activationEnabled:'true'}},
  {upstream:[]},{response:new Response('not-json',{headers:{'content-type':'application/json'}})},
  {response:new Response('x'.repeat(8193),{headers:{'content-type':'application/json'}})},
  {response:new Response('{}',{headers:{'content-type':'text/plain'}})},
  {response:new Response('{}',{status:503,headers:{'content-type':'application/json'}})}]){
  const r=await responseFor(options);assert.equal(r.status,503);assert.deepEqual(r.body,{market:'US-CA',available:false,frameworkDeployed:false});
 }
});
test('HEAD is bodyless and writes are rejected without a provider call',async()=>{
 const head=await responseFor({method:'HEAD',released:false});assert.equal(head.body,null);assert.equal(head.status,200);
 const write=await responseFor({method:'POST'});assert.equal(write.status,405);assert.equal(write.requests.length,0);assert.equal(write.headers.Allow,'GET, HEAD');
});
