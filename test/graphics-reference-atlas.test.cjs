'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('graphics references are consolidated into one governed atlas',()=>{
  const root=path.join(__dirname,'..','public');
  const atlas=JSON.parse(fs.readFileSync(path.join(root,'graphics-reference-atlas.json'),'utf8'));
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'experience-manifest.json'),'utf8'));
  assert.equal(manifest.visualArchitecture.graphicsReferenceAtlas.path,'/graphics-reference-atlas.json');
  assert.equal(atlas.externalReferences.length,4);
  assert.equal(atlas.presentationResources.length,1);
  assert.equal(atlas.assetBoundary.externalCdn,false);
  assert.equal(atlas.assetBoundary.liveNeuralRendering,false);
  assert.equal(atlas.assetBoundary.tenantData,false);
  assert.equal(atlas.pipeline.length,4);
  for(const item of atlas.externalReferences){
    assert.equal(item.usage,'research-reference');
    assert.equal(item.publicRuntime,false);
    assert.match(item.url,/^https:\/\//);
  }
});
