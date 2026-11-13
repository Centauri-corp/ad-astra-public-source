'use strict';
const {test,beforeEach,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{EventEmitter}=require('node:events');
const ask=require('../api/ask'),gates=require('../lib/release-gates'),release=require('../public/release-manifest.json'),routing=require('../vercel.json');
const client=require('../public/neural/engine-client.js');
const customerBudget=require('./fixtures/customer-budget.cjs');
const originalEnv={...process.env},originalFetch=global.fetch,originalRelease=structuredClone(release),originalRedirects=structuredClone(routing.redirects);
const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...pair.publicKey.export({format:'jwk'}),kid:'stream-fixture',use:'sig',alg:'RS256'};
let calls=[],providerStatus=200,redis=[1,11,3600],pendingProvider=false,providerSignal;
function token(){const now=Math.floor(Date.now()/1000),parts=[{alg:'RS256',kid:jwk.kid,typ:'JWT'},{iss:'https://clerk.adastra.global',aud:'ad-astra-workspace',azp:'https://adastra.global',sub:'user_streamA',sid:'sess_streamA',iat:now,nbf:now-1,exp:now+60}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url'));return parts.join('.')+'.'+crypto.sign('RSA-SHA256',Buffer.from(parts.join('.')),pair.privateKey).toString('base64url');}
function fixture(headers={}){const req=new EventEmitter();Object.assign(req,{method:'POST',headers:{host:'adastra.global',origin:'https://adastra.global',accept:'text/event-stream','content-type':'application/json','x-ad-astra-request':'public-v1','idempotency-key':crypto.randomUUID(),authorization:'Bearer '+token(),...headers},body:{question:'Explain a safe synthetic example.',mode:'ask'}});const res=new EventEmitter();Object.assign(res,{headers:{},body:'',writableEnded:false,destroyed:false,setHeader(key,value){this.headers[key.toLowerCase()]=value;},write(value){this.body+=value;return true;},end(value=''){this.body+=value;this.writableEnded=true;}});return {req,res};}
const events=res=>res.body.trim().split('\n\n').filter(Boolean).map(frame=>JSON.parse(frame.split('\ndata: ')[1]));
beforeEach(()=>{
 Object.assign(release,originalRelease,{publicLaunchEnabled:true,engineAvailable:true});routing.redirects=[];
 for(const k of Object.keys(process.env))if(!(k in originalEnv))delete process.env[k];
 Object.assign(process.env,originalEnv,{AD_ASTRA_ACCESS_MODE:'authenticated',AD_ASTRA_AUTH_ISSUER:'https://clerk.adastra.global',AD_ASTRA_AUTH_JWKS_URL:'https://clerk.adastra.global/.well-known/jwks.json',AD_ASTRA_AUTH_AUDIENCE:'ad-astra-workspace',AD_ASTRA_DAILY_BUDGET_MICRO_USD:'10000000',KV_REST_API_URL:'https://stream-redis.invalid',KV_REST_API_TOKEN:'synthetic-fixture',AD_ASTRA_MODEL_GATEWAY_URL:'https://gateway.invalid/v1/respond',AD_ASTRA_MODEL_GATEWAY_TOKEN:'synthetic-gateway-token',AD_ASTRA_MODEL_GATEWAY_CONTRACT:'ad-astra-model-gateway/v1'});
 for(const flag of gates.FLAGS)process.env[flag]='true';calls=[];providerStatus=200;redis=[1,11,3600];pendingProvider=false;providerSignal=undefined;
 Object.assign(process.env,customerBudget.env);
 global.fetch=async(url,init)=>{calls.push({url,init});if(url.includes('/.well-known/jwks.json'))return {ok:true,json:async()=>({keys:[jwk]})};if(url==='https://stream-redis.invalid')return {ok:true,json:async()=>({result:redis})};if(url===customerBudget.url)return Response.json(customerBudget.allowance(init));if(url==='https://gateway.invalid/v1/respond'){providerSignal=init.signal;if(pendingProvider)return new Promise((_resolve,reject)=>{init.signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true});});return Response.json({object:'chat.completion',model:'astra-lumen',choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:'Synthetic streamed answer. <script>not executable</script>'}}],usage:{prompt_tokens:100,completion_tokens:20,total_tokens:120}},{status:providerStatus});}throw Error('Unexpected fixture destination');};
});
after(()=>{global.fetch=originalFetch;Object.assign(release,originalRelease);routing.redirects=originalRedirects;for(const k of Object.keys(process.env))if(!(k in originalEnv))delete process.env[k];Object.assign(process.env,originalEnv);});
test('signed request reserves capacity before emitting four correlated lifecycle events',async()=>{
 const {req,res}=fixture();await ask(req,res);assert.equal(res.statusCode,200);assert.match(res.headers['content-type'],/^text\/event-stream/);assert.equal(res.headers['cache-control'],'no-store, no-transform');
 const rows=events(res);assert.deepEqual(rows.map(e=>e.type),['accepted','requesting','answer','completed']);assert.deepEqual(rows.map(e=>e.sequence),[1,2,3,4]);assert.ok(rows.every(e=>e.requestId===res.headers['x-request-id']));
 const seen=[];const answer=await client.readStream(new Response(res.body,{headers:res.headers}),{onEvent:e=>seen.push(e.type)});assert.equal(answer,'Synthetic streamed answer. <script>not executable</script>');assert.equal(seen.length,4);
 assert.ok(calls.findIndex(c=>c.url==='https://stream-redis.invalid')<calls.findIndex(c=>c.url.includes('/v1/respond')));assert.equal(calls.filter(c=>c.url.includes('/v1/respond')).length,1);assert.ok(!res.body.includes('synthetic-fixture'));assert.ok(!res.body.includes(req.body.question));
});
test('authentication, release, origin and capacity failures remain JSON and emit no activity stream',async()=>{
 for(const kind of ['auth','release','origin','capacity']){calls=[];release.engineAvailable=true;redis=[1,11,3600];const f=fixture(kind==='auth'?{authorization:''}:kind==='origin'?{origin:'https://untrusted.invalid'}:{});if(kind==='release')release.engineAvailable=false;if(kind==='capacity')redis=[2,0,3600];await ask(f.req,f.res);assert.ok([401,403,429,503].includes(f.res.statusCode));assert.match(f.res.headers['content-type'],/^application\/json/);assert.ok(!f.res.body.includes('event: accepted'));assert.equal(calls.filter(c=>c.url.includes('/v1/respond')).length,0);}
});
test('provider failure terminates with a safe event and never invents an answer or retries',async()=>{
 providerStatus=429;const f=fixture();await ask(f.req,f.res);assert.deepEqual(events(f.res).map(e=>e.type),['accepted','requesting','failed']);await assert.rejects(()=>client.readStream(new Response(f.res.body,{headers:f.res.headers})),/ai_unavailable/);assert.equal(calls.filter(c=>c.url.includes('/v1/respond')).length,1);
});
test('client disconnect aborts the single in-flight provider request without replay',async()=>{
 pendingProvider=true;const f=fixture(),running=ask(f.req,f.res);for(let i=0;i<50&&!providerSignal;i++)await new Promise(resolve=>setImmediate(resolve));assert.ok(providerSignal);f.res.destroyed=true;f.res.emit('close');await running;assert.equal(providerSignal.aborted,true);assert.equal(calls.filter(c=>c.url.includes('/v1/respond')).length,1);assert.equal(f.res.listenerCount('close'),0);
});
test('paid-access denial and duplicate request are explicit client stops, not streamed model activity',async()=>{
 for(const [status,reason]of [[403,'access_denied'],[409,'request_replayed']]){
  await assert.rejects(()=>client.readStream(new Response('{}',{status,headers:{'content-type':'application/json'}})),new RegExp(reason));
 }
});
test('reducer rejects mismatched IDs, sequence gaps, stale times and unsolicited event data',()=>{
 const now=Date.now(),id=crypto.randomUUID(),first={schema:'ad-astra-engine-event/v1',requestId:id,sequence:1,type:'accepted',at:new Date(now).toISOString()};
 for(const change of [e=>e.requestId=crypto.randomUUID(),e=>e.sequence=2,e=>e.type='answer',e=>e.at=new Date(now-300001).toISOString(),e=>e.at=new Date(now+30001).toISOString(),e=>e.secret='not-allowed']){const event=structuredClone(first);change(event);assert.throws(()=>client.reducer(id,()=>now).accept(event));}
 const reducer=client.reducer(id,()=>now);reducer.accept(first);assert.throws(()=>reducer.accept(first));assert.throws(()=>reducer.result(),/incomplete/);
});
test('stream parser handles split UTF-8 frames and rejects premature EOF, invalid framing and oversized input',async()=>{
 const id=crypto.randomUUID(),now=new Date().toISOString(),rows=['accepted','requesting','answer','completed'].map((type,i)=>({schema:'ad-astra-engine-event/v1',requestId:id,sequence:i+1,type,at:now,...(type==='answer'?{answer:'A useful café example.',mode:'ask'}:{})}));
 const serialize=e=>'event: '+e.type+'\ndata: '+JSON.stringify(e)+'\n\n',body=rows.map(serialize).join(''),headers={'content-type':'text/event-stream','x-request-id':id};
 const bytes=new TextEncoder().encode(body),stream=new ReadableStream({start(c){for(const byte of bytes)c.enqueue(new Uint8Array([byte]));c.close();}});assert.equal(await client.readStream(new Response(stream,{headers})),'A useful café example.');
 for(const bad of [rows.slice(0,3).map(serialize).join(''),body.replace('event: accepted','event: completed'),body+'incomplete','x'.repeat(65537)])await assert.rejects(()=>client.readStream(new Response(bad,{headers})));
});
test('a late session token after cancellation cannot dispatch a request',async()=>{
 const abort=new AbortController();let grant,count=0;const pending=client.ask({question:'A synthetic test question.',getToken:()=>new Promise(resolve=>grant=resolve),fetcher:async()=>{count++;},signal:abort.signal});abort.abort();grant('synthetic-session-token');await assert.rejects(()=>pending,/request_cancelled/);assert.equal(count,0);
});
