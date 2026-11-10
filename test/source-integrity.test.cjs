'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createManifest,verify}=require('../scripts/website-source-integrity.cjs');
function fixture(run){const root=fs.mkdtempSync(path.join(os.tmpdir(),'astra-source-'));try{for(const dir of ['public','api','lib'])fs.mkdirSync(path.join(root,dir));fs.writeFileSync(path.join(root,'public/index.html'),'<h1>AD ASTRA</h1>');run(root);}finally{fs.rmSync(root,{recursive:true,force:true});}}
test('changed bytes and unexpected output files invalidate a frozen file inventory',()=>fixture(root=>{
  const manifest=createManifest(root);assert.equal(verify(root,manifest).fingerprint,manifest.fingerprint);
  fs.writeFileSync(path.join(root,'public/index.html'),'<h1>Changed</h1>');assert.throws(()=>verify(root,manifest),/changed/);
  fs.writeFileSync(path.join(root,'public/index.html'),'<h1>AD ASTRA</h1>');fs.writeFileSync(path.join(root,'public/unreviewed.html'),'new');assert.throws(()=>verify(root,manifest),/changed/);
}));
test('hidden files, symlinks and private output are rejected before a candidate is captured',()=>fixture(root=>{
  const hidden=path.join(root,'public/.env');fs.writeFileSync(hidden,'example');assert.throws(()=>createManifest(root),/Hidden/);fs.unlinkSync(hidden);
  const linked=path.join(root,'public/shared');fs.symlinkSync(path.join(root,'lib'),linked);assert.throws(()=>createManifest(root),/symlinks/);fs.unlinkSync(linked);
  fs.writeFileSync(path.join(root,'public/index.html'),'astra_private');assert.throws(()=>createManifest(root),/Private material/);
}));
test('the checked website inventory binds the public site and existing server modules without granting release approval',()=>{
  const root=path.join(__dirname,'..'),manifest=require('../config/website-source-integrity.json');
  verify(root,manifest);assert.ok(manifest.files.some(f=>f.path==='public/intelligence/index.html'));assert.ok(manifest.files.some(f=>f.path==='api/ask.js'));assert.equal(manifest.releaseAuthorization,false);
});
