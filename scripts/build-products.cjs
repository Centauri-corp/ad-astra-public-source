'use strict';
// Deterministic static output: usable without JavaScript, WebGL or providers.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {productFiles}=require('./lib/product-architecture.cjs');
const files=productFiles(require('../config/public-product-families.json'),require('../config/public-visual-architecture.json'));
const root=path.join(__dirname,'..'),check=process.argv.includes('--check');
for(const [relative,content] of files){
 const output=path.join(root,relative);
 if(check)assert.equal(fs.readFileSync(output,'utf8'),content,'Generated product asset drifted: '+relative+'; run npm run products:build');
 else{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,content);}
}
console.log('AD_ASTRA_PRODUCTS_PASS families=6 modes=5 outputs='+files.size+' availability=in-development check='+check);
