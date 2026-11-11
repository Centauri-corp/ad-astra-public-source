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
 const projects=[env.VERCEL_PROJECT_ID,env.AD_ASTRA_RELEASE_PROJECT_ID].filter(value=>value!==undefined);
 assert.ok(projects.length,'A verified production project identifier is required');
 for(const project of projects)assert.equal(project,source.projectId,'Production project does not match the selected release source');
 // CLI ORG_ID is not a guaranteed platform system variable. The release
 // operator may configure this public identifier; all supplied IDs must agree.
 const teams=[env.VERCEL_ORG_ID,env.VERCEL_TEAM_ID,env.AD_ASTRA_RELEASE_TEAM_ID].filter(value=>value!==undefined);
 assert.ok(teams.length,'A verified production team identifier is required');
 for(const team of teams)assert.equal(team,source.teamId,'Production team does not match the selected release source');
 const sha=env.VERCEL_GIT_COMMIT_SHA||'';
 assert.match(sha,/^[a-f0-9]{40}$/,'An exact production source commit is required');
 // Git deployments can use a branch or a SHA in ref. A SHA ref must equal
 // the platform's actual commit, never an arbitrary or mismatched hash.
 // External protected review still binds that exact commit to PR36.
 assert.ok(env.VERCEL_GIT_COMMIT_REF===source.branch||env.VERCEL_GIT_COMMIT_REF===sha,
  'Production builds must use PR36 or its exact pinned SHA; work and unknown branches are held');
 return 'source-selected-not-release-accepted';
}
if(require.main===module){try{console.log('AD_ASTRA_PRODUCTION_SOURCE_CHECK '+check());}catch(e){console.error('AD_ASTRA_PRODUCTION_SOURCE_HOLD '+e.message);process.exitCode=1;}}
module.exports={check};
