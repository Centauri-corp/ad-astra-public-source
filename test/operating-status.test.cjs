'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {operatingStatus} = require('../lib/operating-status');
const endpoint = require('../api/operating-status');

const state = (report, id) => report.services.find(service => service.id === id).state;
const released = {engineAvailable:true, publicLaunchEnabled:true};
const openRoutes = {release:released, redirects:[]};

test('engine availability requires runtime readiness, release acceptance and a customer route', () => {
  assert.equal(state(operatingStatus(true), 'engine'), 'paused');
  assert.equal(state(operatingStatus(false, openRoutes), 'engine'), 'paused');
  assert.equal(state(operatingStatus(true, {release:released, redirects:[{source:'/platform/:path*'},{source:'/knowledge/:path*'}]}), 'engine'), 'paused');
  assert.equal(state(operatingStatus(true, {release:{...released, publicLaunchEnabled:false}, redirects:[]}), 'engine'), 'paused');
  assert.equal(state(operatingStatus(true, openRoutes), 'engine'), 'available');
});

test('enabling the engine cannot claim CRM, billing, outreach or product availability', () => {
  const report = operatingStatus(true, openRoutes);
  for (const id of ['crm', 'billing', 'outreach', 'products', 'workspace']) assert.notEqual(state(report, id), 'available', id);
  assert.equal(report.services.find(service => service.id === 'workspace').href, '/platform/');
  assert.equal(operatingStatus(false).services.find(service => service.id === 'workspace').href, '/platform-preview/');
});

function response() {
  return {headers:{},setHeader(key,value){this.headers[key.toLowerCase()]=value;},end(body){this.body=body;}};
}

test('public status endpoint returns only availability and makes no external requests', () => {
  const originalFetch = global.fetch;
  global.fetch = () => {throw new Error('External request from metadata endpoint');};
  try {
    const res = response(); endpoint({method:'GET'}, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['cache-control'], 'no-store');
    assert.equal(res.headers['x-robots-tag'], 'noindex, nofollow');
    const report = JSON.parse(res.body);
    assert.deepEqual(Object.keys(report).sort(), ['basis','generatedAt','schema','services']);
    assert.equal(Number.isFinite(Date.parse(report.generatedAt)), true);
    assert.equal(report.services.length, 7);
    for (const service of report.services) {
      assert.ok(Object.keys(service).every(key => ['id','name','state','description','href','label'].includes(key)));
      if (service.href) assert.match(service.href, /^\/[a-z/-]*$/);
    }
  } finally {global.fetch = originalFetch;}
});

test('HEAD is bodyless and mutation methods are refused', () => {
  const res = response(); endpoint({method:'HEAD'}, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body, '');
  for (const method of ['POST','PUT','PATCH','DELETE']) {
    const result = response(); endpoint({method}, result);
    assert.equal(result.statusCode, 405); assert.equal(result.headers.allow, 'GET, HEAD'); assert.equal(result.body, undefined);
  }
});

function browserHarness(responses) {
  const original = operatingStatus(false).services;
  const cards = original.map(service => {
    const badge = {dataset:{state:service.state}, textContent:service.label};
    const description = {textContent:service.description};
    return {dataset:{service:service.id}, querySelector(selector){return selector === '[data-state]' ? badge : description;}};
  });
  const summary = {textContent:''};
  const refresh = {hidden:true, disabled:false, addEventListener(event, callback){this.click = callback;}};
  const calls = [];
  const context = {
    document:{getElementById(id){return id === 'availability-update' ? summary : refresh;},querySelectorAll(){return cards;}},
    AbortSignal, Intl, Date,
    fetch:async (url, options) => {
      calls.push({url, options});
      const next = responses.shift(); if (next instanceof Error) throw next;
      return {ok:true,json:async()=>next};
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/status/status.js'),'utf8'), context);
  return {cards,summary,refresh,calls};
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('browser refresh safely renders release state, and failure removes a stale available state', async () => {
  const report = {...operatingStatus(true, openRoutes), generatedAt:new Date().toISOString()};
  const ui = browserHarness([report, new Error('Network unavailable')]);
  await settle();
  assert.equal(ui.cards.find(card => card.dataset.service === 'engine').querySelector('[data-state]').textContent, 'Available');
  assert.equal(ui.calls[0].url, '/api/operating-status');
  assert.equal(ui.calls[0].options.cache, 'no-store');
  await ui.refresh.click();
  assert.equal(ui.cards.find(card => card.dataset.service === 'engine').querySelector('[data-state]').textContent, 'Paused');
  assert.match(ui.summary.textContent, /could not be checked/);
  assert.equal(ui.refresh.disabled, false);
});

test('malformed and duplicate-service responses cannot paint a positive status', async () => {
  for (const mutate of [r => {r.schema='other';}, r => {r.services[0]=r.services[1];}, r => {r.services[0].state='__proto__';}, r => {r.generatedAt='invalid';}]) {
    const report = structuredClone({...operatingStatus(true, openRoutes), generatedAt:new Date().toISOString()});
    mutate(report);
    const ui = browserHarness([report]); await settle();
    assert.equal(ui.cards.find(card => card.dataset.service === 'engine').querySelector('[data-state]').textContent, 'Paused');
    assert.match(ui.summary.textContent, /could not be checked/);
  }
});
