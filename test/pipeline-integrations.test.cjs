'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createReaders,collectReadiness,readJson,BINDINGS,STAGES,CHECKS}=require('../lib/pipeline-integrations.cjs');
const {createHandler}=require('../api/pipeline-readiness');
const now=()=>Date.parse('2026-11-05T20:00:00Z'),sha='a'.repeat(40),id='dpl_1234567890123456',secret='test-only-not-a-real-credential';
const env={AD_ASTRA_PIPELINE_SUPABASE_SECRET:secret,AD_ASTRA_PIPELINE_SANITY_READ_TOKEN:secret,AD_ASTRA_PIPELINE_VERCEL_READ_TOKEN:secret,AD_ASTRA_PIPELINE_REVIEW_SHA:sha,AD_ASTRA_PIPELINE_DEPLOYMENT_ID:id};
const json=(value,headers={})=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json',...headers}});
const db=()=>({schemaVersion:1,scope:'ad-astra-private-pipeline-diagnostics',releaseAuthorized:false,snapshot:{observed_at:'2026-11-05T20:00:00Z',graphics_versions_recorded:0,graphics_previews_recorded:0,video_evidence_recorded:0,non_reconciled_model_calls:2,provider_receipts_without_cost:2,budget_baseline_declared_verified:false}});
const content=()=>({result:STAGES.map((stageKey,i)=>({_id:'drafts.fixture-'+i,_rev:'revision-'+i,stageKey,implementationStatus:'draft'}))});
const pr=()=>({head:{sha,repo:{full_name:BINDINGS.repo}},base:{ref:'main',repo:{full_name:BINDINGS.repo}},user:{login:'author'},merged:false});
function transport(log,override){return async(url,init)=>{
 log.push({url,init});if(override){const r=override(url,init);if(r)return r;}
 if(url.includes('supabase.co'))return json(db());
 if(url.includes('sanity.io'))return json(content());
 if(url.includes('/reviews?'))return json([]);
 if(url.includes('/check-runs?'))return json({total_count:3,check_runs:CHECKS.map(name=>({name,head_sha:sha,status:'completed',conclusion:'success'}))});
 if(url.includes('api.github.com'))return json(pr());
 if(url.includes('api.vercel.com'))return json({id,projectId:BINDINGS.vercelProject,meta:{githubCommitSha:sha},state:'READY',target:'staging'});
 throw new Error('unexpected_network');
};}
test('bounded cross-platform snapshot carries real blockers and never authorizes release',async()=>{
 const log=[],r=await collectReadiness({env,now,fetcher:transport(log)});
 assert.equal(r.services.supabase.metrics.non_reconciled_model_calls,2);
 assert.equal(r.services.sanity.contractCount,5);assert.equal(r.services.github.merged,false);
 assert.equal(r.services.vercel.target,'staging');assert.equal(r.services.catalyst.dispatchEnabled,false);
 assert.equal(r.releaseAuthorized,false);assert.equal(r.externalActionsEnabled,false);
 for(const b of ['GRAPHICS_EVIDENCE_MISSING','VIDEO_EVIDENCE_MISSING','MODEL_ACCOUNTING_PENDING','BUDGET_BASELINE_UNVERIFIED','CATALYST_NOT_CONNECTED','INDEPENDENT_SOURCE_REVIEW_MISSING'])assert.ok(r.blockers.includes(b));
 assert.equal(log.filter(x=>x.init.method==='POST').length,1);assert.ok(log.every(x=>x.init.redirect==='error'));
 assert.ok(!JSON.stringify(r).includes(secret));
});
test('missing credentials fail closed without making network requests',async()=>{
 let calls=0;const r=await collectReadiness({env:{},now,fetcher:async()=>{calls++;throw Error('unexpected');}});
 assert.equal(calls,0);assert.equal(r.releaseAuthorized,false);assert.equal(r.services.supabase.reason,'credential_not_configured');
});
test('a thrown provider error never reflects a token or raw upstream payload',async()=>{
 const r=await collectReadiness({env,now,fetcher:async()=>{throw Error(secret);}});
 assert.ok(!JSON.stringify(r).includes(secret));assert.equal(r.services.supabase.reason,'provider_unavailable');
});
test('off-origin calls and mutating methods are rejected before fetch',async()=>{
 const never=async()=>{throw Error('fetch_should_not_run');};
 await assert.rejects(readJson(never,'https://evil.invalid/test'),/origin_denied/);
 await assert.rejects(readJson(never,'https://api.github.com/repos/x',{method:'DELETE'}),/mutation_denied/);
 await assert.rejects(readJson(never,'https://'+BINDINGS.supabase+'.supabase.co/rest/v1/rpc/other',{method:'POST',body:'{}'}),/mutation_denied/);
});
test('oversized and non-JSON responses are rejected',async()=>{
 await assert.rejects(readJson(async()=>new Response('html',{headers:{'Content-Type':'text/html'}}),'https://api.github.com/test'),/invalid_provider_response/);
 await assert.rejects(readJson(async()=>json({x:'x'.repeat(262145)}),'https://api.github.com/test'),/response_too_large/);
});
test('stale or invalid Supabase evidence cannot pass as observed',async()=>{
 const x=db();x.snapshot.observed_at='2026-11-04T20:00:00Z';
 await assert.rejects(createReaders({env,now,fetcher:async()=>json(x)}).supabase(),/stale_provider_evidence/);
 x.snapshot.observed_at='2026-11-05T20:00:00Z';x.snapshot.non_reconciled_model_calls='0';
 await assert.rejects(createReaders({env,now,fetcher:async()=>json(x)}).supabase(),/invalid_provider_response/);
});
test('duplicate, missing and malformed Sanity stage records fail closed',async()=>{
 const x=content();x.result[1].stageKey=x.result[0].stageKey;
 await assert.rejects(createReaders({env,now,fetcher:async()=>json(x)}).sanity(),/content_contract_incomplete/);
 x.result=[];await assert.rejects(createReaders({env,now,fetcher:async()=>json(x)}).sanity(),/content_contract_incomplete/);
});
test('GitHub head drift is rejected',async()=>{
 const x=pr();x.head.sha='b'.repeat(40);
 await assert.rejects(createReaders({env,now,fetcher:async()=>json(x)}).github(),/source_head_drift/);
});
test('GitHub pagination and missing check totals cannot silently truncate',async()=>{
 const fetcher=transport([],url=>url.includes('/reviews?')?json([],{Link:'<https://api.github.com/next>; rel="next"'}):null);
 await assert.rejects(createReaders({env,now,fetcher}).github(),/provider_result_incomplete/);
});
test('approval submissions are not treated as verified reviewer authority',async()=>{
 const fetcher=transport([],url=>url.includes('/reviews?')?json([{id:1,state:'APPROVED',commit_id:sha,user:{login:'reviewer'}}]):null);
 const r=await createReaders({env,now,fetcher}).github();assert.equal(r.approvalSubmissions,1);assert.equal(r.reviewerEligibilityVerified,false);assert.equal(r.releaseAuthorized,false);
});
test('wrong Vercel source or project is rejected',async()=>{
 await assert.rejects(createReaders({env,now,fetcher:async()=>json({id,projectId:'wrong',meta:{githubCommitSha:sha}})}).vercel(),/deployment_source_drift/);
});
function response(){return {statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=body;}};}
function req(method='GET'){return {method,url:'/api/pipeline-readiness',headers:{host:'adastra.global',origin:'https://adastra.global'}};}
const enabled={AD_ASTRA_PIPELINE_AUDIT_ENABLED:'true',AD_ASTRA_PIPELINE_REVIEWER_SUBJECT:'user_reviewer'};
test('review endpoint is absent by default and does not call authentication or providers',async()=>{
 const res=response();await createHandler({env:{},authenticate:()=>{throw Error('must_not_run');}})(req(),res);assert.equal(res.statusCode,404);
});
test('authenticated non-reviewers are denied before collecting private data',async()=>{
 const res=response();let calls=0;await createHandler({env:enabled,authenticate:async()=>({ok:true,claims:{sub:'user_customer'}}),collect:()=>{calls++;}})(req(),res);
 assert.equal(res.statusCode,403);assert.equal(calls,0);
});
test('anonymous and cross-origin requests cannot access private data',async()=>{
 let count=0;const h=createHandler({env:enabled,authenticate:async()=>{count++;return {ok:false,status:401};}});
 const a=response();await h(req(),a);assert.equal(a.statusCode,401);
 const b=response(),r=req();r.headers.origin='https://evil.invalid';await h(r,b);assert.equal(b.statusCode,403);assert.equal(count,1);
});
test('writes and query-injected targets are refused',async()=>{
 const h=createHandler({env:enabled}),a=response();await h(req('POST'),a);assert.equal(a.statusCode,405);
 const b=response(),r=req();r.url+='?target=https://evil.invalid';await h(r,b);assert.equal(b.statusCode,400);
});
test('owner access returns private non-cacheable snapshot and deduplicates reads',async()=>{
 let calls=0;const report={releaseAuthorized:false,externalActionsEnabled:false,blockers:['CATALYST_NOT_CONNECTED']};
 const h=createHandler({env:enabled,authenticate:async()=>({ok:true,claims:{sub:'user_reviewer'}}),collect:async()=>{calls++;return report;}});
 const a=response(),b=response();await Promise.all([h(req(),a),h(req(),b)]);
 assert.equal(calls,1);assert.equal(a.statusCode,200);assert.equal(a.headers['Cache-Control'],'private, no-store');assert.equal(JSON.parse(a.body).releaseAuthorized,false);
});
test('authorized HEAD avoids expensive provider collection',async()=>{
 const h=createHandler({env:enabled,authenticate:async()=>({ok:true,claims:{sub:'user_reviewer'}}),collect:()=>{throw Error('must_not_run');}}),res=response();
 await h(req('HEAD'),res);assert.equal(res.statusCode,204);assert.equal(res.body,'');
});
test('invalid report and authentication errors remain generic failures',async()=>{
 const h=createHandler({env:enabled,authenticate:async()=>({ok:true,claims:{sub:'user_reviewer'}}),collect:async()=>({releaseAuthorized:true})}),res=response();await h(req(),res);assert.equal(res.statusCode,503);
 const b=response();await createHandler({env:enabled,authenticate:async()=>{throw Error(secret);}})(req(),b);assert.equal(b.statusCode,503);assert.ok(!b.body.includes(secret));
});
