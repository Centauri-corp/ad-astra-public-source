'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const registry = require('../intelligence/global-resource-registry.json');
const gateway = require('../lib/resource-gateway');
const endpoint = require('../api/resources');

function invoke(req) {
  const headers = {};
  let body = '';
  const res = {
    statusCode: 0,
    setHeader(name,value){ headers[name.toLowerCase()] = String(value); },
    end(value=''){ body = value; return {statusCode:this.statusCode,headers,body}; }
  };
  endpoint(req,res);
  return {statusCode:res.statusCode,headers,body};
}

test('registry contains forty-two unique resources across twelve domains',()=>{
  assert.equal(gateway.validateRegistry(registry),true);
  assert.equal(registry.resources.length,42);
  assert.equal(new Set(registry.resources.map(item=>item.id)).size,42);
  assert.equal(registry.domains.length,12);
  assert.equal(registry.productionActivation,false);
  assert.equal(registry.publicInferenceActivation,false);
});

test('registry is fail-closed and every source is HTTPS',()=>{
  assert.equal(registry.externalContentTrustedAsInstructions,false);
  assert.equal(registry.releasePolicy.externalWritesAllowed,false);
  assert.equal(registry.releasePolicy.paidProviderCallsAllowed,false);
  for(const resource of registry.resources) assert.equal(new URL(resource.officialUrl).protocol,'https:');
});

test('query filters only approved catalog dimensions',()=>{
  const earth = gateway.queryResources(registry,{domain:'space-earth'});
  assert.ok(earth.length>=5);
  assert.ok(earth.every(item=>item.domains.includes('space-earth')));
  const phaseOne = gateway.queryResources(registry,{phase:'phase-1'});
  assert.equal(phaseOne.length,6);
  assert.equal(registry.connectorCandidates.length,5);
  assert.ok(registry.connectorCandidates.every(candidate=>candidate.status==='not-connected'));
  assert.throws(()=>gateway.queryResources(registry,{domain:'unknown'}),/unknown_domain/);
  assert.throws(()=>gateway.queryResources(registry,{url:'https://example.com'}),/unsupported_query/);
});

test('evidence envelope preserves source, rights and limitations',()=>{
  const resource = registry.resources.find(item=>item.id==='nasa-earthdata');
  const evidence = gateway.createEvidenceEnvelope(resource,{recordId:'collection-123',sourceUrl:'https://www.earthdata.nasa.gov/',retrievedAt:'2026-11-04T00:00:00Z',connectorVersion:'evaluation-1',limitations:['Connector not production approved'],data:{title:'Example'}});
  assert.equal(evidence.source.resourceId,'nasa-earthdata');
  assert.equal(evidence.rights.releaseStatus,'discovered');
  assert.deepEqual(evidence.quality.limitations,['Connector not production approved']);
});

test('resource API is read-only, filterable and explicit about inactive connectors',()=>{
  const get = invoke({method:'GET',query:{domain:'space-earth'}});
  assert.equal(get.statusCode,200);
  const payload = JSON.parse(get.body);
  assert.equal(payload.status,'catalog-only');
  assert.equal(payload.productionActivation,false);
  assert.equal(payload.providerConnectorsActive,false);
  assert.ok(payload.resources.every(item=>item.domains.includes('space-earth')));
  const head = invoke({method:'HEAD',query:{phase:'phase-1'}});
  assert.equal(head.statusCode,200);
  assert.equal(head.body,'');
  const post = invoke({method:'POST',query:{}});
  assert.equal(post.statusCode,405);
  const bad = invoke({method:'GET',query:{target:'https://example.com'}});
  assert.equal(bad.statusCode,400);
});

test('public resource page is noindex, static and transparent',()=>{
  const fs = require('node:fs');
  const path = require('node:path');
  const page = fs.readFileSync(path.join(__dirname,'../public/resources/index.html'),'utf8');
  assert.match(page,/<meta name="robots" content="noindex,follow">/);
  assert.match(page,/rel="canonical" href="https:\/\/adastra\.global\/resources\/"/);
  assert.equal((page.match(/data-domain="/g)||[]).length,12);
  assert.match(page,/No diagnosis, engineering certification, legal representation or provider integration is active/);
  assert.doesNotMatch(page,/<form\b|<script\b/i);
});
