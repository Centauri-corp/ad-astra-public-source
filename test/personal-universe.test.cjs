'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const config=require('../projects/website-customer-experience/neural-customer-verticals.json');
const {families}=require('../config/public-product-families.json');
const {publicCustomerAgents}=require('../lib/customer-agent-catalog');
const html=fs.readFileSync(require('node:path').join(__dirname,'../public/personal-universe/index.html'),'utf8');
const js=fs.readFileSync(require('node:path').join(__dirname,'../public/personal-universe/universe.js'),'utf8');
const verticals=fs.readFileSync(require('node:path').join(__dirname,'../public/companion/verticals.js'),'utf8');
const css=fs.readFileSync(require('node:path').join(__dirname,'../public/personal-universe/universe.css'),'utf8');
test('customer universe preserves six catalog directions and sanctioned agents',()=>{
 assert.equal(config.schema,'ad-astra-neural-customer-verticals/v1');
 assert.deepEqual(config.families.map(x=>x.id),families.map(x=>x.id));
 const ids=new Set(publicCustomerAgents().map(x=>x.id));
 for(const item of config.families){
  assert.ok(ids.has(item.agentId));
  assert.match(item.accent,/^#[0-9a-f]{6}$/i);
  assert.ok(['research','create','plan'].includes(item.mode));
  assert.ok(['ask','research','create','learn','explore'].includes(item.interaction));
 }
});
test('preview is non-indexed, 3D opt-in, voice opt-in and calls existing protected client',()=>{
 assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.match(html,/id="load-3d"/);
 assert.match(html,/id="verify-account"/);
 assert.match(html,/id="voice-dictate"[^>]+disabled/);
 assert.match(html,/id="ask-intelligence"[^>]+disabled/);
 assert.match(js,/createCinematicScene/);
 assert.match(js,/createCompanionIdentity/);
 assert.match(js,/AdAstraEngineClient\.ask/);
 assert.match(js,/identity\.token\(tokenScope\)/);
 assert.match(js,/voice\?\.dictate\(\)/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|serviceWorker|fetch\s*\(\s*['"]https?:/);
});
test('visual choices never become authorization or customer telemetry',()=>{
 assert.match(verticals,/NEVER a tenant\/role\/entitlement/);
 assert.match(verticals,/const byId=new Map/);
 assert.match(verticals,/requestHint/);
 assert.match(require('node:fs').readFileSync(require('node:path').join(__dirname,'../lib/customer-integration.js'),'utf8'),/runsAI:false/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/This image does not show an AI model thinking/);
});
