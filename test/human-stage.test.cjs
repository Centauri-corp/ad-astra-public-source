'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('homepage human-to-human journey is explicit and fail-closed',()=>{
  const root=path.join(__dirname,'..','public');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'experience-manifest.json'),'utf8'));
  const journey=manifest.visualArchitecture.humanToHuman;
  assert.deepEqual(journey.journey,['arrive','neural-motion','speak-or-type','choose-direction','intelligence-layer','continue']);
  assert.equal(journey.status,'cinematic-guided-preview');
  assert.equal(journey.voice.liveProvider,false);
  assert.equal(journey.voice.engineAdapter,'ad-astra/cinematic-intelligence-preview/v1');
  assert.equal(journey.telemetry,false);
  assert.equal(journey.fallback,'typed-input-and-accessible-text');
  const homepage=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const script=fs.readFileSync(path.join(root,'human-stage.js'),'utf8');
  assert.equal(homepage.includes('id="human-stage"'),true);
  assert.equal(homepage.includes('data-stage-listen'),true);
  assert.equal(homepage.includes('data-stage-input'),true);
  assert.equal(script.includes('SpeechRecognition'),true);
  assert.equal(script.includes('speechSynthesis'),true);
  assert.equal(script.includes('fetch('),false);
  assert.equal(script.includes('XMLHttpRequest'),false);
});
