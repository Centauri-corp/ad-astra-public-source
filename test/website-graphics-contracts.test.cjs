'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const sharp=require('sharp');
const h=require('../scripts/lib/website-project.cjs');
const {createManifest}=require('../scripts/website-source-integrity.cjs');
const {check:visualGuard}=require('../scripts/check-website-visual-release.cjs');
const source=path.resolve(__dirname,'..'),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const encode=value=>JSON.stringify(value,null,2)+'\n';
const read=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
function write(root,file,value){const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,typeof value==='string'||Buffer.isBuffer(value)?value:encode(value));}
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'astra-graphics-contract-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const context=h.loadProject(source),files=new Set([
  'projects/website-customer-experience/project.json','projects/website-customer-experience/visual-standard.json',
  'projects/website-customer-experience/asset-selections.json','projects/website-customer-experience/visual-review.json',
  'projects/website-customer-experience/resources.json','projects/website-customer-experience/model-experience.json',
  'config/public-product-families.json','config/customer-experience-framework.json','config/story-collection.json',
  'lib/model-catalog.js','lib/customer-agent-catalog.js','lib/offer-catalog.js','lib/modes.js'
 ]);
 for(const asset of context.selection.assets){files.add(asset.manifest);for(const src of [asset.src,asset.mobile].filter(Boolean))files.add('public'+src);}
 for(const file of files){const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(source,file),target);}
 fs.mkdirSync(path.join(root,'api'));return root;
}
function update(root,file,change){const value=read(root,file);change(value);write(root,file,value);}
const selectionPath='projects/website-customer-experience/asset-selections.json';
function rendered(route,context=h.loadProject()){
 const original=fs.readFileSync(path.join(source,'public',route.slice(1),'index.html'),'utf8');
 return h.reconcileVisualAssets(original,route,context);
}

