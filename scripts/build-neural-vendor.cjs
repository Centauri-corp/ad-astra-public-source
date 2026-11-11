'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),vendor=path.join(root,'node_modules/three');
const version=require('../package.json').devDependencies.three;
assert.equal(JSON.parse(fs.readFileSync(path.join(vendor,'package.json'),'utf8')).version,version);
const files=new Map(['three.module.js','three.core.js'].map(name=>['public/neural/vendor/'+name,fs.readFileSync(path.join(vendor,'build',name))]));
files.set('public/neural/vendor/LICENSE.txt',fs.readFileSync(path.join(vendor,'LICENSE')));
const inventory=[...files].map(([file,bytes])=>({path:'/'+file.slice(7),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}));
files.set('public/neural/vendor/manifest.json',Buffer.from(JSON.stringify({schema:'ad-astra-neural-vendor/v1',package:'three',version,license:'MIT',delivery:'self-hosted-explicit-load-only',files:inventory},null,2)+'\n'));
for(const[file,bytes]of files){const target=path.join(root,file);if(process.argv.includes('--check'))assert.ok(fs.readFileSync(target).equals(bytes),'Neural vendor drift: '+file);else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}}
console.log('AD_ASTRA_NEURAL_VENDOR_PASS version='+version+' files='+files.size+' externalCdn=false');
