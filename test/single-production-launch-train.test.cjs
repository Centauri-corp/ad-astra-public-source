'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const unit=JSON.parse(read('config/continuous-public-release-unit.json'));
const release=JSON.parse(read('public/release-manifest.json'));
const film=JSON.parse(read('config/ad-astra-original-cinematic-film.v1.json'));
const media=JSON.parse(read('public/graphics/cinematic-media-manifest.json'));
const train=unit.singleProductionLaunchTrain;

test('one complete CRC public launch train, not separate launch approvals',()=>{
 assert.equal(train.schema,'crc.ad-astra.website-single-launch-train/v1');
 assert.equal(train.phases.length,10);
 assert.deepEqual(train.phases.map(p=>p.id),Array.from({length:10},(_,i)=>'L'+String(i).padStart(2,'0')));
 assert.equal(train.authority.publicSource,'Centauri-corp/ad-astra-public-source');
 assert.equal(train.authority.publicPr,61);
 assert.equal(train.authority.privatePr,161);
 assert.equal(train.authority.privateCandidateBranch,'upgrade/ad-astra-one-production-flow-20261121');
 assert.deepEqual(train.authority.supersededPrivatePrs,[160]);
 assert.equal(train.authority.additionalApprovalLanes,false);
 assert.equal(train.authority.independentReleaseCaseRequired,true);
 assert.ok(train.phases.some(p=>p.name.includes('Original film')));
 assert.ok(train.phases.some(p=>p.name.includes('Products & Solutions')));
 assert.ok(train.phases.some(p=>p.name.includes('SEO')||p.name.includes('revenue')));
 assert.ok(train.phases.some(p=>p.name.includes('security')));
 assert.ok(train.phases.some(p=>p.name.includes('Immutable production artifact')));
 assert.ok(train.phases.every(p=>['STAGING_PASS','DESKTOP_PREVIEW_PASS','PARTIAL','NEEDS_EVIDENCE','BLOCKED'].includes(p.state)));
});

test('flagship product demonstrations are integrated into the same public frontend with no false customer claims',()=>{
 const home=read('public/index.html');
 const products=read('public/products/index.html');
 for(const file of ['public/graphics/flagship-proof.js','public/graphics/flagship-proof.css','public/graphics/cinematic-director.js','public/graphics/cinematic-journey.js','public/products/portfolio.json','api/ask.js','api/workspace.js','api/subscriptions.js','api/status.js','lib/auth.js','lib/release-gates.js']){
  assert.ok(fs.existsSync(path.join(root,file)),file);
 }
 for(const page of [home,products]){
  assert.ok(page.includes('data-proof-cinema'));
  assert.ok(page.includes('/graphics/flagship-proof.js'));
 }
 assert.equal(train.creative.flagship4.length,4);
 assert.ok(train.creative.flagship4.every(p=>fs.existsSync(path.join(root,'public'+p+'index.html'))));
 assert.equal(train.creative.original90sFilmRendered,false);
 assert.equal(film.status,'ARCHITECTURE_ONLY_NOT_RENDERED');
 assert.equal(media.videoAuditedAsPremiumFlagship,false);
 assert.equal(train.creative.commercialCutdownRightsAccepted,false);
});

test('commercial edit and historical staging never substitute for release credentials',()=>{
 assert.match(train.creative.commercial30sTimeline,/invideo[.]io/);
 assert.match(train.creative.commercial30sExportCard,/invideo[.]io/);
 assert.equal(train.finalDisposition,'PUBLIC_PRODUCTION_HOLD');
 assert.equal(train.automaticallyPromote,false);
 assert.equal(train.noSyntheticReceipts,true);
 assert.equal(train.noReusedDJISpaceXOrDocumentaryFootage,true);
 assert.ok(train.phases.filter(p=>p.blocksPromotion).length>=7);
 assert.equal(train.observations.domainVerified,false);
 assert.equal(train.observations.supabasePass,0);
 assert.equal(train.observations.supabaseAuthorities,0);
 assert.equal(release.publicLaunchEnabled,false);
 assert.equal(release.engineAvailable,false);
 assert.equal(release.customerWorkspace.productionAccepted,false);
 assert.equal(unit.publicLaunchEnabled,false);
 assert.equal(unit.productionPromotionAllowed,false);
 assert.equal(unit.customerExecutionEnabled,false);
 assert.equal(unit.billingEnabled,false);
 assert.equal(unit.indexingEnabled,false);
 assert.equal(media.publicDomainPromotion,false);
});
