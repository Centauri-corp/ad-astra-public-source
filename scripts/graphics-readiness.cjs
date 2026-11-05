#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const {assessVisualRelease}=require('../lib/graphics-evidence-gate.cjs');
const args=process.argv.slice(2),strict=args.includes('--strict');
const paths=args.filter(x=>x!=='--strict');
if(paths.length>1){process.stderr.write('Usage: node scripts/graphics-readiness.cjs [snapshot.json] [--strict]\n');process.exit(2);}
let snapshot={};
if(paths.length){
 const stat=fs.statSync(paths[0]);
 if(!stat.isFile()||stat.size>1048576)throw new Error('Invalid offline audit snapshot');
 snapshot=JSON.parse(fs.readFileSync(paths[0],'utf8'));
}
const report=assessVisualRelease(snapshot);
process.stdout.write(JSON.stringify(report,null,2)+'\n');
if(strict&&!report.productionEligible)process.exitCode=2;
