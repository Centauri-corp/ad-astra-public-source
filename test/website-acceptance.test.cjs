'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');

test('public entry does not misrepresent a paused intelligence engine as live', () => {
  assert.match(html, /Live responses are paused/i);
  assert.doesNotMatch(html, /Open the live engine/i);
  assert.match(html, /Explore the preview interface/i);
});

test('public entry keeps canonical, accessibility and anchor destinations', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/adastra\.global\/"/);
  assert.match(html, /<a class="skip" href="#main">Skip to content<\/a>/);
  assert.match(html, /<main\b[^>]*id="main"/);
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const inPage = [...html.matchAll(/\bhref="#([^"]+)"/g)].map(match => match[1]);
  for (const anchor of inPage) assert.ok(ids.has(anchor), 'Missing in-page target: ' + anchor);
  assert.doesNotMatch(html, /href=["']javascript:/i);
});

test('API and private routes remain nonindexed by deployment policy', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.equal(config.git.deploymentEnabled, false);
  assert.ok(config.headers.some(rule =>
    rule.source.includes('(api|lib|scripts|test)') &&
    rule.headers.some(header => header.key === 'X-Robots-Tag' && header.value.includes('noindex'))
  ));
});

test('customer pages do not promise live intelligence while release is paused', () => {
  const pages = ['knowledge/index.html', 'platform/index.html', 'markets/index.html', 'pricing/index.html', 'services/index.html', 'company/index.html', 'about/index.html', 'workspace/index.html'];
  for (const page of pages) {
    const content = fs.readFileSync(path.join(root, 'public', page), 'utf8');
    assert.doesNotMatch(content, /Open the live engine|Start with the live engine|Use the live engine today/i, page);
    assert.match(content, /name="robots" content="noindex,follow"/, page);
    assert.match(content, /rel="canonical"/, page);
  }
  const knowledge = fs.readFileSync(path.join(root, 'public/knowledge/index.html'), 'utf8');
  assert.match(knowledge, /AI responses remain paused until release checks are complete|Live responses are unavailable until release checks are completed/);
  const pricing = fs.readFileSync(path.join(root, 'public/pricing/index.html'), 'utf8');
  assert.match(pricing, /not available for purchase/i);
});

test('workspace manifest names the implemented products without asserting production acceptance', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/release-manifest.json'), 'utf8'));
  assert.deepEqual(manifest.customerWorkspace.products, ['day', 'learn', 'career']);
  assert.equal(manifest.customerWorkspace.route, '/workspace/');
  assert.equal(manifest.customerWorkspace.api, '/api/workspace');
  assert.equal(manifest.customerWorkspace.protocol, 'ad-astra-customer-workspace/v1');
  assert.equal(manifest.customerWorkspace.productionAccepted, false);
  assert.equal(manifest.engineAvailable, false);
  assert.equal(manifest.publicLaunchEnabled, false);
});

test('paused platform clearly labels preview actions and does not mislabel sign out', () => {
  const platform = fs.readFileSync(path.join(root, 'public/platform/index.html'), 'utf8');
  assert.match(platform, /Engine paused — release checks pending/);
  for (const mode of ['Ask', 'Research', 'Create', 'Learn', 'Explore']) {
    assert.match(platform, new RegExp('Preview ' + mode + ' pathway'));
    assert.doesNotMatch(platform, new RegExp('>Open ' + mode + ' ↗'));
  }
  assert.match(platform, /id="platform-sign-out"><a href="\/workspace\/">Workspace access<\/a>/);
  assert.doesNotMatch(platform, /href="\/workspace\/">Sign out<\/a>/);
});

test('each Life journey deep-links to its matching workspace product without bypassing account access', () => {
  const life=fs.readFileSync(path.join(root,'public/life/index.html'),'utf8');
  const workspace=fs.readFileSync(path.join(root,'public/workspace/index.html'),'utf8');
  const app=fs.readFileSync(path.join(root,'public/workspace/app.js'),'utf8');
  for(const [id,name] of [['day','DayFlow'],['learn','LearnPath'],['career','CareerStep']]){
    assert.ok(life.includes('href="/workspace/?product='+id+'">Explore '+name), 'Missing Life product deep-link: '+id);
    assert.match(workspace,new RegExp('name="productId" value="'+id+'"'));
  }
  assert.match(app,/new URLSearchParams\(location\.search\)\.get\('product'\)/);
  assert.match(app,/Object\.hasOwn\(definitions,requestedProduct\)/);
  assert.match(app,/if\(requestedProduct && Object\.hasOwn\(definitions,requestedProduct\)\) choose\(requestedProduct\)/);
  assert.ok(app.includes("'sign-in-link').href='/sign-in/?return='+encodeURIComponent('/workspace/?product='+requestedProduct)"));
  assert.match(app,/await window\.adAstraVerifySession\(clerk\)/);
  assert.match(workspace,/Customer execution remains subject to release and account access checks/);
});
