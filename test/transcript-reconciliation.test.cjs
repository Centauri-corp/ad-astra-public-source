'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const ledger=require('../governance/transcript-codex-reconciliation.json');
test('historical records never confer execution authority',()=>{
 assert.equal(ledger.executionAuthorized,false);
 assert.equal(ledger.authority,'historical-evidence-only');
 Object.values(ledger.rules).forEach(value=>assert.equal(value,true));
});
test('retrieved source scopes are explicitly bounded',()=>{
 assert.ok(ledger.sources.some(s=>s.id==='transcript-index'&&s.scope.includes('not complete')));
 assert.ok(ledger.sources.some(s=>s.id==='github-pr22'&&s.status==='open'));
});
test('all unverified or gated capabilities remain non-public',()=>{
 for(const row of ledger.reconciled) {
   if(['transcript-only','implementation-unverified','proposed','historical-needs-reverification'].includes(row.status)) {
     assert.notEqual(row.release,'live');
   }
 }
});
