'use strict';
const {test,beforeEach,after}=require('node:test'), assert=require('node:assert/strict'), crypto=require('node:crypto'), vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ask=require('../api/ask'),workspaceHandler=require('../api/workspace'),status=require('../api/status'),auth=require('../lib/auth'),quota=require('../lib/quota'),gates=require('../lib/release-gates');
const models=require('../api/models'),catalog=require('../lib/model-catalog'),bridge=require('../lib/customer-workspace');
const originalEnv={...process.env},originalFetch=global.fetch;
const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...pair.publicKey.export({format:'jwk'}),kid:'test-key',use:'sig',alg:'RS256'};
const sessionId='11111111-1111-4111-8111-111111111111', requestId='22222222-2222-4222-8222-222222222222';
const base={protocol:bridge.PROTOCOL,environment:'production',market:'US-CA',canExecute:true,releaseId:'synthetic-release'};
let calls=[],redisResult=[1,11,3600],runtimeStatus=200,access=true,recoveryStatus=404;
function token(overrides={},head={}){
 const now=Math.floor(Date.now()/1000);
 const claims={iss:'https://clerk.adastra.global',aud:'ad-astra-workspace',azp:'https://adastra.global',sub:'user_testA',sid:'sess_testA',iat:now,nbf:now-1,exp:now+60,...overrides};
 const parts=[{alg:'RS256',kid:jwk.kid,typ:'JWT',...head},claims].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url'));
 return parts.join('.')+'.'+crypto.sign('RSA-SHA256',Buffer.from(parts.join('.')),pair.privateKey).toString('base64url');
}
function response(){return {headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(v){this.body=v?JSON.parse(v):null;}};}
async function request(options={}){
 const req={method:'POST',body:{productId:'day',input:{goal:'Learn a useful topic',minutes:25}},...options};
 req.headers={host:'adastra.global',origin:'https://adastra.global','content-type':'application/json','x-ad-astra-request':'public-v1','idempotency-key':crypto.randomUUID(),authorization:'Bearer '+token(),...options.headers};
 const res=response(); await (options.handler || ask)(req,res);return res;
}
function runReply(body){
 const now=new Date().toISOString();
 const turn={requestId,status:'completed',input:body.input,result:{app:body.productId,title:'Synthetic saved plan',metric:'25 minutes',items:['One synthetic action'],notice:'Synthetic fixture'},answer:'Synthetic fixture response',citations:[],usage:{state:'reconciled',reservedCents:2,actualCents:1},createdAt:now};
 return {...base,requestId,status:'completed',session:{id:body.sessionId || sessionId,productId:body.productId,title:'Synthetic session',updatedAt:now,turns:[turn],nextCursor:null}};
}
const actions=()=>calls.filter(call=>call.url.endsWith('/astra-customer-workspace-production')).map(call=>JSON.parse(call.options.body).action);
beforeEach(()=>{
 for(const key of Object.keys(process.env))if(!(key in originalEnv))delete process.env[key];
 Object.assign(process.env,originalEnv,{AD_ASTRA_ACCESS_MODE:'authenticated',AD_ASTRA_AUTH_ISSUER:'https://clerk.adastra.global',AD_ASTRA_AUTH_JWKS_URL:'https://clerk.adastra.global/.well-known/jwks.json',AD_ASTRA_AUTH_AUDIENCE:'ad-astra-workspace',AD_ASTRA_DAILY_BUDGET_MICRO_USD:'10000000',KV_REST_API_URL:'https://redis.invalid',KV_REST_API_TOKEN:'synthetic-test-only',VERCEL_ENV:'production',AD_ASTRA_SUBSCRIPTION_ENVIRONMENT:'production',AD_ASTRA_CUSTOMER_RUNTIME_ENABLED:'true',AD_ASTRA_CUSTOMER_WORKSPACE_SECRET:'synthetic-test-only-bridge-secret-000000'});
 for(const flag of gates.FLAGS)process.env[flag]='true';
 delete process.env.OPENAI_API_KEY;delete process.env.OPENAI_MODEL;
 calls=[];redisResult=[1,11,3600];runtimeStatus=200;access=true;recoveryStatus=404;
 global.fetch=async(url,options)=>{
  calls.push({url,options});
  if(url.includes('/.well-known/jwks.json'))return {ok:true,json:async()=>({keys:[jwk]})};
  if(url==='https://redis.invalid')return {ok:true,json:async()=>({result:redisResult})};
  if(url.endsWith('/astra-customer-workspace-production')){
   const body=JSON.parse(options.body);
   if(body.action==='status')return access==='outage'?Response.json({error:'unavailable'},{status:503}):Response.json({...base,environment:access==='wrong-environment'?'development':'production',canExecute:access===true});
   if(body.action==='recover') {
    if(access===false)return Response.json({error:'customer_access_required'},{status:403});
    if(access==='outage')return Response.json({error:'unavailable'},{status:503});
    if(access==='wrong-environment')return Response.json({...runReply(body),environment:'development'});
    if(recoveryStatus===404)return Response.json({error:'workspace_not_found'},{status:404});
    if(recoveryStatus===409)return Response.json({error:'idempotency_conflict',secret:'never-forward-this'},{status:409});
    const saved=runReply(body);
    if(recoveryStatus===202){saved.status='pending';saved.session.turns[0].status='pending';saved.session.turns[0].answer='';}
    return Response.json(saved,{status:recoveryStatus});
   }
   if(body.action==='list')return Response.json({...base,sessions:[]});
   if(body.action==='run')return runtimeStatus===200?Response.json(runReply(body)):Response.json({error:'request_limit_reached'},{status:runtimeStatus});
  }
  throw Error('Unexpected external destination');
 };
});
after(()=>{global.fetch=originalFetch;for(const k of Object.keys(process.env))if(!(k in originalEnv))delete process.env[k];Object.assign(process.env,originalEnv);});
test('signed recovery and quota precede one bounded canonical run, without public model credentials',async()=>{
 const r=await request();assert.equal(r.statusCode,200);assert.equal(r.headers['cache-control'],'no-store');
 const quotaIndex=calls.findIndex(c=>c.url==='https://redis.invalid');
 const runIndex=calls.findIndex(c=>c.options && c.url.endsWith('/astra-customer-workspace-production') && JSON.parse(c.options.body).action==='run');
 assert.ok(quotaIndex>=0 && quotaIndex<runIndex);assert.deepEqual(actions(),['recover','run']);
 const sent=calls[runIndex];assert.equal(JSON.parse(sent.options.body).protocol,bridge.PROTOCOL);
 assert.ok(sent.options.signal);assert.equal(sent.options.redirect,'error');
 assert.equal(sent.options.headers['x-ad-astra-bridge-secret'],process.env.AD_ASTRA_CUSTOMER_WORKSPACE_SECRET);
 assert.ok(!calls.some(c=>/openai.com|generations|chat\/completions/.test(c.url)));
 assert.ok(!JSON.stringify(r.body).includes('synthetic-test-only'));
 assert.equal(r.body.requestId,requestId);assert.notEqual(r.body.transportRequestId,requestId);
});
test('recovery authorization failures, outages and wrong environments stop quota and execution',async()=>{
 for(const [value,code]of [[false,403],['outage',503],['wrong-environment',503]]){
  access=value;calls=[];assert.equal((await request()).statusCode,code);
  assert.ok(!calls.some(c=>c.url==='https://redis.invalid'));assert.ok(!actions().includes('run'));
 }
});
test('missing bridge configuration prevents lookup; missing runtime admission prevents new execution',async()=>{
 const old=process.env.AD_ASTRA_CUSTOMER_WORKSPACE_SECRET;delete process.env.AD_ASTRA_CUSTOMER_WORKSPACE_SECRET;
 const missing=await request();assert.equal(missing.statusCode,503);assert.equal(missing.body.error,'workspace_unavailable');assert.deepEqual(actions(),[]);
 process.env.AD_ASTRA_CUSTOMER_WORKSPACE_SECRET=old;delete process.env.AD_ASTRA_CUSTOMER_RUNTIME_ENABLED;
 const held=await request();assert.equal(held.statusCode,503);assert.equal(held.body.error,'release_not_ready');assert.deepEqual(actions(),['recover']);assert.ok(!calls.some(c=>c.url==='https://redis.invalid'));
});
test('every absent or false release flag prevents new work while permitting read-only recovery',async()=>{
 for(const flag of gates.FLAGS){process.env[flag]='false';calls=[];const r=await request();assert.equal(r.statusCode,503);assert.equal(r.body.error,'release_not_ready');assert.ok(!calls.some(c=>c.url==='https://redis.invalid'));assert.deepEqual(actions(),['recover']);process.env[flag]='true';}
 delete process.env.AD_ASTRA_SECURITY_REVIEW_APPROVED;assert.equal((await request()).statusCode,503);
});
test('authorized saved-session reads remain available during execution hold and never reserve spend',async()=>{
 process.env.AD_ASTRA_ENABLE_LIVE_AI='false';
 const result=await request({handler:workspaceHandler,body:{action:'list'}});
 assert.equal(result.statusCode,200);assert.equal(result.body.canExecute,false);assert.deepEqual(result.body.sessions,[]);
 assert.deepEqual(actions(),['list']);assert.ok(!calls.some(c=>c.url==='https://redis.invalid'));
});
test('accepted completed and pending outcomes are recoverable during hold without another admission',async()=>{
 process.env.AD_ASTRA_ENABLE_LIVE_AI='false';redisResult=[0,0,3600];
 for(const code of [200,202]){
  calls=[];recoveryStatus=code;
  const result=await request({headers:{'idempotency-key':'accepted-request-0001'}});
  assert.equal(result.statusCode,code);assert.equal(result.body.canExecute,false);assert.equal(result.body.requestId,requestId);
  assert.deepEqual(actions(),['recover']);assert.ok(!calls.some(c=>c.url==='https://redis.invalid'));
 }
});
test('a recovery conflict is returned unchanged and never falls through to quota or a new run',async()=>{
 recoveryStatus=409;process.env.AD_ASTRA_ENABLE_LIVE_AI='false';
 const body={productId:'career',sessionId,input:{role:'A different request',weeks:8},question:'Changed context'};
 const result=await request({body,headers:{'idempotency-key':'reused-key-0001'}});
 assert.equal(result.statusCode,409);assert.equal(result.body.error,'idempotency_conflict');
 assert.ok(!JSON.stringify(result.body).includes('never-forward-this'));assert.deepEqual(actions(),['recover']);assert.ok(!calls.some(c=>c.url==='https://redis.invalid'));
 const lookup=calls.find(c=>c.url.endsWith('/astra-customer-workspace-production'));
 assert.deepEqual(JSON.parse(lookup.options.body),{protocol:bridge.PROTOCOL,...body,action:'recover'});
 assert.equal(lookup.options.headers['Idempotency-Key'],'reused-key-0001');
});
test('auth mode cannot become public and missing auth configuration denies',async()=>{
 for(const value of ['public','disabled','']){process.env.AD_ASTRA_ACCESS_MODE=value;assert.equal((await request()).statusCode,503);}
 delete process.env.AD_ASTRA_ACCESS_MODE;assert.equal((await request()).statusCode,503);assert.equal(calls.length,0);
});
test('missing and forged bearer tokens never reach quota or runtime',async()=>{
 assert.equal((await request({headers:{authorization:''}})).statusCode,401);
 const parts=token().split('.');parts[2]=Buffer.alloc(256).toString('base64url');
 assert.equal((await request({headers:{authorization:'Bearer '+parts.join('.')}})).statusCode,401);
 assert.deepEqual(actions(),[]);assert.ok(!calls.some(c=>c.url==='https://redis.invalid'));
});
test('JWT issuer audience azp subject session state and numeric date checks',async()=>{
 const now=Math.floor(Date.now()/1000);
 for(const claims of [{iss:'https://evil.example'},{aud:undefined},{aud:'wrong'},{azp:undefined},{azp:'https://evil.example'},{sub:''},{sid:undefined},{sts:'pending'},{exp:now-1},{exp:String(now+60)},{nbf:'not-a-date'},{nbf:now+60},{iat:now+60},{exp:now+3600}]){
  assert.equal((await request({headers:{authorization:'Bearer '+token(claims)}})).statusCode,401,JSON.stringify(claims));
 }
 for(const h of [{alg:'none'},{alg:'HS256'},{jku:'https://evil.example'},{kid:'unknown'},{crit:['b64']}])assert.equal((await request({headers:{authorization:'Bearer '+token({},h)}})).statusCode,401);
 assert.deepEqual(actions(),[]);
});
test('origin and method rejection cannot be bypassed with Host or proxy headers',async()=>{
 assert.equal((await request({method:'GET'})).statusCode,405);
 for(const headers of [{origin:'https://evil.example',host:'evil.example'},{origin:''},{'sec-fetch-site':'cross-site'},{'x-ad-astra-request':''},{host:'evil.example','x-forwarded-host':'adastra.global',origin:'https://adastra.global'}])assert.equal((await request({headers})).statusCode,403);
 assert.equal(calls.length,0);
});
test('body limits and exact input schema reject browser authority, provider and tenant injection',async()=>{
 assert.equal((await request({headers:{'content-type':'text/plain'}})).statusCode,415);
 assert.equal((await request({body:'{'})).statusCode,400);
 assert.equal((await request({body:[]})).statusCode,422);
 assert.equal((await request({body:{question:'x'.repeat(15000)}})).statusCode,413);
 assert.equal((await request({body:JSON.stringify({question:'x'.repeat(15000)})})).statusCode,413);
 assert.equal((await request({headers:{'content-length':'15000'}})).statusCode,413);
 const good={productId:'day',input:{goal:'A real goal',minutes:20}};
 for(const body of [{...good,productId:'__proto__'},{...good,input:{goal:'',minutes:20}},{...good,input:{goal:'A goal',minutes:0}},{...good,input:{goal:'A goal',minutes:1441}},{...good,input:{goal:'A goal',minutes:'20'}},{...good,tenantId:sessionId},{...good,approval:true},{...good,model:'arbitrary-model'},{...good,protocol:'forged'},{...good,question:'x'.repeat(4001)},{...good,action:'status'}])assert.equal((await request({body})).statusCode,422);
 assert.equal(calls.length,0);
});
test('idempotency is required and forwarded unchanged to the canonical runtime',async()=>{
 for(const key of ['', 'x','x'.repeat(129),'key\ninjection','key:colon-unsupported'])assert.equal((await request({headers:{'idempotency-key':key}})).statusCode,400);
 const key='same-request-0001';const r=await request({headers:{'idempotency-key':key}});assert.equal(r.statusCode,200);
 const run=calls.find(c=>c.url.endsWith('/astra-customer-workspace-production') && JSON.parse(c.options.body).action==='run');assert.equal(run.options.headers['Idempotency-Key'],key);
});
test('quota outage and corrupt replies fail closed without a local memory fallback',async()=>{
 for(const result of [null,'1',[-1,0,60],[1,20,0],[1,'11',3600]]){redisResult=result;assert.equal((await request()).statusCode,503);}
 delete process.env.KV_REST_API_TOKEN;delete process.env.UPSTASH_REDIS_REST_TOKEN;assert.equal((await request()).statusCode,503);
 assert.ok(!actions().includes('run'));
});
test('user quota and conservative daily admission exhaustion stop execution with Retry-After',async()=>{
 for(const [result,error] of [[[0,0,120],'rate_limit_reached'],[[2,0,3600],'daily_capacity_reached']]){redisResult=result;const r=await request();assert.equal(r.statusCode,429);assert.equal(r.body.error,error);assert.ok(Number(r.headers['retry-after'])>0);}
 assert.ok(!actions().includes('run'));
});
test('the legacy public admission cap stays bounded',async()=>{
 for(const value of ['', 'NaN','10000001','-1','1.5']){process.env.AD_ASTRA_DAILY_BUDGET_MICRO_USD=value;assert.equal((await request()).statusCode,503);}
 assert.ok(!actions().includes('run'));
});
test('quota keys use signed identity, ignore spoofed IP and survive module reload',async()=>{
 await request({headers:{'x-forwarded-for':'1.2.3.4'}});const first=JSON.parse(calls.find(c=>c.url==='https://redis.invalid').options.body);
 calls=[];await request({headers:{'x-forwarded-for':'9.8.7.6'}});const second=JSON.parse(calls.find(c=>c.url==='https://redis.invalid').options.body);
 assert.deepEqual(first.slice(3,5),second.slice(3,5));assert.ok(!first[3].includes('user_testA'));
 delete require.cache[require.resolve('../lib/quota')];calls=[];await require('../lib/quota').reserve({iss:'https://clerk.adastra.global',sub:'user_testA'});assert.equal(JSON.parse(calls[0].options.body)[3],first[3]);
});
test('canonical runtime failure never automatically retries or refunds ambiguous execution',async()=>{
 runtimeStatus=429;const r=await request();assert.equal(r.statusCode,429);assert.equal(r.body.error,'request_limit_reached');assert.equal(actions().filter(action=>action==='run').length,1);assert.equal(calls.filter(c=>c.url==='https://redis.invalid').length,1);
 assert.ok(!JSON.stringify(r.body).includes('synthetic-test-only'));
});
test('status requires the same customer runtime and never performs model or quota work',async()=>{
 const anonymous=response();await status({method:'GET'},anonymous);assert.equal(anonymous.body.available,false);assert.deepEqual(Object.keys(anonymous.body).sort(),['available','message']);assert.equal(calls.length,0);
 const signed=response();await status({method:'GET',headers:{authorization:'Bearer '+token()}},signed);assert.equal(signed.body.available,true);assert.deepEqual(actions(),['status']);
 assert.ok(!calls.some(c=>c.url==='https://redis.invalid'));
 process.env.AD_ASTRA_SECURITY_REVIEW_APPROVED='false';const held=response();await status({method:'GET'},held);assert.equal(held.body.available,false);
});
test('public model catalog exposes stable names without provider details',()=>{
 const r=response();models({method:'GET'},r);assert.equal(r.statusCode,200);assert.equal(r.headers['cache-control'],'public, max-age=300, stale-while-revalidate=3600');
 const body=r.body;assert.equal(body.family,'Ad Astra');assert.equal(body.architecture,'one-connected-model-with-sector-profiles');assert.equal(body.models.length,1);assert.deepEqual(body.models.map(m=>m.id),catalog.MODELS.map(m=>m.id));assert.equal(body.profiles.length,catalog.MARKET_PROFILES.length);
 for(const model of body.models){assert.ok(model.name.startsWith('Astra '));assert.ok(!('provider' in model));assert.ok(!('apiKey' in model));}
 for(const profile of body.profiles){assert.ok(profile.name.startsWith('Astra '));assert.equal(profile.foundationModel,'astra-lumen');assert.ok(!('provider' in profile));assert.ok(!('apiKey' in profile));}
});
test('legacy routes enter one workspace and preserve the graphic agent entry',()=>{
 const agent=fs.readFileSync(path.join(__dirname,'../public/agent/index.html'),'utf8');assert.match(agent,/Astra\s*<br><em>Polaris\.<\/em>/);assert.match(agent,/Start with curiosity/);assert.match(agent,/href="\/workspace\/"/);
 const vercel=JSON.parse(fs.readFileSync(path.join(__dirname,'../vercel.json'),'utf8'));
 assert.deepEqual(vercel.redirects.map(r=>[r.source,r.destination]),[['/platform/:path*','/workspace/'],['/knowledge/:path*','/workspace/']]);
});
test('return paths reject external URLs and preserve only authorized workspace session identity',()=>{
 const context={window:{},URL,location:{origin:'https://adastra.global'}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/auth-navigation.js'),'utf8'),context);
 const safe=context.window.adAstraReturnPath;
 for(const value of ['https://evil.example','//evil.example','/\\evil.example','javascript:alert(1)','/sign-in/','/%2f%2fevil.example'])assert.equal(safe(value),'/workspace/');
 assert.equal(safe('/workspace/?session='+sessionId+'&tenantId=evil'),'/workspace/?session='+sessionId);
 assert.equal(safe('/workspace/?session=not-an-id'),'/workspace/');
 assert.equal(safe('/knowledge/?mode=learn#ask-ad-astra'),'/knowledge/?mode=learn#ask-ad-astra');
 assert.equal(safe('/account/billing/?return=https://evil.example'),'/account/billing/');
});
test('session handshake verifies identity without runtime or quota access',async()=>{
 const session=require('../api/session');
 for(const [authorization,code] of [['Bearer '+token(),200],['',401],['Bearer invalid.token.value',401]]){
  const res=response();await session({method:'POST',headers:{host:'adastra.global',origin:'https://adastra.global','x-ad-astra-request':'public-v1',authorization}},res);
  assert.equal(res.statusCode,code);assert.equal(res.body.authenticated,code===200);assert.deepEqual(Object.keys(res.body),['authenticated']);
 }
 assert.ok(!calls.some(c=>c.url==='https://redis.invalid'));assert.deepEqual(actions(),[]);
});
