'use strict';
const {authenticateRequest}=require('../lib/auth');
const {createClient}=require('../lib/shared-budget');
module.exports=async function session(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
 const reply=(code,value)=>{res.statusCode=code;res.end(JSON.stringify({protocol:'ad-astra-customer-session/v1',...value}));};
 if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(405,{authenticated:false});}
 const host=String(req.headers?.host||'').toLowerCase();
 if(!['adastra.global',process.env.VERCEL_URL].includes(host)||req.headers?.origin!==`https://${host}`||req.headers?.['x-ad-astra-request']!=='public-v1')return reply(403,{authenticated:false});
 const auth=await authenticateRequest(req);
 if(!auth.ok)return reply(auth.status,{authenticated:false});
 try{const active=await createClient().verifySession(req.headers.authorization);return reply(active?200:401,{authenticated:active});}
 catch{return reply(503,{authenticated:false});}
};
