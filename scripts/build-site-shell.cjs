'use strict';
// Mechanical, idempotent shared-chrome migration. Page bodies and access guards stay intact.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {applySharedShell}=require('./lib/site-shell.cjs');
const root=path.join(__dirname,'../public');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
let count=0;
for(const file of walk(root).filter(f=>f.endsWith('/index.html'))){
 const rel=path.relative(root,file).replaceAll('\\','/'),route=rel==='index.html'?'/':'/'+rel.replace(/index\.html$/,'');
 const original=fs.readFileSync(file,'utf8'),next=applySharedShell(original,route);
 if(process.argv.includes('--check'))assert.equal(original,next,'Shared navigation drifted: '+route);else if(next!==original)fs.writeFileSync(file,next);
 count++;
}
console.log('AD_ASTRA_SITE_SHELL_PASS routes='+count+' externalWrites=false');
