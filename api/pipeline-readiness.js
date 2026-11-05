'use strict';
// Disabled by default. An authenticated customer is NOT an authorized reviewer.
const {collectReadiness}=require('../lib/pipeline-integrations.cjs');
function createHandler({env=process.env,authenticate=req=>require('../lib/auth').authenticateRequest(req),collect=()=>collectReadiness({env})}={}){
  let inflight=null,cached=null,cacheUntil=0;
  return async function pipelineReadiness(req,res){
    const reply=(status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Vary','Authorization');res.end(req.method==='HEAD'?'':JSON.stringify(body));};
    const reviewer=env.AD_ASTRA_PIPELINE_REVIEWER_SUBJECT;
    if(env.AD_ASTRA_PIPELINE_AUDIT_ENABLED!=='true'||!/^user_[A-Za-z0-9]{4,120}$/.test(reviewer||''))return reply(404,{error:'not_found'});
    if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return reply(405,{error:'method_not_allowed'});}
    if(typeof req.url!=='string'||req.url.includes('?'))return reply(400,{error:'query_not_supported'});
    const host=req.headers?.host,origin=req.headers?.origin;
    const validHost=host==='adastra.global'||(typeof env.VERCEL_URL==='string'&&/^[a-z0-9.-]+\.vercel\.app$/.test(env.VERCEL_URL)&&host===env.VERCEL_URL);
    if(!validHost||(origin!==undefined&&origin!=='https://'+host)||req.headers?.['sec-fetch-site']==='cross-site')return reply(403,{error:'origin_denied'});
    let auth;try{auth=await authenticate(req);}catch{return reply(503,{error:'authentication_unavailable'});}
    if(!auth?.ok)return reply(auth?.status===503?503:401,{error:auth?.status===503?'authentication_unavailable':'authentication_required'});
    if(auth.claims?.sub!==reviewer)return reply(403,{error:'reviewer_required'});
    if(req.method==='HEAD')return reply(204,{});
    try{
      if(cached&&Date.now()<cacheUntil)return reply(200,cached);
      if(!inflight)inflight=Promise.resolve().then(collect).then(value=>{if(value?.releaseAuthorized!==false||value?.externalActionsEnabled!==false)throw new Error('invalid_readiness');cached=value;cacheUntil=Date.now()+15000;return value;}).finally(()=>{inflight=null;});
      return reply(200,await inflight);
    }catch{return reply(503,{error:'readiness_unavailable'});}
  };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
