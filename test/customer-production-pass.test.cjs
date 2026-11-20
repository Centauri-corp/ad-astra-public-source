'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const result=spawnSync(process.execPath,[path.resolve(__dirname,'../scripts/check-customer-production-pass.cjs')],{encoding:'utf8',timeout:15000});
test('unified website product service design contract is structurally aligned and HOLD',()=>{
 assert.equal(result.status,0,result.stderr||result.stdout);
 assert.match(result.stdout,/production HOLD/);
});
