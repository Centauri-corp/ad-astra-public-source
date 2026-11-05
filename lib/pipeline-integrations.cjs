'use strict';
// Server-only read adapters. No mutation, model execution, approval or promotion.
const {createHash}=require('node:crypto');
const BINDINGS=Object.freeze({
  supabase:'wewznejqpnsmiwkbozgw', sanity:'6a4vgjc9', dataset:'production',
  repo:'zohebkhanfiji-ux/ad-astra-public-source', pr:24,
  vercelProject:'prj_FX8QO3TIqUNAfFR4enz0bALmjeg1',vercelTeam:'team_5xblMPo2zEBjbz4KPmeDVHPr'
});
const STAGES=Object.freeze(['graphics-sanity-source-v1','graphics-supabase-evidence-v1','graphics-github-source-v1','graphics-vercel-release-v1','graphics-catalyst-handoff-v1']);
const CHECKS=Object.freeze(['security-and-release','resource-browser','homepage-experience']);
const ORIGINS=new Set(['https://'+BINDINGS.supabase+'.supabase.co','https://'+BINDINGS.sanity+'.api.sanity.io','https://api.github.com','https://api.vercel.com']);
const SHA=/^[a-f0-9]{40}$/;
class BridgeError extends Error { constructor(code){super(code);this.code=code;} }
const fail=code=>{throw new BridgeError(code);};
function token(value){if(typeof value!=='string'||value.length<16||value.length>4096||/\s/.test(value))fail('credential_not_configured');return value;}
function safeInt(value){if(!Number.isSafeInteger(value)||value<0)fail('invalid_provider_response');return value;}
async function readJson(fetcher,url,init={}){
  const address=new URL(url);
  if(!ORIGINS.has(address.origin)||address.username||address.password||address.hash)fail('origin_denied');
  const method=init.method||'GET';
  if(method!=='GET'&&!(method==='POST'&&address.origin==='https://'+BINDINGS.supabase+'.supabase.co'&&address.pathname==='/rest/v1/rpc/astra_pipeline_readiness_v1'&&init.body==='{}'))fail('mutation_denied');
  const response=await fetcher(address.toString(),{...init,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6000)});
  if(!response.ok){await response.body?.cancel();fail('provider_request_failed');}
  if(!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();fail('invalid_provider_response');}
  if(Number(response.headers.get('content-length')||0)>262144){await response.body?.cancel();fail('response_too_large');}
  const reader=response.body?.getReader();if(!reader)fail('invalid_provider_response');
  const chunks=[];let size=0;
  try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>262144){await reader.cancel();fail('response_too_large');}chunks.push(part.value);}}
  finally{reader.releaseLock();}
  let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail('invalid_provider_response');}
  if((response.headers.get('link')||'').includes('rel="next"'))fail('provider_result_incomplete');
  return data;
}
function createReaders({env=process.env,fetcher=globalThis.fetch,now=Date.now}={}){
  async function supabase(){
    const secret=token(env.AD_ASTRA_PIPELINE_SUPABASE_SECRET);
    const data=await readJson(fetcher,'https://'+BINDINGS.supabase+'.supabase.co/rest/v1/rpc/astra_pipeline_readiness_v1',{
      method:'POST',headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:'{}'
    });
    if(data?.schemaVersion!==1||data.scope!=='ad-astra-private-pipeline-diagnostics'||data.releaseAuthorized!==false)fail('invalid_provider_response');
    const s=data.snapshot||{};const observed=Date.parse(s.observed_at);
    if(!Number.isFinite(observed)||observed>now()+5000||now()-observed>120000)fail('stale_provider_evidence');
    const metrics={};for(const key of ['graphics_versions_recorded','graphics_previews_recorded','video_evidence_recorded','non_reconciled_model_calls','provider_receipts_without_cost'])metrics[key]=safeInt(s[key]);
    if(typeof s.budget_baseline_declared_verified!=='boolean')fail('invalid_provider_response');
    return {observedAt:s.observed_at,metrics,budgetDeclaredVerified:s.budget_baseline_declared_verified,releaseAuthorized:false};
  }
  async function sanity(){
    const secret=token(env.AD_ASTRA_PIPELINE_SANITY_READ_TOKEN);
    const query='*[_type == "astraIntegrationStage" && group == $group && internalOnly == true] | order(_id asc)[0...11]{_id,_rev,stageKey,implementationStatus}';
    const search=new URLSearchParams({query,perspective:'raw','$group':JSON.stringify('graphics-pipeline-v1')});
    const data=await readJson(fetcher,'https://'+BINDINGS.sanity+'.api.sanity.io/v2026-11-05/data/query/'+BINDINGS.dataset+'?'+search,{headers:{Authorization:'Bearer '+secret}});
    const rows=data?.result;if(!Array.isArray(rows)||rows.length!==STAGES.length)fail('content_contract_incomplete');
    const keys=new Set();
    for(const row of rows){if(!row||!STAGES.includes(row.stageKey)||keys.has(row.stageKey)||typeof row._id!=='string'||typeof row._rev!=='string'||!row._rev)fail('content_contract_incomplete');keys.add(row.stageKey);}
    const digest=createHash('sha256').update(JSON.stringify(rows.map(r=>[r._id,r._rev,r.stageKey]).sort((a,b)=>a[0].localeCompare(b[0])))).digest('hex');
    return {contractCount:rows.length,revisionDigest:digest,editorialOnly:true,releaseAuthorized:false};
  }
  async function github(){
    const expected=env.AD_ASTRA_PIPELINE_REVIEW_SHA;if(!SHA.test(expected||''))fail('source_binding_not_configured');
    const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'AD-ASTRA-Readiness'};
    if(env.AD_ASTRA_PIPELINE_GITHUB_READ_TOKEN)headers.Authorization='Bearer '+token(env.AD_ASTRA_PIPELINE_GITHUB_READ_TOKEN);
    const root='https://api.github.com/repos/'+BINDINGS.repo;
    const pr=await readJson(fetcher,root+'/pulls/'+BINDINGS.pr,{headers});
    if(pr?.head?.sha!==expected||pr?.head?.repo?.full_name!==BINDINGS.repo||pr?.base?.repo?.full_name!==BINDINGS.repo)fail('source_head_drift');
    const [reviews,checks]=await Promise.all([
      readJson(fetcher,root+'/pulls/'+BINDINGS.pr+'/reviews?per_page=100',{headers}),
      readJson(fetcher,root+'/commits/'+expected+'/check-runs?per_page=100&filter=latest',{headers})
    ]);
    if(!Array.isArray(reviews)||!Array.isArray(checks?.check_runs)||checks.total_count!==checks.check_runs.length)fail('provider_result_incomplete');
    const latest=new Map();
    for(const r of reviews){if(!r?.user?.login)continue;const previous=latest.get(r.user.login);if(!previous||r.id>previous.id)latest.set(r.user.login,r);}
    const approvals=[...latest.values()].filter(r=>r.state==='APPROVED'&&r.commit_id===expected&&r.user.login!==pr.user?.login).length;
    const statuses={};for(const name of CHECKS){const matches=checks.check_runs.filter(c=>c.name===name&&c.head_sha===expected);statuses[name]=matches.length===1&&matches[0].status==='completed'&&matches[0].conclusion==='success';}
    return {headSha:expected,base:pr.base.ref,merged:pr.merged===true,approvalSubmissions:approvals,reviewerEligibilityVerified:false,checks:statuses,releaseAuthorized:false};
  }
  async function vercel(){
    const secret=token(env.AD_ASTRA_PIPELINE_VERCEL_READ_TOKEN),id=env.AD_ASTRA_PIPELINE_DEPLOYMENT_ID,sha=env.AD_ASTRA_PIPELINE_REVIEW_SHA;
    if(!/^dpl_[A-Za-z0-9]{12,80}$/.test(id||'')||!SHA.test(sha||''))fail('deployment_binding_not_configured');
    const data=await readJson(fetcher,'https://api.vercel.com/v13/deployments/'+id+'?teamId='+BINDINGS.vercelTeam,{headers:{Authorization:'Bearer '+secret}});
    const d=data.deployment||data;
    if(d.id!==id||(d.projectId||d.project?.id)!==BINDINGS.vercelProject||(d.meta?.githubCommitSha||d.gitSource?.sha)!==sha)fail('deployment_source_drift');
    return {deploymentId:id,sourceSha:sha,state:d.readyState||d.state,target:d.target||'preview',productionAcceptanceVerified:false,releaseAuthorized:false};
  }
  return {supabase,sanity,github,vercel,catalyst:async()=>({status:'blocked',reason:'connector_access_unverified',dispatchEnabled:false})};
}
async function collectReadiness(options={}){
  const readers=createReaders(options),services={},blockers=[];
  await Promise.all(Object.entries(readers).map(async([name,read])=>{try{services[name]={status:'observed',...await read()};}catch(e){services[name]={status:'unverified',reason:e instanceof BridgeError?e.code:'provider_unavailable'};blockers.push(name.toUpperCase()+'_UNVERIFIED');}}));
  const db=services.supabase.metrics;
  if(db){if(!db.graphics_versions_recorded||!db.graphics_previews_recorded)blockers.push('GRAPHICS_EVIDENCE_MISSING');if(!db.video_evidence_recorded)blockers.push('VIDEO_EVIDENCE_MISSING');if(db.non_reconciled_model_calls||db.provider_receipts_without_cost)blockers.push('MODEL_ACCOUNTING_PENDING');if(!services.supabase.budgetDeclaredVerified)blockers.push('BUDGET_BASELINE_UNVERIFIED');}
  if(services.github.status==='observed'){
    if(!services.github.approvalSubmissions)blockers.push('INDEPENDENT_SOURCE_REVIEW_MISSING');
    if(!Object.values(services.github.checks).every(Boolean))blockers.push('SOURCE_CHECKS_INCOMPLETE');
  }
  blockers.push('CATALYST_NOT_CONNECTED','EXACT_VERSION_RELEASE_REVIEW_REQUIRED');
  return {schemaVersion:1,observedAt:new Date((options.now||Date.now)()).toISOString(),services,blockers:[...new Set(blockers)].sort(),releaseAuthorized:false,externalActionsEnabled:false};
}
module.exports={BINDINGS,STAGES,CHECKS,BridgeError,readJson,createReaders,collectReadiness};
