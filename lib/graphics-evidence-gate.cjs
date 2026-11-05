'use strict';
// Read-only visual release gate. This code cannot grant access or modify production.
const SHA40=/^[a-f0-9]{40}$/i, SHA256=/^[a-f0-9]{64}$/i;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const REQUIRED_SLOTS=Object.freeze(['neural','products','film']);
const NO_PUBLIC_ACTIONS=Object.freeze(['customerAiEnabled','billingEnabled','checkoutEnabled','externalActionsEnabled','externalPublicationEnabled','filmPremiereEnabled','paidProvidersEnabled']);
function recent(value,now,maxAge=86400000) {
  const time=typeof value==='string'?Date.parse(value):NaN;
  return Number.isFinite(time)&&time<=now&&time>=now-maxAge;
}
function safePath(value) {
  return typeof value==='string'&&value.length>2&&value.length<=500&&!value.startsWith('/')
    &&!value.includes('\\')&&!value.includes('..')&&!value.includes('//')
    &&!/[?#\u0000-\u001f]/.test(value);
}
function assessVisualRelease(snapshot,options={}) {
  const now=options.nowMs===undefined?Date.now():options.nowMs;
  if(!Number.isFinite(now)) throw new TypeError('Invalid audit timestamp');
  const d=snapshot&&typeof snapshot==='object'&&!Array.isArray(snapshot)?snapshot:{};
  const reasons=[],seen=new Set();
  function fail(x){if(!seen.has(x)){seen.add(x);reasons.push(x);}}
  if(d.schemaVersion!==1)fail('SNAPSHOT_SCHEMA_INVALID');
  if(!UUID.test(d.tenantId||''))fail('TENANT_BINDING_MISSING');
  const src=d.source||{};
  if(!SHA40.test(src.headSha||'')||!SHA40.test(src.mergedMainSha||''))fail('SOURCE_SHA_MISSING');
  if(src.branch!=='main')fail('PROTECTED_MAIN_NOT_MERGED');
  const ci=d.ci||{};
  for(const k of ['source','security','chromium','webkit','accessibility','performance'])
    if(ci[k]!==true)fail('CI_'+k.toUpperCase()+'_MISSING');
  if(!src.mergedMainSha||ci.scannedSha!==src.mergedMainSha)fail('CI_NOT_BOUND_TO_MERGED_COMMIT');
  const review=d.independentSourceReview||{};
  if(review.status!=='approved'||!UUID.test(review.reviewerId||'')
    ||!UUID.test(review.authorId||'')||review.reviewerId===review.authorId
    ||review.reviewedHeadSha!==src.headSha||!recent(review.decidedAt,now,1209600000))
    fail('INDEPENDENT_SOURCE_REVIEW_MISSING');
  const assets=Array.isArray(d.assets)?d.assets:[];
  for(const slot of REQUIRED_SLOTS) {
    const matches=assets.filter(a=>a&&a.slot===slot);
    if(matches.length!==1){fail('ASSET_SLOT_'+slot.toUpperCase()+'_NOT_VERIFIED');continue;}
    const a=matches[0],bucket=slot==='film'?'astra-video-private':'astra-graphics-private';
    if(a.tenantId!==d.tenantId||!UUID.test(a.versionId||''))fail('ASSET_TENANT_OR_VERSION_INVALID');
    if(!SHA256.test(a.sha256||''))fail('ASSET_CONTENT_HASH_INVALID');
    if(a.storageBucket!==bucket||!safePath(a.storagePath))fail('ASSET_PRIVATE_STORAGE_INVALID');
    const obj=a.objectEvidence||{};
    if(obj.verifiedBy!=='server'||obj.exists!==true||obj.sha256!==a.sha256
      ||obj.storageBucket!==bucket||obj.storagePath!==a.storagePath
      ||!recent(obj.checkedAt,now))fail('ASSET_STORAGE_EVIDENCE_MISSING');
    const rights=a.rights||{};
    if(rights.status!=='approved'||typeof rights.sourceRef!=='string'||rights.sourceRef.length<12
      ||typeof rights.licenseRef!=='string'||rights.licenseRef.length<8)fail('ASSET_RIGHTS_NOT_VERIFIED');
    const r=a.review||{};
    if(r.status!=='approved'||r.versionId!==a.versionId||r.boundSha256!==a.sha256
      ||!UUID.test(r.reviewerId||'')||!UUID.test(r.creatorId||'')
      ||r.reviewerId===r.creatorId||!recent(r.decidedAt,now,7776000000))
      fail('ASSET_INDEPENDENT_REVIEW_MISSING');
    const qa=a.qa||{};
    if(qa.visual!==true||qa.accessibility!==true
      ||(slot==='film'&&(qa.playback!==true||qa.captions!==true||qa.audio!==true)))
      fail('ASSET_QA_NOT_COMPLETE');
  }
  if(assets.length!==REQUIRED_SLOTS.length)fail('UNREVIEWED_OR_DUPLICATED_ASSETS');
  const money=d.modelAccounting||{};
  if(!Number.isSafeInteger(money.unreconciledCalls)||money.unreconciledCalls!==0
    ||!Number.isSafeInteger(money.providerReceiptsMissingCost)||money.providerReceiptsMissingCost!==0)
    fail('MODEL_COST_RECONCILIATION_INCOMPLETE');
  const budget=d.budget||{};
  if(budget.verified!==true||!recent(budget.verifiedAt,now)
    ||budget.ceilingCents!==50000||budget.period!==new Date(now).toISOString().slice(0,7))
    fail('BUDGET_BASELINE_NOT_VERIFIED');
  const flags=d.runtimeFlags||{};
  for(const key of NO_PUBLIC_ACTIONS)if(flags[key]!==false)fail('RUNTIME_GATE_NOT_CLOSED_'+key.toUpperCase());
  const deploy=d.deployment||{};
  if(deploy.target!=='production'||deploy.state!=='READY'
    ||deploy.sourceSha!==src.mergedMainSha||deploy.smokeTestedSha!==src.mergedMainSha
    ||deploy.smokePassed!==true||deploy.rollbackVerified!==true
    ||!/^dpl_[A-Za-z0-9]{12,}$/.test(deploy.rollbackDeploymentId||'')
    ||deploy.aliasUnchangedBeforePromotion!==true)fail('EXACT_PRODUCTION_STAGE_NOT_VERIFIED');
  return Object.freeze({
    schemaVersion:1,verdict:reasons.length?'BLOCKED':'ELIGIBLE_FOR_FINAL_HUMAN_PROMOTION',
    productionEligible:reasons.length===0,reasonCodes:Object.freeze(reasons),
    requiredSlots:REQUIRED_SLOTS,informationalOnly:true,authorizesExternalAction:false
  });
}
module.exports={assessVisualRelease,REQUIRED_SLOTS};