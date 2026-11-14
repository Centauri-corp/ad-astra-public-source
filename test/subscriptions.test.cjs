'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const tenant='00000000-0000-4000-8000-000000000001',workflow='00000000-0000-4000-8000-000000000002';
const base='https://wewznejqpnsmiwkbozgw.supabase.co/functions/v1/astra-subscriptions-';
function fixture({released=false,target='production',deployment='production',reply,authenticated=true}={}){
 const requests=[];
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../lib/subscriptions.js'),'utf8'),{
  module,require(name){assert.equal(name,'./release-gates');return {ready:()=>released};},
  process:{env:{AD_ASTRA_SUBSCRIPTION_ENVIRONMENT:target,VERCEL_ENV:deployment}},
  URL,Buffer,TextDecoder,AbortSignal,
  fetch:async(url,options)=>{requests.push({url,options});return typeof reply==='function'?reply():Response.json(reply??{});}
 });
 const adapter=module.exports,api={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../api/subscriptions.js'),'utf8'),{
  module:api,Buffer,process:{env:{VERCEL_URL:'preview.example.vercel.app'}},
  require(name){if(name==='../lib/auth')return {authenticateRequest:async()=>authenticated?{ok:true}:{ok:false,status:401,error:'authentication_required'}};
   assert.equal(name,'../lib/subscriptions');return adapter;}
 });
 async function request(body={action:'account'},overrides={}){
  const headers={host:'adastra.global',origin:'https://adastra.global','content-type':'application/json','x-ad-astra-request':'public-v1',authorization:'Bearer synthetic-token',...overrides.headers};
  const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=JSON.parse(v);}};
  await api.exports({method:'POST',body,...overrides,headers},res);return res;
 }
 return {adapter,request,requests};
}
const account={environment:'production',market:'US-CA',linked:true,linkingEnabled:true,checkoutEnabled:true,accessCurrent:true,
 termsUrl:'https://adastra.global/terms/',privacyUrl:'https://adastra.global/privacy/',consentVersion:'2026-11',
 workspaces:[{tenantId:tenant,name:'Synthetic workspace'}],subscriptions:[{tenantId:tenant,workflowId:workflow,plan:'pro',state:'active',canManageBilling:true}]};

