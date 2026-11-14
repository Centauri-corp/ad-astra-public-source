'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {applySharedShell,header,picture}=require('../scripts/lib/site-shell.cjs');
const root=path.join(__dirname,'..'),collection=require('../config/story-collection.json');
const manifest=require('../public/assets/story/manifest.json');
test('six original story assets bind story roles, responsive bytes, provenance and pending approvals',()=>{
 assert.deepEqual(manifest.assets.map(a=>a.id),collection.assets.map(a=>a.id));assert.equal(manifest.assets.length,6);
 assert.equal(manifest.releaseAuthorization,false);assert.equal(manifest.conceptArt,true);
 for(const asset of manifest.assets){
  assert.ok(asset.chapter&&asset.alt&&asset.claimBoundary&&asset.intendedRoutes.length);assert.equal(asset.humanVisualApproval,null);assert.equal(asset.rightsApproval,null);assert.equal(asset.releaseAuthorization,false);
  assert.deepEqual(asset.exports.map(e=>e.width),[960,1672]);
  for(const item of asset.exports){const bytes=fs.readFileSync(path.join(root,'public',item.path));assert.equal(bytes.length,item.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sha256);assert.ok(item.width<=asset.source.width);assert.ok(item.bytes<650000,'Image exceeds the per-export delivery budget: '+item.path);}
 }
});
test('shared chrome migration is idempotent and preserves main body and security metadata',()=>{
 const original='<html><head><meta name="robots" content="noindex,follow"></head><body><header>Old</header><main id="main"><form>Unchanged customer surface</form></main><footer>Old</footer></body></html>';
 const next=applySharedShell(original,'/products/');assert.equal(applySharedShell(next,'/products/'),next);
 assert.ok(next.includes('<main id="main"><form>Unchanged customer surface</form></main>'));assert.ok(next.includes('name="robots" content="noindex,follow"'));
 assert.equal((next.match(/src="\/design-system.js"/g)||[]).length,1);assert.equal((next.match(/href="\/design-system.css"/g)||[]).length,1);
 assert.ok(header('/products/').includes('href="/products/" aria-current="page"'));assert.throws(()=>applySharedShell('<main>Not a page shell</main>','/'));
});
test('story pages are non-executing, complete without script and explicit about research and regions',()=>{
 for(const route of ['','intelligence/','services/']){
  const html=fs.readFileSync(path.join(root,'public',route,'index.html'),'utf8');
  assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.ok(!/<input|<textarea|<audio|<iframe|<form\b/.test(html));if(route)assert.ok(!/<video\b/.test(html));assert.ok(!html.includes('src="/app.js"'));assert.ok(html.includes('src="/companion/app.js"'));assert.ok(html.includes('noindex,follow'));assert.ok(html.includes('/status/'));assert.ok(html.includes('Concept art')||html.includes('Conceptual artwork'));
 }
 const home=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
 for(const asset of collection.assets.filter(a=>a.id!=='intelligence'))assert.ok(home.includes('/assets/story/'+asset.id+'-1672.webp'));
 const signature=require('../projects/website-customer-experience/asset-selections.json').assets.find(a=>a.id==='neural-core');
 assert.ok(home.includes('src="'+signature.src+'"'));
 assert.ok(home.includes('No regions are currently approved'));assert.ok(home.includes('AGI is not achieved'));assert.ok(home.includes('ASI is not achieved'));
 assert.ok(picture('vision','<script>alert(1)</script>').includes('&lt;script&gt;'));
 const js=fs.readFileSync(path.join(root,'public/design-system.js'),'utf8');assert.ok(!/fetch\(|getUserMedia|localStorage|SpeechRecognition|XMLHttpRequest/.test(js));
 const css=fs.readFileSync(path.join(root,'public/design-system.css'),'utf8');assert.ok(css.includes('prefers-reduced-motion:reduce'));assert.ok(css.includes('[hidden]'));
});
test('new neural artwork has source-bound responsive exports within the delivery budget',()=>{
 const art=require('../public/assets/experience/manifest.json');
 assert.equal(art.releaseAuthorization,false);assert.equal(art.humanVisualApproval,null);
 for(const item of art.exports){
  const bytes=fs.readFileSync(path.join(root,'public',item.path));
  assert.ok(item.width<=art.source.width);assert.ok(bytes.length<250000);
  assert.equal(bytes.length,item.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sha256);
 }
});
