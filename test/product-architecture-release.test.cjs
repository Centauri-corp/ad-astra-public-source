'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {validate}=require('../scripts/validate-product-architecture-release.cjs');

test('one controlled product architecture chain is internally consistent',()=>{
 const control=validate();
 assert.equal(control.singlePublicCandidate.parallelCandidatesAllowed,false);
 assert.equal(control.controlledOrder[0].id,'source-reconciliation');
 assert.equal(control.controlledOrder.at(-1).id,'scoped-public-enablement');
});
