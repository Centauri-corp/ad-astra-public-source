'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
const engine = fs.readFileSync(path.join(root,'public/graphics/cinematic-journey.js'),'utf8');
const html = fs.readFileSync(path.join(root,'public/products/index.html'),'utf8');

test('Arrival, Science and Solutions have explicit scene-dependent material geometry',()=>{
  for (const key of ['scienceMask','solutionsMask','lattice','scientificSurface','industrialSurface']) {
    assert.match(engine,new RegExp(key));
  }
  assert.match(engine,/surface=mix\(surface,scientificSurface,scienceMask/);
  assert.match(engine,/surface=mix\(surface,industrialSurface,solutionsMask/);
  for (const [i,label] of [[0,'Arrival'],[1,'Science'],[2,'Solutions']]) {
    assert.match(html,new RegExp('data-cinematic-layer="'+i+'"[^>]*>'+label,'i'));
  }
});
test('scene variants preserve explicit human controls, low-resource behavior and provenance',()=>{
  assert.match(engine,/prefers-reduced-motion/);
  assert.match(engine,/saveData/);
  assert.match(engine,/ad-astra:scene-change/);
  assert.match(engine,/webglcontextlost/);
  assert.match(html,/Synthetic demonstration/);
});
