'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const file=path.join(__dirname,'../intelligence/public-product-catalog.json');
const catalog=JSON.parse(fs.readFileSync(file,'utf8'));
test('eight distinct intelligence layers',()=>{
 assert.equal(catalog.engineLayers.length,8);
 assert.equal(new Set(catalog.engineLayers.map(x=>x.id)).size,8);
});
test('catalog has product ownership, safe launch states and no approved prices',()=>{
 assert.ok(catalog.products.length>=8);
 assert.equal(new Set(catalog.products.map(p=>p.id)).size,catalog.products.length);
 for(const p of catalog.products){
   assert.ok(['planned','release-gated','research'].includes(p.status));
   assert.ok(p.ownerDivision>=1&&p.ownerDivision<=14);
   assert.notEqual(p.pricingState,'approved');
 }
 assert.equal(catalog.releasePolicy.default,'not-released');
 assert.equal(catalog.releasePolicy.modelRequestsRequireExistingReleaseGates,true);
});
test('solutions reference known products and cannot imply generally available',()=>{
 const productIds=new Set(catalog.products.map(p=>p.id));
 for(const s of catalog.solutions){
  assert.ok(['planned','release-gated','research'].includes(s.status));
  assert.ok(s.productIds.length>0);
  for(const id of s.productIds)assert.ok(productIds.has(id));
 }
});

test('public product preview is noindex and carries disclosure',()=>{
 const page=fs.readFileSync(path.join(__dirname,'../public/products/index.html'),'utf8');
 assert.match(page,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.match(page,/Product concepts and research programs are not presented as available services/);
 assert.match(page,/No product purchases or unrestricted AI activation/);
 assert.doesNotMatch(page,/<form\\b/i);
});
