'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {projectFiles}=require('./lib/website-project.cjs');
const root=path.join(__dirname,'..');
for(const [file,content]of projectFiles(root)){
 const target=path.join(root,file);
 if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),content,'Website project source drift: '+file);
 else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);}
}
console.log('AD_ASTRA_WEBSITE_PROJECT_BUILD_PASS authority=projects/website-customer-experience promotionAuthorized=false');
