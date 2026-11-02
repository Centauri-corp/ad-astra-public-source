'use strict';
const {test,beforeEach,after,mock}=require('node:test');
const assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm'),fs=require('node:fs');
const shared=require('../lib/shared-budget'),providerPolicy=require('../lib/provider-budget-policy');
const gates=require('../lib/release-gates'),ask=require('../api/ask');
const originalEnv={...process.env},originalFetch=global.fetch;
const customerKeys=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const workloadKeys=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...customerKeys.publicKey.export({format:'jwk'}),kid:'customer-budget-test',alg:'RS256',use:'sig'};
const TENANT='5e3e7b92-87be-4d15-a098-2e7e285e8c14',USER='20d9ea01-7ec7-46de-82cb-d25f34758d67';
const API_KEY='synthetic-provider-credential-only';
const question='Explain gravity simply.';
const seconds=()=>Math.floor(Date.now()/1000);
function signed(claims,keys=customerKeys){
 const parts=[{alg:'RS256',typ:'JWT',kid:jwk.kid},claims].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url'));
 return parts.join('.')+'.'+crypto.sign('RSA-SHA256',Buffer.from(parts.join('.')),keys.privateKey).toString('base64url');
}
function claims(){return {iss:'https://clerk.adastra.global',aud:'ad-astra-workspace',azp:'https://adastra.global',sub:'user_budgetTest',sid:'sess_budgetTest',iat:seconds(),nbf:seconds()-1,exp:seconds()+120};}
function workload(overrides={}){return signed({iss:shared.POLICY.workloadIssuer,aud:shared.POLICY.workloadAudience,sub:shared.POLICY.workloadSubject,project_id:shared.POLICY.publicProject,owner_id:shared.POLICY.publicTeam,iat:seconds(),exp:seconds()+120,...overrides},workloadKeys);}
function verify(token,key){
 const [h,p,s]=String(token).split('.');
 if(!h||!p||!s||!crypto.verify('RSA-SHA256',Buffer.from(h+'.'+p),key,Buffer.from(s,'base64url')))throw Error('fixture signature denial');
 return JSON.parse(Buffer.from(p,'base64url'));
}
function fixture(){
 const state={calls:[],records:new Map(),receipts:new Map(),providerCalls:0,settlements:0,holds:0,unknown:0,
  deny:false,loseReservationReply:false,providerFailure:false,receiptPending:false,providerCost:1,
  reserveOverride:null,settleOverride:null,reserveResponse:null,executionDisabled:false};
 const response=(data,status=200)=>Response.json(data,{status});
 function common(record,nonce){return {...record.operation,protocol:shared.POLICY.protocol,ledger_project:shared.POLICY.ledgerProject,
  identity:record.identity,reservation_id:record.id,reserved_cents:2,budget_evidence_verified:true,nonce};}
 state.transport=async(url,options={})=>{
  url=String(url);state.calls.push({url,options});
  if(url==='https://clerk.adastra.global/.well-known/jwks.json')return response({keys:[jwk]});
  if(url==='https://redis.invalid')return response({result:[1,11,3600]});
  if(url===shared.POLICY.endpoint){
   try{
    const w=verify(options.headers.Authorization.slice(7),workloadKeys.publicKey);
    const c=verify(options.headers['X-Ad-Astra-Customer-Token'],customerKeys.publicKey);
    if(w.sub!==shared.POLICY.workloadSubject||w.project_id!==shared.POLICY.publicProject||c.sub!=='user_budgetTest'||c.exp<=seconds())throw Error('binding');
   }catch{return response({error:'unauthorized'},403);}
   const input=JSON.parse(options.body);
   if(input.protocol!==shared.POLICY.protocol||state.deny)return response({error:'denied'},403);
   if(input.action==='reserve'){
    if(state.records.has(input.operation_key))return response({error:'already_recorded'},409);
    const record={id:crypto.randomUUID(),permit:crypto.randomUUID(),operation:{operation_key:input.operation_key,request_hash:input.request_hash,
     provider:input.provider,model:input.model,currency:input.currency,monthly_ceiling_cents:50000},
     identity:{...input.identity,tenant_id:TENANT,user_id:USER,membership_active:true,entitlement_active:true},settlement:null};
    state.records.set(input.operation_key,record);state.holds+=2;
    if(state.loseReservationReply)throw Error('synthetic ambiguous transport failure');
    if(state.reserveResponse)return state.reserveResponse(input,record);
    return response({...common(record,input.nonce),state:'reserved',dispatch_authorized:true,dispatch_permit:record.permit,
     dispatch_expires_at:new Date(Date.now()+30000).toISOString(),...state.reserveOverride});
   }
   const record=state.records.get(input.operation_key);
   if(!record||input.reservation_id!==record.id||input.dispatch_permit!==record.permit||input.identity.tenant_id!==TENANT)return response({error:'binding'},403);
   if(input.action==='record-unknown'){state.unknown++;return response({nonce:input.nonce,hold_retained:!record.settlement});}
   if(input.action==='settle'){
    const evidence=state.receipts.get(input.provider_receipt.id);
    if(state.settleOverride)return response({...common(record,input.nonce),...state.settleOverride});
    if(state.receiptPending||!evidence)return response({...common(record,input.nonce),state:'pending',hold_retained:true});
    if(!record.settlement){record.settlement={id:crypto.randomUUID(),receipt:input.provider_receipt.id};state.settlements++;state.holds-=2;}
    if(record.settlement.receipt!==input.provider_receipt.id)return response({error:'conflict'},409);
    const overrun=evidence.cost>2;if(overrun)state.executionDisabled=true;
    return response({...common(record,input.nonce),state:overrun?'overrun':'settled',settlement_id:record.settlement.id,
     receipt_id:input.provider_receipt.id,cost_source:'provider_receipt',cost_verified:true,actual_cost_cents:evidence.cost,
     execution_disabled:state.executionDisabled});
   }
   return response({error:'unsupported'},400);
  }
  if(url==='https://api.openai.com/v1/chat/completions'){
   state.providerCalls++;
   assert.equal(options.headers.Authorization,'Bearer '+API_KEY);
   assert.equal(options.headers['X-Ad-Astra-Customer-Token'],undefined);
   if(state.providerFailure)throw Error('provider response lost');
   const id='chatcmpl-synthetic'+String(state.providerCalls).padStart(8,'0');
   state.receipts.set(id,{cost:state.providerCost,model:shared.POLICY.model});
   return response({id,model:shared.POLICY.model,choices:[{message:{content:'A completed synthetic answer.'}}]});
  }
  throw Error('Unapproved network destination in isolated test');
 };
 return state;
}
let state;
function resetEnvironment(){
 for(const k of Object.keys(process.env))if(!(k in originalEnv))delete process.env[k];
 Object.assign(process.env,originalEnv,{AD_ASTRA_ACCESS_MODE:'authenticated',AD_ASTRA_AUTH_ISSUER:'https://clerk.adastra.global',
 AD_ASTRA_AUTH_JWKS_URL:'https://clerk.adastra.global/.well-known/jwks.json',AD_ASTRA_AUTH_AUDIENCE:'ad-astra-workspace',
 AD_ASTRA_DAILY_BUDGET_MICRO_USD:'10000000',KV_REST_API_URL:'https://redis.invalid',KV_REST_API_TOKEN:'synthetic-redis-only',
 OPENAI_API_KEY:API_KEY,OPENAI_MODEL:shared.POLICY.model,VERCEL_ENV:'production',VERCEL_PROJECT_ID:shared.POLICY.publicProject,
 VERCEL_ORG_ID:shared.POLICY.publicTeam,VERCEL_OIDC_TOKEN:workload(),AD_ASTRA_CUSTOMER_BUDGET_URL:shared.POLICY.endpoint});
 for(const flag of gates.FLAGS)process.env[flag]='true';
}
beforeEach(()=>{
 mock.restoreAll();resetEnvironment();state=fixture();global.fetch=state.transport;
 mock.method(providerPolicy,'isProviderBudgetIntegrated',()=>true);
 mock.method(console,'info',()=>{});mock.method(console,'warn',()=>{});
});
after(()=>{mock.restoreAll();global.fetch=originalFetch;for(const k of Object.keys(process.env))if(!(k in originalEnv))delete process.env[k];Object.assign(process.env,originalEnv);});
async function request({key=crypto.randomUUID(),headers={},body}={}){
 const req={method:'POST',headers:{host:'adastra.global',origin:'https://adastra.global','content-type':'application/json',
 'x-ad-astra-request':'public-v1','idempotency-key':key,authorization:'Bearer '+signed(claims()),...headers},body:body??{question,mode:'ask'}};
 const res={headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(value){this.body=JSON.parse(value);}};
 await ask(req,res);return res;
}
function client(){const c=claims();return shared.createClient({claims:c,customerToken:signed(c),request:state.transport});}
const operation=()=>({idempotencyKey:crypto.randomUUID(),question,mode:'ask'});

