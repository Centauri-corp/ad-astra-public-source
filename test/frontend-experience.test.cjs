'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const registry=JSON.parse(fs.readFileSync(path.join(root,'frontend/experience-registry.json'),'utf8'));
const page=fs.readFileSync(path.join(root,'public/experience/index.html'),'utf8');
const style=fs.readFileSync(path.join(root,'public/experience/experience.css'),'utf8');
test('eight uniquely registered product surfaces',()=>{
 assert.equal(registry.surfaces.length,8);
 assert.equal(new Set(registry.surfaces.map(s=>s.id)).size,8);
 assert.equal(new Set(registry.surfaces.map(s=>s.ownerDivision)).size>=1,true);
 registry.surfaces.forEach(s=>assert.ok(s.ownerDivision>=1&&s.ownerDivision<=14));
});
test('private surfaces never have public paths',()=>{
 for(const s of registry.surfaces.filter(s=>s.launchState==='not-released')){
   assert.equal(s.path,null);
 }
 assert.equal(registry.internalRoutesMustNeverBeServedByPublicSite,true);
 assert.equal(registry.accessPolicy,'deny-unless-authorized');
});
test('preview cannot be indexed or represented as live',()=>{
 assert.match(page,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.match(page,/Not released/);
 assert.match(page,/Restricted • No public entry/);
 assert.doesNotMatch(page,/<form\b/i);
 assert.doesNotMatch(page,/<script\b/i);
 assert.doesNotMatch(page,/https?:\/\/[^"']+\/api\/v1\//i);
});
test('preview retains accessible navigation and reduced motion',()=>{
 assert.match(page,/<main id="main">/);
 assert.match(page,/<a class="skip" href="#main">/);
 assert.match(page,/<section aria-labelledby=/);
 assert.match(style,/prefers-reduced-motion:reduce/);
 assert.match(style,/:focus-visible/);
});
