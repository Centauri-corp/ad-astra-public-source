'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {assessVisualRelease,REQUIRED_SLOTS}=require('../lib/graphics-evidence-gate.cjs');
const nowMs=Date.parse('2026-11-05T12:00:00.000Z');
const head='a'.repeat(40),merged='b'.repeat(40),digest='c'.repeat(64);
const tenant='11111111-1111-4111-8111-111111111111';
const author='22222222-2222-4222-8222-222222222222';
const reviewer='33333333-3333-4333-8333-333333333333';
function asset(slot,n){
  const versionId='44444444-4444-4444-8444-44444444444'+n;
  const bucket=slot==='film'?'astra-video-private':'astra-graphics-private';
  const path=tenant+'/'+versionId+'/output';
  return {slot,tenantId:tenant,versionId,sha256:digest,storageBucket:bucket,storagePath:path,
    objectEvidence:{verifiedBy:'server',exists:true,sha256:digest,tenantId:tenant,versionId,bytesVerified:42,storageBucket:bucket,storagePath:path,checkedAt:'2026-11-05T11:00:00Z'},
    rights:{status:'approved',sourceRef:'asset-source-ref/verified',licenseRef:'license-ref/2026'},
    review:{status:'approved',versionId,boundSha256:digest,creatorId:author,reviewerId:reviewer,decidedAt:'2026-11-04T15:00:00Z'},
    qa:{versionId,boundSha256:digest,visual:true,accessibility:true,playback:true,captions:true,audio:true}};
}
function fixture(){return {
  schemaVersion:1,tenantId:tenant,source:{headSha:head,mergedMainSha:merged,branch:'main'},
  ci:{source:true,security:true,chromium:true,webkit:true,accessibility:true,performance:true,scannedSha:merged},
  independentSourceReview:{status:'approved',authorId:author,reviewerId:reviewer,reviewedHeadSha:head,decidedAt:'2026-11-04T15:00:00Z'},
  assets:REQUIRED_SLOTS.map(asset),
  modelAccounting:{unreconciledCalls:0,providerReceiptsMissingCost:0},
  budget:{verified:true,verifiedAt:'2026-11-05T11:00:00Z',period:'2026-11',ceilingCents:50000},
  runtimeFlags:{customerAiEnabled:false,billingEnabled:false,checkoutEnabled:false,externalActionsEnabled:false,externalPublicationEnabled:false,filmPremiereEnabled:false,paidProvidersEnabled:false},
  deployment:{target:'production',state:'READY',sourceSha:merged,smokeTestedSha:merged,smokePassed:true,rollbackVerified:true,rollbackDeploymentId:'dpl_1234567890123456',aliasUnchangedBeforePromotion:true}
};}
const verdict=d=>assessVisualRelease(d,{nowMs});
test('empty evidence blocks publication and authorizes no action',()=>{
  const r=verdict({});assert.equal(r.productionEligible,false);assert.equal(r.authorizesExternalAction,false);
  assert.ok(r.reasonCodes.includes('BUDGET_BASELINE_NOT_VERIFIED'));
});
test('a consistent offline fixture cannot authorize or establish production eligibility',()=>{
  const r=verdict(fixture());assert.equal(r.evidenceConsistent,true);
  assert.equal(r.productionEligible,false);assert.equal(r.authorizesExternalAction,false);
  assert.equal(r.verdict,'EVIDENCE_CONSISTENT_AWAITING_AUTHORITATIVE_RELEASE_REVIEW');
});
test('no customer AI or billing enabled during visual release',()=>{
  const x=fixture();x.runtimeFlags.customerAiEnabled=true;x.runtimeFlags.billingEnabled=true;
  const r=verdict(x);assert.equal(r.productionEligible,false);
  assert.ok(r.reasonCodes.includes('RUNTIME_GATE_NOT_CLOSED_CUSTOMERAIENABLED'));
});
test('unsettled usage and unverified baseline block',()=>{
  const x=fixture();x.modelAccounting.unreconciledCalls=2;x.budget.verified=false;
  const r=verdict(x);assert.ok(r.reasonCodes.includes('MODEL_COST_RECONCILIATION_INCOMPLETE'));
  assert.ok(r.reasonCodes.includes('BUDGET_BASELINE_NOT_VERIFIED'));
});
test('wrong object hash, tenant or storage bucket blocks',()=>{
  const x=fixture();x.assets[0].objectEvidence.sha256='f'.repeat(64);
  x.assets[1].tenantId='99999999-9999-4999-8999-999999999999';
  x.assets[2].storageBucket='public';
  const r=verdict(x);for(const code of ['ASSET_STORAGE_EVIDENCE_MISSING','ASSET_TENANT_OR_VERSION_INVALID','ASSET_PRIVATE_STORAGE_INVALID'])
    assert.ok(r.reasonCodes.includes(code));
});
test('self approval and hash mismatches block',()=>{
  const x=fixture();x.assets[0].review.reviewerId=author;
  x.assets[1].review.boundSha256='f'.repeat(64);x.independentSourceReview.reviewerId=author;
  const r=verdict(x);assert.ok(r.reasonCodes.includes('ASSET_INDEPENDENT_REVIEW_MISSING'));
  assert.ok(r.reasonCodes.includes('INDEPENDENT_SOURCE_REVIEW_MISSING'));
});
test('missing film rights and captions fail',()=>{
  const x=fixture();x.assets[2].rights.status='pending';x.assets[2].qa.captions=false;
  const r=verdict(x);assert.ok(r.reasonCodes.includes('ASSET_RIGHTS_NOT_VERIFIED'));
  assert.ok(r.reasonCodes.includes('ASSET_QA_NOT_COMPLETE'));
});
test('preview or mismatched production commit cannot pass',()=>{
  const x=fixture();x.deployment.target='staging';x.deployment.smokeTestedSha=head;
  assert.ok(verdict(x).reasonCodes.includes('EXACT_PRODUCTION_STAGE_NOT_VERIFIED'));
});
test('source checks and review are bound to exact commits',()=>{
  const x=fixture();x.ci.webkit=false;x.ci.scannedSha=head;
  x.independentSourceReview.decidedAt='2026-09-01T12:00:00Z';
  const r=verdict(x);for(const code of ['CI_WEBKIT_MISSING','CI_NOT_BOUND_TO_MERGED_COMMIT','INDEPENDENT_SOURCE_REVIEW_MISSING'])
    assert.ok(r.reasonCodes.includes(code));
});
test('missing required graphic slots do not pass',()=>{
  const x=fixture();x.assets=[];const r=verdict(x);
  for(const slot of REQUIRED_SLOTS)assert.ok(r.reasonCodes.includes('ASSET_SLOT_'+slot.toUpperCase()+'_NOT_VERIFIED'));
});
test('storage receipts and QA must bind the same tenant, version and bytes',()=>{
  const x=fixture();x.assets[0].storagePath='other/'+x.assets[0].versionId+'/output';
  x.assets[1].objectEvidence.versionId=tenant;x.assets[1].objectEvidence.bytesVerified=0;
  x.assets[2].qa.boundSha256='f'.repeat(64);
  const r=verdict(x);for(const code of ['ASSET_PRIVATE_STORAGE_INVALID','ASSET_STORAGE_EVIDENCE_MISSING','ASSET_QA_NOT_COMPLETE'])
    assert.ok(r.reasonCodes.includes(code));
});
test('encoded storage paths do not enter the release evidence contract',()=>{
  const x=fixture();x.assets[0].storagePath=tenant+'/'+x.assets[0].versionId+'/%2e%2e/output';
  assert.ok(verdict(x).reasonCodes.includes('ASSET_PRIVATE_STORAGE_INVALID'));
});
