'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const projectRoot=path.resolve(__dirname,'../..');
const read=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
function loadProject(root=projectRoot){
 const directory='projects/website-customer-experience/';
 return {root,project:read(root,directory+'project.json'),standard:read(root,directory+'visual-standard.json'),selection:read(root,directory+'asset-selections.json'),review:read(root,directory+'visual-review.json')};
}
function pageGroupFor(route,project=loadProject().project){
 const exact=project.pageGroups.find(group=>group.paths?.includes(route));
 const match=exact||project.pageGroups.find(group=>group.prefix&&route.startsWith(group.prefix));
 assert.ok(match,'Unassigned website route: '+route);return match;
}
function primaryAsset(route,context=loadProject()){
 const group=pageGroupFor(route,context.project);
 const id=group.families==='from-route'?context.selection.familyAssets[route.split('/')[2]]:group.primaryAsset;
 const selected=id?context.selection.assets.find(asset=>asset.id===id):null;
 assert.ok(!id||selected,'Unregistered primary asset: '+id);return selected;
}
function reconcileVisualAssets(html,route){
 const context=loadProject(),selected=primaryAsset(route,context);
 if(!selected)return html;
 // Only archival image tags change. Forms, scripts, auth guards and page text stay intact.
 return html.replace(/<img\b[^>]*>/g,tag=>{
  const src=tag.match(/\bsrc="([^"]+)"/)?.[1];
  if(!context.selection.legacyPrimaryAssets.includes(src))return tag;
  return tag.replace(/\bsrc="[^"]+"/,'src="'+selected.src+'"').replace(/\balt="[^"]*"/,'alt="'+selected.alt.replaceAll('&','&amp;').replaceAll('"','&quot;')+'"');
 });
}
function projectFiles(root=projectRoot){
 const c=loadProject(root),{standard,selection}=c,colors=standard.tokens;
 const graphics=read(root,'config/public-graphics-alignment.json');
 graphics.projectAuthority='projects/website-customer-experience/project.json';
 graphics.brand.palette={...colors};
 graphics.brand.paletteSource='projects/website-customer-experience/visual-standard.json#tokens';
 const neural=selection.assets.find(a=>a.id==='neural-core');
 Object.assign(graphics.pageGroups.homepage,{hero:neural.src,motionPoster:neural.src,neuralStudy:neural.src,mobileNeuralStudy:neural.mobile,status:'cinematic customer experience candidate; consolidated owner visual review pending'});
 Object.assign(graphics.pageGroups.platformPreview,{hero:neural.src,neuralCard:neural.src,status:'interactive local sample workspace; no live model session or customer data'});
 graphics.pageGroups.modelAndMarkets.primaryArt=neural.src;
 graphics.pageGroups.modelAndMarkets.status='selected neural/company/global story imagery by project route group; availability remains governed';
 const architecture=read(root,'config/public-visual-architecture.json');
 architecture.tokens={...colors};architecture.projectAuthority=graphics.projectAuthority;
 const experience=read(root,'public/experience-manifest.json');
 experience.websiteProject='projects/website-customer-experience/project.json';
 experience.visualArchitecture.palette={navy:colors.background,cyan:colors.cyan,violet:colors.violet,gold:colors.champagne};
 experience.visualArchitecture.signatureAsset=neural.src;
 const manifest=read(root,'public/assets/visual-manifest.json');
 manifest.activeSelection={authority:'projects/website-customer-experience/asset-selections.json',signatureAsset:neural.src,review:'pending-consolidated-visual-review'};
 manifest.purpose='Ad Astra visual resource archive and active project selection; archived candidates are not current homepage instructions';
 manifest.assets=manifest.assets.filter(asset=>asset.id!=='ad-astra-neural-spiral');
 for(const asset of manifest.assets)if(selection.legacyPrimaryAssets.includes(asset.path))asset.lifecycle='archived-primary-candidate';
 manifest.assets.push({id:'ad-astra-neural-spiral',path:neural.src,role:neural.role,kind:'image',provenanceManifest:'/assets/experience/manifest.json',reviewStatus:'candidate',alt:neural.alt});
 const css='/* Generated from the dedicated website visual standard. */\n:root{'+Object.entries(colors).map(([name,value])=>'--cx-'+name+':'+value).join(';')+';--space:var(--cx-background);--surface:var(--cx-surface);--text:var(--cx-text);--subtle:var(--cx-muted);--ice:var(--cx-cyan);--champagne:var(--cx-champagne)}\n';
 return new Map([
  ['config/public-graphics-alignment.json',json(graphics)],['config/public-visual-architecture.json',json(architecture)],
  ['public/experience-manifest.json',json(experience)],['public/assets/visual-manifest.json',json(manifest)],
  ['public/assets/brand/experience-tokens.css',css]
 ]);
}
function projectCoverage(root=projectRoot){
 const c=loadProject(root),ledger=read(root,c.project.sourceOfTruth.routeLedger),families=read(root,c.project.sourceOfTruth.productFamilies).families;
 const resources=read(root,c.project.sourceOfTruth.resources);
 assert.equal(resources.schema,'ad-astra-website-resources/v1');
 assert.equal(new Set(resources.sources.map(s=>s.id)).size,resources.sources.length,'Duplicate resource authority');
 for(const source of resources.sources){
  assert.ok(source.status&&source.selectionStatus&&source.rightsStatus&&source.nextAction,'Incomplete resource status: '+source.id);
  if(source.url){const url=new URL(source.url);assert.equal(url.protocol,'https:');assert.ok(!url.username&&!url.password&&!/[?&](?:token|key|signature|profile_setup_handoff)=/i.test(source.url),'Credential-bearing resource link');}
 }
 assert.equal(c.project.company,'Ad Astra');
 assert.equal(c.project.sourceOfTruth.repository,read(root,c.project.sourceOfTruth.releasePolicy).repository);
 assert.equal(new Set(c.selection.assets.map(a=>a.id)).size,c.selection.assets.length,'Duplicate visual selection');
 for(const file of Object.values(c.project.sourceOfTruth).filter(v=>typeof v==='string'&&/\.(?:json|js)$/.test(v)))assert.ok(fs.existsSync(path.join(root,file)),'Missing authoritative source: '+file);
 for(const contract of c.project.backendContracts)assert.ok(fs.existsSync(path.join(root,contract.source)),contract.source);
 return ledger.routes.map(({path:route,decision})=>{
  const group=pageGroupFor(route,c.project),asset=primaryAsset(route,c),file='public'+(route==='/'?'/index.html':route+'index.html');
  const html=fs.readFileSync(path.join(root,file),'utf8');
  const familyIds=group.families==='from-route'?[route.split('/')[2]]:families.map(f=>f.id);
  for(const id of familyIds)assert.ok(families.some(f=>f.id===id),'Unknown route product family: '+id);
  assert.ok(html.includes('href="/assets/brand/experience-tokens.css"'),'Missing governed tokens: '+route);
  const legacy=c.selection.legacyPrimaryAssets.filter(src=>new RegExp('<img\\b[^>]*src="'+src.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'"').test(html));
  assert.deepEqual(legacy,[],'Retired primary artwork on '+route);
  if(asset)assert.ok(html.includes(asset.src),'Selected page artwork drift: '+route);
  return {route,source:file,sourceSha256:digest(html),group:group.id,journey:group.journey,productFamilies:familyIds,primaryAsset:asset?.id??null,indexingDecision:decision,visualReview:'pending-human-review',backendAcceptance:'separate-protected-release-evidence'};
 });
}
async function assetQuality(root=projectRoot){
 const sharp=require('sharp'),c=loadProject(root),result=[];
 for(const asset of c.selection.assets){
  const variants=[];
  for(const [use,src]of [['desktop',asset.src],['mobile',asset.mobile]]){
   if(!src)continue;
   assert.ok(src.startsWith('/assets/')&&!src.includes('..'),'Invalid selected asset path');
   const bytes=fs.readFileSync(path.join(root,'public',src));
   const item={use,src,bytes:bytes.length,sha256:digest(bytes)};
   if(asset.kind==='raster'){
    const meta=await sharp(bytes).metadata();Object.assign(item,{width:meta.width,height:meta.height,format:meta.format});
    const min=use==='desktop'?c.standard.delivery.desktopHeroMinimumWidth:c.standard.delivery.mobileMinimumWidth;
    assert.ok(meta.width>=min,'Selected export below minimum width: '+src);
    const max=asset.id==='neural-core'?c.standard.delivery.heroExportMaxBytes:c.standard.delivery.secondaryExportMaxBytes;
    assert.ok(bytes.length<=max,'Selected export exceeds delivery budget: '+src);
    assert.ok(c.standard.delivery.rasterFormats.includes(meta.format),'Unsupported raster delivery: '+src);
    const manifest=read(root,asset.manifest),entries=manifest.exports??manifest.assets?.flatMap(a=>a.exports??[])??[];
    const evidence=entries.find(e=>e.path===src||'/'+e.path===src);
    assert.ok(evidence&&evidence.sha256===item.sha256,'Provenance hash mismatch: '+src);
   }
   variants.push(item);
  }
  result.push({id:asset.id,role:asset.role,manifest:asset.manifest,variants,visualDecision:'pending',masterTargetWidth:c.standard.delivery.desktopMasterTargetWidth,masterTargetStatus:asset.kind==='vector'?'not-applicable':'requires-source-master-review',rights:'requires-consolidated-rights-review'});
 }
 return result;
}
function visualAcceptance({review,standard,fingerprint,routes,assets}){
 const missing=[];
 if(review.decision!=='approved')missing.push('Owner visual review of the complete bundle');
 if(review.scopeFingerprint!==fingerprint)missing.push('Visual review bound to the current website fingerprint');
 if(review.reviewerId!=='zoheb-khan'||!Number.isFinite(Date.parse(review.reviewedAt))||!review.evidenceRef)missing.push('Actual reviewer, date and review evidence');
 for(const criterion of standard.visualAcceptance.criteria){const score=review.scores[criterion];if(!Number.isInteger(score)||score<standard.visualAcceptance.minimumEachScore||score>standard.visualAcceptance.scaleMax)missing.push('Visual criterion: '+criterion);}
 if(new Set(review.routeCoverage).size!==routes.length||routes.some(route=>!review.routeCoverage.includes(route)))missing.push('Desktop and mobile review of every current route');
 for(const asset of assets){const entry=review.assetRights.find(r=>r.assetId===asset.id);if(entry?.decision!=='approved'||!entry.evidenceRef)missing.push('Selected asset rights: '+asset.id);}
 return {ready:missing.length===0,decision:review.decision,missing,scopeFingerprint:fingerprint};
}
async function projectReport(root=projectRoot){
 const c=loadProject(root),pages=projectCoverage(root),assets=await assetQuality(root),fingerprint=read(root,'config/website-source-integrity.json').fingerprint;
 const {modelExperienceReport}=require('./website-model-alignment.cjs');
 const models=modelExperienceReport(root);
 const visual=visualAcceptance({...c,fingerprint,routes:pages.map(p=>p.route),assets});
 if(visual.ready)for(const page of pages)page.visualReview='approved-current-fingerprint';
 const resources=read(root,c.project.sourceOfTruth.resources);
 const routeSet=new Set(pages.map(p=>p.route));
 const experienceCoverage=c.project.completeExperienceRequirements.map(group=>({id:group.id,existing:group.routes.filter(route=>routeSet.has(route)),missing:group.routes.filter(route=>!routeSet.has(route)),note:'Presence does not establish content acceptance or functioning customer services.'}));
 return {schema:'ad-astra-website-project-report/v1',project:c.project.name,sourceOfTruth:c.project.sourceOfTruth,sourceFingerprint:fingerprint,pages,assets,models,experienceCoverage,resources:{count:resources.sources.length,providers:[...new Set(resources.sources.map(s=>s.provider))],accessPolicyConflicts:resources.sources.filter(s=>s.status==='fresh-acl-conflicts-with-stored-private-policy').map(s=>s.id)},visualAcceptance:visual,productionAcceptance:'Separate exact-candidate release and authenticated provider acceptance remain required.'};
}
module.exports={loadProject,pageGroupFor,primaryAsset,reconcileVisualAssets,projectFiles,projectCoverage,assetQuality,visualAcceptance,projectReport};
