'use strict';
const fs=require('node:fs'),path=require('node:path');
const {projectReport}=require('./lib/website-project.cjs');
(async()=>{
 const report=await projectReport();
 const output=process.env.AD_ASTRA_PROJECT_REPORT;
 if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({project:report.project,sourceFingerprint:report.sourceFingerprint,visualFingerprint:report.visualScope.fingerprint,coveredRoutes:report.pages.length,selectedAssetFamilies:report.assets.length,modelCoverage:report.models.counts,technicalAlignment:'pass',visualAcceptance:report.visualAcceptance,report:output??null},null,2));
 if(process.argv.includes('--require-visual-approval')&&!report.visualAcceptance.ready)process.exitCode=1;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
