'use strict';
const assert = require('node:assert/strict');
const {head, footer, picture, esc, applySharedShell} = require('./site-shell.cjs');

function validate(framework, catalog) {
  assert.equal(framework.schema, 'ad-astra-customer-experience/v1');
  assert.equal(framework.brand, 'AD ASTRA');
  assert.equal(framework.scope, 'customer-journey-design-preview');
  assert.equal(framework.releaseAuthorization, false);
  assert.deepEqual(framework.capabilities, {aiExecution:false, accountCreation:false, billing:false, crmWrites:false, outreach:false, microphone:false, tracking:false});
  assert.deepEqual(framework.stages.map(s => s.id), ['discover','choose','evaluate','account','subscribe','first-value','return']);
  assert.deepEqual(framework.stages.map(s => s.state), ['preview','preview','preview','planned','planned','planned','planned']);
  for (const stage of framework.stages) {
    assert.match(stage.route, /^\/(?:[a-z0-9-]+\/)*$/);
    assert.ok(stage.name && stage.promise);
  }
  assert.deepEqual(framework.directions.map(d => d.id), ['research','create','learn','plan','build','coordinate']);
  for (const direction of framework.directions) {
    const family = catalog.families.find(f => f.id === direction.family);
    assert.ok(family && family.modes.includes(direction.mode), 'Direction must resolve to an existing product and mode');
    assert.ok(['intelligence','products','agi','global'].includes(direction.art));
    assert.ok(direction.name && direction.intention && direction.sample.title && direction.sample.summary && direction.sample.review);
    assert.equal(direction.sample.steps.length, 3);
    for (const step of direction.sample.steps) assert.ok(typeof step === 'string' && step.trim());
  }
}

function sampleText(direction) {
  return ['AD ASTRA / ILLUSTRATIVE SAMPLE', 'Written example, not a generated answer or live service.', '', direction.sample.title, '', direction.intention, '', direction.sample.summary, '', ...direction.sample.steps.map((step, i) => `${i + 1}. ${step}`), '', direction.sample.review, '', 'Products remain in development. No account, payment or AI request was created.', 'https://adastra.global/status/', ''].join('\n');
}

function journeyTeaser() {
  return `<section class="chapter journey-invitation" aria-labelledby="journey-invitation-title"><div class="chapter-intro"><div><p class="eyebrow">YOUR JOURNEY / ONE CLEAR NEXT STEP</p><h2 id="journey-invitation-title">Enter with a question.<br><span>Leave with a direction.</span></h2></div><div><p class="body-copy">See how your intention could become useful work. Explore a written example, find the right product direction and understand what needs to be ready before customer access opens.</p><a class="cta" href="/start/">Find your starting point <span aria-hidden="true">↗</span></a></div></div><ol class="journey-rail"><li><span>01 / DISCOVER</span><p>Start with the work you want to do.</p></li><li><span>02 / EXPLORE</span><p>Understand the intended outcome and its limits.</p></li><li><span>03 / DECIDE</span><p>Review plans and availability before committing.</p></li></ol></section>`;
}

