'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {check}=require('../scripts/check-production-source.cjs');
const source=require('../config/production-release-source.json');
const production={VERCEL_ENV:'production',VERCEL_PROJECT_ID:source.projectId,VERCEL_ORG_ID:source.teamId,VERCEL_GIT_COMMIT_REF:source.branch,VERCEL_GIT_COMMIT_SHA:'a'.repeat(40)};
test('selected production source still does not grant release approval',()=>{assert.equal(check(production),'source-selected-not-release-accepted');assert.equal(source.releaseAuthorized,false);});
test('old work, unknown branches, unpinned commits and mismatched project/team cannot stage this source',()=>{
 for(const patch of [{VERCEL_GIT_COMMIT_REF:'work'},{VERCEL_GIT_COMMIT_REF:undefined},{VERCEL_GIT_COMMIT_SHA:''},{VERCEL_PROJECT_ID:'wrong'},{VERCEL_ORG_ID:'wrong'}])assert.throws(()=>check({...production,...patch}));
});
test('protected marketing previews need no production credentials',()=>assert.equal(check({VERCEL_ENV:'preview'}),'not-production'));
test('exact SHA deployments are supported without accepting a different or unpinned ref',()=>{
 assert.equal(check({...production,VERCEL_GIT_COMMIT_REF:production.VERCEL_GIT_COMMIT_SHA}),'source-selected-not-release-accepted');
 for(const ref of ['b'.repeat(40),'work','main','refs/heads/work',''])assert.throws(()=>check({...production,VERCEL_GIT_COMMIT_REF:ref}));
});
test('CLI, platform and scoped public team identifiers work; none can override a conflict',()=>{
 for(const key of ['VERCEL_TEAM_ID','AD_ASTRA_RELEASE_TEAM_ID']){
  const env={...production,[key]:source.teamId};delete env.VERCEL_ORG_ID;assert.equal(check(env),'source-selected-not-release-accepted');
  assert.throws(()=>check({...env,VERCEL_ORG_ID:'wrong'}));
 }
 const missing={...production};delete missing.VERCEL_ORG_ID;assert.throws(()=>check(missing));
 assert.throws(()=>check({...production,AD_ASTRA_RELEASE_TEAM_ID:'wrong'}));
});
test('scoped project identifier supports platform builds without overriding an actual mismatch',()=>{
 const env={...production,AD_ASTRA_RELEASE_PROJECT_ID:source.projectId};delete env.VERCEL_PROJECT_ID;
 assert.equal(check(env),'source-selected-not-release-accepted');
 assert.throws(()=>check({...env,VERCEL_PROJECT_ID:'wrong'}));
 assert.throws(()=>check({...production,AD_ASTRA_RELEASE_PROJECT_ID:'wrong'}));
 delete env.AD_ASTRA_RELEASE_PROJECT_ID;assert.throws(()=>check(env));
});
