'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const portfolio=JSON.parse(read('public/products/portfolio.json'));
const release=JSON.parse(read('public/release-manifest.json'));
const publicUnit=JSON.parse(read('config/continuous-public-release-unit.json'));
const page=read('public/products/index.html');
const filter=read('public/products/portfolio.js');
const style=read('public/products/portfolio.css');
const demo=read('public/products/product-demo.js');
const graphics=require('../lib/products-solutions-graphics.cjs');
const ids=['beyond-physics','astra-lumen','neural-visual-experience','governed-workflows'];
test('one authoritative public portfolio identifies four products, 12 capabilities, three Life products and 15 market directions',()=>{
 assert.equal(portfolio.schema,'ad-astra/products-solutions-portfolio/v1');
 assert.deepEqual(portfolio.flagship.map(p=>p.id),ids);
 assert.deepEqual(Object.keys(graphics.PRODUCT_SCENES),ids);
 assert.equal(portfolio.capabilities.length,12);
 assert.equal(portfolio.life.length,3);
 assert.equal(portfolio.markets.length,15);
 assert.equal(new Set(portfolio.markets.map(x=>x.route)).size,15);
 assert.equal(new Set(portfolio.capabilities.map(x=>x.id)).size,12);
 assert.equal(new Set(portfolio.flagship.map(x=>x.primary)).size,4);
});
test('every flagship has an independently linkable cinematic product page and accurate concept claims',()=>{
 for(const p of portfolio.flagship){
  const file='public'+p.primary+'index.html';
  assert.ok(exists(file),file);
  const html=read(file);
  assert.match(html,/name="robots" content="noindex,follow"/);
  assert.ok(html.includes('<title>'+p.name+' — Products &amp; Solutions | Ad Astra</title>'));
  assert.ok(html.includes('https://adastra.global'+p.primary));
  assert.ok(html.includes(p.summary));
  assert.ok(html.includes(p.outcome));
  assert.ok(html.includes('src="'+p.image+'"'));
  assert.ok(html.includes('id="demonstration"'));
  assert.ok(html.includes('id="access"'));
  assert.ok(html.includes('No checkout is enabled'));
  assert.ok(html.includes('/workspace/'));
  assert.ok(html.includes('/pricing/'));
  assert.ok(html.includes('Not a verified customer deployment')||html.includes('not a verified customer deployment')||html.includes('Conceptual demonstration'));
  assert.ok(page.includes('href="'+p.primary+'"'),p.primary);
 }
});
test('flagship demonstrations are either real synthetic camera controls or explicitly local, bounded interactions',()=>{
 const science=read('public/products/neural-visual-experience/index.html');
 assert.match(science,/id="scientific-surface"/);
 assert.match(science,/src="\/scientific\/scene-model\.js"/);
 assert.match(science,/src="\/scientific\/viewer\.js"/);
 for(const id of ids.filter(id=>id!=='neural-visual-experience')){
  const html=read('public/products/'+id+'/index.html');
  assert.match(html,/data-demo-kind=/);
  assert.match(html,/data-demo-step=/);
  assert.match(html,/src="\/products\/product-demo\.js"/);
 }
 for(const id of ids.filter(id=>id!=='neural-visual-experience'))assert.ok(demo.includes("'"+id+"'"));
 assert.match(demo,/aria-pressed/);
 assert.match(demo,/ArrowRight/);
 assert.match(demo,/Home/);
 assert.doesNotMatch(demo,/\bfetch\s*\(|XMLHttpRequest|navigator\.mediaDevices|localStorage|sessionStorage|sendBeacon/);
});
test('catalog is accessible, page-linked, progressively filterable and always review-only',()=>{
 for(const p of portfolio.flagship)assert.ok(page.includes('data-audiences="'+p.audiences.join(' ')+'"'));
 for(const p of portfolio.capabilities)assert.ok(page.includes('>'+p.name+'</strong>'));
 for(const p of portfolio.life)assert.ok(page.includes('<h4>'+p.name+'</h4>'));
 for(const p of portfolio.markets)assert.ok(page.includes('href="'+p.route+'"'));
 assert.match(page,/aria-label="Filter flagship product directions"/);
 assert.match(page,/data-portfolio-count role="status" aria-live="polite"/);
 assert.match(filter,/card.hidden=!visible/);
 assert.match(filter,/aria-pressed/);
 assert.match(style,/@media\(max-width:700px\)/);
 assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
 assert.ok(exists('public/products/detail-demo.css'));
 assert.ok(exists('public/products/portfolio.js'));
});
test('catalog eligibility, pricing and operational permissions fail closed for prelaunch',()=>{
 assert.equal(portfolio.release.publicLaunchEnabled,false);
 assert.equal(portfolio.release.checkoutEnabled,false);
 assert.equal(portfolio.release.crmOutboundEnabled,false);
 assert.equal(portfolio.release.seoIndexingEnabled,false);
 assert.equal(portfolio.governance.noNewApprovalProcess,true);
 assert.equal(release.publicLaunchEnabled,false);
 assert.equal(release.engineAvailable,false);
 assert.equal(release.customerWorkspace.productionAccepted,false);
 assert.equal(publicUnit.productionPromotionAllowed,false);
 assert.equal(publicUnit.customerExecutionEnabled,false);
 assert.equal(publicUnit.billingEnabled,false);
 assert.ok(portfolio.plans.every(x=>x.state==='draft-not-for-sale'));
 assert.ok(portfolio.flagship.every(x=>x.status.includes('preview')));
 assert.match(read('public/pricing/index.html'),/not available for purchase/);
});
