'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('one shared cinematic visual across homepage, journey and products has accessible human controls',()=>{
  for(const p of ['public/index.html','public/journey/index.html','public/products/index.html']){
    const html=read(p);
    assert.match(html,/data-cinematic-journey role="img" tabindex="0"/,p);
    for(const n of [0,1,2])assert.match(html,new RegExp('data-cinematic-layer="'+n+'"'),p);
    assert.match(html,/data-cinematic-reset aria-label="Reset spatial camera and perspective"/,p);
    assert.match(html,/name="robots" content="noindex,follow"/,p);
  }
  assert.match(read('public/index.html'),/href="\/scientific\/"/);
});

test('static fallback, reduced motion and device limits preserve scene control without GPU promotion',()=>{
  const engine=read('public/graphics/cinematic-journey.js');
  const evolution=read('public/graphics/evolution.js');
  assert.match(engine,/ad-astra:request-scene/);
  assert.match(engine,/updateScene\(host\.dataset\.cinematicScene\|\|'0','static'\)/);
  assert.match(engine,/resetButton\?\.addEventListener\('click',resetView\)/);
  assert.match(engine,/canvas\.addEventListener\('keydown'/);
  assert.match(engine,/Number\.isInteger\(index\)/);
  assert.match(engine,/cinematic-fallback/);
  assert.doesNotMatch(engine,/buttons\.forEach\(control => \{ control\.disabled = true/);
  assert.match(evolution,/ad-astra:request-scene/);
  assert.doesNotMatch(evolution,/\.click\(\)/);
  assert.match(evolution,/sessionStorage/);
  const policy=JSON.parse(read('config/continuous-public-release-unit.json'));
  assert.equal(policy.reviewOnly,true);
  assert.equal(policy.publicLaunchEnabled,false);
  assert.equal(policy.customerExecutionEnabled,false);
  assert.equal(policy.billingEnabled,false);
  assert.equal(policy.productionPromotionAllowed,false);
  assert.equal(policy.visualInteractionUpgrade.customerRuntimeEnabled,false);
});

test('four product directions select one of the existing three approved cinematic scenes',()=>{
 const html=read('public/products/index.html');
 const expected=[['beyond-physics',1],['astra-lumen',0],['neural-visual-experience',1],['governed-workflows',2]];
 for(const [id,scene] of expected){
  assert.match(html,new RegExp('data-product-direction="'+id+'" data-cinematic-target="'+scene+'"'),id);
 }
 assert.equal((html.match(/data-product-direction="/g)||[]).length,4);
 assert.match(html,/data-product-mode role="status" aria-live="polite"/);
 const controller=read('public/products/app.js');
 assert.match(controller,/ad-astra:request-scene/);
 assert.match(controller,/fromVisitor&&cinematic/);
 assert.match(controller,/dataset\.cinematicTarget/);
 assert.doesNotMatch(controller,/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|eval\(/);
});
