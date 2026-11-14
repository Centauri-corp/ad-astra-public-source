'use strict';
const assert=require('node:assert/strict');
const {projectReport}=require('./lib/website-project.cjs');
async function check(env=process.env,reportFactory=projectReport){
 if(env.VERCEL_ENV!=='production')return 'visual-review-candidate';
 const report=await reportFactory();
 assert.equal(report.visualAcceptance.ready,true,'The current website visual bundle requires actual owner acceptance and matching review evidence before production: '+report.visualAcceptance.missing.join('; '));
 return 'visual-accepted-other-release-evidence-still-required';
}
if(require.main===module)check().then(result=>console.log('AD_ASTRA_WEBSITE_VISUAL_RELEASE '+result)).catch(error=>{console.error('AD_ASTRA_WEBSITE_VISUAL_HOLD '+error.message);process.exitCode=1;});
module.exports={check};
