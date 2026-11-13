'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const projectRoot=path.resolve(__dirname,'../..');
const read=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
const shaPattern=/^[a-f0-9]{64}$/;
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=value=>typeof value==='string'&&value.trim()===value&&value.length>0;
function fields(value,required,optional=[],label='record'){
 assert.ok(plain(value),label+' must be an object');
 assert.ok(required.every(key=>Object.hasOwn(value,key))&&Object.keys(value).every(key=>[...required,...optional].includes(key)),'Invalid '+label+' fields');
}
function localFile(root,relative){
 assert.ok(text(relative)&&!path.isAbsolute(relative)&&!relative.includes('\\')&&!relative.split('/').some(part=>part==='..'||part==='.'||!part),'Invalid relative file reference');
 const base=path.resolve(root),file=path.resolve(base,relative);
 assert.ok(file.startsWith(base+path.sep),'File outside evidence/source root');
 let current=base;
 for(const part of relative.split('/')){current=path.join(current,part);assert.ok(!fs.lstatSync(current).isSymbolicLink(),'Symlink in file reference');}
 assert.ok(fs.statSync(file).isFile(),'File reference is not a file');return file;
}
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
 assert.ok(group.families!=='from-route'||id,'Missing family artwork mapping: '+route);
 assert.ok(!id||selected,'Unregistered primary asset: '+id);return selected;
}
function assetExport(asset,src,context){
 const manifest=read(context.root,asset.manifest);
 const entries=manifest.exports??manifest.assets?.flatMap(a=>a.exports??[])??[];
 const entry=entries.find(e=>e.path===src||'/'+e.path===src);
 if(!entry)return null;
 const source=manifest.source??manifest.assets?.find(a=>(a.exports??[]).some(e=>e.path===entry.path))?.source;
 // Older neural derivatives record width only. Infer the layout ratio from the
 // recorded master; assetQuality separately decodes the actual export pixels.
 return {...entry,height:entry.height??(source?.width&&source?.height?Math.round(entry.width*source.height/source.width):undefined)};
}
function assetPicture(id,{cls='',hero=false,primary=false,imgId='',decorative=false,sizes='100vw',fit}={},context=loadProject()){
 const asset=context.selection.assets.find(a=>a.id===id);assert.ok(asset,'Unregistered picture: '+id);
 const desktop=assetExport(asset,asset.src,context),mobile=asset.mobile&&assetExport(asset,asset.mobile,context);
 assert.ok(desktop&&desktop.width&&desktop.height,'Raster picture needs recorded dimensions: '+id);
 const exports=[mobile,desktop].filter(Boolean).filter((entry,index,all)=>all.findIndex(e=>e.path===entry.path)===index).sort((a,b)=>a.width-b.width);
 const srcset=exports.map(e=>esc(e.path.startsWith('/')?e.path:'/'+e.path)+' '+e.width+'w').join(', ');
 assert.ok(fit===undefined||['contain','cover'].includes(fit),'Invalid image fit');
 return '<picture'+(cls?' class="'+esc(cls)+'"':'')+(primary?' data-primary-art="'+esc(id)+'"':'')+'><source type="image/'+(asset.src.endsWith('.avif')?'avif':'webp')+'" srcset="'+srcset+'" sizes="'+esc(sizes)+'"><img'+(imgId?' id="'+esc(imgId)+'"':'')+' src="'+esc(asset.src)+'" width="'+desktop.width+'" height="'+desktop.height+'" alt="'+esc(decorative?'':asset.alt)+'"'+(fit?' style="object-fit:'+fit+'"':'')+' '+(hero?'fetchpriority="high"':'loading="lazy"')+' decoding="async"></picture>';
}
function primaryPicture(route,options={},context=loadProject()){
 const asset=primaryAsset(route,context),group=pageGroupFor(route,context.project);assert.ok(asset,'Text-only route has no primary picture');
 return assetPicture(asset.id,{sizes:group.primarySizes??'100vw',fit:group.primaryFit,...options,primary:true},context);
}
// A small static-markup parser, not a browser visibility oracle. Inline/ancestor
// hiding is rejected here; final CSS composition is checked in browser review.
function mainNodes(html){
 const main=html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i);assert.ok(main,'Missing main content');
 const source=main[0].replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,m=>' '.repeat(m.length));
 const nodes=[],stack=[],voids=new Set(['img','source','br','hr','input','meta','link','wbr','area','base','embed','param','track','col']);
 const tokens=/<\/?([a-z][\w:-]*)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi;let match;
 while((match=tokens.exec(source))){
  const tag=match[1].toLowerCase();
  if(match[0].startsWith('</')){const index=stack.map(n=>n.tag).lastIndexOf(tag);if(index>=0){for(const node of stack.splice(index)){node.end=tokens.lastIndex;}}continue;}
  const attrs={};for(const attr of match[0].slice(match[1].length+1,-1).matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)){const name=attr[1].toLowerCase();assert.ok(!Object.hasOwn(attrs,name),'Duplicate HTML attribute');attrs[name]=attr[2]??attr[3]??attr[4]??'';}
  const node={tag,attrs,parent:stack.at(-1),start:match.index,openEnd:tokens.lastIndex,end:tokens.lastIndex};nodes.push(node);
  if(!voids.has(tag)&&!match[0].endsWith('/>'))stack.push(node);
 }
 return {nodes,mainStart:main.index,source:main[0]};
}
const descendants=(node,ancestor)=>{for(let n=node;n;n=n.parent)if(n===ancestor)return true;return false;};
const hiddenNode=node=>{for(let n=node;n;n=n.parent)if(Object.hasOwn(n.attrs,'hidden')||n.attrs['aria-hidden']==='true'||['template','noscript'].includes(n.tag)||/(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|opacity\s*:\s*0(?:\s|;|$))/i.test(n.attrs.style??''))return true;return false;};
function visiblePrimary(html,route,context=loadProject()){
 const asset=primaryAsset(route,context),group=pageGroupFor(route,context.project),{nodes}=mainNodes(html);
 const marked=nodes.filter(n=>Object.hasOwn(n.attrs,'data-primary-art'));
 if(!asset){assert.equal(group.textOnly,true,'Unspecified visual treatment: '+route);assert.equal(marked.length,0,'Text-only route has primary-art marker');return null;}
 assert.equal(marked.length,1,'Exactly one visible primary artwork required: '+route);
 const target=marked[0];assert.equal(target.tag,'picture','Primary art must be a responsive picture');
 assert.equal(target.attrs['data-primary-art'],asset.id,'Wrong primary art role: '+route);
 assert.ok(!hiddenNode(target),'Hidden primary art: '+route);
 const images=nodes.filter(n=>n.tag==='img'&&descendants(n,target));assert.equal(images.length,1,'Primary picture must contain one image');
 const image=images[0];assert.ok(!hiddenNode(image),'Hidden primary image');assert.equal(image.attrs.src,asset.src,'Wrong visible primary source: '+route);
 const sources=nodes.filter(n=>n.tag==='source'&&descendants(n,target));assert.equal(sources.length,1,'One governed responsive source required');
 assert.equal(sources[0].attrs.type,asset.src.endsWith('.avif')?'image/avif':'image/webp','Primary source MIME drift');
 const expected=[asset.mobile,asset.src].filter(Boolean).map(src=>assetExport(asset,src,context));
 assert.ok(expected.every(Boolean),'Unregistered responsive export');
 const desktop=assetExport(asset,asset.src,context);
 assert.equal(image.attrs.width,String(desktop.width),'Primary intrinsic width drift');assert.equal(image.attrs.height,String(desktop.height),'Primary intrinsic height drift');
 const actual=sources[0].attrs.srcset?.split(',').map(s=>s.trim()).sort();
 assert.deepEqual(actual,[...new Set(expected.map(e=>(e.path.startsWith('/')?e.path:'/'+e.path)+' '+e.width+'w'))].sort(),'Primary responsive sources drift');
 assert.equal(sources[0].attrs.sizes,group.primarySizes??'100vw','Primary layout sizes drift: '+route);
 if(group.primaryFit)assert.ok(new RegExp('object-fit:\\s*'+group.primaryFit+'(?:;|$)').test(image.attrs.style??''),'Primary fit drift: '+route);
 return {assetId:asset.id,source:asset.src,sizes:sources[0].attrs.sizes,fit:group.primaryFit??'stylesheet-defined',visibility:'static-markup-checked; final CSS requires browser review'};
}
function reconcileVisualAssets(html,route,context=loadProject()){
 const selected=primaryAsset(route,context),group=pageGroupFor(route,context.project);
 if(!selected)return html;
 // Only archival image tags change. Forms, scripts, auth guards and page text stay intact.
 html=html.replace(/<img\b[^>]*>/g,tag=>{
  const src=tag.match(/\bsrc="([^"]+)"/)?.[1];
  if(!context.selection.legacyPrimaryAssets.includes(src))return tag;
  return tag.replace(/\bsrc="[^"]+"/,'src="'+selected.src+'"').replace(/\balt="[^"]*"/,'alt="'+selected.alt.replaceAll('&','&amp;').replaceAll('"','&quot;')+'"');
 });
 const parsed=mainNodes(html),container=parsed.nodes.find(n=>n.attrs.class?.split(/\s+/).includes(group.artContainerClass));
 if(!container)return html; // Coverage fails if the owned source omits its role.
 const target=container.tag==='picture'?container:parsed.nodes.find(n=>n.tag==='picture'&&descendants(n,container))??parsed.nodes.find(n=>n.tag==='img'&&descendants(n,container));
 if(!target)return html;
 const image=target.tag==='img'?target:parsed.nodes.find(n=>n.tag==='img'&&descendants(n,target));
 const replacement=primaryPicture(route,{cls:target.tag==='picture'?(target.attrs.class??''):'',hero:true,imgId:image?.attrs.id??'',decorative:image?.attrs.alt===''},context);
 return html.slice(0,parsed.mainStart+target.start)+replacement+html.slice(parsed.mainStart+target.end);
}
function projectFiles(root=projectRoot){
 const c=loadProject(root),{standard,selection}=c,colors=standard.tokens;
 validateSelections(c);
 const graphics=read(root,'config/public-graphics-alignment.json');
 graphics.projectAuthority='projects/website-customer-experience/project.json';
 graphics.brand.palette={...colors};
 graphics.brand.paletteSource='projects/website-customer-experience/visual-standard.json#tokens';
 const neural=selection.assets.find(a=>a.id==='neural-core');
 Object.assign(graphics.pageGroups.homepage,{hero:neural.src,motionPoster:neural.src,neuralStudy:neural.src,mobileNeuralStudy:neural.mobile,status:'cinematic customer experience candidate; consolidated owner visual review pending'});
 Object.assign(graphics.pageGroups.platformPreview,{hero:neural.src,neuralCard:neural.src,status:'interactive local sample workspace; no live model session or customer data'});
 graphics.pageGroups.modelAndMarkets.primaryArt=null;
 graphics.pageGroups.modelAndMarkets.socialArt=neural.src;
 graphics.pageGroups.modelAndMarkets.status='Route-specific visible roles; company/market pages are explicitly text-only. Social images are separate from visible primary artwork.';
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
 const mark=manifest.assets.find(a=>a.id==='ad-astra-orbital-mark');
 if(mark){const bytes=fs.readFileSync(localFile(root,'public'+mark.path));Object.assign(mark,{kind:'vector',bytes:bytes.length,sha256:digest(bytes)});}
 manifest.assets.push({id:'ad-astra-neural-spiral',path:neural.src,role:neural.role,kind:'image',provenanceManifest:'/'+neural.manifest.replace(/^public\//,''),origin:{...neural.origin},reviewStatus:'candidate',alt:neural.alt});
 const css='/* Generated from the dedicated website visual standard. */\n:root{'+Object.entries(colors).map(([name,value])=>'--cx-'+name+':'+value).join(';')+';--space:var(--cx-background);--surface:var(--cx-surface);--text:var(--cx-text);--subtle:var(--cx-muted);--ice:var(--cx-cyan);--champagne:var(--cx-champagne)}\n';
 return new Map([
  ['config/public-graphics-alignment.json',json(graphics)],['config/public-visual-architecture.json',json(architecture)],
  ['public/experience-manifest.json',json(experience)],['public/assets/visual-manifest.json',json(manifest)],
  ['public/assets/brand/experience-tokens.css',css]
 ]);
}
function resourceFor(context,origin){
 fields(origin,['kind','resourceId','version'],[],'asset origin');
 assert.ok(['local-generated','first-party-code','provider-export'].includes(origin.kind),'Unknown asset origin kind');
 assert.ok(text(origin.resourceId)&&shaPattern.test(origin.version),'Invalid origin version/reference');
 const resources=read(context.root,context.project.sourceOfTruth.resources);
 const source=resources.sources.find(s=>s.id===origin.resourceId);assert.ok(source,'Unknown selected resource: '+origin.resourceId);
 assert.ok(text(source.status)&&text(source.selectionStatus)&&text(source.rightsStatus),'Invalid selected resource status');
 assert.ok(!/(?:hold|blocked|quarantine|conflicts)/i.test(source.selectionStatus+' '+source.status),'Selected resource is on hold: '+origin.resourceId);
 // Origin labels must not reclassify a held/external provider as first-party.
 if(origin.kind!=='provider-export')assert.equal(source.provider,'AD ASTRA','External resource requires provider-export origin');
 return source;
}
function validateSelections(context){
 const {selection}=context;
 assert.equal(selection.schema,'ad-astra-website-asset-selections/v1');
 assert.ok(Array.isArray(selection.assets)&&selection.assets.length,'Empty visual selection');
 assert.equal(new Set(selection.assets.map(a=>a.id)).size,selection.assets.length,'Duplicate visual selection');
 for(const asset of selection.assets){
  fields(asset,['id','src','mobile','manifest','kind','role','alt','origin'],[],'selected asset');
  assert.ok(['raster','vector'].includes(asset.kind),'Unknown selected asset kind');
  assert.ok(text(asset.id)&&text(asset.role)&&text(asset.alt),'Invalid selected asset identity');
  for(const src of [asset.src,asset.mobile].filter(v=>v!==null))assert.ok(text(src)&&/^\/assets\/[a-zA-Z0-9/_-]+\.(?:svg|webp|avif)$/.test(src),'Invalid selected asset path');
  assert.ok(text(asset.manifest)&&asset.manifest.startsWith('public/assets/')&&asset.manifest.endsWith('.json'),'Invalid provenance manifest');
  if(asset.kind==='raster')assert.ok(asset.mobile,'Raster art requires a mobile export');
  resourceFor(context,asset.origin);
 }
 return context;
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
 validateSelections(c);
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
  const visible=visiblePrimary(html,route,c);
  return {route,source:file,sourceSha256:digest(html),group:group.id,journey:group.journey,productFamilies:familyIds,primaryAsset:asset?.id??null,socialAsset:group.socialAsset??null,visibleArtwork:visible,textOnly:group.textOnly===true,indexingDecision:decision,visualReview:'pending-human-review',backendAcceptance:'separate-protected-release-evidence'};
 });
}
async function assetQuality(root=projectRoot){
 const sharp=require('sharp'),c=loadProject(root),result=[];
 validateSelections(c);
 for(const asset of c.selection.assets){
  const manifest=JSON.parse(fs.readFileSync(localFile(root,asset.manifest),'utf8'));
  const manifestAsset=manifest.assets?.find(a=>(a.exports??[]).some(e=>e.path===asset.src)||a.path===asset.src);
  const source=manifestAsset?.source??manifest.source;
  if(source?.resourceId){resourceFor(c,{...asset.origin,resourceId:source.resourceId});assert.equal(source.resourceId,asset.origin.resourceId,'Manifest/selection origin mismatch');}
  if(source?.sha256)assert.equal(source.sha256,asset.origin.version,'Master provenance version mismatch');
  const variants=[];
  for(const [use,src]of [['desktop',asset.src],['mobile',asset.mobile]]){
   if(!src)continue;
   assert.ok(src.startsWith('/assets/')&&!src.includes('..'),'Invalid selected asset path');
   const bytes=fs.readFileSync(localFile(root,'public'+src));
   const item={use,src,bytes:bytes.length,sha256:digest(bytes)};
   const max=asset.id==='neural-core'?c.standard.delivery.heroExportMaxBytes:c.standard.delivery.secondaryExportMaxBytes;
   assert.ok(bytes.length>0&&bytes.length<=max,'Selected export exceeds delivery budget: '+src);
   const entries=manifest.exports??manifest.assets?.flatMap(a=>a.exports??[a])??[];
   const evidence=entries.find(e=>e.path===src||'/'+e.path===src);
   assert.ok(evidence,'Missing provenance export: '+src);
   const expectedHash=evidence.sha256??(asset.kind==='vector'&&asset.origin.kind==='first-party-code'?asset.origin.version:null);
   assert.equal(expectedHash,item.sha256,'Provenance hash mismatch: '+src);
   if(evidence.bytes!==undefined)assert.equal(evidence.bytes,bytes.length,'Provenance byte count mismatch');
   if(asset.kind==='raster'){
    const image=sharp(bytes,{limitInputPixels:64000000}),meta=await image.metadata();Object.assign(item,{width:meta.width,height:meta.height,format:meta.format});
    assert.ok(c.standard.delivery.rasterFormats.includes(meta.format),'Unsupported raster delivery: '+src);
    assert.equal(path.extname(src),'.'+meta.format,'Declared/decoded raster format mismatch');
    assert.equal(evidence.width,meta.width,'Provenance decoded width mismatch');
    if(evidence.height!==undefined)assert.equal(evidence.height,meta.height,'Provenance decoded height mismatch');
    const min=use==='desktop'?c.standard.delivery.desktopHeroMinimumWidth:c.standard.delivery.mobileMinimumWidth;
    assert.ok(meta.width>=min,'Selected export below minimum width: '+src);
    assert.ok(Number.isInteger(source?.width)&&Number.isInteger(source?.height)&&source.width>=meta.width,'Missing/undersized recorded master');
    await image.stats(); // Force pixel decoding, not just a plausible header.
   }else{
    const svg=bytes.toString('utf8');
    assert.ok(src.endsWith('.svg')&&/^\s*(?:<\?xml[^>]*>\s*)?<svg\b/.test(svg)&&/<\/svg>\s*$/.test(svg),'Vector selection is not SVG');
    assert.ok(!/<!DOCTYPE|<!ENTITY|<(?:script|foreignObject)\b|\bon\w+\s*=|(?:href\s*=\s*["'](?!#)|url\(\s*["']?(?!#))/i.test(svg),'Unsafe SVG provenance');
    assert.equal(asset.origin.version,item.sha256,'Vector source version mismatch');item.format='svg';
   }
   variants.push(item);
  }
  result.push({id:asset.id,role:asset.role,manifest:asset.manifest,origin:{...asset.origin},variants,assetFingerprint:digest(json(variants.map(({use,src,sha256})=>({use,src,sha256})))),visualDecision:'pending',recordedMaster:source?{width:source.width,height:source.height,sha256:source.sha256,independentlyVerified:false}:null,masterTargetWidth:c.standard.delivery.desktopMasterTargetWidth,masterTargetStatus:asset.kind==='vector'?'not-applicable':'requires-source-master-review',rights:'requires-consolidated-rights-review'});
 }
 return result;
}
const visualCriteria=['storyAlignment','cinematicCraft','productClarity','brandConsistency','desktopComposition','mobileComposition','typographyAndContrast','motionAndFallbacks'];
function validateVisualStandard(standard){
 assert.equal(standard.schema,'ad-astra-website-visual-standard/v1');
 const policy=standard.visualAcceptance;
 assert.deepEqual([...policy.criteria].sort(),[...visualCriteria].sort(),'The existing eight visual criteria are required');
 assert.equal(policy.minimumEachScore,4,'Visual minimum remains 4/5');assert.equal(policy.scaleMax,5,'Visual scale remains 4/5');
 assert.deepEqual([...policy.reviewWidths].sort((a,b)=>a-b),[390,1440],'Existing mobile and desktop review widths');
}
function visualScope(root,inventory,context=loadProject(root)){
 validateVisualStandard(context.standard);validateSelections(context);
 const policyPaths=['project.json','visual-standard.json','asset-selections.json','model-experience.json'].map(f=>'projects/website-customer-experience/'+f);
 const designPaths=['config/public-product-families.json','config/customer-experience-framework.json','config/story-collection.json'];
 const policies=[...policyPaths,...designPaths].map(file=>({path:file,sha256:digest(fs.readFileSync(localFile(root,file)))}));
 // These local public projections exclude runtime directives, private aliases,
 // lookup implementations and comments. Full source integrity still binds all
 // backend bytes; changes to actual customer labels/capabilities bind here.
 const catalogPaths=['lib/modes.js','lib/model-catalog.js','lib/customer-agent-catalog.js','lib/offer-catalog.js'];
 for(const file of catalogPaths)delete require.cache[require.resolve(localFile(root,file))];
 const model=require(localFile(root,'lib/model-catalog.js'));
 const catalogs={models:model.publicModels(),profiles:model.publicMarketProfiles(),agents:require(localFile(root,'lib/customer-agent-catalog.js')).publicCustomerAgents(),offers:require(localFile(root,'lib/offer-catalog.js')).publicOffers(),modeIds:[...require(localFile(root,'lib/modes.js')).MODE_IDS]};
 const resources=[...new Set(context.selection.assets.map(a=>a.origin.resourceId))].sort().map(id=>{
  const source=read(root,context.project.sourceOfTruth.resources).sources.find(s=>s.id===id);
  return {id,provider:source.provider,authorityPath:source.authorityPath??null,url:source.url??null,status:source.status,selectionStatus:source.selectionStatus,rightsStatus:source.rightsStatus};
 });
 const files=inventory.files.filter(f=>f.path.startsWith('public/'));
 const scope={schema:'ad-astra-visual-scope/v1',files,policies,catalogs,selectedResources:resources};
 return {...scope,fingerprint:digest(json(scope)),excludes:['review decision record','backend-only implementation bytes','unselected resource observations']};
}
function pixelCoverage({width,height,dpr,fit,nativeWidth,nativeHeight}){
 for(const value of [width,height,dpr,nativeWidth,nativeHeight])assert.ok(Number.isFinite(value)&&value>0,'Pixel coverage requires positive finite measurements');
 assert.ok(['contain','cover'].includes(fit),'Pixel coverage requires actual computed fit');
 const ratio=nativeWidth/nativeHeight,cssWidth=(fit==='cover'?Math.max:Math.min)(width,height*ratio),requiredWidth=Math.ceil(cssWidth*dpr);
 return {requiredWidth,nativeWidth,nativePixelCoverage:requiredWidth<=nativeWidth,upscaleFactor:requiredWidth/nativeWidth,masterDetailCreated:false};
}
async function evidenceBytes(evidenceRoot,ref,hash){
 assert.ok(text(evidenceRoot),'AD_ASTRA_VISUAL_REVIEW_ROOT must identify the existing review artifacts');
 assert.ok(text(ref)&&shaPattern.test(hash),'Invalid evidence reference/hash');
 const file=localFile(evidenceRoot,ref),stat=fs.statSync(file);
 assert.ok(stat.size>0&&stat.size<=32*1024*1024,'Empty or oversized review evidence');
 const bytes=fs.readFileSync(file);assert.equal(digest(bytes),hash,'Review evidence hash mismatch');return bytes;
}
async function visualAcceptance({review,standard,fingerprint,routes,assets,evidenceRoot=process.env.AD_ASTRA_VISUAL_REVIEW_ROOT,now=Date.now()}){
 validateVisualStandard(standard);
 const missing=[],add=message=>missing.push(message),scores=plain(review.scores)?review.scores:{};
 if(review.schema!=='ad-astra-website-visual-review/v1')add('Visual review schema');
 if(review.decision!=='approved')add('Owner visual review of the complete bundle');
 if(!shaPattern.test(fingerprint)||review.scopeFingerprint!==fingerprint)add('Visual review bound to current visual policy and rendered bundle');
 const reviewedTime=typeof review.reviewedAt==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(review.reviewedAt)?Date.parse(review.reviewedAt):NaN;
 if(review.reviewerId!=='zoheb-khan'||!Number.isFinite(reviewedTime)||reviewedTime>now||new Date(reviewedTime).toISOString().replace('.000Z','Z')!==review.reviewedAt?.replace('.000Z','Z'))add('Recorded owner, nonfuture ISO date and decision evidence');
 if(Object.keys(scores).length!==visualCriteria.length)add('Complete visual scores');
 for(const criterion of visualCriteria)if(!Number.isInteger(scores[criterion])||scores[criterion]<4||scores[criterion]>5)add('Visual criterion: '+criterion);
 if(!Array.isArray(review.routeCoverage)||review.routeCoverage.length!==routes.length||new Set(review.routeCoverage).size!==routes.length||routes.some(route=>!review.routeCoverage.includes(route)))add('Every current route reviewed exactly once');
 const rights=Array.isArray(review.assetRights)?review.assetRights:[],artifacts=Array.isArray(review.viewportArtifacts)?review.viewportArtifacts:[];
 if(rights.length!==assets.length||new Set(rights.map(r=>r?.assetId)).size!==assets.length)add('Exact selected asset-rights coverage');
 const evidenceChecks=[];
 for(const asset of assets){
  const entry=rights.find(r=>r?.assetId===asset.id);
  if(entry?.decision!=='approved'||entry.assetFingerprint!==asset.assetFingerprint||!text(entry.evidenceRef)||!shaPattern.test(entry.evidenceSha256??''))add('Selected asset rights/version evidence: '+asset.id);
  else evidenceChecks.push(async()=>{await evidenceBytes(evidenceRoot,entry.evidenceRef,entry.evidenceSha256);});
 }
 const pairs=new Set();
 for(const item of artifacts){
  try{
   fields(item,['route','width','height','evidenceRef','evidenceSha256'],['deviceScaleFactor'],'viewport artifact');
   const dpr=item.deviceScaleFactor??1;
   assert.ok(routes.includes(item.route)&&standard.accessibility.responsiveWidths.includes(item.width),'Unknown reviewed route/viewport');
   assert.ok(Number.isInteger(item.height)&&item.height>0,'Invalid screenshot viewport height');
   assert.ok(Number.isFinite(dpr)&&dpr>=1&&dpr<=4,'Invalid screenshot DPR');
   const key=json([item.route,item.width,dpr]);assert.ok(!pairs.has(key),'Duplicate route/viewport artifact');pairs.add(key);
   evidenceChecks.push(async()=>{
    const bytes=await evidenceBytes(evidenceRoot,item.evidenceRef,item.evidenceSha256),image=require('sharp')(bytes,{limitInputPixels:64000000}),meta=await image.metadata();
    assert.ok(['png','webp','avif'].includes(meta.format),'Review screenshot must be a decoded raster');
    assert.equal(meta.width,Math.round(item.width*dpr),'Screenshot width does not match reviewed viewport/DPR');await image.stats();
    assert.ok(meta.height>=Math.round(item.height*dpr),'Screenshot is shorter than its reviewed viewport');
   });
  }catch(error){add('Viewport evidence: '+error.message);}
 }
 for(const route of routes)for(const width of standard.visualAcceptance.reviewWidths)if(!artifacts.some(a=>a?.route===route&&a.width===width))add('Missing screenshot: '+route+' @ '+width);
 // File evidence verifies the record, not the identity of its author. Existing
 // independent exact-commit review and final authorization remain separate.
 try{
  const bytes=await evidenceBytes(evidenceRoot,review.evidenceRef,review.evidenceSha256),decision=JSON.parse(bytes);
  fields(decision,['schema','decision','reviewerId','reviewedAt','scopeFingerprint','scores','artifactFingerprint'],['sourceEvidenceRef'],'owner decision artifact');
  assert.equal(decision.schema,'ad-astra-owner-visual-decision/v1');
  for(const field of ['decision','reviewerId','reviewedAt','scopeFingerprint'])assert.equal(decision[field],review[field],'Owner decision '+field+' mismatch');
  assert.deepEqual(decision.scores,scores,'Owner decision score mismatch');
  assert.equal(decision.artifactFingerprint,digest(json({viewportArtifacts:artifacts,assetRights:rights})),'Owner decision artifacts mismatch');
 }catch(error){add('Owner decision evidence: '+error.message);}
 for(const check of evidenceChecks)try{await check();}catch(error){add('Review artifact: '+error.message);}
 return {ready:missing.length===0,decision:review.decision,missing,scopeFingerprint:fingerprint,identityVerification:'Local evidence files do not authenticate the human actor; existing independent release review remains required.'};
}
async function projectReport(root=projectRoot){
 const {verify}=require('../website-source-integrity.cjs');
 const inventory=verify(root,read(root,'config/website-source-integrity.json'));
 const c=loadProject(root),pages=projectCoverage(root),assets=await assetQuality(root),fingerprint=inventory.fingerprint,scope=visualScope(root,inventory,c);
 const {modelExperienceReport}=require('./website-model-alignment.cjs');
 const models=modelExperienceReport(root);
 const visual=await visualAcceptance({...c,fingerprint:scope.fingerprint,routes:pages.map(p=>p.route),assets});
 if(visual.ready)for(const page of pages)page.visualReview='recorded-owner-evidence-matches-visual-scope';
 const resources=read(root,c.project.sourceOfTruth.resources);
 const routeSet=new Set(pages.map(p=>p.route));
 const experienceCoverage=c.project.completeExperienceRequirements.map(group=>({id:group.id,existing:group.routes.filter(route=>routeSet.has(route)),missing:group.routes.filter(route=>!routeSet.has(route)),note:'Presence does not establish content acceptance or functioning customer services.'}));
 const finalInventory=verify(root,read(root,'config/website-source-integrity.json'));
 assert.equal(finalInventory.fingerprint,inventory.fingerprint,'Source changed during project reporting');
 assert.equal(visualScope(root,finalInventory).fingerprint,scope.fingerprint,'Visual policy/selection changed during project reporting');
 return {schema:'ad-astra-website-project-report/v1',project:c.project.name,sourceOfTruth:c.project.sourceOfTruth,sourceFingerprint:fingerprint,visualScope:scope,pages,assets,models,experienceCoverage,resources:{count:resources.sources.length,providers:[...new Set(resources.sources.map(s=>s.provider))],accessPolicyConflicts:resources.sources.filter(s=>s.status==='fresh-acl-conflicts-with-stored-private-policy').map(s=>s.id)},visualAcceptance:visual,productionAcceptance:'Separate exact-candidate release and authenticated provider acceptance remain required.'};
}
module.exports={loadProject,pageGroupFor,primaryAsset,assetPicture,primaryPicture,mainNodes,visiblePrimary,reconcileVisualAssets,projectFiles,projectCoverage,validateSelections,assetQuality,validateVisualStandard,visualScope,pixelCoverage,visualAcceptance,projectReport};
