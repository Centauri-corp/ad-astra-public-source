'use strict';
const {test,beforeEach,after}=require('node:test');
const assert=require('node:assert/strict');
const bridge=require('../lib/customer-workspace');
const {createClient}=require('../public/workspace/client');
const originalFetch=global.fetch,originalEnv={...process.env};
const id='11111111-1111-4111-8111-111111111111',requestId='22222222-2222-4222-8222-222222222222',cursor='33333333-3333-7333-8333-333333333333';
const inputs={day:{goal:'Plan a useful day',minutes:25},learn:{subject:'Orbital mechanics',hours:4},career:{role:'Systems engineer',weeks:8}};
const common={protocol:bridge.PROTOCOL,environment:'production',market:'US-CA',canExecute:true,releaseId:'fixture-release'};
const copy=value=>JSON.parse(JSON.stringify(value));
function saved(productId='day',status='completed') {
 const now='2026-11-19T12:00:00.000Z';
 return {...common,requestId,status,internal:'private-extra',session:{id,productId,title:'Synthetic session',updatedAt:now,nextCursor:null,tenantId:'private-extra',turns:[{
  requestId,status,input:copy(inputs[productId]),result:{app:productId,title:'Synthetic plan',metric:'A bounded plan',items:['A useful first step'],notice:'Test fixture'},
  answer:status==='completed'?'Synthetic answer':'',citations:[{title:'NASA reference',url:'https://www.nasa.gov/',sourceVersionId:cursor,secret:'private-extra'}],
  usage:{state:status==='pending'?'pending':'reconciled',reservedCents:2,actualCents:status==='pending'?null:1,providerKey:'private-extra'},createdAt:now,
 }]}};
}
let calls=[];
beforeEach(()=>{
 process.env.AD_ASTRA_SUBSCRIPTION_ENVIRONMENT='production';process.env.AD_ASTRA_CUSTOMER_WORKSPACE_SECRET='synthetic-bridge-secret-only-00000000';calls=[];
 global.fetch=async(url,options)=>{calls.push({url,options});return Response.json(saved(JSON.parse(options.body).productId || 'day'));};
});
after(()=>{global.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in originalEnv))delete process.env[key];Object.assign(process.env,originalEnv);});
test('all three Life journeys use the same fixed server bridge and publish only customer-safe saved results',async()=>{
 for(const productId of Object.keys(inputs)) {
  const result=await bridge.call({action:'run',productId,input:inputs[productId]},'signed-clerk-token','request-key-0001');
  assert.equal(result.status,200);assert.equal(result.body.session.productId,productId);assert.deepEqual(result.body.session.turns[0].input,inputs[productId]);
  assert.ok(!JSON.stringify(result.body).includes('private-extra'));
  const sent=calls.at(-1);assert.equal(sent.url,'https://wewznejqpnsmiwkbozgw.supabase.co/functions/v1/astra-customer-workspace-production');
  assert.equal(sent.options.headers.Authorization,'Bearer signed-clerk-token');assert.equal(sent.options.headers['Idempotency-Key'],'request-key-0001');
  assert.equal(sent.options.redirect,'error');assert.equal(sent.options.cache,'no-store');assert.ok(sent.options.signal);
 }
});
test('read pagination keeps the owned session identity and accepts version7 cursors without executing work',async()=>{
 global.fetch=async(url,options)=>{calls.push({url,options});const data=saved();data.session.nextCursor=cursor;return Response.json(data);};
 const result=await bridge.call({action:'get',sessionId:id,before:cursor},'signed-token');
 assert.equal(result.body.session.nextCursor,cursor);
 assert.deepEqual(JSON.parse(calls[0].options.body),{protocol:bridge.PROTOCOL,action:'get',sessionId:id,before:cursor});
 assert.equal(calls[0].options.headers['Idempotency-Key'],undefined);
 for(const body of [{action:'get',sessionId:id,before:'not-an-id'},{action:'list',before:cursor},{action:'run',productId:'day',input:inputs.day,before:cursor},{action:'recover',productId:'day',input:inputs.day,tenantId:id}])assert.equal(bridge.validRequest(body),false);
});
test('malformed, inconsistent and unsafe retained outputs are rejected at the public boundary',async()=>{
 const changes=[
  data=>{data.protocol='forged';},data=>{data.environment='development';},data=>{data.market='elsewhere';},data=>{data.canExecute='yes';},
  data=>{data.session.id=cursor;},data=>{data.session.turns[0].result.app='career';},data=>{data.session.turns[0].answer='';},
  data=>{data.session.turns[0].citations[0].url='javascript:alert(1)';},data=>{data.session.turns[0].citations[0].url='https://user:pass@example.com';},
  data=>{data.session.turns[0].citations[0].sourceVersionId='unbound';},data=>{data.session.turns[0].usage.actualCents=null;},
  data=>{data.session.turns[0].usage.actualCents=-1;},data=>{data.session.turns[0].input.tenantId=id;},data=>{data.session.turns[0].createdAt='not-a-date';},
  data=>{data.session.nextCursor='bad-cursor';},data=>{data.session.turns.push(copy(data.session.turns[0]));},
  data=>{data.status='failed';},data=>{data.requestId=cursor;},
 ];
 for(const mutate of changes){const data=saved();mutate(data);global.fetch=async()=>Response.json(data);await assert.rejects(bridge.call({action:'run',sessionId:id,productId:'day',input:inputs.day},'signed-token','request-key-0001'));}
 const data=saved();data.session.turns=Array.from({length:11},(_,i)=>({...data.session.turns[0],requestId:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`}));
 global.fetch=async()=>Response.json(data);await assert.rejects(bridge.call({action:'get',sessionId:id},'signed-token'));
});
test('transport status distinguishes pending from a completed or failed saved attempt',async()=>{
 global.fetch=async()=>Response.json(saved('day','pending'),{status:202});
 const pending=await bridge.call({action:'recover',productId:'day',input:inputs.day},'signed-token','request-key-0001');assert.equal(pending.body.status,'pending');assert.equal(pending.status,202);
 global.fetch=async()=>Response.json(saved('day','pending'));
 await assert.rejects(bridge.call({action:'run',productId:'day',input:inputs.day},'signed-token','request-key-0001'));
 global.fetch=async()=>Response.json(saved(),{status:202});
 await assert.rejects(bridge.call({action:'recover',productId:'day',input:inputs.day},'signed-token','request-key-0001'));
 global.fetch=async()=>Response.json(saved('day','failed'));
 const failed=await bridge.call({action:'recover',productId:'day',input:inputs.day},'signed-token','request-key-0001');assert.equal(failed.body.status,'failed');
});
test('response parsing supports a full Unicode history page and rejects oversized or invalid transport data',async()=>{
 const data=saved(),template=data.session.turns[0];
 data.session.turns=Array.from({length:10},(_,i)=>({...template,requestId:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,answer:'星'.repeat(12000)}));
 global.fetch=async()=>Response.json(data);
 const result=await bridge.call({action:'get',sessionId:id},'signed-token');assert.equal(result.body.session.turns.length,10);assert.equal(result.body.session.turns[9].answer.length,12000);
 let cancelled=false;
 const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(bridge.MAX_RESPONSE+1));},cancel(){cancelled=true;}});
 await assert.rejects(bridge.boundedJson(new Response(stream,{headers:{'Content-Type':'application/json'}})));assert.equal(cancelled,true);
 await assert.rejects(bridge.boundedJson(new Response('{}',{headers:{'Content-Type':'text/html'}})));
 await assert.rejects(bridge.boundedJson(new Response(Buffer.from([123,34,120,34,58,34,255,34,125]),{headers:{'Content-Type':'application/json'}})));
});
test('untrusted error details and expired deadlines cannot trigger another backend operation',async()=>{
 global.fetch=async(url,options)=>{calls.push({url,options});return Response.json({error:'idempotency_conflict',token:'private-extra'},{status:409});};
 const conflict=await bridge.call({action:'recover',productId:'day',input:inputs.day},'signed-token','request-key-0001');assert.deepEqual(conflict,{status:409,body:{error:'idempotency_conflict'}});assert.equal(calls.length,1);
 await assert.rejects(bridge.call({action:'run',productId:'day',input:inputs.day},'signed-token','request-key-0001',{deadline:Date.now()-1}));assert.equal(calls.length,1);
 for(const body of [{action:'run',productId:'day',input:inputs.day,question:''},{action:'run',productId:'day',input:inputs.day,question:'   '},{action:'run',productId:'day',input:{...inputs.day,provider:'browser-choice'}}])await assert.rejects(bridge.call(body,'signed-token','request-key-0001'));
 assert.equal(calls.length,1);
});
function clientFixture(fetchImpl) {
 let identity='session-a:user-a',next=0;
 const client=createClient({getToken:async()=>'jwt-'+identity,getIdentity:()=>identity,uuid:()=>`request-key-${++next}`,fetchImpl});
 return {client,setIdentity(value){identity=value;}};
}
test('governed backend errors keep actionable customer meanings without exposing provider details',async()=>{
 for(const [remote,status,expected]of [
  ['unauthorized',401,'authentication_invalid'],['customer_access_denied',403,'customer_access_required'],
  ['customer_execution_not_released',403,'release_not_ready'],['capacity_reached',429,'request_limit_reached'],
  ['invalid_contract',400,'invalid_workspace_request'],['result_reconciliation_required',503,'result_reconciliation_required'],
  ['customer_execution_failed',503,'customer_execution_failed'],['model_policy_unavailable',503,'workspace_unavailable'],
 ]){
  global.fetch=async()=>Response.json({error:remote,provider:'private-provider-detail',debug:'private-extra'},{status});
  const result=await bridge.call({action:'recover',productId:'day',input:inputs.day},'signed-token','request-key-0001');
  assert.deepEqual(result,{status,body:{error:expected}});
 }
});
test('uncertain browser runs keep one key and recover the original payload without creating new work',async()=>{
 const received=[];let count=0;
 const {client}=clientFixture(async(url,options)=>{received.push({url,options});if(++count===1)throw Error('connection_lost');return Response.json({...saved('day',count===2?'pending':'completed'),canExecute:count===2},{status:count===2?202:200});});
 const body={action:'run',productId:'day',input:copy(inputs.day)};
 await assert.rejects(client.request(body),/connection_lost/);assert.equal(received.length,1);assert.equal(client.hasPending(),true);
 await client.request(body);assert.equal(client.hasPending(),true);
 // The UI may now display an assigned session; recovery must keep the absent
 // session from the accepted original payload to preserve its canonical hash.
 body.sessionId=id;body.input.goal='Edited locally after acceptance';
 const recovered=await client.recover();assert.equal(recovered.canExecute,false);assert.equal(client.hasPending(),false);
 assert.equal(received[0].options.headers['Idempotency-Key'],received[1].options.headers['Idempotency-Key']);assert.equal(received[1].options.headers['Idempotency-Key'],received[2].options.headers['Idempotency-Key']);
 assert.deepEqual(JSON.parse(received[2].options.body),{action:'recover',productId:'day',input:inputs.day});
 assert.equal(received[2].url,'/api/workspace');assert.equal(received[2].options.headers['x-ad-astra-bridge-secret'],undefined);assert.equal(received[2].options.cache,'no-store');
});
test('changed payloads and accounts never reuse another pending request identity',async()=>{
 const received=[];const {client,setIdentity}=clientFixture(async(url,options)=>{received.push(options);throw Error('uncertain');});
 await assert.rejects(client.request({action:'run',productId:'day',input:inputs.day}));
 await assert.rejects(client.request({action:'run',productId:'learn',input:inputs.learn}));
 assert.notEqual(received[0].headers['Idempotency-Key'],received[1].headers['Idempotency-Key']);
 setIdentity('session-b:user-b');assert.equal(client.hasPending(),false);await assert.rejects(client.recover(),/workspace_not_found/);
 await assert.rejects(client.request({action:'run',productId:'learn',input:inputs.learn}));
 assert.notEqual(received[1].headers['Idempotency-Key'],received[2].headers['Idempotency-Key']);assert.equal(received[2].headers.Authorization,'Bearer jwt-session-b:user-b');
});
test('account changes during token lookup never send a request, and cleared sessions cannot publish in-flight private results',async()=>{
 let identity='account-a',tokenResolve,sent=0;
 const client=createClient({getIdentity:()=>identity,getToken:()=>new Promise(resolve=>{tokenResolve=resolve;}),fetchImpl:async()=>{++sent;return Response.json(common);}});
 const awaiting=client.request({action:'status'});identity='account-b';tokenResolve('old-token');await assert.rejects(awaiting,/authentication_changed/);assert.equal(sent,0);
 for(const change of ['account','reset']) {
  let release;const fixture=clientFixture(async()=>new Promise(resolve=>{release=resolve;}));
  const response=fixture.client.request({action:'get',sessionId:id});await new Promise(resolve=>setImmediate(resolve));
  if(change==='account')fixture.setIdentity('session-b:user-b');else fixture.client.reset();
  release(Response.json(saved()));await assert.rejects(response,/authentication_changed/);
 }
});
test('completion of an older browser request cannot erase a newer pending recovery',async()=>{
 const sent=[];const fixture=clientFixture(async(url,options)=>new Promise(resolve=>{sent.push({options,resolve});}));
 const first=fixture.client.request({action:'run',productId:'day',input:inputs.day});await new Promise(resolve=>setImmediate(resolve));
 const second=fixture.client.request({action:'run',productId:'learn',input:inputs.learn});await new Promise(resolve=>setImmediate(resolve));
 sent[0].resolve(Response.json(saved()));await first;assert.equal(fixture.client.hasPending(),true);
 sent[1].resolve(Response.json(saved('learn','pending'),{status:202}));await second;
 const recovery=fixture.client.recover();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(sent[2].options.headers['Idempotency-Key'],sent[1].options.headers['Idempotency-Key']);assert.equal(JSON.parse(sent[2].options.body).productId,'learn');
 sent[2].resolve(Response.json(saved('learn')));await recovery;assert.equal(fixture.client.hasPending(),false);
});
test('missing recovery and conflicting payload errors never make the browser resubmit automatically',async()=>{
 const received=[];let error='workspace_not_found';
 const fixture=clientFixture(async(url,options)=>{received.push(options);return Response.json({error,transportRequestId:'safe-reference'},{status:error==='workspace_not_found'?404:409});});
 await assert.rejects(fixture.client.request({action:'run',productId:'day',input:inputs.day}),/workspace_not_found/);assert.equal(received.length,1);
 error='idempotency_conflict';await assert.rejects(fixture.client.recover(),value=>value.message==='idempotency_conflict' && value.requestId==='safe-reference');
 assert.equal(received.length,2);assert.equal(JSON.parse(received[1].body).action,'recover');assert.equal(fixture.client.hasPending(),true);
});