test('handler reserves shared monthly capacity before provider and settles independently sourced receipt',async()=>{
 const r=await request();assert.equal(r.statusCode,200);assert.equal(state.providerCalls,1);assert.equal(state.settlements,1);assert.equal(state.holds,0);
 const reserve=state.calls.findIndex(c=>c.url===shared.POLICY.endpoint&&JSON.parse(c.options.body).action==='reserve');
 const provider=state.calls.findIndex(c=>c.url.includes('/chat/completions'));assert.ok(reserve<provider);
 const payload=JSON.parse(state.calls[reserve].options.body);assert.equal(payload.identity.tenant_id,undefined);assert.equal(payload.identity.user_id,undefined);
 assert.ok(!state.calls[reserve].options.body.includes(question));
 const settlement=JSON.parse(state.calls.find(c=>c.url===shared.POLICY.endpoint&&JSON.parse(c.options.body).action==='settle').options.body);
 assert.equal(settlement.actual_cost_cents,undefined);assert.equal(settlement.cost_verified,undefined);assert.equal(settlement.provider_receipt.actual_cost_cents,undefined);
 assert.ok(!JSON.stringify(r.body).includes(API_KEY));assert.ok(!JSON.stringify(r.body).includes(TENANT));
 for(const call of state.calls.filter(c=>c.url===shared.POLICY.endpoint)){assert.equal(call.options.redirect,'error');assert.equal(call.options.cache,'no-store');assert.ok(call.options.signal);}
});
test('source-controlled release block survives every configured legacy and adapter flag',async()=>{
 mock.restoreAll();process.env.AD_ASTRA_SHARED_BUDGET_INTEGRATED='true';process.env.AD_ASTRA_SHARED_BUDGET_VERIFIED='true';
 assert.equal(gates.ready(),false);const r=await request();assert.equal(r.statusCode,503);assert.equal(r.body.error,'release_not_ready');
 assert.equal(state.records.size,0);assert.equal(state.providerCalls,0);
});
test('missing endpoint credentials and wrong workload/endpoint binding fail before admission or provider',async()=>{
 const good={...process.env};
 const bad=[{AD_ASTRA_CUSTOMER_BUDGET_URL:''},{AD_ASTRA_CUSTOMER_BUDGET_URL:'https://evil.invalid/functions/v1/astra-customer-budget'},
 {AD_ASTRA_CUSTOMER_BUDGET_URL:shared.POLICY.endpoint+'?redirect=1'},{AD_ASTRA_CUSTOMER_BUDGET_URL:shared.POLICY.endpoint.replace('astra-customer-budget','astra-control')},
 {VERCEL_OIDC_TOKEN:''},{VERCEL_OIDC_TOKEN:workload({project_id:'prj_other'})},{VERCEL_OIDC_TOKEN:workload({exp:seconds()-1})},
 {VERCEL_ENV:'preview'},{VERCEL_PROJECT_ID:'prj_other'},{VERCEL_ORG_ID:'team_other'}];
 for(const change of bad){Object.assign(process.env,good,change);const r=await request();assert.equal(r.statusCode,503);}
 assert.equal(state.records.size,0);assert.equal(state.providerCalls,0);
});
test('provider credentials are required before reservation and never substituted with customer/workload tokens',async()=>{
 process.env.OPENAI_API_KEY='invalid credential\n';const r=await request();assert.equal(r.statusCode,503);assert.equal(state.records.size,0);assert.equal(state.providerCalls,0);
});
test('unverified customer membership or entitlement denial makes no provider call',async()=>{
 state.deny=true;const r=await request();assert.equal(r.statusCode,403);assert.equal(state.providerCalls,0);assert.equal(state.records.size,0);
});
test('bridge must verify customer signature even when a caller passes claim-shaped objects',async()=>{
 const c=claims(),parts=signed(c).split('.');parts[2]=Buffer.alloc(256).toString('base64url');
 const b=shared.createClient({claims:c,customerToken:parts.join('.'),request:state.transport});
 await assert.rejects(()=>b.reserve(operation()),e=>e.code==='customer_budget_denied');assert.equal(state.records.size,0);
});
test('missing operation key and browser tenant/model/cost injection cannot reserve',async()=>{
 assert.equal((await request({key:''})).statusCode,428);
 for(const extra of [{tenant_id:TENANT},{provider:'other'},{actual_cost_cents:0}])assert.equal((await request({body:{question,mode:'ask',...extra}})).statusCode,422);
 assert.equal(state.records.size,0);assert.equal(state.providerCalls,0);
});
test('concurrent and later retries of one operation never dispatch the provider twice',async()=>{
 const key=crypto.randomUUID(),responses=await Promise.all([request({key}),request({key})]);
 assert.deepEqual(responses.map(r=>r.statusCode).sort(),[200,409]);assert.equal((await request({key})).statusCode,409);
 assert.equal(state.providerCalls,1);assert.equal(state.records.size,1);assert.equal(state.settlements,1);
});
test('operation key conflict cannot submit changed content as a replay',async()=>{
 const key=crypto.randomUUID();assert.equal((await request({key})).statusCode,200);
 assert.equal((await request({key,body:{question:'Explain a different subject.',mode:'research'}})).statusCode,409);assert.equal(state.providerCalls,1);
});
test('lost reservation reply retains its hold and a retry cannot dispatch',async()=>{
 const key=crypto.randomUUID();state.loseReservationReply=true;
 assert.equal((await request({key})).statusCode,503);assert.equal(state.holds,2);assert.equal(state.providerCalls,0);
 state.loseReservationReply=false;assert.equal((await request({key})).statusCode,409);assert.equal(state.providerCalls,0);assert.equal(state.holds,2);
});
test('ambiguous provider failure retains the reservation without provider retries or refunds',async()=>{
 const key=crypto.randomUUID();state.providerFailure=true;
 assert.equal((await request({key})).statusCode,503);assert.equal(state.providerCalls,1);assert.equal(state.holds,2);assert.equal(state.settlements,0);assert.equal(state.unknown,1);
 assert.equal((await request({key})).statusCode,409);assert.equal(state.providerCalls,1);assert.equal(state.holds,2);
});
test('unknown independent cost returns the completed answer and retains its full hold',async()=>{
 state.receiptPending=true;const key=crypto.randomUUID();const r=await request({key});assert.equal(r.statusCode,200);assert.match(r.body.answer,/completed/);
 assert.equal(state.holds,2);assert.equal(state.settlements,0);assert.equal((await request({key})).statusCode,409);assert.equal(state.providerCalls,1);
});
test('reservation identity provider model currency ceiling nonce and lease mismatches deny dispatch',async()=>{
 const variants=[{provider:'wrong'},{model:'wrong'},{currency:'EUR'},{monthly_ceiling_cents:50001},{reserved_cents:1},
 {budget_evidence_verified:false},{nonce:crypto.randomUUID()},{dispatch_authorized:false},{dispatch_expires_at:new Date(0).toISOString()},
 {identity:{issuer:'https://clerk.adastra.global',subject:'user_budgetTest',session_id:'sess_budgetTest',tenant_id:TENANT,user_id:USER,membership_active:false,entitlement_active:true}},
 {identity:{issuer:'https://clerk.adastra.global',subject:'user_other',session_id:'sess_budgetTest',tenant_id:TENANT,user_id:USER,membership_active:true,entitlement_active:true}}];
 for(const variant of variants){state.reserveOverride=variant;const r=await request();assert.ok([403,409,503].includes(r.statusCode));}
 assert.equal(state.providerCalls,0);
});
test('non-JSON truncated and oversized admission replies fail closed',async()=>{
 for(const response of [()=>new Response('sign in',{headers:{'content-type':'text/html'}}),()=>new Response('{',{headers:{'content-type':'application/json'}}),()=>new Response(' '.repeat(16385),{headers:{'content-type':'application/json'}})]){
  state.reserveResponse=response;assert.equal((await request()).statusCode,503);
 }
 assert.equal(state.providerCalls,0);assert.equal(state.holds,6);
});
test('unverified settlement cost cannot release the hold or make a completed answer retryable',async()=>{
 state.settleOverride={state:'settled',receipt_id:'chatcmpl-synthetic00000001',settlement_id:crypto.randomUUID(),cost_source:'client_estimate',cost_verified:false,actual_cost_cents:0};
 const r=await request();assert.equal(r.statusCode,200);assert.equal(state.settlements,0);assert.equal(state.holds,2);assert.equal(state.unknown,1);
});
test('verified overrun is recorded and requires the bridge to close future execution',async()=>{
 state.providerCost=3;const r=await request();assert.equal(r.statusCode,200);assert.equal(state.executionDisabled,true);assert.equal(state.settlements,1);
});
test('local admission cannot be dispatched twice and settled receipt conflicts are rejected',async()=>{
 const b=client(),admission=await b.reserve(operation());
 const receipt={id:'chatcmpl-independentreceipt',model:shared.POLICY.model};state.receipts.set(receipt.id,{cost:1});let calls=0;
 const dispatch=async()=>{calls++;return {value:'complete',receipt};};
 assert.equal((await b.execute(admission,dispatch)).accounting,'settled');
 await assert.rejects(()=>b.execute(admission,dispatch),e=>e.code==='operation_already_recorded');assert.equal(calls,1);
 const first=await b.settle(admission,receipt),second=await b.settle(admission,receipt);assert.deepEqual(first,second);assert.equal(state.settlements,1);
 await assert.rejects(()=>b.settle(admission,{...receipt,id:'chatcmpl-differentreceipt'}),e=>e.code==='settlement_conflict');
 await assert.rejects(()=>b.settle(admission,{...receipt,actual_cost_cents:0}),e=>e.code==='invalid_provider_receipt');
});
test('browser retains the same operation key on uncertain retries and starts a new key after success',async()=>{
 const nodes=new Map(),handlers={},requests=[];
 for(const id of ['knowledge-auth','main','live-ai-form','live-ai-question','live-ai-mode','live-ai-submit','live-ai-status','live-ai-answer','live-ai-text'])nodes.set(id,{hidden:false,value:'',dataset:{available:'true'},addEventListener:(name,fn)=>{handlers[name]=fn;},scrollIntoView(){}});
 nodes.get('live-ai-question').value=question;nodes.get('live-ai-mode').value='ask';
 const clerk={session:{getToken:async()=>signed(claims())},load:async()=>{}};
 const context={window:{Clerk:clerk,adAstraVerifySession:async()=>{}},document:{getElementById:id=>nodes.get(id),querySelectorAll:()=>[]},
 location:{pathname:'/knowledge/',search:'',hash:''},URLSearchParams,AbortSignal,crypto:{randomUUID:crypto.randomUUID},console,
 fetch:async(_url,options)=>{requests.push(options);if(requests.length===1)throw Error('uncertain response');return {ok:true,json:async()=>({ok:true,answer:'complete'})};}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../public/knowledge/app.js'),'utf8'),context);
 await new Promise(resolve=>setImmediate(resolve));
 for(let n=0;n<3;n++)await handlers.submit({preventDefault(){}});
 assert.equal(requests.length,3);assert.equal(requests[0].headers['Idempotency-Key'],requests[1].headers['Idempotency-Key']);
 assert.notEqual(requests[1].headers['Idempotency-Key'],requests[2].headers['Idempotency-Key']);
});
