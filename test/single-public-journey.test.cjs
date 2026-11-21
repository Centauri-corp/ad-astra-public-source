'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const journey = require('../public/journey/continuity.js');
test('one canonical public customer sequence with bounded links', () => {
  assert.deepEqual(journey.steps.map(s => s.id), ['arrival','intelligence','life','products','workspace']);
  assert.equal(journey.nextStep('arrival').id,'intelligence');
  assert.equal(journey.nextStep('workspace'),null);
  assert.equal(journey.getStep('publish'),null);
  assert.equal(journey.safeStepFromHash('#unknown').id,'arrival');
  for (const s of journey.steps) {
    assert.match(s.href,/^\/(?!\/)/);
    const route=s.href==='/'?'index.html':path.join(s.href.slice(1),'index.html');
    assert.ok(fs.existsSync(path.join(__dirname,'../public',route)), 'Missing route: '+s.href);
  }
});
test('journey cannot confer payment, release, deployment or model authority',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../public/journey/continuity.js'),'utf8');
 assert.doesNotMatch(source,/fetch\(|localStorage|checkout|stripe|supabase|secret|modelCall|eval\(/i);
 assert.equal(journey.getStep('__proto__'),null);
});
