'use strict';
const {test,beforeEach,after}=require('node:test'), assert=require('node:assert/strict'), crypto=require('node:crypto'), vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ask=require('../api/ask'),status=require('../api/status'),auth=require('../lib/auth'),quota=require('../lib/quota'),idempotency=require('../lib/idempotency'),gates=require('../lib/release-gates');
const originalEnv={...process.env},originalFetch=global.fetch;
const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...pair.publicKey.export({format:'jwk'}),kid:'test-key',use:'sig',alg:'RS256'};
let calls=[],redisResult=[1,11,3600],providerStatus=200,idempotencyMode='new';
function token(overrides={},head={}){
 const now=Math.floor(Date.now()/1000);
 const claims={iss:'https://clerk.adastra.global',aud:'ad-astra-workspace',azp:'https://adastra.global',sub:'user_testA',sid:'sess_testA',iat:now,nbf:now-1,exp:now+60,ad_astra_entitlements:['live_ai'],...overrides};
 const parts=[{alg:'RS256',kid:jwk.kid,typ:'JWT',...head},claims].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url'));
 return parts.join('.')+'.'+crypto.sign('RSA-SHA256',Buffer.from(parts.join('.')),pair.privateKey).toString('base64url');
}
function response(){return {headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(v){this.body=v?JSON.parse(v):null;}};}
async function request(options={}){
 const idempotencyKey=options.idempotencyKey===undefined?'request-test-001':options.idempotencyKey;
 const req={method:'POST',headers:{host:'adastra.global',origin:'https://adastra.global','content-type':'application/json','x-ad-astra-request':'public-v1',authorization:'Bearer '+token(),'idempotency-key':idempotencyKey,...options.headers},body:{question:'Explain gravity simply.',mode:'ask'},...options};
 req.headers={host:'adastra.global',origin:'https://adastra.global','content-type':'application/json','x-ad-astra-request':'public-v1',authorization:'Bearer '+token(),'idempotency-key':idempotencyKey,...options.headers};
 const res=response(); await ask(req,res);return res;
}
beforeEach(()=>{
 for(const key of Object.keys(process.env))if(!(key in originalEnv))delete process.env[key];
 Object.assign(process.env,originalEnv,{AD_ASTRA_ACCESS_MODE:'authenticated',AD_ASTRA_AUTH_ISSUER:'https://clerk.adastra.global',AD_ASTRA_AUTH_JWKS_URL:'https://clerk.adastra.global/.well-known/jwks.json',AD_ASTRA_AUTH_AUDIENCE:'ad-astra-workspace',AD_ASTRA_DAILY_BUDGET_MICRO_USD:'10000000',KV_REST_API_URL:'https://redis.invalid',KV_REST_API_TOKEN:'synthetic-test-only',OPENAI_API_KEY:'synthetic-test-only',OPENAI_MODEL:'gpt-4.1-mini-2025-04-14',VERCEL_ENV:'production'});
 for(const flag of gates.FLAGS)process.env[flag]='true';
 calls=[];redisResult=[1,11,3600];providerStatus=200;idempotencyMode='new';
 global.fetch=async(url,options)=>{
  calls.push({url,options});
  if(url.includes('/.well-known/jwks.json'))return {ok:true,json:async()=>({keys:[jwk]})};
  if(url==='https://redis.invalid'){
   const args=JSON.parse(options.body),script=String(args[1]||'');
   if(script.includes("COMPLETE:"))return {ok:true,json:async()=>({result:1})};
   if(script.includes('DEL'))return {ok:true,json:async()=>({result:1})};
   if(script.includes('PENDING:')){
    if(idempotencyMode==='replay'){
     const record={fingerprint:args[4],status:200,payload:{ok:true,mode:'ask',answer:'Replayed fixture',disclosure:'AI-generated response. Verify important claims against primary sources.'},headers:{'X-Ad-Astra-Quota-Mode':'durable'}};
     return {ok:true,json:async()=>({result:[0,'COMPLETE:'+Buffer.from(JSON.stringify(record)).toString('base64url')]})};
    }
    if(idempotencyMode==='in_progress')return {ok:true,json:async()=>({result:[0,'PENDING:'+args[4]]})};
    if(idempotencyMode==='conflict')return {ok:true,json:async()=>({result:[0,'PENDING:other-fingerprint']})};
    return {ok:true,json:async()=>({result:[1,'PENDING:'+args[4]]})};
   }
   return {ok:true,json:async()=>({result:redisResult})};
  }
  if(url==='https://api.openai.com/v1/chat/completions')return {ok:providerStatus===200,status:providerStatus,json:async()=>({choices:[{message:{content:'Synthetic fixture response'}}]})};
  throw Error('Unexpected external destination');
 };
});
after(()=>{global.fetch=originalFetch;for(const k of Object.keys(process.env))if(!(k in originalEnv))delete process.env[k];Object.assign(process.env,originalEnv);});
test('valid signed session reserves quota before one bounded provider request',async()=>{
 const r=await request();assert.equal(r.statusCode,200);assert.equal(r.headers['cache-control'],'no-store');
 const redisCalls=calls.filter(c=>c.url==='https://redis.invalid');
 const beginIndex=calls.findIndex(c=>c.url==='https://redis.invalid'&&String(JSON.parse(c.options.body)[1]).includes('PENDING:'));
 const quotaIndex=calls.findIndex(c=>c.url==='https://redis.invalid'&&String(JSON.parse(c.options.body)[1]).includes('local now'));
 const modelIndex=calls.findIndex(c=>c.url.includes('/chat/completions'));
 const completeIndex=calls.findIndex(c=>c.url==='https://redis.invalid'&&String(JSON.parse(c.options.body)[1]).includes('COMPLETE:'));
 assert.equal(redisCalls.length,3);assert.ok(beginIndex<quotaIndex&&quotaIndex<modelIndex&&modelIndex<completeIndex);
 const payload=JSON.parse(calls[modelIndex].options.body);assert.equal(payload.max_tokens,700);assert.equal(payload.store,false);assert.equal(payload.model,'gpt-4.1-mini-2025-04-14');assert.ok(calls[modelIndex].options.signal);
});
test('idempotency key is required before durable quota or model dispatch',async()=>{
 const r=await request({headers:{'idempotency-key':''}});assert.equal(r.statusCode,400);assert.equal(r.body.error,'idempotency_key_required');assert.equal(calls.filter(c=>c.url==='https://redis.invalid').length,0);assert.equal(calls.filter(c=>c.url.includes('/chat/completions')).length,0);
});
test('completed idempotency replays the original result without another quota or model call',async()=>{
 assert.equal((await request()).statusCode,200);calls=[];idempotencyMode='replay';
 const r=await request();assert.equal(r.statusCode,200);assert.equal(r.body.answer,'Replayed fixture');assert.equal(r.headers['idempotency-replayed'],'true');assert.equal(calls.filter(c=>c.url.includes('/chat/completions')).length,0);assert.equal(calls.filter(c=>c.url==='https://redis.invalid').length,1);
});
test('pending and conflicting idempotency keys fail closed',async()=>{
 idempotencyMode='in_progress';let r=await request();assert.equal(r.statusCode,409);assert.equal(r.body.error,'idempotency_in_progress');
 idempotencyMode='conflict';r=await request({body:{question:'Explain inertia simply.',mode:'ask'}});assert.equal(r.statusCode,409);assert.equal(r.body.error,'idempotency_conflict');assert.equal(calls.filter(c=>c.url.includes('/chat/completions')).length,0);
});
test('idempotency namespace binds tenant and signed identity',()=>{
 const base={iss:'https://clerk.adastra.global',sub:'user_testA',org_id:'tenant_a'};
 assert.notEqual(idempotency.keyFor(base,'request-test-001'),idempotency.keyFor({...base,sub:'user_testB'},'request-test-001'));
 assert.notEqual(idempotency.keyFor(base,'request-test-001'),idempotency.keyFor({...base,org_id:'tenant_b'},'request-test-001'));
});
test('every absent or false release flag prevents all quota and model calls',async()=>{
 for(const flag of gates.FLAGS){
  for(const value of [undefined,'false']){
   if(value===undefined)delete process.env[flag];else process.env[flag]=value;
   calls=[];const r=await request();assert.equal(r.statusCode,503,flag);assert.equal(r.body.error,'release_not_ready');
   assert.ok(!calls.some(c=>c.url==='https://redis.invalid'||c.url.includes('/chat/completions')),flag);
  }
  process.env[flag]='true';
 }
});
test('signed customer entitlement is required before quota or model dispatch',async()=>{
 for(const value of [undefined,null,[],['research'],true,'live_ai']){
  calls=[];
  const r=await request({headers:{authorization:'Bearer '+token({ad_astra_entitlements:value})}});
  assert.equal(r.statusCode,403);
  assert.equal(r.body.error,'entitlement_required');
  assert.ok(!calls.some(c=>c.url==='https://redis.invalid'||c.url.includes('/chat/completions')));
 }
 const parts=token({ad_astra_entitlements:[]}).split('.');
 const body=JSON.parse(Buffer.from(parts[1],'base64url'));body.ad_astra_entitlements=['live_ai'];
 parts[1]=Buffer.from(JSON.stringify(body)).toString('base64url');
 assert.equal((await request({headers:{authorization:'Bearer '+parts.join('.')}})).statusCode,401);
});
test('auth mode cannot become public, absent auth configuration denies',async()=>{
 for(const value of ['public','disabled','']){process.env.AD_ASTRA_ACCESS_MODE=value;assert.equal((await request()).statusCode,503);}
 delete process.env.AD_ASTRA_ACCESS_MODE;assert.equal((await request()).statusCode,503);assert.equal(calls.length,0);
});
test('missing and forged bearer tokens never reach quota or model',async()=>{
 assert.equal((await request({headers:{authorization:''}})).statusCode,401);
 const parts=token().split('.');parts[2]=Buffer.alloc(256).toString('base64url');
 assert.equal((await request({headers:{authorization:'Bearer '+parts.join('.')}})).statusCode,401);
 assert.ok(!calls.some(c=>c.url.includes('/chat/completions')||c.url==='https://redis.invalid'));
});
test('JWT issuer audience azp subject session state and numeric date checks',async()=>{
 const now=Math.floor(Date.now()/1000);
 for(const claims of [{iss:'https://evil.example'},{aud:undefined},{aud:'wrong'},{azp:undefined},{azp:'https://evil.example'},{sub:''},{sid:undefined},{sts:'pending'},{exp:now-1},{exp:String(now+60)},{nbf:'not-a-date'},{nbf:now+60},{iat:now+60},{exp:now+3600}]){
  assert.equal((await request({headers:{authorization:'Bearer '+token(claims)}})).statusCode,401,JSON.stringify(claims));
 }
 for(const h of [{alg:'none'},{alg:'HS256'},{jku:'https://evil.example'},{kid:'unknown'},{crit:['b64']}])assert.equal((await request({headers:{authorization:'Bearer '+token({},h)}})).statusCode,401);
 assert.ok(!calls.some(c=>c.url.includes('/chat/completions')));
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
 for(const body of [{question:'tiny'},{question:'x'.repeat(4001)},{question:'A valid question',mode:'__proto__'},{question:'A valid question',references:[{title:'private'}]},{question:'A valid question',model:'unbounded-model'}])assert.equal((await request({body})).statusCode,422);
 assert.equal(calls.length,0);
});
test('quota outage and corrupt replies fail closed without memory fallback',async()=>{
 for(const result of [null,'1',[-1,0,60],[1,20,0],[1,'11',3600]]){redisResult=result;assert.equal((await request()).statusCode,503);}
 delete process.env.KV_REST_API_TOKEN;delete process.env.UPSTASH_REDIS_REST_TOKEN;assert.equal((await request()).statusCode,503);
 assert.ok(!calls.some(c=>c.url.includes('/chat/completions')));
});
test('user quota and global budget exhaustion stop model calls with Retry-After',async()=>{
 for(const [result,error] of [[[0,0,120],'rate_limit_reached'],[[2,0,3600],'daily_capacity_reached']]){redisResult=result;const r=await request();assert.equal(r.statusCode,429);assert.equal(r.body.error,error);assert.ok(Number(r.headers['retry-after'])>0);}
 assert.ok(!calls.some(c=>c.url.includes('/chat/completions')));
});
test('budget is required and never exceeds the owner-approved ceiling',async()=>{
 for(const value of ['', 'NaN','10000001','-1','1.5']){process.env.AD_ASTRA_DAILY_BUDGET_MICRO_USD=value;assert.equal((await request()).statusCode,503);}
 assert.ok(!calls.some(c=>c.url.includes('/chat/completions')));
});
test('quota keys use signed identity, ignore spoofed IP and survive module reload',async()=>{
 await request({headers:{'x-forwarded-for':'1.2.3.4'}});const quotaCall=()=>calls.find(c=>c.url==='https://redis.invalid'&&String(JSON.parse(c.options.body)[1]).includes('local now'));const first=JSON.parse(quotaCall().options.body);
 calls=[];await request({headers:{'x-forwarded-for':'9.8.7.6'}});const second=JSON.parse(quotaCall().options.body);
 assert.deepEqual(first.slice(3,5),second.slice(3,5));assert.ok(!first[3].includes('user_testA'));
 delete require.cache[require.resolve('../lib/quota')];calls=[];await require('../lib/quota').reserve({iss:'https://clerk.adastra.global',sub:'user_testA'});assert.equal(JSON.parse(calls[0].options.body)[3],first[3]);
});
test('provider 429 yields safe 503 without retry or refund',async()=>{
 providerStatus=429;const r=await request();assert.equal(r.statusCode,503);assert.equal(r.body.error,'ai_unavailable');assert.equal(calls.filter(c=>c.url.includes('/chat/completions')).length,1);assert.equal(calls.filter(c=>c.url==='https://redis.invalid').length,3);
 assert.ok(!JSON.stringify(r.body).includes('synthetic-test-only'));
});
test('status exposes availability only and requires actual release configuration',()=>{
 process.env.AD_ASTRA_SECURITY_REVIEW_APPROVED='false';const r=response();status({method:'GET'},r);assert.deepEqual(Object.keys(r.body).sort(),['available','message']);assert.equal(r.body.available,false);
});
test('return paths reject external URLs and preserve approved mode navigation',()=>{
 const context={window:{},URL,location:{origin:'https://adastra.global'}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/auth-navigation.js'),'utf8'),context);
 const safe=context.window.adAstraReturnPath;
 for(const value of ['https://evil.example','//evil.example','/\\evil.example','javascript:alert(1)','/sign-in/','/%2f%2fevil.example'])assert.equal(safe(value),'/platform/');
 assert.equal(safe('/knowledge/?mode=learn#ask-ad-astra'),'/knowledge/?mode=learn#ask-ad-astra');
});
test('session handshake verifies identity without model or quota access',async()=>{
 const session=require('../api/session');
 for(const [authorization,code] of [['Bearer '+token(),200],['',401],['Bearer invalid.token.value',401]]){
  const res=response();await session({method:'POST',headers:{host:'adastra.global',origin:'https://adastra.global','x-ad-astra-request':'public-v1',authorization}},res);
  assert.equal(res.statusCode,code);assert.equal(res.body.authenticated,code===200);assert.deepEqual(Object.keys(res.body),['authenticated']);
 }
 assert.ok(!calls.some(c=>c.url==='https://redis.invalid'||c.url.includes('/chat/completions')));
});
test('browser session verification distinguishes invalid identity from service outage',async()=>{
 const context={window:{},URL,URLSearchParams,location:{origin:'https://adastra.global'},AbortSignal,fetch:async()=>({ok:false,status:401})};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/auth-navigation.js'),'utf8'),context);
 const clerk={session:{getToken:async()=>token()}};
 await assert.rejects(context.window.adAstraVerifySession(clerk),{message:'authentication_invalid'});
 context.fetch=async()=>({ok:false,status:503});
 await assert.rejects(context.window.adAstraVerifySession(clerk),{message:'verification_unavailable'});
 context.fetch=async()=>({ok:true,status:200,json:async()=>({authenticated:true})});
 await context.window.adAstraVerifySession(clerk);
});
test('sign-in redirects only a server-verified session and offers recovery otherwise',async()=>{
 const script=fs.readFileSync(path.join(__dirname,'../public/sign-in/app.js'),'utf8');
 async function render(verified,session=true){
  const elements=Object.fromEntries(['sign-in-status','sign-in','sign-in-reset','sign-in-retry'].map(id=>[id,{hidden:true,events:{},addEventListener(event,fn){this.events[event]=fn;}}]));
  const navigations=[];let mounted=0,loads=0,signOuts=0;
  const location={search:'?return=%2Fknowledge%2F',replace(value){navigations.push(value);},reload(){loads++;}};
  const clerk={session:session?{getToken:async()=>token()}:null,load:async()=>{},mountSignIn:()=>{mounted++;},signOut:async()=>{signOuts++;}};
  const context={window:{Clerk:clerk,adAstraReturnPath:()=>'/knowledge/',adAstraVerifySession:async()=>{if(verified)throw new Error(verified);}},location,document:{getElementById:id=>elements[id]},URLSearchParams,console};
  vm.runInNewContext(script,context);
  await new Promise(resolve=>setImmediate(resolve));
  return {elements,navigations,mounted,loads:()=>loads,signOuts:()=>signOuts};
 }
 const valid=await render(null);assert.deepEqual(valid.navigations,['/knowledge/']);assert.equal(valid.mounted,0);
 const invalid=await render('authentication_invalid');assert.equal(invalid.navigations.length,0);assert.equal(invalid.elements['sign-in-reset'].hidden,false);
 await invalid.elements['sign-in-reset'].events.click();assert.equal(invalid.signOuts(),1);assert.equal(invalid.loads(),1);
 const unavailable=await render('verification_unavailable');assert.equal(unavailable.navigations.length,0);assert.equal(unavailable.elements['sign-in-reset'].hidden,true);assert.equal(unavailable.elements['sign-in-retry'].hidden,false);
 const newUser=await render(null,false);assert.equal(newUser.mounted,1);assert.equal(newUser.navigations.length,0);
});