function experienceFiles(framework, catalog, story) {
  validate(framework, catalog);
  const art = story.assets.find(a => a.id === 'intelligence');
  const choices = framework.directions.map((d, i) => `<button type="button" data-direction-choice="${d.id}" aria-pressed="${i === 0}" aria-controls="sample-${d.id}"><span>0${i + 1}</span>${esc(d.name)}<span aria-hidden="true">↗</span></button>`).join('');
  const samples = framework.directions.map(d => {
    const family = catalog.families.find(f => f.id === d.family);
    const scene = story.assets.find(a => a.id === d.art);
    return `<article class="journey-sample" id="sample-${d.id}" data-direction-panel="${d.id}" aria-labelledby="sample-${d.id}-title"><div class="sample-banner"><span>WRITTEN EXAMPLE / NOT LIVE AI</span><span>${esc(family.name)}</span></div><div class="sample-intention"><p class="eyebrow">YOUR INTENTION</p><p>${esc(d.intention)}</p></div><div class="sample-content"><p class="eyebrow">THE SHAPE OF A USEFUL OUTCOME</p><h3 id="sample-${d.id}-title">${esc(d.sample.title)}</h3><p>${esc(d.sample.summary)}</p><ol>${d.sample.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><p class="sample-review">${esc(d.sample.review)}</p></div><figure class="sample-art">${picture(d.art, scene.alt)}<figcaption>Concept art · not execution or telemetry</figcaption></figure><div class="sample-actions"><a class="cta" href="/products/${d.family}/">Explore ${esc(family.name)} <span aria-hidden="true">↗</span></a><a class="quiet-cta" href="/start/samples/${d.id}.txt" download="ad-astra-${d.id}-sample.txt">Download written sample <span aria-hidden="true">↓</span></a></div></article>`;
  }).join('');
  const stages = framework.stages.map((s, i) => `<li><span class="journey-stage-number">0${i + 1}</span><div><h3>${esc(s.name)}</h3><p>${esc(s.promise)}</p><a href="${s.route}">${s.state === 'preview' ? 'Explore the preview' : 'Review the design or availability'} <span aria-hidden="true">↗</span></a></div><span class="journey-stage-state">${s.state === 'preview' ? 'Design preview' : 'Future customer step'}</span></li>`).join('');
  const content = `<main id="main" class="journey-page"><section class="journey-arrival" aria-labelledby="journey-title"><div><p class="eyebrow">AD ASTRA / FIND YOUR STARTING POINT</p><h1 id="journey-title">Your intention.<br><span>A world of direction.</span></h1><p class="body-copy">Start with something that matters to you. See the shape of a useful outcome, then explore the product direction behind it.</p><a class="cta" href="#workspace">Explore the experience <span aria-hidden="true">↓</span></a><p class="journey-disclosure">An interactive design preview. No live AI, account creation or subscriptions.</p></div><figure>${picture('intelligence', art.alt, {hero:true})}<figcaption>Human-directed intelligence / Concept art</figcaption></figure></section><section class="journey-workspace" id="workspace" aria-labelledby="workspace-title"><div class="journey-workspace-heading"><div><p class="eyebrow">INTENTION → DIRECTION → REVIEW</p><h2 id="workspace-title">What would you like<br>to move forward?</h2></div><p>Choose a starting point. Every example is prewritten, editable after download and clearly separate from a generated answer.</p></div><div class="journey-canvas"><aside class="journey-choices"><div data-direction-controls hidden role="group" aria-label="Choose your starting point">${choices}</div><noscript><p>JavaScript is off. All six written examples and product links are available below.</p></noscript><div class="journey-boundary"><span class="journey-boundary-symbol" aria-hidden="true">◎</span><h3>You stay in control.</h3><p>This preview sends no prompts, records no audio and does not create an account or charge you.</p><a href="/status/">Check current availability <span aria-hidden="true">↗</span></a></div></aside><div class="journey-output">${samples}</div></div><p class="journey-announcement" data-direction-announcement role="status" aria-live="polite" aria-atomic="true">Six illustrative directions. No AI request has been sent.</p></section><section class="journey-continuity" aria-labelledby="continuity-title"><div class="chapter-intro"><div><p class="eyebrow">THE EXPERIENCE WE ARE BUILDING</p><h2 id="continuity-title">One connected journey.<br><span>No uncertain next step.</span></h2></div><p class="body-copy">Discovering Ad Astra should connect naturally to choosing access, making useful work and returning with confidence. Customer account, payment and live-workspace steps below are future requirements—not services activated by this preview.</p></div><ol class="journey-stages">${stages}</ol></section><section class="journey-next" aria-labelledby="journey-next-title"><p class="eyebrow">UNDERSTAND BEFORE YOU COMMIT</p><h2 id="journey-next-title">The right fit.<br>On clear terms.</h2><p>Plans, service regions and customer access remain under review. No payment is requested. Explore the planned access structure and check what is actually available.</p><div class="hero-actions"><a class="cta" href="/pricing/">Review plans & availability <span aria-hidden="true">↗</span></a><a class="quiet-cta" href="/platform-preview/">View the workspace design <span aria-hidden="true">↗</span></a></div></section></main>`;
  let html = head('/start/', 'Find your starting point', 'Explore the Ad Astra customer journey: choose an intention, review a clearly labelled written example and understand planned access before committing.') + content + footer() + '</body></html>\n';
  html = html.replace('</head>', '<link rel="stylesheet" href="/start/experience.css"><script defer src="/start/experience.js"></script></head>');
  const files = new Map([['public/start/index.html', applySharedShell(html, '/start/')]]);
  for (const direction of framework.directions) files.set(`public/start/samples/${direction.id}.txt`, sampleText(direction));
  return files;
}

module.exports = {validate, sampleText, experienceFiles, journeyTeaser};
