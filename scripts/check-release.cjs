'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
if(process.env.VERCEL_PROJECT_ID)assert.equal(process.env.VERCEL_PROJECT_ID,'prj_FX8QO3TIqUNAfFR4enz0bALmjeg1');
if(process.env.VERCEL_ORG_ID)assert.equal(process.env.VERCEL_ORG_ID,'team_5xblMPo2zEBjbz4KPmeDVHPr');
const files=walk(path.join(root,'public'));
for(const f of files){
 const rel=path.relative(path.join(root,'public'),f).replaceAll('\\','/');
 assert.ok(!/(catalog\.json|\.map$|\.env|\.git|ad-astra-cognitive|company-film|preview-v2\.mp4)/i.test(rel),rel);
 if(!/\.(html|js|css|json|txt|xml)$/.test(f))continue;
 const text=fs.readFileSync(f,'utf8');
 assert.ok(!/sk-proj-[A-Za-z0-9_-]{16}|SANITY_API_TOKEN|Bearer sk-|energy-america|ad-astra-cognitive|chatgpt\.site/i.test(text),'Public privacy scan: '+rel);
 if(rel.endsWith('.html')){
  assert.ok(text.includes('rel="canonical"'),rel+' missing canonical');
  if(['index.html','company/index.html'].includes(rel))assert.ok(/name="robots" content="index,follow"/.test(text),rel+' missing index'); else assert.ok(/name="robots" content="noindex,follow"/.test(text),rel+' missing noindex');
 }
}
const film=fs.readFileSync(path.join(root,'public/film/index.html'),'utf8');assert.ok(!/<video|<audio|<iframe/i.test(film));
const sitemap=fs.readFileSync(path.join(root,'public/sitemap.xml'),'utf8');assert.equal((sitemap.match(/<loc>/g)||[]).length,2);for(const route of ['','company/'])assert.ok(sitemap.includes('<loc>https://adastra.global/'+route+'</loc>'));
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'vercel.json'))).git.deploymentEnabled,false);

for(const route of ['privacy','terms','contact','security','trust']){
 const file=path.join(root,'public',route,'index.html');
 assert.ok(fs.existsSync(file),'Missing customer trust page: '+route);
 const content=fs.readFileSync(file,'utf8');
 assert.match(content,/noindex,follow/,'Unreviewed trust page must remain noindex: '+route);
}
const markets=fs.readFileSync(path.join(root,'public/markets/index.html'),'utf8');
assert.doesNotMatch(markets,/Use the live engine today|general modes available now/i);
assert.match(markets,/AI responses are paused pending release checks/i);
const knowledge=fs.readFileSync(path.join(root,'public/knowledge/index.html'),'utf8');
assert.match(knowledge,/Interactive AI responses are paused pending release checks/i);
const homepage=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
assert.doesNotMatch(homepage,/Open the live engine/i);
assert.match(homepage,/PLATFORM — COMING SOON/,'Public header must not suggest unrestricted platform availability');
assert.doesNotMatch(homepage,/>\s*OPEN PLATFORM\s*</i,'Public CTA must not claim general availability');
assert.match(homepage,/id="neural-intelligence"/,'Neural architecture preview must be present');
assert.match(homepage,/Neural Intelligence OS — private development/,'Neural preview must disclose private status');
assert.doesNotMatch(homepage,/Neural Intelligence OS — live now/i,'Neural preview must never claim production access');
assert.match(homepage,/class="neural-original-master"/,'Approved original master must be shown');
assert.match(homepage,/443f89273eb4071329cac3fa151d2674b37e6eaf-1672x941\\.png/,'Original image checksum-derived asset URL must match');
assert.equal((homepage.match(/data-neural-state="/g)||[]).length,6,'All six original state selectors required');
assert.doesNotMatch(homepage,/Neural Intelligence OS — live now/i,'Artwork must not imply active AI');
const vercel=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
assert.match(vercel.headers[0].headers.find(h=>h.key==='Content-Security-Policy').value,/img-src[^;]*https:\\/\\/cdn\\.sanity\\.io/,'Approved Sanity image must be permitted by CSP');
console.log('AD_ASTRA_STATIC_RELEASE_PASS publicFiles='+files.length+' film=withheld indexing=home-and-company privacy=passed');
