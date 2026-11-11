'use strict';
const {authenticateRequest}=require('../lib/auth');
const subscriptions=require('../lib/subscriptions');
module.exports=async function handler(req,res){
 for(const [key,value]of Object.entries({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'}))res.setHeader(key,value);
 const reply=(status,body)=>{res.statusCode=status;if(status===429)res.setHeader('Retry-After','60');res.end(JSON.stringify(body));};
 if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(405,{error:'method_not_allowed'});}
 const host=String(req.headers?.host||'').toLowerCase();
 if(!['adastra.global',process.env.VERCEL_URL].includes(host)||req.headers?.origin!==`https://${host}`||req.headers?.['sec-fetch-site']==='cross-site'||req.headers?.['x-ad-astra-request']!=='public-v1')return reply(403,{error:'same_origin_required'});
 if(String(req.headers?.['content-type']||'').split(';')[0].trim().toLowerCase()!=='application/json')return reply(415,{error:'json_required'});
 const auth=await authenticateRequest(req);if(!auth.ok)return reply(auth.status,{error:auth.error});
 try{
  if(Number(req.headers?.['content-length'])>14000)return reply(413,{error:'body_too_large'});
  let raw;
  if(req.body!==undefined)raw=Buffer.isBuffer(req.body)?req.body.toString('utf8'):typeof req.body==='string'?req.body:JSON.stringify(req.body);
  else{const parts=[];let size=0;for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>14000)return reply(413,{error:'body_too_large'});parts.push(Buffer.from(chunk));}raw=Buffer.concat(parts).toString('utf8');}
  if(Buffer.byteLength(raw)>14000)return reply(413,{error:'body_too_large'});
  let body;try{body=JSON.parse(raw);}catch{return reply(400,{error:'invalid_json'});}
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['action','input'].includes(key))||!Object.hasOwn(subscriptions.FIELDS,body.action))return reply(400,{error:'invalid_subscription_request'});
  const input=body.input??{};
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!subscriptions.FIELDS[body.action].includes(key)))return reply(400,{error:'invalid_subscription_request'});
  const key=req.headers?.['idempotency-key'];
  if(body.action==='enroll'&&(typeof key!=='string'||!/^[A-Za-z0-9:_-]{8,128}$/.test(key)))return reply(400,{error:'idempotency_key_required'});
  const result=await subscriptions.call(body.action,input,req.headers.authorization.slice(7),body.action==='enroll'?key:undefined);
  return reply(result.status,result.body);
 }catch{return reply(503,{error:'subscription_unavailable'});}
};
