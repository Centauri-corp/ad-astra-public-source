'use strict';
// Defense in depth for THIS candidate. Cannot revoke other accounts' manual
// deployment permissions or enforce this guard in an older source tree.
const assert=require('node:assert/strict');
const source=require('../config/production-release-source.json');
function check(env=process.env){
 assert.equal(source.schema,'ad-astra-production-release-source/v1');
 assert.equal(source.repository,'Centauri-corp/ad-astra-public-source');
 assert.equal(source.pullRequest,36);assert.equal(source.automaticGitDeployments,false);
 assert.equal(source.independentExactCommitReviewRequired,true);assert.equal(source.releaseAuthorized,false);
 if(env.VERCEL_ENV!=='production')return 'not-production';
 assert.equal(env.VERCEL_PROJECT_ID,source.projectId,'Production project does not match the selected release source');
 assert.equal(env.VERCEL_ORG_ID,source.teamId,'Production team does not match the selected release source');
 assert.equal(env.VERCEL_GIT_COMMIT_REF,source.branch,'Production builds must use PR36; work and unknown branches are held');
 assert.match(env.VERCEL_GIT_COMMIT_SHA||'',/^[a-f0-9]{40}$/,'An exact production source commit is required');
 return 'source-selected-not-release-accepted';
}
if(require.main===module){try{console.log('AD_ASTRA_PRODUCTION_SOURCE_CHECK '+check());}catch(e){console.error('AD_ASTRA_PRODUCTION_SOURCE_HOLD '+e.message);process.exitCode=1;}}
module.exports={check};
