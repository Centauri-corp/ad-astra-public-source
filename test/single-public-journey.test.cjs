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

test('Life entry integrates public-only journey scripts and next-step link',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/life/index.html'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../public/life/style.css'),'utf8');
 assert.match(html,/src="\/journey\/continuity\.js"/);
 assert.match(html,/src="\/journey\/navigation\.js"/);
 assert.match(html,/data-current-journey="life"/);
 assert.match(html,/data-next-journey/);
 assert.match(css,/aria-current="step"/);
 assert.match(html,/name="robots" content="noindex,follow"/);
 const adapter=fs.readFileSync(path.join(__dirname,'../public/journey/navigation.js'),'utf8');
 assert.match(adapter,/replaceChildren\(nav\)/);
 assert.doesNotMatch(adapter,/fetch\(|localStorage|stripe|supabase|checkout|eval\(/i);
});

test('graphics products destination uses canonical universal stage, not services market landing',()=>{
  assert.equal(journey.getStep('products').href,'/products/');
  const html=fs.readFileSync(path.join(__dirname,'../public/products/index.html'),'utf8');
  assert.match(html,/id="universal-stage"/);
  const life=fs.readFileSync(path.join(__dirname,'../public/life/index.html'),'utf8');
  assert.match(life,/data-next-journey href="\/products\/"/);
});
