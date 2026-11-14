'use strict';
const assert=require('node:assert/strict');
const control=require('../config/product-architecture-release-control.json');
const catalog=require('../config/public-product-families.json');
const source=require('../config/production-release-source.json');

function validate(){
  assert.equal(control.schema,'ad-astra-product-architecture-release-control/v1');
  assert.equal(control.company,'AD ASTRA');
  assert.equal(control.singlePublicCandidate.repository,source.repository);
  assert.equal(control.singlePublicCandidate.pullRequest,source.pullRequest);
  assert.equal(control.singlePublicCandidate.branch,source.branch);
  assert.equal(control.singlePublicCandidate.basePullRequest,source.base.pullRequest);
  assert.equal(control.singlePublicCandidate.baseBranch,source.base.branch);
  assert.equal(control.singlePublicCandidate.parallelCandidatesAllowed,false);
  assert.deepEqual(control.productFamilies,catalog.families.map(family=>family.id));
  assert.equal(new Set(control.productFamilies).size,control.productFamilies.length);
  assert.equal(control.productFamilies.length,6);
  assert.equal(control.capabilityBoundary.customerAiExecution,false);
  assert.equal(control.capabilityBoundary.billing,false);
  assert.equal(control.capabilityBoundary.crmWrites,false);
  assert.equal(control.capabilityBoundary.outboundMessaging,false);
  assert.equal(control.capabilityBoundary.globalAvailability,false);
  assert.deepEqual(control.controlledOrder.map(step=>step.order),[1,2,3,4,5,6,7]);
  assert.equal(new Set(control.controlledOrder.map(step=>step.id)).size,control.controlledOrder.length);
  for(const step of control.controlledOrder)assert.ok(step.requires.length&&['blocked','pending'].includes(step.state));
  return control;
}

if(require.main===module){const result=validate();console.log(`AD_ASTRA_PRODUCT_ARCHITECTURE_RELEASE_PASS families=${result.productFamilies.length} stages=${result.controlledOrder.length}`);}
module.exports={validate};
