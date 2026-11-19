'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {chooseGraphicsProfile,validateVisualData,inspectFrameMetrics,PROFILES}=require('../lib/graphics-capability-contract.cjs');
const {buildGraphicsAtlas,compileScene}=require('../lib/graphics-intelligence-core.cjs');
test('graphics capability is static without explicit consent or for reduced motion',()=>{
 assert.equal(chooseGraphicsProfile({webgl2:true}).renderer,'static');
 assert.equal(chooseGraphicsProfile({webgl2:true,explicit3DConsent:true,reducedMotion:true}).renderer,'static');
 assert.equal(chooseGraphicsProfile({webgl2:true,explicit3DConsent:true,saveData:true}).renderer,'static');
 assert.equal(chooseGraphicsProfile({webgpu:true,explicit3DConsent:true}).renderer,'static');
});
test('explicit supported WebGL2 gets a resource-bounded profile',()=>{
 const p=chooseGraphicsProfile({webgl2:true,explicit3DConsent:true,mobile:true});
 assert.equal(p.profile,'mobile');assert.equal(p.budget.maxDpr,1.5);
 assert.equal(inspectFrameMetrics({drawCalls:10,textureMB:8,particles:120,fps:45,dpr:1.25},p.profile).pass,true);
 assert.equal(inspectFrameMetrics({drawCalls:81,textureMB:8,particles:120,fps:45,dpr:1.25},p.profile).pass,false);
});
test('external and private data are not falsely represented as approved scientific visualization',()=>{
 assert.throws(()=>validateVisualData({provenance:'verified-data',title:'Earth'}));
 assert.throws(()=>validateVisualData({provenance:'concept',title:'Diagram',tenantId:'secret'}));
 assert.equal(validateVisualData({provenance:'concept',title:'Orbital concept'}).provenance,'concept');
 assert.equal(compileScene({id:'cosmos',provenance:'concept'}).provenance.kind,'concept');
 assert.equal(buildGraphicsAtlas().scenes.length,7);
});
test('static graphics profile never authorizes GPU budget',()=>{
 assert.equal(PROFILES.static.maxDrawCalls,0);
 assert.equal(PROFILES.static.maxParticles,0);
});
