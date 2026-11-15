'use strict';
const {buildCustomerIntegration,selectCustomerDirection}=require('../lib/customer-integration');
const {families}=require('../config/public-product-families.json');
const integration=buildCustomerIntegration(families);
module.exports=function customerIntegration(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 const reply=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body));};
 if(req.method!=='GET'){res.setHeader('Allow','GET');return reply(405,{error:'method_not_allowed'});}
 const host=String(req.headers?.host||'').toLowerCase();
 if(!['adastra.global',process.env.VERCEL_URL].filter(Boolean).includes(host))return reply(403,{error:'unrecognized_host'});
 let u;try{u=new URL(req.url,'https://'+host)}catch{return reply(400,{error:'invalid_request'});}
 if(u.pathname!=='/api/customer-integration')return reply(404,{error:'not_found'});
 if([...u.searchParams.keys()].some(k=>!['family','agent'].includes(k))||
    u.searchParams.getAll('family').length>1||u.searchParams.getAll('agent').length>1)return reply(400,{error:'invalid_query'});
 const family=u.searchParams.get('family'),agent=u.searchParams.get('agent');
 if(agent&&!family)return reply(400,{error:'family_required'});
 if(!family)return reply(200,integration);
 const direction=selectCustomerDirection(integration,family,agent);
 if(!direction.allowed)return reply(404,{error:'unknown_family'});
 return reply(200,{schema:integration.schema,environment:integration.environment,
  direction,customerAccess:'verified-session-required',modelExecutionAuthorized:false,
  billingAuthorized:false});
};
