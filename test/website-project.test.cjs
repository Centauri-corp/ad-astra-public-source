'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadProject,pageGroupFor,primaryAsset,reconcileVisualAssets,projectFiles,projectCoverage,assetQuality,visualAcceptance}=require('../scripts/lib/website-project.cjs');
const root=path.join(__dirname,'..'),context=loadProject();
test('all current routes have product, journey, source and visual ownership',()=>{
 const pages=projectCoverage();
 assert.deepEqual(pages.map(p=>p.route),require('../public/route-release-evidence.json').routes.map(r=>r.path));
 assert.ok(pages.every(p=>p.group&&p.journey&&p.productFamilies.length&&/^[a-f0-9]{64}$/.test(p.sourceSha256)));
 assert.equal(pageGroupFor('/products/core-intelligence/').id,'product-detail');
 assert.throws(()=>pageGroupFor('/unowned-new-route/'),/Unassigned/);
 const broken=structuredClone(context);broken.selection.assets=[];assert.throws(()=>primaryAsset('/',broken),/Unregistered/);
});
test('the project generates current graphics contracts, brand tokens and explicit archival lifecycle',()=>{
 for(const [file,content]of projectFiles())assert.equal(fs.readFileSync(path.join(root,file),'utf8'),content,file);
 const graphics=require('../config/public-graphics-alignment.json');
 assert.equal(graphics.pageGroups.homepage.hero,context.selection.assets.find(a=>a.id==='neural-core').src);
 assert.equal(graphics.pageGroups.platformPreview.hero,graphics.pageGroups.homepage.hero);
 assert.deepEqual(graphics.brand.palette,context.standard.tokens);
 const manifest=require('../public/assets/visual-manifest.json');
 for(const candidate of manifest.assets.filter(a=>context.selection.legacyPrimaryAssets.includes(a.path)))assert.equal(candidate.lifecycle,'archived-primary-candidate');
});
test('retired primary image migration is idempotent and preserves protected forms and scripts',()=>{
 const original='<main hidden id="platform-content"><form action="/api/session"><input name="token"></form><script src="/auth.js"></script><img src="/assets/astra-lumen-neural-concierge.png" alt="Old head"></main>';
 const updated=reconcileVisualAssets(original,'/agent/');
 assert.ok(updated.includes('src="/assets/experience/neural-core-1600.webp"'));
 assert.ok(updated.includes('<main hidden id="platform-content"><form action="/api/session"><input name="token"></form><script src="/auth.js"></script>'));
 assert.equal(reconcileVisualAssets(updated,'/agent/'),updated);
 assert.equal(reconcileVisualAssets(original,'/platform/'),original,'Text-first guarded routes have no implicit asset substitution');
});
test('selected responsive art decodes at genuine delivery dimensions and matches source hashes',async()=>{
 const assets=await assetQuality();
 assert.equal(assets.length,context.selection.assets.length);
 for(const asset of assets)for(const v of asset.variants){assert.ok(v.bytes>0);assert.match(v.sha256,/^[a-f0-9]{64}$/);if(v.width)assert.ok(v.width>=(v.use==='desktop'?1600:800));}
});
test('review metadata alone cannot establish actual acceptance without current decision and viewport artifacts',async()=>{
 const routes=['/','/platform-preview/'],assets=[{id:'neural-core'}],fingerprint='a'.repeat(64);
 const approved={decision:'approved',scopeFingerprint:fingerprint,reviewerId:'zoheb-khan',reviewedAt:'2026-11-13T18:00:00Z',evidenceRef:'review://synthetic-fixture',scores:Object.fromEntries(context.standard.visualAcceptance.criteria.map(k=>[k,4])),routeCoverage:[...routes],assetRights:[{assetId:'neural-core',decision:'approved',evidenceRef:'review://synthetic-rights-fixture'}]};
 const evaluate=review=>visualAcceptance({review,standard:context.standard,fingerprint,routes,assets});
 assert.equal((await evaluate(approved)).ready,false,'A reviewer string and review:// reference are not evidence');
 for(const mutate of [r=>r.decision='pending',r=>r.scopeFingerprint='b'.repeat(64),r=>r.reviewerId=null,r=>r.evidenceRef=null,r=>r.routeCoverage.pop(),r=>r.assetRights=[],r=>r.scores.mobileComposition=3,r=>r.scores.storyAlignment=99]){
  const altered=structuredClone(approved);mutate(altered);assert.equal((await evaluate(altered)).ready,false);
 }
 assert.equal((await evaluate(context.review)).ready,false,'Real pending review cannot inherit a synthetic fixture approval');
});
