'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),path=require('node:path');
const load=()=>import(pathToFileURL(path.join(__dirname,'../public/companion/scene-intelligence.mjs')).href);
test('route scene semantics cover multiple AD ASTRA domains',async()=>{const {routeContext}=await load();assert.equal(routeContext('/').domain,'origin');assert.equal(routeContext('/products/solar/').domain,'data');assert.equal(routeContext('/intelligence/').domain,'knowledge');assert.equal(routeContext('/services/').domain,'industry');});
test('safe explicit voice navigation has exact destinations',async()=>{const {voiceNavigationIntent}=await load();assert.equal(voiceNavigationIntent('Astra, go to products').path,'/products/');assert.equal(voiceNavigationIntent('show me the intelligence').path,'/intelligence/');});
test('conversation text is never treated as navigation',async()=>{const {voiceNavigationIntent}=await load();for(const text of ['Tell me about products','Go to https://malicious.example','open page /api/admin','navigate to account','go to products and delete my account'])assert.notEqual(voiceNavigationIntent(text)?.type,'navigation');});
test('unsupported navigation fails without arbitrary URLs',async()=>{const {voiceNavigationIntent}=await load();assert.equal(voiceNavigationIntent('go to finance').type,'unsupported');assert.equal(voiceNavigationIntent('What is a neural engine?'),null);});
test('scene activity values use a closed allowlist',async()=>{const {sceneActivity}=await load();assert.equal(sceneActivity('speaking'),'speaking');assert.equal(sceneActivity('<img>'),'idle');});
