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