test('CX-001: OG metadata cannot rescue a wrong, absent, hidden or duplicated visible primary image',()=>{
 const context=h.loadProject(),html=rendered('/agent/',context),asset=h.primaryAsset('/agent/',context);
 assert.equal(h.visiblePrimary(html,'/agent/',context).assetId,asset.id);
 const bodyStart=html.indexOf('<body'),head=html.slice(0,bodyStart),body=html.slice(bodyStart);
 assert.ok(head.includes(asset.src));
 for(const changed of [
  body.replace('src="'+asset.src+'"','src="/assets/story/intelligence-1672.webp"'),
  body.replace(/<picture\b[^>]*data-primary-art[\s\S]*?<\/picture>/,''),
  body.replace('data-primary-art=','hidden data-primary-art='),
  body.replace('data-primary-art=','style="display:none" data-primary-art='),
  body.replace('<main ','<main hidden '),
  body.replace('</main>',h.primaryPicture('/agent/',{},context)+'</main>')
 ])assert.throws(()=>h.visiblePrimary(head+changed,'/agent/',context),/primary|Primary/);
});
test('CX-001: text-only routes separate social imagery; selection changes drive the visible hero',()=>{
 const c=h.loadProject();
 for(const route of ['/company/','/about/','/markets/','/markets/california/']){
  assert.equal(h.primaryAsset(route,c),null);assert.ok(h.pageGroupFor(route,c.project).socialAsset);
  assert.equal(h.visiblePrimary(rendered(route,c),route,c),null);
 }
 const replacement=structuredClone(c.selection.assets.find(a=>a.id==='global-perspective'));
 Object.assign(c.selection.assets.find(a=>a.id==='neural-core'),replacement,{id:'neural-core'});
 const home=require('../scripts/lib/customer-home.cjs').customerHome(c);
 assert.equal(h.visiblePrimary(home,'/',c).source,replacement.src);
 assert.ok(home.match(/<picture class="ad-neural-art"[\s\S]*?<\/picture>/)[0].includes(replacement.src));
});
test('CX-002: genuine raster exports and pinned first-party SVG provenance pass',async()=>{
 const assets=await h.assetQuality();assert.equal(assets.length,8);
 for(const asset of assets){assert.match(asset.assetFingerprint,/^[a-f0-9]{64}$/);for(const v of asset.variants)assert.ok(['svg','webp','avif'].includes(v.format));}
 const mark=assets.find(a=>a.id==='orbital-mark');assert.equal(mark.variants[0].sha256,mark.origin.version);
 assert.equal(assets.find(a=>a.id==='neural-core').recordedMaster.independentlyVerified,false);
});
test('CX-002: unknown kind and a WebP labelled vector fail closed',async t=>{
 const root=fixture(t);
 update(root,selectionPath,s=>s.assets[0].kind='unrecognized-kind');await assert.rejects(h.assetQuality(root),/Unknown selected asset kind/);
 update(root,selectionPath,s=>s.assets[0].kind='vector');await assert.rejects(h.assetQuality(root),/not SVG/);
});
test('CX-002: even correctly hashed one-pixel rasters cannot bypass minimum delivery dimensions',async t=>{
 const root=fixture(t),pixel=await sharp({create:{width:1,height:1,channels:3,background:'#05070a'}}).webp().toBuffer();
 const manifest=read(root,'public/assets/experience/manifest.json');
 for(const entry of manifest.exports){write(root,'public'+entry.path,pixel);Object.assign(entry,{width:1,height:1,bytes:pixel.length,sha256:hash(pixel)});}
 write(root,'public/assets/experience/manifest.json',manifest);
 await assert.rejects(h.assetQuality(root),/below minimum width/);
 update(root,selectionPath,s=>s.assets[0].kind='vector');await assert.rejects(h.assetQuality(root),/not SVG/);
});
test('CX-002: stale bytes, decoded metadata and vector origin versions fail provenance checks',async t=>{
 const root=fixture(t),manifest='public/assets/experience/manifest.json',saved=read(root,manifest);
 update(root,manifest,m=>m.exports[1].bytes=1);await assert.rejects(h.assetQuality(root),/byte count/);
 write(root,manifest,saved);update(root,manifest,m=>m.exports[1].width=1);await assert.rejects(h.assetQuality(root),/decoded width/);
 write(root,manifest,saved);update(root,selectionPath,s=>s.assets.find(a=>a.id==='orbital-mark').origin.version='0'.repeat(64));
 await assert.rejects(h.assetQuality(root),/hash mismatch|version mismatch/);
});
test('CX-006: a selected held origin fails, but unrelated held datasets do not block first-party art',async t=>{
 const root=fixture(t);assert.equal((await h.assetQuality(root)).length,8);
 update(root,selectionPath,s=>s.assets[0].origin={...s.assets[0].origin,kind:'provider-export',resourceId:'sanity-dataset-production'});
 await assert.rejects(h.assetQuality(root),/on hold/);
});
test('CX-006: unknown provenance fields and a manifest pointing to a held source are not ignored',async t=>{
 const root=fixture(t),saved=read(root,selectionPath);
 update(root,selectionPath,s=>s.assets[0].sourceResourceId='sanity-dataset-production');await assert.rejects(h.assetQuality(root),/selected asset fields/);
 write(root,selectionPath,saved);update(root,'public/assets/experience/manifest.json',m=>m.source.resourceId='sanity-dataset-production');
 await assert.rejects(h.assetQuality(root),/on hold/);
});
test('CX-004: the actual report and production visual guard reject stale bytes before interpreting review data',async t=>{
 const root=fixture(t);write(root,'config/website-source-integrity.json',createManifest(root));
 write(root,'public/synthetic-unreviewed.txt','SYNTHETIC changed file');
 await assert.rejects(h.projectReport(root),/bytes or file set changed/);
 await assert.rejects(visualGuard({VERCEL_ENV:'production'},()=>h.projectReport(root)),/bytes or file set changed/);
});
test('CX-005: visual policy, selection, route ownership and UX catalogs bind the visual hash, not backend-only bytes or the review record',t=>{
 const root=fixture(t),baseline=h.visualScope(root,createManifest(root)).fingerprint;
 write(root,'api/synthetic.js','// backend-only source change\n');
 assert.equal(h.visualScope(root,createManifest(root)).fingerprint,baseline);
 update(root,'projects/website-customer-experience/visual-review.json',r=>r.note+=' SYNTHETIC decision metadata');
 assert.equal(h.visualScope(root,createManifest(root)).fingerprint,baseline);
 const standard='projects/website-customer-experience/visual-standard.json',saved=read(root,standard);
 update(root,standard,s=>s.graphicsRules.push('SYNTHETIC changed visual rule'));
 assert.notEqual(h.visualScope(root,createManifest(root)).fingerprint,baseline);write(root,standard,saved);
 update(root,standard,s=>s.visualAcceptance.criteria=s.visualAcceptance.criteria.filter(c=>c!=='brandConsistency'));
 assert.throws(()=>h.visualScope(root,createManifest(root)),/eight visual criteria/);write(root,standard,saved);
 const project='projects/website-customer-experience/project.json',projectSaved=read(root,project);
 update(root,project,p=>p.pageGroups[0].journey='SYNTHETIC changed ownership');assert.notEqual(h.visualScope(root,createManifest(root)).fingerprint,baseline);write(root,project,projectSaved);
 const catalog='lib/model-catalog.js',catalogSource=fs.readFileSync(path.join(root,catalog),'utf8');
 fs.appendFileSync(path.join(root,catalog),'\n// Backend implementation comment only\n');
 assert.equal(h.visualScope(root,createManifest(root)).fingerprint,baseline,'Catalog comments do not change public presentation');
 write(root,catalog,catalogSource.replace("legacyName: 'Astra Lumen'","legacyName: 'SYNTHETIC internal alias'"));
 assert.equal(h.visualScope(root,createManifest(root)).fingerprint,baseline,'Private aliases are outside visual scope');
 write(root,catalog,catalogSource.replace("name: 'Astra Polaris'","name: 'SYNTHETIC customer label'"));
 assert.notEqual(h.visualScope(root,createManifest(root)).fingerprint,baseline,'Public catalog text invalidates the visual scope');write(root,catalog,catalogSource);
 const modes='lib/modes.js';write(root,modes,fs.readFileSync(path.join(root,modes),'utf8').replace('clarify the question and give a useful next step','SYNTHETIC backend-only system instruction'));
 assert.equal(h.visualScope(root,createManifest(root)).fingerprint,baseline,'Runtime prompt text is outside visual scope');
 const agents='lib/customer-agent-catalog.js',agentSource=fs.readFileSync(path.join(root,agents),'utf8');
 write(root,agents,agentSource.replace("directive: 'clarify the question and offer a practical starting point'","directive: 'SYNTHETIC backend-only directive'"));
 assert.equal(h.visualScope(root,createManifest(root)).fingerprint,baseline,'Agent directives are outside visual scope');
 write(root,agents,agentSource.replace("name: 'Astra Guide'","name: 'SYNTHETIC public agent name'"));
 assert.notEqual(h.visualScope(root,createManifest(root)).fingerprint,baseline,'Public agent text remains bound');
});

