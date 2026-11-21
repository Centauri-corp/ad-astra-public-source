'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('Atlas Universal is one governed public platform surface',()=>{
 const root=path.join(__dirname,'..','public');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'experience-manifest.json'),'utf8'));
 const atlas=manifest.visualArchitecture.atlasUniversal;
 assert.equal(atlas.route,'/atlas/');
 assert.equal(atlas.domains.length,12);
 assert.equal(atlas.interaction,'explicit-domain-selection');
 assert.equal(atlas.liveTelemetry,false);
 assert.equal(atlas.tenantDataInPublicScene,false);
 const html=fs.readFileSync(path.join(root,'atlas','index.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'atlas','app.js'),'utf8');
 assert.equal((html.match(/data-atlas-domain=/g)||[]).length,12);
 assert.equal(js.includes('fetch('),false);
 assert.equal(js.includes('XMLHttpRequest'),false);
});
