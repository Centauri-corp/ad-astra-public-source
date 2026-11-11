'use strict';
const {test,beforeEach,after}=require('node:test');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const handler=require('../api/subscriptions'),subscriptions=require('../lib/subscriptions');
const originalEnv={...process.env},originalFetch=global.fetch;
const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...pair.publicKey.export({format:'jwk'}),kid:'billing-test-key',use:'sig',alg:'RS256'};
const tenantId='12345678-1234-4234-8234-123456789012',workflowId='22345678-1234-4234-8234-123456789012';
let calls=[],upstream;
function token(){const now=Math.floor(Date.now()/1000),parts=[{alg:'RS256',kid:jwk.kid},{iss:'https://clerk.adastra.global',aud:'ad-astra-workspace',azp:'https://adastra.global',sub:'user_billing',sid:'sess_billing',iat:now,nbf:now-1,exp:now+60}].map(value=>Buffer.from(JSON.stringify(value)).toString('base64url'));return parts.join('.')+'.'+crypto.sign('RSA-SHA256',Buffer.from(parts.join('.')),pair.privateKey).toString('base64url');}
async function request(body,headers={}){const res={headers:{},setHeader(key,value){this.headers[key.toLowerCase()]=value;},end(value){this.body=JSON.parse(value);}};await handler({method:'POST',headers:{host:'adastra.global',origin:'https://adastra.global','content-type':'application/json','x-ad-astra-request':'public-v1',authorization:'Bearer '+token(),...headers},body},res);return res;}
beforeEach(()=>{Object.assign(process.env,{AD_ASTRA_SUBSCRIPTION_ENVIRONMENT:'production',AD_ASTRA_ACCESS_MODE:'authenticated',AD_ASTRA_AUTH_ISSUER:'https://clerk.adastra.global',AD_ASTRA_AUTH_AUDIENCE:'ad-astra-workspace',AD_ASTRA_AUTH_JWKS_URL:'https://clerk.adastra.global/.well-known/jwks.json'});calls=[];upstream={environment:'production',market:'US-CA',linked:true,linkingEnabled:true,checkoutEnabled:true,accessCurrent:true,consentVersion:'ca-v1',termsUrl:'https://adastra.global/terms/',privacyUrl:'https://adastra.global/privacy/',workspaces:[{tenantId,name:'Workspace'}],subscriptions:[]};global.fetch=async(url,options)=>{if(url.includes('/.well-known/jwks.json'))return Response.json({keys:[jwk]});calls.push({url,options});return Response.json(upstream);};});
after(()=>{global.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in originalEnv))delete process.env[key];Object.assign(process.env,originalEnv);});
test('invalid customer actions and required billing fields stop at the public boundary',async()=>{
 const invalid=[{action:['account']},{action:'constructor'}, {action:'link',input:{email:'bad',password:'private-fixture'}},{action:'link',input:{email:'a@b.co',password:'x',mfaCode:123456}},{action:'checkout',input:{workflowId:{toString:'x'}}},{action:'state',input:{}},{action:'unlink',input:{confirm:'true'}},{action:'enroll',input:{tenantId,plan:'pro',market:'US-CA',consent:false,consentVersion:'ca-v1',channel:'direct'}},{action:'account',input:{tenantId}}];
 for(const body of invalid){const result=await request(body);assert.equal(result.statusCode,400,JSON.stringify(body));assert.equal(result.body.error,'invalid_subscription_request');assert.ok(!JSON.stringify(result.body).includes('private-fixture'));}
 assert.equal(calls.length,0);
 const missingKey=await request({action:'enroll',input:{tenantId,plan:'pro',market:'US-CA',consent:true,consentVersion:'ca-v1',channel:'direct'}});assert.equal(missingKey.statusCode,400);assert.equal(calls.length,0);
});
test('account admission requires a linked identity, valid consent, and approved policy links',async()=>{
 assert.equal((await request({action:'account'})).body.checkoutEnabled,true);
 for(const change of [{consentVersion:null},{consentVersion:'invalid version'},{termsUrl:'https://evil.example/terms/'},{privacyUrl:'https://adastra.global/'},{linked:false}]){const previous={...upstream};Object.assign(upstream,change);const result=await request({action:'account'});assert.equal(result.statusCode,200);assert.equal(result.body.checkoutEnabled,false,JSON.stringify(change));if(change.linked===false)assert.equal(result.body.accessCurrent,false);upstream=previous;}
 process.env.AD_ASTRA_SUBSCRIPTION_ENVIRONMENT='development';upstream.environment='development';const sandbox=await request({action:'account'});assert.equal(sandbox.body.checkoutEnabled,false);assert.equal(sandbox.body.accessCurrent,false);
});
test('customer calls preserve the enrollment key and constrain provider navigation',async()=>{
 const input={tenantId,plan:'starter',market:'US-CA',consent:true,consentVersion:'ca-v1',channel:'direct'};
 upstream={workflowId,state:'requested'};assert.equal((await request({action:'enroll',input},{'idempotency-key':'enroll-retry-123'})).statusCode,200);assert.equal(calls[0].options.headers['Idempotency-Key'],'enroll-retry-123');assert.deepEqual(JSON.parse(calls[0].options.body),input);
 for(const url of ['https://checkout.stripe.com.evil.example/','http://billing.stripe.com/','https://user:pass@billing.stripe.com/']){upstream={url};assert.equal((await request({action:'portal',input:{workflowId}})).statusCode,503);}
 upstream={url:'https://billing.stripe.com/p/session-fixture'};const portal=await request({action:'portal',input:{workflowId}});assert.equal(portal.statusCode,200);assert.equal(portal.body.url,upstream.url);assert.equal(portal.headers['cache-control'],'no-store');
 assert.equal(subscriptions.validInput('account',{}),true);
});
