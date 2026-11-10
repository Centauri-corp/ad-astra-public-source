'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),pub=path.join(root,'public');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files=walk(pub).filter(file=>file.endsWith('/index.html'));
const routeFor=file=>'/'+path.relative(pub,file).replaceAll('\\','/').replace(/index\.html$/,'');
const text=s=>s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const source=files.map(file=>({file,route:routeFor(file),html:fs.readFileSync(file,'utf8')}));
const sourceByRoute=new Map(source.map(p=>[p.route,p]));
const report={schema:'ad-astra-page-by-page-audit/v1',observedAt:new Date().toISOString(),comparisonCommit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),scope:'public-pages-and-source-contracts-only',pages:[]};
for(const item of source){
  const localLinks=[...item.html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m=>({href:m[1],label:text(m[2])}));
  const badLinks=[];
  for(const link of localLinks){
    if(/^(https?:|mailto:|tel:)/.test(link.href))continue;
    try{const url=new URL(link.href,'https://adastra.global'+item.route),target=sourceByRoute.get(url.pathname);if(url.hash&&target&&!target.html.includes(`id="${url.hash.slice(1)}"`))badLinks.push({href:link.href,reason:'missing-source-anchor'});else if(!target&&!fs.existsSync(path.join(pub,url.pathname)))badLinks.push({href:link.href,reason:'missing-source-target'});}catch{badLinks.push({href:link.href,reason:'invalid-link'});}
  }
  const record={path:item.route,title:item.html.match(/<title>([^<]+)<\/title>/i)?.[1]??null,h1Count:(item.html.match(/<h1\b/gi)||[]).length,canonical:item.html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1]??null,robots:item.html.match(/<meta name="robots" content="([^"]+)"/i)?.[1]??null,linksToProducts:localLinks.some(l=>l.href.startsWith('/products/')),linksToAvailability:localLinks.some(l=>l.href==='/status/'),brokenSourceLinks:badLinks,visibleLegacyModelName:/Astra Lumen|ASTRA LUMEN/.test(item.html.replace(/<[^>]*>/g,'')),sourceSha256:hash(item.html),live:null};
  try{const raw=cp.execFileSync('curl',['--silent','--show-error','--max-time','15','--write-out','\n__HTTP_STATUS__:%{http_code}','https://adastra.global'+item.route],{encoding:'utf8',maxBuffer:2*1024*1024});const marker=raw.lastIndexOf('\n__HTTP_STATUS__:');if(marker<0)throw Error('Missing HTTP status');const body=raw.slice(0,marker);record.live={status:Number(raw.slice(marker+17)),sha256:hash(body),matchesWorkingSource:body===item.html};}catch{record.live={status:null,error:'Public page request failed'};}
  report.pages.push(record);
}
report.summary={pages:report.pages.length,reachable:report.pages.filter(p=>p.live.status===200).length,redirected:report.pages.filter(p=>p.live.status>=300&&p.live.status<400).length,sourceMatches:report.pages.filter(p=>p.live.matchesWorkingSource).length,brokenSourceLinks:report.pages.reduce((n,p)=>n+p.brokenSourceLinks.length,0),pagesWithoutProductLink:report.pages.filter(p=>!p.linksToProducts).length,pagesWithoutAvailabilityLink:report.pages.filter(p=>!p.linksToAvailability).length};
const dir=path.join(root,'LStra/evidence');fs.mkdirSync(dir,{recursive:true});const basename='page-audit-'+report.observedAt.replace(/[:.]/g,'-');fs.writeFileSync(path.join(dir,basename+'.json'),JSON.stringify(report,null,2)+'\n');
const lines=['# AD ASTRA page-by-page website audit','',`Observed: ${report.observedAt}. Source comparison: ${report.comparisonCommit}. GET-only public checks; no customer records accessed.`,'','| Page | HTTP | H1s | Products link | Availability link | Broken source links | Live matches working source |','| --- | --- | --- | --- | --- | --- | --- |',...report.pages.map(p=>`| ${p.path} | ${p.live.status??'unavailable'} | ${p.h1Count} | ${p.linksToProducts?'yes':'missing'} | ${p.linksToAvailability?'yes':'missing'} | ${p.brokenSourceLinks.length} | ${p.live.matchesWorkingSource?'yes':'no'} |`),'','The audit reports observations. Redirected customer routes are intentional release boundaries; a source mismatch after coding does not by itself indicate production drift. Missing approvals, commercial evidence and working customer functions are evaluated separately.'];fs.writeFileSync(path.join(dir,basename+'.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({evidence:path.join(dir,basename+'.json'),summary:report.summary,brokenLinks:report.pages.flatMap(p=>p.brokenSourceLinks.map(link=>({page:p.path,...link})))},null,2));
