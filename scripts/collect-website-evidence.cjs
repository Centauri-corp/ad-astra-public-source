'use strict';
// Fixed public routes, GET only, no cookies, credentials or customer data.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.join(__dirname,'..');
const commit=cp.execFileSync('git',['rev-parse','--verify','HEAD^{commit}'],{cwd:root,encoding:'utf8'}).trim();
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const routes=['/','/products/','/status/','/api/operating-status','/api/status','/robots.txt','/sitemap.xml'];
const report={schema:'ad-astra-live-website-observation/v1',observedAt:new Date().toISOString(),origin:'https://adastra.global',comparisonCommit:commit,purpose:'read-only-observation-not-release-acceptance',routes:[]};
for(const route of routes){
  try {
    const raw=cp.execFileSync('curl',['--silent','--show-error','--max-time','20','--max-redirs','0','--write-out','\n__HTTP_STATUS__:%{http_code}','https://adastra.global'+route],{encoding:'utf8',maxBuffer:2*1024*1024});
    const marker=raw.lastIndexOf('\n__HTTP_STATUS__:');
    if(marker<0)throw new Error('response status unavailable');
    const body=raw.slice(0,marker),status=Number(raw.slice(marker+17));
    const record={path:route,status,sha256:sha(body)};
    if(route.endsWith('/')){
      const file='public'+(route==='/'?'/index.html':route+'index.html');
      try {record.matchesComparisonCommit=sha(cp.execFileSync('git',['show',`${commit}:${file}`],{cwd:root}))===record.sha256;}catch{record.matchesComparisonCommit=false;}
      record.title=body.match(/<title>([^<]+)<\/title>/i)?.[1]??null;
      record.canonical=body.match(/<link rel="canonical" href="([^"]+)"/i)?.[1]??null;
      record.robots=body.match(/<meta name="robots" content="([^"]+)"/i)?.[1]??null;
    } else if(route==='/api/operating-status'){
      const payload=JSON.parse(body);record.schema=payload.schema;record.services=(payload.services??[]).map(s=>({id:s.id,state:s.state}));
    } else if(route==='/api/status')record.engineAvailable=JSON.parse(body).available===true;
    else if(route==='/sitemap.xml')record.locations=[...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
    report.routes.push(record);
  } catch(error){report.routes.push({path:route,status:null,error:'Public read failed; retry this route before accepting evidence.'});}
}
const directory=path.join(root,'LStra/evidence');fs.mkdirSync(directory,{recursive:true});
const file=path.join(directory,`website-${report.observedAt.replace(/[:.]/g,'-')}.json`);
fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({file,comparisonCommit:commit,routes:report.routes.map(r=>({path:r.path,status:r.status,sourceMatch:r.matchesComparisonCommit})),productionAcceptance:false},null,2));
if(report.routes.some(r=>r.status!==200))process.exitCode=2;
