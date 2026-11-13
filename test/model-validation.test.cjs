'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const { publicModels, publicMarketProfiles, MODELS } = require('../lib/model-catalog');
const { publicCustomerAgents } = require('../lib/customer-agent-catalog');
const { CONTRACT, validateCatalog, validateRelease, validateCompletion, readCompletion } = require('../lib/model-validation');
const release = require('../public/release-manifest.json');
function completion() {
  return { object: 'chat.completion', model: CONTRACT.runtimeModel,
    choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: '  Synthetic contract fixture.  ', refusal: null } }],
    usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 } };
}
test('one foundation integration, five modes and 24 profiles have distinct, validated identities', () => {
  assert.deepEqual(validateCatalog(publicModels(), publicMarketProfiles(), publicCustomerAgents()), { connectedModelCount: 1, modeCount: 5, sectorProfileCount: 24, customerAgentCount: 6 });
  assert.equal(validateRelease(release), true);
  assert.equal(release.engineAvailable, false); assert.equal(release.publicLaunchEnabled, false);
  for (const profile of publicMarketProfiles()) assert.equal(profile.foundationModel, CONTRACT.productId);
});
test('public catalog returns detached allowlisted values rather than internal objects', () => {
  const models = publicModels(); models[0].modes.push('unapproved'); models[0].name = 'mutated';
  assert.deepEqual(publicModels()[0].modes, CONTRACT.modes);
  assert.equal(publicModels()[0].name, CONTRACT.publicName);
  assert.ok(!Object.hasOwn(publicModels()[0], 'legacyName'));
  assert.ok(Object.isFrozen(MODELS[0]));
});
test('extra models, modes, profile drift, duplicate identities and metadata leaks are rejected', () => {
  const mutations = [
    (m,p) => m.push({ ...m[0], id: 'another-model' }),
    (m,p) => m[0].modes.push('autonomous'),
    (m,p) => m[0].provider = 'private',
    (m,p) => m[0].name = 'AGI available',
    (m,p) => m[0].role = 'ASI is available',
    (m,p) => p.pop(),
    (m,p) => p[1].id = p[0].id,
    (m,p) => p[1].name = p[0].name,
    (m,p) => p[0].foundationModel = 'unapproved-model',
    (m,p) => p[0].apiKey = 'synthetic',
    (m,p) => p[0].name = '<script>unsafe</script>',
    (m,p) => p[0].id = '__proto__',
  ];
  for (const mutate of mutations) {
    const m = publicModels(), p = publicMarketProfiles(); mutate(m,p);
    assert.throws(() => validateCatalog(m,p), /model_contract_invalid/);
  }
});
test('release metadata cannot advertise additional models or achieved AGI/ASI', () => {
  for (const mutate of [r=>r.connectedPublicModelCount=4, r=>r.marketProfileCount=436, r=>r.customerAgentCount=1,
    r=>r.customerModes.reverse(), r=>r.customerAiModel='new-model',
    r=>r.intelligenceLayers.agi='available', r=>r.intelligenceLayers.asi='production',
    r=>r.intelligenceLayers.liveTelemetry=true]) {
    const value = structuredClone(release); mutate(value); assert.throws(() => validateRelease(value));
  }
});
test('only a completed answer from the exact pinned provider snapshot is admitted', async () => {
  assert.equal(validateCompletion(completion()), 'Synthetic contract fixture.');
  const value = completion(); value.choices[0].message.tool_calls = null; value.choices[0].message.function_call = null;
  assert.equal(await readCompletion(Response.json(value)), 'Synthetic contract fixture.');
});
test('model substitution, truncation, tools, refusals, role changes and ambiguous choices fail closed', () => {
  for (const mutate of [d=>d.model='unrecognized-runtime', d=>delete d.model, d=>d.object='other',
    d=>d.choices.push(d.choices[0]), d=>d.choices=[], d=>d.choices[0].index=1,
    d=>d.choices[0].finish_reason='length', d=>d.choices[0].finish_reason='content_filter',
    d=>d.choices[0].message.role='tool', d=>d.choices[0].message.refusal='synthetic refusal',
    d=>d.choices[0].message.tool_calls=[{name:'not allowed'}], d=>d.choices[0].message.function_call={},
    d=>d.choices[0].message.content='', d=>d.choices[0].message.content='x'.repeat(6001),
    d=>d.choices[0].message.content='text\u0000hidden', d=>d.choices[0].message.content=[]]) {
    const data = completion(); mutate(data); assert.throws(() => validateCompletion(data), /model_contract_invalid/);
  }
});
test('usage is bounded, integer-valued and arithmetically consistent', () => {
  for (const usage of [undefined, {}, {prompt_tokens:-1,completion_tokens:20,total_tokens:19},
    {prompt_tokens:0,completion_tokens:20,total_tokens:20},{prompt_tokens:100,completion_tokens:0,total_tokens:100},
    {prompt_tokens:100,completion_tokens:701,total_tokens:801},
    {prompt_tokens:16385,completion_tokens:20,total_tokens:16405},
    {prompt_tokens:100,completion_tokens:'20',total_tokens:120},
    {prompt_tokens:100,completion_tokens:20,total_tokens:121}]) {
    assert.throws(() => validateCompletion({...completion(),usage}));
  }
});
test('catalog endpoint fails closed on drift without publishing the rejected metadata', () => {
  const vm = require('node:vm'), fs = require('node:fs');
  const models = publicModels(); models[0].provider = 'sensitive-provider-metadata';
  const context = {module:{exports:{}},require(name){
    if (name === '../lib/model-catalog') return {publicModels:()=>models,publicMarketProfiles};
    if (name === '../lib/customer-agent-catalog') return {publicCustomerAgents};
    return require('../lib/model-validation');
  }};
  vm.runInNewContext(fs.readFileSync(require.resolve('../api/models'),'utf8'),context);
  const res={headers:{},setHeader(k,v){this.headers[k]=v},end(value){this.body=JSON.parse(value)}};
  context.module.exports({method:'GET'},res);
  assert.equal(res.statusCode,503);assert.equal(res.headers['Cache-Control'],'no-store');
  assert.deepEqual(res.body,{error:'model_catalog_unavailable'});
});
test('public catalog declares profile/model distinction and no AGI/ASI availability without provider disclosure', () => {
  const res={setHeader(){},end(value){this.body=JSON.parse(value)}};
  require('../api/models')({method:'GET'},res);
  assert.equal(res.body.capabilityClass,'bounded-narrow-ai-integration');
  assert.equal(res.body.agiAvailable,false);assert.equal(res.body.asiAvailable,false);
  assert.equal(JSON.stringify(res.body).includes('gateway.invalid'),false);
  assert.equal(res.body.agents.length, 6);
  for (const agent of res.body.agents) { assert.ok(!Object.hasOwn(agent, 'modelRole')); assert.equal(agent.availability, 'development-preview'); assert.ok(!/provider|connector|openai|google|ollama|llama/i.test(JSON.stringify(agent))); }
  assert.match(res.body.disclosure,/does not establish customer availability/);
});
test('bounded reader rejects non-JSON, malformed JSON, oversized headers and streamed bodies', async () => {
  for (const response of [new Response('not json'),new Response('{',{headers:{'content-type':'application/json'}}),
    new Response('{}',{headers:{'content-type':'application/json','content-length':'65537'}}),
    new Response('x'.repeat(65537),{headers:{'content-type':'application/json'}}),
    new Response('{}',{headers:{'content-type':'application/json','content-length':'not-a-number'}})]) {
    await assert.rejects(readCompletion(response));
  }
});
test('response reader cancels oversized streams and rejects malformed UTF-8', async () => {
  let cancelled = false;
  const body = new ReadableStream({start(c){c.enqueue(new Uint8Array(65537));},cancel(){cancelled=true;}});
  await assert.rejects(readCompletion(new Response(body,{headers:{'content-type':'application/json'}})));
  assert.equal(cancelled,true);
  await assert.rejects(readCompletion(new Response(new Uint8Array([0xff]),{headers:{'content-type':'application/json'}})));
});
test('chunked provider JSON decodes split UTF-8 safely without generating any answer', async () => {
  const value = completion(); value.choices[0].message.content = 'Synthetic café fixture.';
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const body = new ReadableStream({start(c){for(const byte of bytes)c.enqueue(new Uint8Array([byte]));c.close();}});
  assert.equal(await readCompletion(new Response(body,{headers:{'content-type':'application/json; charset=utf-8'}})), 'Synthetic café fixture.');
});
