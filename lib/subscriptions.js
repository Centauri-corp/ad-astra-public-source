'use strict';
const {ready}=require('./release-gates');
const BASE='https://wewznejqpnsmiwkbozgw.supabase.co/functions/v1/astra-subscriptions-';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATES=new Set(['requested','checkout_created','checkout_expired','payment_pending','paid','active','past_due','canceled','refunded','disputed','market_hold','payment_review']);
const FIELDS=Object.freeze({account:[],access:[],link:['email','password','mfaCode'],unlink:['confirm'],enroll:['tenantId','plan','market','consent','consentVersion','channel'],state:['workflowId'],activate:['workflowId'],checkout:['workflowId'],portal:['workflowId']});
function validInput(action,input){
 if(typeof action!=='string'||!Object.hasOwn(FIELDS,action)||!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(field=>!FIELDS[action].includes(field)))return false;
 if(action==='link')return typeof input.email==='string'&&input.email.length<=254&&/^\S+@\S+\.\S+$/.test(input.email.trim())&&typeof input.password==='string'&&input.password.length>=1&&input.password.length<=1024&&(input.mfaCode===undefined||(typeof input.mfaCode==='string'&&/^\d{6}$/.test(input.mfaCode)));
 if(action==='unlink')return input.confirm===true;
 if(action==='enroll')return typeof input.tenantId==='string'&&UUID.test(input.tenantId)&&['starter','pro'].includes(input.plan)&&input.market==='US-CA'&&input.consent===true&&typeof input.consentVersion==='string'&&/^[A-Za-z0-9._-]{1,100}$/.test(input.consentVersion)&&['organic','partners','referrals','paid','direct'].includes(input.channel);
 if(['state','activate','checkout','portal'].includes(action))return typeof input.workflowId==='string'&&UUID.test(input.workflowId);
 return Object.keys(input).length===0;
}
async function boundedJson(response){
 if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||'')||Number(response.headers.get('content-length'))>65536){await response.body?.cancel();throw Error('subscription_unavailable');}
 const reader=response.body?.getReader();if(!reader)throw Error('subscription_unavailable');
 const chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();throw Error('subscription_unavailable');}chunks.push(value);}}
 finally{reader.releaseLock();}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
}
function safeUrl(value,action){
 const url=new URL(value),host=action==='portal'?'billing.stripe.com':'checkout.stripe.com';
 if(url.protocol!=='https:'||url.hostname!==host||url.port||url.username||url.password)throw Error('subscription_unavailable');
 return url.href;
}
function account(data,environment){
 if(data.environment!==environment||data.market!=='US-CA'||typeof data.linked!=='boolean'||!Array.isArray(data.workspaces)||!Array.isArray(data.subscriptions))throw Error('subscription_unavailable');
 const policy=value=>{try{const url=new URL(value);return url.origin==='https://adastra.global'&&url.pathname!=='/'&&!url.username&&!url.password&&!url.search&&!url.hash?url.href:null;}catch{return null;}};
 const termsUrl=policy(data.termsUrl),privacyUrl=policy(data.privacyUrl);
 const consentVersion=typeof data.consentVersion==='string'&&/^[A-Za-z0-9._-]{1,100}$/.test(data.consentVersion)?data.consentVersion:null;
 return {environment,market:'US-CA',linked:data.linked,linkingEnabled:data.linkingEnabled===true,checkoutEnabled:ready()&&environment==='production'&&data.linked&&data.checkoutEnabled===true&&Boolean(termsUrl&&privacyUrl&&consentVersion),termsUrl,privacyUrl,
  accessCurrent:ready()&&environment==='production'&&data.linked&&data.accessCurrent===true,
  consentVersion,
  workspaces:(data.linked?data.workspaces:[]).slice(0,50).filter(row=>row&&UUID.test(row.tenantId)&&typeof row.name==='string').map(row=>({tenantId:row.tenantId,name:row.name.slice(0,160)})),
  subscriptions:(data.linked?data.subscriptions:[]).slice(0,20).filter(row=>row&&UUID.test(row.workflowId)&&UUID.test(row.tenantId)&&['starter','pro'].includes(row.plan)&&STATES.has(row.state))
   .map(row=>({workflowId:row.workflowId,tenantId:row.tenantId,plan:row.plan,state:row.state,paidThrough:typeof row.paidThrough==='string'&&Number.isFinite(Date.parse(row.paidThrough))?row.paidThrough:null,canManageBilling:row.canManageBilling===true}))};
}
async function call(action,input,token,key){
 const environment=process.env.AD_ASTRA_SUBSCRIPTION_ENVIRONMENT;
 if(!['production','development'].includes(environment)||
   (environment==='production'&&process.env.VERCEL_ENV!=='production')||
   (environment==='development'&&process.env.VERCEL_ENV==='production'))throw Error('subscription_unavailable');
 if(!validInput(action,input))throw Error('invalid_subscription_request');
 // Existing account and cancellation access must survive a pause in new sales.
 // New enrollment, checkout and product activation require the source/runtime
 // release checks even if a provider is accidentally configured as available.
 if(['enroll','checkout','activate'].includes(action)&&!ready())throw Error('subscription_release_not_ready');
 const headers={Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'};
 if(key)headers['Idempotency-Key']=key;
 const response=await fetch(BASE+environment+'/'+action,{method:'POST',headers,body:JSON.stringify(input),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(action==='link'?25000:5000)});
 const data=await boundedJson(response);
 if(!response.ok)return {status:[400,401,403,404,409,413,429].includes(response.status)?response.status:503,body:{error:response.status===401?'authentication_or_connection_required':response.status===409?'subscription_conflict':response.status===429?'request_limit_reached':'subscription_unavailable'}};
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('subscription_unavailable');
 if(action==='account')return {status:200,body:account(data,environment)};
 if(action==='access'){
  if(data.environment!==environment||data.market!=='US-CA'||typeof data.allowed!=='boolean')throw Error('subscription_unavailable');
  return {status:200,body:{allowed:ready()&&environment==='production'&&data.allowed,environment,market:'US-CA'}};
 }
 if(action==='link'||action==='unlink'){
  if(data.linked!==(action==='link'))throw Error('subscription_unavailable');
  return {status:200,body:{linked:data.linked}};
 }
 if(action==='portal'||action==='checkout')return {status:200,body:{url:safeUrl(data.url,action)}};
 if(!UUID.test(data.workflowId??data.id)||!STATES.has(data.state))throw Error('subscription_unavailable');
 return {status:200,body:{workflowId:data.workflowId??data.id,state:data.state,accessCurrent:ready()&&environment==='production'&&data.accessCurrent===true}};
}
module.exports={call,FIELDS,validInput};
