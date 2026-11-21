'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('Universal Stage declares twelve governed knowledge domains',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'..','public','experience-manifest.json'),'utf8'));
  const stage=manifest.visualArchitecture.universalStage;
  assert.equal(stage.domains.length,12);
  assert.equal(stage.liveTelemetry,false);
  assert.equal(stage.fallback,'accessible-text-and-static-orbit');

  const products=fs.readFileSync(path.join(__dirname,'..','public','products','index.html'),'utf8');
  assert.equal(products.includes('\\n<script'),false);
  for(const label of ['Space &amp; Earth','Arts &amp; Culture','Medical &amp; Health','Science','Engineering','Geotechnology','Education','Law &amp; Civic','Economics','Environment','Technology','Accessibility']){
    assert.equal(products.includes('<span>'+label+'</span>'),true);
  }
});
