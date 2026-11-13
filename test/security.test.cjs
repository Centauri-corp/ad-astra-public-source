'use strict';
const {test,beforeEach,after}=require('node:test'), assert=require('node:assert/strict'), crypto=require('node:crypto'), vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ask=require('../api/ask'),status=require('../api/status'),auth=require('../lib/auth'),quota=require('../lib/quota'),gates=require('../lib/release-gates');
const models=require('../api/models'),catalog=require('../lib/model-catalog');
const originalEnv={...process.env},originalFetch=global.fetch;
const customerBudget=require('./fixtures/customer-budget.cjs');
const release=require('../public/release-manifest.json'),routing=require('../vercel.json');
const originalRelease=structuredClone(release),originalRedirects=structuredClone(routing.redirects);
const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...pair.publicKey.export({format:'jwk'}),kid:'test-key',use:'sig',alg:'RS256'};
let calls=[],redisResult=[1,11,3600],providerStatus=200,providerPayload,budgetReply;
function token(overrides={},head={}){
 const now=Math.floor(Date.now()/1000);
 const claims={iss:'https://clerk.adastra.global',aud:'ad-astra-workspace',azp:'https://adastra.global',sub:'user_testA',sid:'sess_testA',iat:now,nbf:now-1,exp:now+60,...overrides};
 const parts=[{alg:'RS256',kid:jwk.kid,typ:'JWT',...head},claims].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url'));
 return parts.join('.')+'.'+crypto.sign('RSA-SHA256',Buffer.from(parts.join('.')),pair.privateKey).toString('base64url');
}
function response(){return {headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(v){this.body=v?JSON.parse(v):null;}};}
async function request(options={}){
 const req={method:'POST',headers:{host:'adastra.global',origin:'https://adastra.global','content-type':'application/json','x-ad-astra-request':'public-v1',authorization:'Bearer '+token(),...options.headers},body:{question:'Explain gravity simply.',mode:'ask'},...options};
 req.headers={host:'adastra.global',origin:'https://adastra.global','content-type':'application/json','x-ad-astra-request':'public-v1','idempotency-key':crypto.randomUUID(),authorization:'Bearer '+token(),...options.headers};
 const res=response(); await ask(req,res);return res;
}
beforeEach(()=>{
 // In-memory accepted-source fixture only; never edits public manifests.
 release.publicLaunchEnabled=true;release.engineAvailable=true;routing.redirects=[];
 for(const key of Object.keys(process.env))if(!(key in originalEnv))delete process.env[key];
 Object.assign(process.env,originalEnv,{AD_ASTRA_ACCESS_MODE:'authenticated',AD_ASTRA_AUTH_ISSUER:'https://clerk.adastra.global',AD_ASTRA_AUTH_JWKS_URL:'https://clerk.adastra.global/.well-known/jwks.json',AD_ASTRA_AUTH_AUDIENCE:'ad-astra-workspace',AD_ASTRA_DAILY_BUDGET_MICRO_USD:'10000000',KV_REST_API_URL:'https://redis.invalid',KV_REST_API_TOKEN:'synthetic-test-only',AD_ASTRA_MODEL_GATEWAY_URL:'https://gateway.invalid/v1/respond',AD_ASTRA_MODEL_GATEWAY_TOKEN:'synthetic-gateway-token',AD_ASTRA_MODEL_GATEWAY_CONTRACT:'ad-astra-model-gateway/v1',VERCEL_ENV:'production'});
 for(const flag of gates.FLAGS)process.env[flag]='true';
 Object.assign(process.env,customerBudget.env);budgetReply=null;
 calls=[];redisResult=[1,11,3600];providerStatus=200;
 providerPayload={object:'chat.completion',model:'astra-lumen',choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:'Synthetic fixture response'}}],usage:{prompt_tokens:100,completion_tokens:20,total_tokens:120}};
 global.fetch=async(url,options)=>{
  calls.push({url,options});
  if(url.includes('/.well-known/jwks.json'))return {ok:true,json:async()=>({keys:[jwk]})};
  if(url==='https://redis.invalid')return {ok:true,json:async()=>({result:redisResult})};
  if(url===customerBudget.url)return Response.json(budgetReply||customerBudget.allowance(options));
  if(url==='https://gateway.invalid/v1/respond')return Response.json(providerPayload,{status:providerStatus});
  throw Error('Unexpected external destination');
 };
});
after(()=>{global.fetch=originalFetch;Object.assign(release,originalRelease);routing.redirects=originalRedirects;for(const k of Object.keys(process.env))if(!(k in originalEnv))delete process.env[k];Object.assign(process.env,originalEnv);});
test('runtime switches cannot bypass a marketing-only source or closed customer routes',async()=>{
 for(const key of ['publicLaunchEnabled','engineAvailable']){release[key]=false;calls=[];const r=await request();assert.equal(r.statusCode,503);assert.equal(r.body.error,'release_not_ready');assert.ok(!calls.some(c=>c.url==='https://redis.invalid'||c.url.includes('/v1/respond')));release[key]=true;}
  assert.deepEqual(routing.redirects, []);
});
test('all five contracted modes and governed agent profiles use a bounded provider request in the synthetic fixture',async()=>{
 const ids=require('../lib/modes').MODE_IDS;assert.deepEqual(ids,release.customerModes);assert.deepEqual(catalog.MODELS[0].modes,ids);
 for(const mode of ids){calls=[];const r=await request({body:{question:'Compare two clear alternatives.',mode}});assert.equal(r.statusCode,200);assert.equal(r.body.mode,mode);assert.equal(calls.filter(c=>c.url.includes('/v1/respond')).length,1);}
 const r=await request({body:{question:'Compare two clear alternatives.',mode:'research',agentId:'researcher'}});assert.equal(r.statusCode,200);assert.equal(r.body.agentId,'researcher');
});
test('valid signed session reserves quota before one bounded provider request',async()=>{
 const r=await request();assert.equal(r.statusCode,200);assert.equal(r.headers['cache-control'],'no-store');
 const quotaIndex=calls.findIndex(c=>c.url==='https://redis.invalid'),modelIndex=calls.findIndex(c=>c.url.includes('/v1/respond'));assert.ok(quotaIndex<modelIndex);
 const admissionIndex=calls.findIndex(c=>c.url===customerBudget.url);assert.ok(admissionIndex>quotaIndex&&admissionIndex<modelIndex);
 const admission=JSON.parse(calls[admissionIndex].options.body);assert.deepEqual(Object.keys(admission).sort(),['idempotencyKey','protocol','requestHash']);
 const payload=JSON.parse(calls[modelIndex].options.body);assert.equal(payload.agentId,'guide');assert.equal(payload.mode,'ask');assert.ok(Array.isArray(payload.messages));assert.ok(!('model' in payload));assert.ok(calls[modelIndex].options.signal);
});
test('paid denial, revoked access, replay and tenant capacity never reach the provider',async()=>{
 for(const [reason,code] of [['paid_access_required',403],['request_replayed',409],['capacity_reached',429]]){
  budgetReply={protocol:'ad-astra-customer-budget/v1',allowed:false,reason};calls=[];
  const r=await request();assert.equal(r.statusCode,code);assert.equal(r.body.error,reason);
  assert.ok(!calls.some(c=>c.url.includes('/v1/respond')));assert.ok(!JSON.stringify(r.body).includes('secret'));
 }
});
test('an invalid or unavailable bridge cannot fall back to identity and Redis alone',async()=>{
 for(const value of [{allowed:true},{protocol:'ad-astra-customer-budget/v1',allowed:false,reason:'unknown'},
  {...customerBudget.allowance({body:JSON.stringify({requestHash:'a'.repeat(64)})}),expiresAt:0}]){
  budgetReply=value;calls=[];const r=await request();assert.equal(r.statusCode,503);
  assert.equal(r.body.error,'customer_access_unavailable');assert.ok(!calls.some(c=>c.url.includes('/v1/respond')));
 }
 delete process.env.AD_ASTRA_CUSTOMER_BUDGET_SECRET;assert.equal((await request()).statusCode,503);
});
test('every absent or false release flag prevents all quota and model calls',async()=>{
 for(const flag of gates.FLAGS){process.env[flag]='false';calls=[];const r=await request();assert.equal(r.statusCode,503);assert.equal(r.body.error,'release_not_ready');assert.ok(!calls.some(c=>c.url==='https://redis.invalid'||c.url.includes('/v1/respond')));process.env[flag]='true';}
 delete process.env.AD_ASTRA_SECURITY_REVIEW_APPROVED;assert.equal((await request()).statusCode,503);
});
test('auth mode cannot become public, absent auth configuration denies',async()=>{
 for(const value of ['public','disabled','']){process.env.AD_ASTRA_ACCESS_MODE=value;assert.equal((await request()).statusCode,503);}
 delete process.env.AD_ASTRA_ACCESS_MODE;assert.equal((await request()).statusCode,503);assert.equal(calls.length,0);
});
test('missing and forged bearer tokens never reach quota or model',async()=>{
 assert.equal((await request({headers:{authorization:''}})).statusCode,401);
 const parts=token().split('.');parts[2]=Buffer.alloc(256).toString('base64url');
 assert.equal((await request({headers:{authorization:'Bearer '+parts.join('.')}})).statusCode,401);
 assert.ok(!calls.some(c=>c.url.includes('/v1/respond')||c.url==='https://redis.invalid'));
});
test('JWT issuer audience azp subject session state and numeric date checks',async()=>{
 const now=Math.floor(Date.now()/1000);
 for(const claims of [{iss:'https://evil.example'},{aud:undefined},{aud:'wrong'},{azp:undefined},{azp:'https://evil.example'},{sub:''},{sid:undefined},{sts:'pending'},{exp:now-1},{exp:String(now+60)},{nbf:'not-a-date'},{nbf:now+60},{iat:now+60},{exp:now+3600}]){
  assert.equal((await request({headers:{authorization:'Bearer '+token(claims)}})).statusCode,401,JSON.stringify(claims));
 }
 for(const h of [{alg:'none'},{alg:'HS256'},{jku:'https://evil.example'},{kid:'unknown'},{crit:['b64']}])assert.equal((await request({headers:{authorization:'Bearer '+token({},h)}})).statusCode,401);
 assert.ok(!calls.some(c=>c.url.includes('/v1/respond')));
});
test('origin and method rejection cannot be bypassed with Host or proxy headers',async()=>{
 assert.equal((await request({method:'GET'})).statusCode,405);
 for(const headers of [{origin:'https://evil.example',host:'evil.example'},{origin:''},{'sec-fetch-site':'cross-site'},{'x-ad-astra-request':''},{host:'evil.example','x-forwarded-host':'adastra.global',origin:'https://adastra.global'}])assert.equal((await request({headers})).statusCode,403);
 assert.equal(calls.length,0);
});
test('body limits apply to parsed objects, strings, Unicode, and unknown fields',async()=>{
 assert.equal((await request({headers:{'content-type':'text/plain'}})).statusCode,415);
 assert.equal((await request({body:'{'})).statusCode,400);
 assert.equal((await request({body:[]})).statusCode,400);
 assert.equal((await request({body:{question:'x'.repeat(15000)}})).statusCode,413);
 assert.equal((await request({body:JSON.stringify({question:'x'.repeat(15000)})})).statusCode,413);
 assert.equal((await request({headers:{'content-length':'15000'}})).statusCode,413);
 for(const body of [{question:'tiny'},{question:'x'.repeat(4001)},{question:'A valid question',mode:'__proto__'},{question:'A valid question',agentId:'unknown'},{question:'A valid question',references:[{title:'private'}]},{question:'A valid question',model:'unbounded-model'}])assert.equal((await request({body})).statusCode,422);
 assert.equal(calls.length,0);
});
test('quota outage and corrupt replies fail closed without memory fallback',async()=>{
 for(const result of [null,'1',[-1,0,60],[1,20,0],[1,'11',3600]]){redisResult=result;assert.equal((await request()).statusCode,503);}
 delete process.env.KV_REST_API_TOKEN;delete process.env.UPSTASH_REDIS_REST_TOKEN;assert.equal((await request()).statusCode,503);
 assert.ok(!calls.some(c=>c.url.includes('/v1/respond')));
});
test('user quota and global budget exhaustion stop model calls with Retry-After',async()=>{
 for(const [result,error] of [[[0,0,120],'rate_limit_reached'],[[2,0,3600],'daily_capacity_reached']]){redisResult=result;const r=await request();assert.equal(r.statusCode,429);assert.equal(r.body.error,error);assert.ok(Number(r.headers['retry-after'])>0);}
 assert.ok(!calls.some(c=>c.url.includes('/v1/respond')));
});
test('budget is required and never exceeds the owner-approved ceiling',async()=>{
 for(const value of ['', 'NaN','10000001','-1','1.5']){process.env.AD_ASTRA_DAILY_BUDGET_MICRO_USD=value;assert.equal((await request()).statusCode,503);}
 assert.ok(!calls.some(c=>c.url.includes('/v1/respond')));
});
test('quota keys use signed identity, ignore spoofed IP and survive module reload',async()=>{
 await request({headers:{'x-forwarded-for':'1.2.3.4'}});const first=JSON.parse(calls.find(c=>c.url==='https://redis.invalid').options.body);
 calls=[];await request({headers:{'x-forwarded-for':'9.8.7.6'}});const second=JSON.parse(calls.find(c=>c.url==='https://redis.invalid').options.body);
 assert.deepEqual(first.slice(3,5),second.slice(3,5));assert.ok(!first[3].includes('user_testA'));
 delete require.cache[require.resolve('../lib/quota')];calls=[];await require('../lib/quota').reserve({iss:'https://clerk.adastra.global',sub:'user_testA'});assert.equal(JSON.parse(calls[0].options.body)[3],first[3]);
});
test('provider 429 yields safe 503 without retry or refund',async()=>{
 providerStatus=429;const r=await request();assert.equal(r.statusCode,503);assert.equal(r.body.error,'ai_unavailable');assert.equal(calls.filter(c=>c.url.includes('/v1/respond')).length,1);assert.equal(calls.filter(c=>c.url==='https://redis.invalid').length,1);
 assert.ok(!JSON.stringify(r.body).includes('synthetic-test-only'));
});
test('provider model/format violations never publish an answer, replay or expose the provider body',async()=>{
 const valid=structuredClone(providerPayload);
 for(const mutate of [p=>p.model='unapproved-private-model',p=>p.choices[0].finish_reason='length',
   p=>p.choices[0].message.tool_calls=[{function:{name:'unapproved-tool'}}],p=>p.usage.total_tokens=999]){
  providerPayload=structuredClone(valid);mutate(providerPayload);calls=[];
  const r=await request();assert.equal(r.statusCode,503);assert.equal(r.body.error,'ai_unavailable');
  assert.ok(!('answer' in r.body));assert.ok(!JSON.stringify(r.body).includes('unapproved'));
  assert.equal(calls.filter(c=>c.url.includes('/v1/respond')).length,1);
  assert.equal(calls.filter(c=>c.url==='https://redis.invalid').length,1);
 }
});
test('status exposes availability only and requires actual release configuration',()=>{
 process.env.AD_ASTRA_SECURITY_REVIEW_APPROVED='false';const r=response();status({method:'GET'},r);assert.deepEqual(Object.keys(r.body).sort(),['available','message']);assert.equal(r.body.available,false);
});
test('public model catalog exposes stable names without provider details',()=>{
 const r=response();models({method:'GET'},r);assert.equal(r.statusCode,200);assert.equal(r.headers['cache-control'],'public, max-age=300, stale-while-revalidate=3600');
 const body=r.body;assert.equal(body.family,'Ad Astra');assert.equal(body.architecture,'one-connected-model-with-sector-profiles');assert.equal(body.models.length,1);assert.deepEqual(body.models.map(m=>m.id),catalog.MODELS.map(m=>m.id));assert.equal(body.profiles.length,catalog.MARKET_PROFILES.length);
 for(const model of body.models){assert.ok(model.name.startsWith('Astra '));assert.ok(!('provider' in model));assert.ok(!('apiKey' in model));}
 for(const profile of body.profiles){assert.ok(profile.name.startsWith('Astra '));assert.equal(profile.foundationModel,'astra-lumen');assert.ok(!('provider' in profile));assert.ok(!('apiKey' in profile));}
});
test('public agent surface is present and portal routes redirect away',()=>{
 const agent=fs.readFileSync(path.join(__dirname,'../public/agent/index.html'),'utf8');
 assert.match(agent,/Astra\s*<br><em>Polaris\.<\/em>/);
 assert.match(agent,/Start with curiosity/);
 const vercel=JSON.parse(fs.readFileSync(path.join(__dirname,'../vercel.json'),'utf8'));
  assert.deepEqual(vercel.redirects, []);
});
test('return paths reject external URLs and preserve approved mode navigation',()=>{
 const context={window:{},URL,location:{origin:'https://adastra.global'}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/auth-navigation.js'),'utf8'),context);
 const safe=context.window.adAstraReturnPath;
 for(const value of ['https://evil.example','//evil.example','/\\evil.example','javascript:alert(1)','/sign-in/','/%2f%2fevil.example'])assert.equal(safe(value),'/platform/');
  assert.equal(safe('/knowledge/?mode=learn#ask-ad-astra'),'/knowledge/?mode=learn#ask-ad-astra');
 assert.equal(safe('/account/billing/'),'/account/billing/');
 assert.equal(safe('/account/billing/?return=https://evil.example&mode=learn#ask-ad-astra'),'/account/billing/');
 for(const value of ['/account/','/account/billing/extra/','/account/billing/%2f%2fevil.example','/account/billing/\\evil.example'])assert.equal(safe(value),'/platform/');
});
test('session handshake verifies identity without model or quota access',async()=>{
 const session=require('../api/session');
 for(const [authorization,code] of [['Bearer '+token(),200],['',401],['Bearer invalid.token.value',401]]){
  const res=response();await session({method:'POST',headers:{host:'adastra.global',origin:'https://adastra.global','x-ad-astra-request':'public-v1',authorization}},res);
  assert.equal(res.statusCode,code);assert.equal(res.body.authenticated,code===200);assert.deepEqual(Object.keys(res.body),['authenticated']);
 }
 assert.ok(!calls.some(c=>c.url==='https://redis.invalid'||c.url.includes('/v1/respond')));
});
