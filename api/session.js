'use strict';
const {authenticateRequest}=require('../lib/auth');
module.exports=async function session(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
 const reply=(code,value)=>{res.statusCode=code;res.end(JSON.stringify(value));};
 if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(405,{authenticated:false});}
 const host=String(req.headers?.host||'').toLowerCase();
 if(!['adastra.global',process.env.VERCEL_URL].includes(host)||req.headers?.origin!==`https://${host}`||req.headers?.['x-ad-astra-request']!=='public-v1')return reply(403,{authenticated:false});
 const auth=await authenticateRequest(req);
 return reply(auth.ok?200:auth.status,{authenticated:auth.ok});
};
