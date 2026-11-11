'use strict';

// Configuration/status metadata only. Never returns tenant records or credentials.
const {ready}=require('../lib/release-gates');
function createHandler({releaseReady=ready,environment=()=>process.env,request=(...args)=>fetch(...args)}={}){
 return async function subscriptionStatus(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  const send=(code,body)=>{res.statusCode=code;res.end(req.method==='HEAD'?'':JSON.stringify(body));};
  const unavailable={market:'US-CA',available:false,frameworkDeployed:false};
  if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return send(405,unavailable);}
  const env=environment(),target=env.AD_ASTRA_SUBSCRIPTION_ENVIRONMENT;
  if(!['production','development'].includes(target)||
     (target==='production'&&env.VERCEL_ENV!=='production')||
     (target==='development'&&env.VERCEL_ENV==='production')||!releaseReady())return send(200,unavailable);
  try{
   const upstream=await request(`https://wewznejqpnsmiwkbozgw.supabase.co/functions/v1/astra-subscriptions-${target}/status`,{
    headers:{Accept:'application/json'},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(4000)
   });
   if(!upstream.ok||!/^application\/json(?:;|$)/i.test(upstream.headers.get('content-type')||'')||Number(upstream.headers.get('content-length')||0)>8192)throw new Error('unavailable');
   const chunks=[];let size=0;
   for await(const chunk of upstream.body){size+=chunk.byteLength;if(size>8192)throw new Error('unavailable');chunks.push(Buffer.from(chunk));}
   const status=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(!status||typeof status!=='object'||Array.isArray(status)||status.environment!==target||
      ['frameworkDeployed','checkoutEnabled','activationEnabled'].some(key=>typeof status[key]!=='boolean'))throw new Error('unavailable');
   return send(200,{market:'US-CA',environment:target,
    available:target==='production'&&status.frameworkDeployed&&status.checkoutEnabled&&status.activationEnabled,
    frameworkDeployed:status.frameworkDeployed});
  }catch{return send(503,unavailable);}
 };
}
module.exports=createHandler();
module.exports.createHandler=createHandler;
