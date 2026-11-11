'use strict';

// Public availability only; tenant records, credentials and internal gates stay private.
module.exports=async function subscriptionStatus(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET'){res.statusCode=405;res.end(JSON.stringify({available:false}));return;}
  const environment=process.env.AD_ASTRA_SUBSCRIPTION_ENVIRONMENT;
  if(!['production','development'].includes(environment)){res.statusCode=503;res.end(JSON.stringify({market:'US-CA',available:false}));return;}
  try {
    const upstream=await fetch(`https://wewznejqpnsmiwkbozgw.supabase.co/functions/v1/astra-subscriptions-${environment}/status`,{
      headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(4000)
    });
    if(!upstream.ok)throw new Error('unavailable');
    const status=await upstream.json();
    const available=environment==='production' && status.environment===environment && status.frameworkDeployed===true
      && status.checkoutEnabled===true && status.activationEnabled===true && status.productAvailable===true;
    res.statusCode=200;
    res.end(JSON.stringify({market:'US-CA',environment,available,frameworkDeployed:status.frameworkDeployed===true}));
  } catch {res.statusCode=503;res.end(JSON.stringify({market:'US-CA',environment,available:false}));}
};
