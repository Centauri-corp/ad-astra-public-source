'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const unit=JSON.parse(read('config/continuous-public-release-unit.json'));

test('one continuous public release unit is review-only with no unearned rights',()=>{
 assert.equal(unit.schema,'ad-astra/continuous-public-release-unit/v1');
 assert.equal(unit.sourceRepository,'Centauri-corp/ad-astra-public-source');
 assert.equal(unit.privateGovernor,'Centauri-corp/ad-astra-internal-source');
 for(const key of ['publicLaunchEnabled','customerExecutionEnabled','externalCrmWritesEnabled','billingEnabled','indexingEnabled','productionPromotionAllowed'])assert.equal(unit[key],false,key);
 assert.equal(unit.reviewOnly,true);
 assert.equal(unit.chapters.length,5);
 assert.deepEqual(unit.expandedRoutes,['/journey/','/scientific/']);
 const manifest=JSON.parse(read('public/release-manifest.json'));
 assert.equal(manifest.publicLaunchEnabled,false);
 assert.equal(manifest.engineAvailable,false);
});

test('public journey and scientific studio are served as real HTML routes',()=>{
 for(const route of [...unit.chapters.map(x=>x.path),...unit.expandedRoutes]){
  const file=route==='/'?'public/index.html':'public'+route+'index.html';
  const html=read(file);
  assert.match(html,/rel="canonical"/);
  if(route!=='/')assert.match(html,/name="robots" content="noindex,follow"/);
  assert.match(html,/Ad Astra|AD ASTRA|Astra/);
 }
 const journey=read('public/journey/index.html');
 const science=read('public/scientific/index.html');
 assert.match(journey,/data-cinematic-host/);
 assert.match(journey,/data-cinematic-journey/);
 assert.match(journey,/href="\/scientific\/"/);
 for (const i of [0,1,2])assert.match(journey,new RegExp('data-cinematic-layer="'+i+'"'));
 assert.match(science,/src="\/scientific\/scene-model\.js"/);
 assert.match(science,/src="\/scientific\/viewer\.js"/);
 for(const id of ['scientific-surface','scientific-time','scientific-time-value','scientific-left','scientific-right','scientific-animation','scientific-surface-caption'])assert.ok(science.includes('id="'+id+'"'),id);
});

test('homepage and products link to the one journey and studio',()=>{
 assert.match(read('public/index.html'),/href="\/journey\/"/);
 assert.match(read('public/products/index.html'),/href="\/scientific\/"/);
 assert.match(read('public/journey/entry.css'),/prefers-reduced-motion/);
 assert.match(read('public/scientific/studio.css'),/prefers-reduced-motion/);
 assert.match(read('public/graphics/cinematic-journey.js'),/webglcontextlost/);
 assert.match(read('public/scientific/scene-model.js'),/normalized illustrative units/);
});
