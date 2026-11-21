'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {DOMAINS,STAGES,createAtlasSession,resolveAtlasIntent,getAtlasEngineContract}=require('../lib/atlas-universal-platform.cjs');

test('Atlas engine contract is fail-closed and human-directed',()=>{
 const contract=getAtlasEngineContract();
 assert.equal(contract.schema,'ad-astra/atlas-engine-adapter/v1');
 assert.equal(contract.liveProvider,false);
 assert.equal(contract.voiceConsent,'explicit-user-action');
 assert.equal(contract.transcriptRetention,'none-by-default');
 assert.equal(contract.sessionPersistence,'none-by-default');
 assert.equal(contract.toolExecution,'human-confirmed');
 assert.equal(contract.telemetry,false);
});
test('Atlas sessions preserve domain, stage and privacy boundaries',()=>{
 assert.equal(DOMAINS.length,12);
 assert.equal(STAGES.length,5);
 const session=createAtlasSession({domain:'science',stage:'connect',voiceActivated:true});
 assert.equal(session.domain,'science');
 assert.equal(session.stage,'connect');
 assert.equal(session.voice.activated,true);
 assert.equal(session.voice.transcriptRetention,'none');
 assert.equal(session.execution.toolsEnabled,false);
 assert.equal(session.tenantData,false);
 assert.throws(()=>createAtlasSession({domain:'unknown'}),/atlas-domain-invalid/);
});
test('Atlas intent resolution routes without executing tools',()=>{
 const result=resolveAtlasIntent({domain:'technology',stage:'continue'});
 assert.equal(result.nextRoute,'/products/');
 assert.equal(result.action,'route-only');
 assert.equal(result.execution.toolsEnabled,false);
});
