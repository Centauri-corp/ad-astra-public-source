'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const home=read('public/index.html');
const products=read('public/products/index.html');
const js=read('public/graphics/flagship-proof.js');
const css=read('public/graphics/flagship-proof.css');
const release=JSON.parse(read('public/release-manifest.json'));

test('the website homepage and products share one first-class interactive proof stage',()=>{
 for(const html of [home,products]){
  assert.match(html,/data-proof-cinema/);
  assert.match(html,/id="flagship-proof"/);
  assert.match(html,/href="#flagship-proof"/);
  assert.match(html,/\/graphics\/flagship-proof\.css/);
  assert.match(html,/\/graphics\/flagship-proof\.js/);
  assert.match(html,/data-proof-canvas/);
  assert.match(html,/data-proof-advance/);
  assert.match(html,/data-proof-reset/);
  assert.match(html,/data-proof-evidence role="status" aria-live="polite"/);
  for(const mode of ['discovery','learning','visualize','govern'])
   assert.match(html,new RegExp('data-proof-select="'+mode+'"'));
  assert.ok(html.indexOf('data-proof-cinema')<html.indexOf('lumen-intelligence-bridge') || html.includes('editorial-chapter-rail'));
 }
 assert.ok(home.indexOf('data-proof-cinema')<home.indexOf('lumen-intelligence-bridge'));
 assert.ok(products.indexOf('data-proof-cinema')<products.indexOf('editorial-chapter-rail'));
});

test('four real local simulation modes are distinct, interactive and release truthful',()=>{
 for(const name of ['discovery','learning','visualize','govern'])
  assert.match(js,new RegExp(name+'\\s*:\\s*\\{'));
 assert.match(js,/function discovery\(/);
 assert.match(js,/function learning\(/);
 assert.match(js,/function surface\(/);
 assert.match(js,/function governance\(/);
 assert.match(js,/function forward\(/);
 assert.match(js,/function restart\(/);
 assert.match(js,/Math\.sin/);
 assert.match(js,/getContext\('2d'/);
 assert.match(js,/title\.textContent=item\.name/);
 assert.match(js,/Object\.hasOwn\(chapters,next\)/);
 assert.match(js,/aria-pressed/);
 assert.match(js,/data-proof-cinema/);
 assert.match(js,/ArrowRight/);
 assert.match(js,/canvas\.setAttribute\('tabindex','0'\)/);
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|navigator\.mediaDevices|speechSynthesis/);
});

test('simulation has bounded rendering, low motion, data saver and page visibility controls',()=>{
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.match(js,/navigator\.connection\?\.saveData/);
 assert.match(js,/Math\.min\(window\.devicePixelRatio\|\|1,saveData\?1:1\.5\)/);
 assert.match(js,/now-last>=33/);
 assert.match(js,/IntersectionObserver/);
 assert.match(js,/document\.hidden/);
 assert.match(js,/cancelAnimationFrame/);
 assert.match(js,/ResizeObserver/);
 assert.match(js,/pagehide/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('graphics still fail closed for unfinished film and unaccepted live product fulfillment',()=>{
 assert.equal(release.publicLaunchEnabled,false);
 assert.equal(release.engineAvailable,false);
 assert.equal(release.filmPublicPlayback,false);
 assert.deepEqual(release.indexableRoutes,[]);
 assert.match(home,/90-second flagship film remains in production/);
 assert.match(products,/no public AI, customer data, or financial transactions are executed/);
 const film=JSON.parse(read('config/ad-astra-original-cinematic-film.v1.json'));
 assert.equal(film.status,'ARCHITECTURE_ONLY_NOT_RENDERED');
 const media=JSON.parse(read('public/graphics/cinematic-media-manifest.json'));
 assert.equal(media.videoAuditedAsPremiumFlagship,false);
 assert.equal(media.publicDomainPromotion,false);
});
test('mobile and assistive presentation remain source-bound, keyboard-readable and motion-optional',()=>{
 assert.doesNotThrow(()=>new vm.Script(js,{filename:'flagship-proof.js'}));
 for(const html of [home,products]){
  assert.match(html,/data-proof-motion aria-pressed="false"/);
  assert.match(html,/id="proof-scene-description" data-proof-accessible/);
  assert.match(html,/aria-describedby="proof-scene-description"/);
  assert.match(html,/tabindex="0"/);
 }
 assert.match(js,/const motionControl=root\.querySelector/);
 assert.match(js,/const accessibleSummary=root\.querySelector/);
 assert.match(js,/motionControl\?\.addEventListener\('click'/);
 assert.match(js,/motionControl\.setAttribute\('aria-pressed',String\(animated\)\)/);
 assert.match(js,/accessibleSummary\.textContent=item\.name/);
 assert.match(js,/canvas\.setAttribute\('aria-label'/);
 assert.match(js,/const compact=width<520/);
 assert.match(js,/width<480\?14:width<820\?18:24/);
 assert.match(js,/width<480 && i%2===1/);
 assert.match(js,/setMotion\(!reduced\.matches&&!saveData&&window\.innerWidth>=900\)/);
 assert.match(js,/if\(animated && !on\)angle\+=/);
 assert.match(css,/\.proof-visual canvas:focus-visible/);
 assert.match(css,/\.proof-screenreader/);
 assert.match(css,/@media\(max-width:420px\)/);
});
