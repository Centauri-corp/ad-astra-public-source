'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {ultraCatalog}=require('../lib/ultra-experience-catalog.cjs');
test('ultra experience portfolio reconciles 24 sector profiles, seven agents, four offers and three main-only workspaces',()=>{
 const c=ultraCatalog();
 assert.deepEqual(c.groups.map(g=>g.items.length),[24,7,4,3]);
 assert.equal(c.totalExperiences,38);
 assert.equal(c.launchApprovedCount,0);
 assert.equal(c.release,'HOLD');
});
test('the ultra portfolio cannot imply deployed products or live AI',()=>{
 const c=ultraCatalog();
 assert.ok(c.groups.every(g=>g.items.every(i=>i.live===false)));
 assert.ok(c.groups.find(g=>g.id==='personal-workspaces').items.every(i=>i.status==='main-only-not-integrated'));
 assert.equal(new Set(c.groups.flatMap(g=>g.items.map(i=>i.kind+':'+i.id))).size,38);
});
