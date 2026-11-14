'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {check}=require('../scripts/check-website-visual-release.cjs');
test('review previews remain available without fabricating visual approval',async()=>{
 assert.equal(await check({VERCEL_ENV:'preview'},()=>{throw Error('No production review required for preview');}),'visual-review-candidate');
});
test('a production build cannot silently skip pending or stale visual acceptance',async()=>{
 await assert.rejects(check({VERCEL_ENV:'production'},async()=>({visualAcceptance:{ready:false,missing:['stale source fingerprint']}})),/actual owner acceptance/);
});
test('visual approval grants no AI, billing, CRM, independent-code-review or release authorization',async()=>{
 assert.equal(await check({VERCEL_ENV:'production'},async()=>({visualAcceptance:{ready:true,missing:[]}})),'visual-accepted-other-release-evidence-still-required');
});
