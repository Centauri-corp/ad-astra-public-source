'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const script = fs.readFileSync('public/access/experience-links.js', 'utf8');
test('access preserves only allowed modes through the existing sign-in return contract', () => {
  for (const mode of ['ask','research','create','learn','explore','//attacker.invalid','<script>','']) {
    const link = {href:'/sign-in/?return=%2Fplatform%2F'}, status = {textContent:''};
    vm.runInNewContext(script, {URL, URLSearchParams, location:{origin:'https://adastra.global',search:'?mode='+encodeURIComponent(mode)},document:{getElementById:id=>({'access-sign-in':link,'access-mode':status}[id] ?? null)}});
    const next = new URL(link.href,'https://adastra.global');
    assert.equal(next.pathname, '/sign-in/');
    assert.equal(next.searchParams.get('return'), ['ask','research','create','learn','explore'].includes(mode) ? '/knowledge/?mode='+mode+'#ask-ad-astra' : '/platform/');
  }
});
test('homepage tab updates stay on the access route without an observer loop', () => {
  const link = {href:'https://adastra.global/knowledge/?mode=research#ask-ad-astra'};
  let callback;
  vm.runInNewContext(script, {URL,URLSearchParams,location:{origin:'https://adastra.global',search:''},document:{getElementById:id=>id==='experience-launch'?link:null},MutationObserver:class {constructor(fn){callback=fn;}observe(){}}});
  assert.equal(link.href, '/access/?mode=research');
  callback(); assert.equal(link.href, '/access/?mode=research');
});
test('access is usable without scripts and keeps an independent canonical and noindex', () => {
  const html=fs.readFileSync('public/access/index.html','utf8');
  assert.match(html, /href="\/sign-in\/\?return=%2Fplatform%2F"/);
  assert.match(html, /name="robots" content="noindex,follow"/);
  assert.match(html, /rel="canonical" href="https:\/\/adastra.global\/access\/"/);
  assert.equal((html.match(/Choose (Ask|Research|Create|Learn|Explore)/g)||[]).length,5);
});
test('homepage structured data has an exact allowed CSP hash', () => {
  const {createHash}=require('node:crypto');
  const html=fs.readFileSync('public/index.html','utf8');
  const policy=require('../vercel.json').headers[0].headers.find(item=>item.key==='Content-Security-Policy').value;
  const scripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length>0);
  for(const [,body] of scripts) assert.ok(policy.includes("'sha256-"+createHash('sha256').update(body).digest('base64')+"'"),'inline script is blocked by CSP');
});