test('closed source blocks new enrollment, checkout and activation before any provider request',async()=>{
 for(const action of ['provision','enroll','checkout','activate']){
  const f=fixture();const input=action==='provision'?{}:action==='enroll'?{tenantId:tenant,plan:'pro',market:'US-CA',consent:true,consentVersion:'2026-11',channel:'direct'}:{workflowId:workflow};
  const r=await f.request({action,input},{headers:{'idempotency-key':'synthetic-enroll-1'}});
  assert.equal(r.statusCode,503);assert.equal(r.body.error,'subscription_release_not_ready');assert.equal(f.requests.length,0);
 }
});
test('new workspace provisioning uses only verified subject context and is gated separately from legacy linking',async()=>{
 const f=fixture({released:true,reply:{linked:true,provisioned:true}});const result=await f.request({action:'provision',input:{}});
 assert.equal(result.statusCode,200);assert.deepEqual(result.body,{linked:true,provisioned:true});
 assert.match(f.requests[0].url,/\/provision$/);assert.deepEqual(JSON.parse(f.requests[0].options.body),{});
 for(const input of [{email:'qa@example.test'},{tenantId:tenant},{subject:'user_spoofed'}]){
  const invalid=fixture({released:true});assert.equal((await invalid.request({action:'provision',input})).statusCode,400);assert.equal(invalid.requests.length,0);
 }
 const enabled=fixture({released:true,reply:{...account,linked:false,newCustomerProvisioningEnabled:true}});
 assert.equal((await enabled.request()).body.newCustomerProvisioningEnabled,true);
 const closed=fixture({reply:{...account,linked:false,newCustomerProvisioningEnabled:true}});
 assert.equal((await closed.request()).body.newCustomerProvisioningEnabled,false);
});
test('paused sales retain authenticated billing management and cannot advertise checkout',async()=>{
 const f=fixture({reply:account});const r=await f.request();
 assert.equal(r.statusCode,200);assert.equal(r.body.checkoutEnabled,false);assert.equal(r.body.subscriptions[0].canManageBilling,true);
 assert.equal(r.headers['Cache-Control'],'no-store');assert.equal(r.headers['Referrer-Policy'],'no-referrer');
 const portal=fixture({reply:{url:'https://billing.stripe.com/p/session/synthetic'}});const p=await portal.request({action:'portal',input:{workflowId:workflow}});
 assert.equal(p.statusCode,200);assert.equal(p.body.url,'https://billing.stripe.com/p/session/synthetic');
});
test('subscription environment isolation rejects production requests from previews and development requests from production',async()=>{
 for(const options of [{deployment:'preview'},{deployment:'development'},{deployment:undefined,target:'invalid'},{target:'development'}]){
  const f=fixture({...options,reply:account});assert.equal((await f.request()).statusCode,503);assert.equal(f.requests.length,0);
 }
 const f=fixture({target:'development',deployment:'preview',reply:{...account,environment:'development'}});
 const r=await f.request();assert.equal(r.statusCode,200);assert.equal(r.body.checkoutEnabled,false);
 assert.equal(f.requests[0].url,base+'development/account');
});
test('authenticated released enrollment retains the idempotency key and pinned provider destination',async()=>{
 const f=fixture({released:true,reply:{workflowId:workflow,state:'requested'}});
 const r=await f.request({action:'enroll',input:{tenantId:tenant,plan:'pro',market:'US-CA',consent:true,consentVersion:'2026-11',channel:'direct'}},{headers:{'idempotency-key':'synthetic-enroll-1'}});
 assert.equal(r.statusCode,200);assert.equal(f.requests.length,1);const {url,options}=f.requests[0];
 assert.equal(url,base+'production/enroll');assert.equal(options.headers['Idempotency-Key'],'synthetic-enroll-1');
 assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.equal(options.headers.Authorization,'Bearer synthetic-token');
});
test('origin, authentication, content type, input shape, body size and enrollment replay key are checked before forwarding',async()=>{
 const cases=[
  [{},{method:'GET'},405],
  [{},{headers:{origin:'https://evil.example'}},403],
  [{},{headers:{'sec-fetch-site':'cross-site'}},403],
  [{},{headers:{'content-type':'text/plain'}},415],
  [{action:'enroll',input:{tenantId:tenant}}, {},400],
  [{action:'account',input:{tenantId:tenant}}, {},400],
  [{action:'unknown'}, {},400],
  ['{broken', {},400],
  [' '.repeat(14001), {},413]
 ];
 for(const [body,options,expected]of cases){const f=fixture({released:true});assert.equal((await f.request(body,options)).statusCode,expected);assert.equal(f.requests.length,0);}
 const f=fixture({authenticated:false});assert.equal((await f.request()).statusCode,401);assert.equal(f.requests.length,0);
});
test('checkout display requires release, a linked identity, consent version, policy URLs and a matching provider environment',async()=>{
 for(const change of [{consentVersion:null},{consentVersion:'invalid version'},{termsUrl:'https://evil.example/terms/'},{privacyUrl:'https://adastra.global/'},{checkoutEnabled:false},{linked:false}]){
  const f=fixture({released:true,reply:{...account,...change}});assert.equal((await f.request()).body.checkoutEnabled,false);
 }
 const f=fixture({released:true,reply:account});assert.equal((await f.request()).body.checkoutEnabled,true);
 const mismatch=fixture({released:true,reply:{...account,environment:'development'}});assert.equal((await mismatch.request()).statusCode,503);
});
test('provider parsing rejects malformed, oversized or non-JSON responses and never leaks the provider body',async()=>{
 const replies=[
  ()=>new Response('private-error',{status:500,headers:{'content-type':'text/html'}}),
  ()=>new Response('{broken',{headers:{'content-type':'application/json'}}),
  ()=>new Response(new Uint8Array([123,34,120,34,58,34,255,34,125]),{headers:{'content-type':'application/json'}}),
  ()=>new Response(' '.repeat(65537),{headers:{'content-type':'application/json'}}),
  ()=>new Response('{}',{headers:{'content-type':'application/json','content-length':'65537'}}),
  ()=>Response.json({environment:'production',privateSecret:'do-not-return'})
 ];
 for(const reply of replies){const f=fixture({reply});const r=await f.request();assert.equal(r.statusCode,503);assert.deepEqual(r.body,{error:'subscription_unavailable'});}
});
test('payment redirects accept only the action-specific HTTPS Stripe host',async()=>{
 for(const url of ['https://evil.example/','http://billing.stripe.com/','https://billing.stripe.com.evil.example/','https://user:password@billing.stripe.com/','https://checkout.stripe.com/']){
  const f=fixture({reply:{url}});const r=await f.request({action:'portal',input:{workflowId:workflow}});assert.equal(r.statusCode,503);
 }
});
test('coerced actions and malformed required billing fields never reach the provider',async()=>{
 const enrollment={tenantId:tenant,plan:'pro',market:'US-CA',consent:true,consentVersion:'2026-11',channel:'direct'};
 const bodies=[{action:['enroll'],input:enrollment},{action:['account']},{action:'constructor'},
  {action:'link',input:{email:'invalid',password:'synthetic-private-value'}},
  {action:'link',input:{email:'qa@example.test',password:'fixture',mfaCode:123456}},
  {action:'unlink',input:{confirm:'true'}},{action:'state',input:{}},
  {action:'checkout',input:{workflowId:[workflow]}},
  {action:'enroll',input:{...enrollment,consent:false}},{action:'enroll',input:{...enrollment,channel:'unapproved'}}];
 for(const body of bodies){const f=fixture({released:true,reply:{workflowId:workflow,state:'requested'}});const result=await f.request(body,{headers:{'idempotency-key':'synthetic-enroll-1'}});assert.equal(result.statusCode,400,JSON.stringify(body));assert.equal(f.requests.length,0);assert.ok(!JSON.stringify(result.body).includes('synthetic-private-value'));}
 const f=fixture({reply:{workflowId:workflow,state:'requested'}});assert.equal((await f.request({action:['enroll'],input:enrollment},{headers:{'idempotency-key':'synthetic-enroll-1'}})).statusCode,400);
 await assert.rejects(f.adapter.call(['enroll'],enrollment,'fixture-token'),/invalid_subscription_request/);assert.equal(f.requests.length,0);
});
test('unlinked identity and paused release cannot advertise current product access',async()=>{
 const unlinked=fixture({released:true,reply:{...account,linked:false}});const body=(await unlinked.request()).body;
 assert.equal(body.checkoutEnabled,false);assert.equal(body.accessCurrent,false);assert.deepEqual(body.workspaces,[]);assert.deepEqual(body.subscriptions,[]);
 const paused=fixture({reply:account});assert.equal((await paused.request()).body.accessCurrent,false);
 const access=fixture({reply:{environment:'production',market:'US-CA',allowed:true}});assert.equal((await access.request({action:'access'})).body.allowed,false);
 const state=fixture({reply:{workflowId:workflow,state:'active',accessCurrent:true}});assert.equal((await state.request({action:'state',input:{workflowId:workflow}})).body.accessCurrent,false);
});
