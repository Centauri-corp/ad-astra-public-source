'use strict';
// Bounded loopback-only read load. Never targets production or paid providers.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const origin='http://127.0.0.1:4175',routes=['/api/status','/api/models','/api/operating-status'];
const report={schema:'ad-astra-loopback-load/v1',observedAt:new Date().toISOString(),scope:'synthetic-loopback-read-only-not-production-capacity-certification',requests:600,concurrency:12,paidProviderCalls:0,latencies:[],errors:[]};
(async()=>{
 let cursor=0;const started=performance.now();
 await Promise.all(Array.from({length:report.concurrency},async()=>{
  while(cursor<report.requests){const n=cursor++,url=origin+routes[n%routes.length],start=performance.now();try{const r=await fetch(url,{signal:AbortSignal.timeout(3000)});const data=await r.json();assert.equal(r.status,200);if(url.endsWith('/api/status'))assert.equal(data.available,false);if(url.endsWith('/api/operating-status'))assert.equal(data.services.length,7);report.latencies.push(performance.now()-start);}catch(e){report.errors.push({request:n,error:e.message});}}
 }));
 report.durationMs=Math.round(performance.now()-started);report.latencies.sort((a,b)=>a-b);report.p50Ms=report.latencies[Math.floor(report.latencies.length*.5)];report.p95Ms=report.latencies[Math.floor(report.latencies.length*.95)];report.maxMs=report.latencies.at(-1);delete report.latencies;
 const checks=[{method:'GET',path:'/api/ask',expected:405},{method:'POST',path:'/api/ask',expected:403,headers:{'content-type':'application/json'},body:'{}'},{method:'POST',path:'/api/session',expected:403,body:'{}'}];
 report.protectedApiDenials=[];for(const check of checks){const r=await fetch(origin+check.path,{method:check.method,headers:check.headers,body:check.body});report.protectedApiDenials.push({path:check.path,method:check.method,status:r.status,expected:check.expected});}
 report.pass=report.errors.length===0&&report.p95Ms<=500&&report.protectedApiDenials.every(c=>c.status===c.expected);
 const dir=path.join(__dirname,'../LStra/evidence');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'loopback-load.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
})();
