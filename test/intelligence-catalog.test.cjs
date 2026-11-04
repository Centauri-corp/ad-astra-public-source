'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../intelligence/public-product-catalog.json'),'utf8'));
test('eight distinct intelligence layers',()=>{assert.equal(catalog.engineLayers.length,8);assert.equal(new Set(catalog.engineLayers.map(x=>x.id)).size,8);});
test('catalog has product ownership, safe launch states and no approved prices',()=>{
 assert.equal(catalog.products.length,9);
 assert.equal(new Set(catalog.products.map(p=>p.id)).size,9);
 for(const p of catalog.products){assert.ok(['planned','release-gated','research'].includes(p.status));assert.ok(p.ownerDivision>=1&&p.ownerDivision<=14);assert.notEqual(p.pricingState,'approved');}
 assert.equal(catalog.releasePolicy.default,'not-released');assert.equal(catalog.releasePolicy.modelRequestsRequireExistingReleaseGates,true);
});
test('solutions reference known products and cannot imply generally available',()=>{
 const ids=new Set(catalog.products.map(p=>p.id));
 for(const s of catalog.solutions){assert.ok(['planned','release-gated','research'].includes(s.status));assert.ok(s.productIds.length>0);for(const id of s.productIds)assert.ok(ids.has(id));}
});
test('offering preview is distinct from retained 25-direction portfolio',()=>{
 const root=fs.readFileSync(path.join(__dirname,'../public/products/index.html'),'utf8');
 const page=fs.readFileSync(path.join(__dirname,'../public/products/intelligence/index.html'),'utf8');
 assert.equal((root.match(/class="family-card"/g)||[]).length,6);
 const lists=[...root.matchAll(/<ul class="product-list">([\s\S]*?)<\/ul>/g)];
 assert.equal(lists.reduce((sum,m)=>sum+(m[1].match(/<li>/g)||[]).length,0),25);
 assert.match(page,/<meta name="robots" content="noindex,follow">/);
 assert.match(page,/rel="canonical" href="https:\/\/adastra\.global\/products\/intelligence\/"/);
 assert.match(page,/Product concepts and research programs are not presented as available services/);
 assert.match(page,/No product purchases or unrestricted AI activation/);
 assert.doesNotMatch(page,/<form\b|<script\b/i);
 for(const p of catalog.products){assert.ok(page.includes('data-product-id="'+p.id+'"'));assert.ok(page.includes(p.name));}
});
