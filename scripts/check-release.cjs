'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const catalog=require('../lib/model-catalog');
assert.equal(catalog.MODELS.length,1);
assert.deepEqual(catalog.MODELS.map(m=>m.id),['astra-lumen']);
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
const homepage=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
assert.ok(!/private|audit|CRM|operations|customer workspace|external writes/i.test(homepage),'Public homepage exposes internal operations');
assert.ok(homepage.includes('Astra Lumen'),'Public homepage missing connected model identity');
const homepageStyle=fs.readFileSync(path.join(root,'public/style.css'),'utf8');
assert.ok(/@media\(max-width:640px\)/.test(homepageStyle),'Homepage missing mobile breakpoint');
assert.ok(/@media\(prefers-reduced-motion:reduce\)/.test(homepageStyle),'Homepage missing reduced-motion fallback');
const agent=fs.readFileSync(path.join(root,'public/agent/index.html'),'utf8');
const agentJs=fs.readFileSync(path.join(root,'public/markets/agent.js'),'utf8');
assert.ok(agent.includes('id="concierge-form"')&&agent.includes('Public preview · local only'),'Public model preview missing');
assert.ok(agentJs.includes('Audio stays in this browser')||agent.includes('does not send prompts anywhere'),'Public preview disclosure missing');
assert.ok(!/fetch\s*\(/i.test(agentJs),'Public preview must remain local-only');
assert.doesNotThrow(()=>new Function(agentJs),'Public preview script syntax invalid');
assert.ok(agent.includes('name="concierge-mode"')&&agent.includes('value="ask"')&&agent.includes('value="learn"'),'Public preview modes missing');
assert.ok(agentJs.includes('selectedMode')&&agentJs.includes('dataset.state'),'Public preview state wiring missing');

const homepageVideos=homepage.match(/<video\b[^>]*>/gi)||[];
assert.ok(homepageVideos.length>=1,'Homepage motion visuals missing');
for(const tag of homepageVideos){
 assert.ok(/class="[^"]*motion-video/.test(tag),'Homepage video missing motion-video class');
 assert.ok(/poster="/.test(tag),'Homepage video missing poster fallback');
 assert.ok(/muted/.test(tag)&&/playsinline/.test(tag),'Homepage video must be silent and inline');
}
assert.ok(homepage.includes('class="motion"')&&homepage.includes('Pause motion'),'Homepage motion control missing');

const film=fs.readFileSync(path.join(root,'public/film/index.html'),'utf8');assert.ok(!/<video|<audio|<iframe/i.test(film));
const sitemap=fs.readFileSync(path.join(root,'public/sitemap.xml'),'utf8');assert.equal((sitemap.match(/<loc>/g)||[]).length,1);assert.ok(sitemap.includes('<loc>https://adastra.global/</loc>'));
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'vercel.json'))).git.deploymentEnabled,false);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/release-manifest.json')));
const experience=JSON.parse(fs.readFileSync(path.join(root,'public/experience-manifest.json')));
assert.equal(manifest.publicLaunchEnabled,false);assert.equal(manifest.engineAvailable,false);
assert.equal(manifest.customerPortal,'authenticated-preview');
assert.equal(manifest.customerAiModel,'astra-lumen');
assert.equal(manifest.connectedPublicModelCount,1);
assert.deepEqual(manifest.customerModes,['ask','research','create','learn','explore']);
assert.deepEqual(experience.visualArchitecture.sceneOrder,['arrival','vision','approach','experiences','horizon','company','signature']);
assert.deepEqual(experience.seo.indexableRoutes,['/']);
assert.equal(experience.visualArchitecture.threeD.privatePreviewOnly,true);
assert.equal(experience.growthAutomation.externalCrmWrites,false);
assert.equal(experience.growthAutomation.outboundSends,false);
assert.equal(experience.growthAutomation.mode,'private-scheduled-read-only-audit');
assert.equal(manifest.autonomousOperations.mode,experience.growthAutomation.mode);
assert.equal(manifest.autonomousOperations.cadence,experience.growthAutomation.cadence);
assert.equal(manifest.autonomousOperations.externalWrites,false);
assert.equal(manifest.autonomousOperations.outboundSends,false);
assert.equal(manifest.autonomousOperations.automaticPublication,false);
const markets=fs.readFileSync(path.join(root,'public/markets/index.html'),'utf8');
const positioning=fs.readFileSync(path.join(root,'public/markets/positioning/index.html'),'utf8');
const microgrids=fs.readFileSync(path.join(root,'public/markets/positioning/microgrids/index.html'),'utf8');
const pricing=fs.readFileSync(path.join(root,'public/pricing/index.html'),'utf8');
assert.ok(markets.includes('/markets/positioning/'));
assert.ok(!markets.includes('Use the live engine today')&&!markets.includes('Available now / first customer surfaces'));
assert.ok(positioning.includes('name="robots" content="noindex,follow"'));
for(const region of ['NORTH AMERICA','EUROPE + UK','MATURE APAC','EMERGING MARKETS'])assert.ok(positioning.includes(region));
assert.ok(positioning.includes('not available for purchase')||positioning.includes('not for sale'));
assert.ok(microgrids.includes('name="robots" content="noindex,follow"'));
for(const region of ['NORTH AMERICA','EUROPE + UK','MATURE APAC','EMERGING MARKETS'])assert.ok(microgrids.includes(region));
assert.ok(microgrids.includes('No autonomous energy dispatch')&&microgrids.includes('No yield or bill reduction is promised'));
assert.ok(microgrids.includes('48-hour deployment or zero utility hookup cannot be assumed'));
assert.ok(microgrids.includes('Project financing and hardware availability have not been independently verified'));
assert.ok(microgrids.includes('20FT / TACTICAL MICRO-POD')&&microgrids.includes('40FT / STRATEGIC NODE'));
assert.ok(microgrids.includes('Neither footprint bypasses municipal permission'));
assert.ok(microgrids.includes('selenium interlayer')&&microgrids.includes('pressure-vessel safety case'));
assert.ok(pricing.includes('For individuals')&&pricing.includes('For organizations')&&pricing.includes('No payment is requested'));
console.log('AD_ASTRA_STATIC_RELEASE_PASS publicFiles='+files.length+' film=withheld indexing=home-only privacy=passed');
