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
  if(rel!=='index.html')assert.ok(/name="robots" content="noindex,follow"/.test(text),rel+' missing noindex');
 }
}
const film=fs.readFileSync(path.join(root,'public/film/index.html'),'utf8');assert.ok(!/<video|<audio|<iframe/i.test(film));
const sitemap=fs.readFileSync(path.join(root,'public/sitemap.xml'),'utf8');assert.equal((sitemap.match(/<loc>/g)||[]).length,1);assert.ok(sitemap.includes('<loc>https://adastra.global/</loc>'));
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'vercel.json'))).git.deploymentEnabled,false);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/release-manifest.json')));
const experience=JSON.parse(fs.readFileSync(path.join(root,'public/experience-manifest.json')));
assert.equal(manifest.publicLaunchEnabled,false);assert.equal(manifest.engineAvailable,false);
assert.equal(manifest.customerPortal,'authenticated-preview');
assert.equal(manifest.customerAiModel,'gpt-4.1-mini-2025-04-14');
assert.deepEqual(manifest.customerModes,['ask','research','create','learn','explore']);
assert.deepEqual(experience.visualArchitecture.sceneOrder,['arrival','vision','approach','experiences','horizon','company','signature']);
assert.deepEqual(experience.seo.indexableRoutes,['/']);
assert.equal(experience.visualArchitecture.threeD.privatePreviewOnly,true);
assert.equal(experience.growthAutomation.externalCrmWrites,false);
assert.equal(experience.growthAutomation.outboundSends,false);
console.log('AD_ASTRA_STATIC_RELEASE_PASS publicFiles='+files.length+' film=withheld indexing=home-only privacy=passed');