async function reviewFixture(t){
 const evidenceRoot=fs.mkdtempSync(path.join(os.tmpdir(),'astra-owner-evidence-test-'));t.after(()=>fs.rmSync(evidenceRoot,{recursive:true,force:true}));
 const standard=h.loadProject().standard,routes=['/','/platform-preview/'],assets=[{id:'neural-core',assetFingerprint:'a'.repeat(64)}],fingerprint='b'.repeat(64);
 const review={schema:'ad-astra-website-visual-review/v1',decision:'approved',scopeFingerprint:fingerprint,reviewerId:'zoheb-khan',reviewedAt:'2026-11-13T18:00:00Z',scores:Object.fromEntries(standard.visualAcceptance.criteria.map(k=>[k,4])),routeCoverage:[...routes],viewportArtifacts:[],assetRights:[]};
 write(evidenceRoot,'rights.txt','SYNTHETIC TEST RIGHTS ARTIFACT; not a real acceptance.');
 review.assetRights.push({assetId:'neural-core',decision:'approved',assetFingerprint:assets[0].assetFingerprint,evidenceRef:'rights.txt',evidenceSha256:hash(fs.readFileSync(path.join(evidenceRoot,'rights.txt')))});
 for(const route of routes)for(const width of standard.visualAcceptance.reviewWidths){
  const file=(route==='/'?'home':'workspace')+'-'+width+'.png';
  const png=await sharp({create:{width,height:30,channels:3,background:'#05070a'}}).png().toBuffer();write(evidenceRoot,file,png);
  review.viewportArtifacts.push({route,width,height:30,deviceScaleFactor:1,evidenceRef:file,evidenceSha256:hash(png)});
 }
 const saveDecision=r=>{
  const decision={schema:'ad-astra-owner-visual-decision/v1',decision:r.decision,reviewerId:r.reviewerId,reviewedAt:r.reviewedAt,scopeFingerprint:r.scopeFingerprint,scores:r.scores,artifactFingerprint:hash(encode({viewportArtifacts:r.viewportArtifacts,assetRights:r.assetRights}))};
  write(evidenceRoot,'owner.json',decision);r.evidenceRef='owner.json';r.evidenceSha256=hash(fs.readFileSync(path.join(evidenceRoot,'owner.json')));
 };
 saveDecision(review);
 return {review,saveDecision,evaluate:r=>h.visualAcceptance({review:r,standard,fingerprint,routes,assets,evidenceRoot,now:Date.parse('2026-11-13T20:00:00Z')})};
}
test('CX-003: complete hashed local decision, rights and route/viewport artifacts validate without claiming actor authentication',async t=>{
 const {review,evaluate}=await reviewFixture(t),result=await evaluate(review);assert.equal(result.ready,true,JSON.stringify(result.missing));
 assert.match(result.identityVerification,/do not authenticate/);
 assert.equal((await evaluate(h.loadProject().review)).ready,false,'Real pending record stays pending');
});
test('CX-003: forged metadata refs, future dates, NaN scores and route omissions fail',async t=>{
 const {review,evaluate}=await reviewFixture(t);
 for(const mutate of [r=>r.evidenceRef={},r=>r.evidenceRef=' ',r=>r.evidenceRef='nonexistent.json',r=>r.reviewedAt='2999-01-01T00:00:00Z',r=>r.reviewedAt='2026-02-30T00:00:00Z',r=>r.scores.storyAlignment=NaN,r=>r.scores.mobileComposition='4',r=>r.routeCoverage.pop(),r=>r.routeCoverage.push(r.routeCoverage[0]),r=>r.assetRights[0].evidenceRef={}]){
  const altered=structuredClone(review);mutate(altered);assert.equal((await evaluate(altered)).ready,false);
 }
});
test('CX-003: stale screenshot bytes, missing viewport, wrong dimensions, traversal and decision artifact mismatch fail',async t=>{
 const {review,saveDecision,evaluate}=await reviewFixture(t);
 for(const mutate of [r=>r.viewportArtifacts.pop(),r=>r.viewportArtifacts[0].evidenceSha256='0'.repeat(64),r=>r.viewportArtifacts[0].width=320,r=>r.viewportArtifacts[0].height=900,r=>r.viewportArtifacts[0].evidenceRef='../outside.png',r=>r.assetRights[0].assetFingerprint='0'.repeat(64)]){
  const altered=structuredClone(review);mutate(altered);saveDecision(altered);assert.equal((await evaluate(altered)).ready,false);
 }
 saveDecision(review);const scores=structuredClone(review);scores.scores.storyAlignment=5;
 assert.equal((await evaluate(scores)).ready,false,'Decision file must bind scores, not just a reviewer string');
});
test('CX-007: all 32 generated product-mode links resolve existing intelligence fragments',()=>{
 const files=require('../scripts/lib/product-architecture.cjs').productFiles(require('../config/public-product-families.json'),require('../config/public-visual-architecture.json'));
 const target=fs.readFileSync(path.join(source,'public/intelligence/index.html'),'utf8'),ids=new Set([...target.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));let count=0;
 for(const [file,html]of files){if(!file.endsWith('index.html'))continue;assert.ok(!html.includes('href="/#tab-'));
  for(const link of html.matchAll(/href="(\/intelligence\/#tab-[^"]+)"/g)){const fragment=link[1].split('#')[1];assert.ok(ids.has(fragment),'Missing fragment '+fragment+' from '+file);count++;}
 }
 assert.equal(count,32);
});
test('DPR: contain art direction and explicit slot sizes remove mobile cover magnification; master limits remain honest',()=>{
 const context=h.loadProject(),html=rendered('/',context),primary=h.visiblePrimary(html,'/',context);
 assert.equal(primary.fit,'contain');assert.equal(primary.sizes,'(max-width: 760px) calc(100vw + 345px), 100vw');
 const old=h.pixelCoverage({width:735,height:564.484375,dpr:2,fit:'cover',nativeWidth:800,nativeHeight:450});
 assert.equal(old.requiredWidth,2008);assert.equal(old.nativePixelCoverage,false);
 const mobile=h.pixelCoverage({width:735,height:564.484375,dpr:2,fit:'contain',nativeWidth:1600,nativeHeight:900});
 assert.equal(mobile.requiredWidth,1470);assert.equal(mobile.nativePixelCoverage,true);
 const desktop=h.pixelCoverage({width:1440,height:900,dpr:2,fit:'contain',nativeWidth:1600,nativeHeight:900});
 assert.equal(desktop.requiredWidth,2880);assert.equal(desktop.nativePixelCoverage,false);assert.equal(desktop.masterDetailCreated,false);
 assert.throws(()=>h.pixelCoverage({width:NaN,height:900,dpr:2,fit:'cover',nativeWidth:1600,nativeHeight:900}),/finite/);
});
