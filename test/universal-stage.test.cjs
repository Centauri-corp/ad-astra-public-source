'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('Universal Stage declares twelve governed knowledge domains',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'..','public','experience-manifest.json'),'utf8'));
  const domains=manifest.visualArchitecture.universalStage.domains;
  assert.equal(domains.length,12);
  assert.equal(manifest.visualArchitecture.universalStage.liveTelemetry,false);
  assert.equal(manifest.visualArchitecture.universalStage.fallback,'accessible-text-and-static-orbit');
  const products=fs.readFileSync(path.join(__dirname,'..','public','products','index.html'),'utf8');
  assert.equal(products.includes('\\\\n<script'),false);
  assert.equal((products.match(/<span>[^<]+<\\/span>/g)||[]).filter(x=>x.includes('&amp;')||x.includes('Science')||x.includes('Engineering')||x.includes('Education')).length>=4,true);
});
