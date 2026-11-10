'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const catalog=require('../lib/model-catalog');
assert.equal(catalog.MODELS.length,1);
assert.deepEqual(catalog.MODELS.map(m=>m.id),['astra-lumen']);
assert.equal(catalog.MARKET_PROFILES.length,24);
assert.equal(new Set(catalog.MARKET_PROFILES.map(profile=>profile.id)).size,catalog.MARKET_PROFILES.length);
for(const profile of catalog.MARKET_PROFILES){assert.ok(/^Astra /.test(profile.name),`Market profile name missing Astra prefix: ${profile.id}`);}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
if(process.env.VERCEL_PROJECT_ID)assert.equal(process.env.VERCEL_PROJECT_ID,'prj_FX8QO3TIqUNAfFR4enz0bALmjeg1');
if(process.env.VERCEL_ORG_ID)assert.equal(process.env.VERCEL_ORG_ID,'team_5xblMPo2zEBjbz4KPmeDVHPr');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/release-manifest.json')));
const experience=JSON.parse(fs.readFileSync(path.join(root,'public/experience-manifest.json')));
const routeEvidence=JSON.parse(fs.readFileSync(path.join(root,'public/route-release-evidence.json')));
const approvedRoutes=routeEvidence.approvedRoutes;
const requiredRouteGates=['contentAndClaims','brandAndRights','seoTechnicalQa','accessibilityResponsiveQa','privacyAndAnalyticsQa','independentReview','humanReleaseAuthorization'];
assert.equal(routeEvidence.schema,'ad-astra-public-route-release-evidence/v1');
assert.equal(routeEvidence.releaseScope,'public-marketing-site-only');
assert.equal(routeEvidence.customerProductLaunchEnabled,false);
assert.deepEqual(routeEvidence.requiredRouteGates,requiredRouteGates);
assert.deepEqual(routeEvidence.availabilityClaims,{globalAvailability:false,approvedRegions:[]});
assert.deepEqual(routeEvidence.capabilityBoundary,{engineExecution:false,customerProductAccess:false,crmWrites:false,billing:false,outboundMessaging:false,paidAdvertising:false});
assert.equal(manifest.releaseScope,'public-marketing-site-only');
assert.equal(manifest.routeEvidenceFile,'route-release-evidence.json');
assert.equal(experience.releaseScope,'public-marketing-site-only');
assert.equal(experience.seo.routeEvidenceFile,'route-release-evidence.json');
assert.deepEqual(manifest.indexableRoutes,approvedRoutes,'Release indexable routes must equal evidence-approved routes');
assert.deepEqual(experience.seo.indexableRoutes,approvedRoutes,'Experience indexable routes must equal evidence-approved routes');
assert.equal(new Set(approvedRoutes).size,approvedRoutes.length,'Duplicate approved routes');
const approvedSet=new Set(approvedRoutes);
const routeRecords=new Map(routeEvidence.routes.map(record=>[record.path,record]));
assert.equal(routeRecords.size,routeEvidence.routes.length,'Duplicate route evidence records');
assert.deepEqual([...routeRecords.values()].filter(record=>record.decision==='approved').map(record=>record.path).sort(),[...approvedRoutes].sort(),'Approved route decisions must match approvedRoutes');
for(const route of approvedRoutes){
 assert.ok(/^\/(?:[a-z0-9-]+\/)*$/.test(route),`Invalid approved route: ${route}`);
 const record=routeRecords.get(route);
 assert.ok(record&&record.decision==='approved',`Approved route lacks an approved evidence record: ${route}`);
 for(const gate of requiredRouteGates)assert.ok(record.gates?.[gate]?.status==='accepted'&&typeof record.gates[gate].evidenceRef==='string'&&record.gates[gate].evidenceRef.length>0,`Approved route evidence missing ${gate}: ${route}`);
}
if(approvedRoutes.length){
 for(const key of ['googleSearchConsole','bingWebmaster'])assert.ok(routeEvidence.searchProperties[key]?.status==='verified'&&typeof routeEvidence.searchProperties[key].evidenceRef==='string'&&routeEvidence.searchProperties[key].evidenceRef.length>0,`Search property evidence missing: ${key}`);
}
const files=walk(path.join(root,'public'));
const htmlRoute=file=>{const rel=path.relative(path.join(root,'public'),file).replaceAll('\\','/');return rel==='index.html'?'/':'/'+rel.replace(/index\.html$/,'');};
const availableRoutes=new Set(files.filter(file=>file.endsWith('.html')).map(htmlRoute));
assert.deepEqual([...routeRecords.keys()].sort(),[...availableRoutes].sort(),'Every public HTML route must have an evidence record');
for(const route of approvedRoutes)assert.ok(availableRoutes.has(route),`Approved route does not exist: ${route}`);
for(const record of routeRecords.values()){
 const unresolved=requiredRouteGates.filter(gate=>record.gates?.[gate]?.status!=='accepted'||typeof record.gates[gate].evidenceRef!=='string'||record.gates[gate].evidenceRef.length===0);
 if(record.decision==='pending')assert.deepEqual(record.missingGates??unresolved,unresolved,`Pending route missing-gate list drifted: ${record.path}`);
}
for(const f of files){
 const rel=path.relative(path.join(root,'public'),f).replaceAll('\\','/');
 assert.ok(!/(catalog\.json|\.map$|\.env|\.git|ad-astra-cognitive|company-film|preview-v2\.mp4)/i.test(rel),rel);
 if(!/\.(html|js|css|json|txt|xml)$/.test(f))continue;
 const text=fs.readFileSync(f,'utf8');
 assert.ok(!/sk-proj-[A-Za-z0-9_-]{16}|SANITY_API_TOKEN|Bearer sk-|energy-america|ad-astra-cognitive|chatgpt\.site/i.test(text),'Public privacy scan: '+rel);
 if(rel.endsWith('.html')){
  const route=htmlRoute(f);
  const expectedRobots=approvedSet.has(route)?'index,follow':'noindex,follow';
  const canonicalTags=[...text.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/gi)];
  assert.equal(canonicalTags.length,1,rel+' must have exactly one canonical link');
  assert.equal(canonicalTags[0][1],'https://adastra.global'+route,rel+' canonical does not match its route');
  const robotsTags=[...text.matchAll(/<meta\s+name="robots"\s+content="([^"]+)"/gi)];
  assert.equal(robotsTags.length,1,rel+' must have exactly one robots directive');
  assert.equal(robotsTags[0][1],expectedRobots,rel+' robots policy does not match route evidence');
  assert.match(text,/<title>[^<]+<\/title>/i,rel+' missing title');
  assert.match(text,/<meta name="description" content="[^"]+"/i,rel+' missing description');
 }
}
const film=fs.readFileSync(path.join(root,'public/film/index.html'),'utf8');assert.ok(!/<video|<audio|<iframe/i.test(film));
const homepage=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
assert.ok(homepage.includes('src="/assets/brand/ad-astra-mark.svg"'),'Homepage must use the approved AD ASTRA orbital mark');
assert.ok(homepage.includes('class="brand-wordmark" aria-hidden="true">AD ASTRA</span>'),'Homepage must retain the semantic AD ASTRA wordmark');
assert.ok(fs.existsSync(path.join(root,'public/assets/brand/ad-astra-mark.svg')),'Missing first-party AD ASTRA orbital mark');
const visualManifest=JSON.parse(fs.readFileSync(path.join(root,'public/assets/visual-manifest.json')));
assert.ok(visualManifest.assets.some(asset=>asset.id==='ad-astra-orbital-mark'&&asset.path==='/assets/brand/ad-astra-mark.svg'),'Visual manifest must identify the deployed AD ASTRA orbital mark');
// The cinematic rebuild uses optional CSS motion, not autoplay video/audio.
// Caption assets remain checked for the archived motion studies, but the new
// homepage must not quietly reintroduce media, microphone or prompt execution.
assert.ok(!/<video|<audio|<iframe|<form\b/.test(homepage),'Homepage must stay a readable, non-executing story');
assert.ok(homepage.includes('data-motion-toggle')&&homepage.includes('/design-system.js'),'Ambient motion needs an explicit pause control');
for(const id of ['intelligence','vision','products','agi','global','beyond'])assert.ok(homepage.includes('/assets/story/'+id+'-1672.webp'),'Missing story chapter art: '+id);
assert.ok(homepage.includes('AGI is not achieved')&&homepage.includes('ASI is not achieved'),'Research boundaries missing');
for(const caption of ['ad-astra-runway-orbital-motion.vtt','ad-astra-horizon-motion.vtt']){const captionPath=path.join(root,'public/assets',caption);assert.ok(fs.existsSync(captionPath),`Missing caption track: ${caption}`);assert.ok(fs.readFileSync(captionPath,'utf8').startsWith('WEBVTT'),`Invalid caption track: ${caption}`);}
const sitemap=fs.readFileSync(path.join(root,'public/sitemap.xml'),'utf8');
const sitemapRoutes=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
const expectedSitemapRoutes=approvedRoutes.map(route=>'https://adastra.global'+route);
assert.deepEqual(sitemapRoutes,expectedSitemapRoutes,'Sitemap must exactly match evidence-approved routes');
const robots=fs.readFileSync(path.join(root,'public/robots.txt'),'utf8');assert.ok(robots.includes('Allow: /')&&robots.includes('Disallow: /api/')&&robots.includes('Sitemap: https://adastra.global/sitemap.xml'));
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'vercel.json'))).git.deploymentEnabled,false);
assert.equal(manifest.publicLaunchEnabled,false);assert.equal(manifest.engineAvailable,false);
assert.equal(manifest.customerPortal,'authenticated-preview');
assert.equal(manifest.customerAiModel,'astra-lumen');
assert.equal(manifest.connectedPublicModelCount,1);
assert.equal(manifest.publicModelName,'Astra Polaris');
assert.equal(manifest.indexingPolicy,'noindex-until-page-evidence-approved');
assert.equal(manifest.marketProfileArchitecture,'one-connected-model-with-sector-profiles');
assert.equal(manifest.marketProfileCount,catalog.MARKET_PROFILES.length);
assert.deepEqual(manifest.customerModes,['ask','research','create','learn','explore']);
assert.deepEqual(experience.visualArchitecture.sceneOrder,['arrival','vision','intelligence','products','future','global','beyond']);
assert.deepEqual(experience.visualArchitecture.palette,{navy:'#060b12',cyan:'#a8dbe3',violet:'#9a7cff',gold:'#d5ba91'});
assert.equal(experience.seo.indexingPolicy,'noindex-until-page-evidence-approved');
assert.equal(experience.seo.homepageRobots,approvedSet.has('/')?'index,follow':'noindex,follow');
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
const agent=fs.readFileSync(path.join(root,'public/agent/index.html'),'utf8');
assert.ok(agent.includes('Astra Polaris')&&agent.includes('Astra Sirius')&&agent.includes('Astra Orion')&&agent.includes('Astra Helios')&&agent.includes('Astra Spica')&&agent.includes('Astra Lyra')&&agent.includes('Astra Rigel')&&agent.includes('Astra Electra')&&agent.includes('Astra Arcturus'),'Public star profile catalog missing');
const preview=fs.readFileSync(path.join(root,'public/platform-preview/index.html'),'utf8');
assert.ok(preview.includes('CUSTOMER PLATFORM MOCKUP')&&preview.includes('Astra Polaris')&&preview.includes('PREVIEW BOUNDARY'),'Customer platform preview missing boundary');
assert.ok(preview.includes('no customer prompts')&&preview.includes('backend writes'),'Customer platform preview exposes an unsafe surface');
assert.ok(preview.includes('/assets/astra-polaris-platform-mockup.png')&&preview.includes('global network'),'Customer platform mockup visual missing');
for(const label of ['QUESTION STUDIO','RESEARCH ATLAS','CREATIVE ORBIT','LEARNING LENS','HORIZON SCANNER','PROJECT ORBIT','KNOWLEDGE ROOMS','SIGNAL MONITOR','PROFILE CONSTELLATIONS','GLOBAL NETWORK','ACCESS LAYER','GOVERNANCE DECK'])assert.ok(preview.includes(label),`Customer product missing: ${label}`);
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
console.log('AD_ASTRA_STATIC_RELEASE_PASS publicFiles='+files.length+' film=withheld indexing=none-until-evidence-approved privacy=passed');
