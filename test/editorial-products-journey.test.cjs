'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('public/products/index.html');
const css = read('public/products/editorial-journey.css');
const js = read('public/products/editorial-journey.js');
const agents = read('AGENTS.md');
const catalog = JSON.parse(read('public/products/portfolio.json'));
const release = JSON.parse(read('public/release-manifest.json'));

test('the user-specified product-first cinematic journey precedes any dense technical catalog', () => {
  const hero = html.indexOf('id="product-opening"');
  const statement = html.indexOf('class="editorial-statement"');
  const story = html.indexOf('id="product-film-story"');
  const technical = html.indexOf('id="technical-foundation"');
  const grid = html.indexOf('class="portfolio-grid"');
  const atlas = html.indexOf('class="atlas"');
  assert.ok(hero > 0 && hero < statement && statement < story, 'lead with cinematic hero and editorial introduction');
  assert.ok(story < technical && technical < grid && technical < atlas, 'move all dense cards and old atlases into secondary appendix');
  assert.ok(!html.slice(hero, technical).includes('data-portfolio-card'), 'no card-first flagship experience');
  assert.ok(html.includes('<details class="editorial-technical" id="technical-foundation">'), 'atlas remains explicitly expandable');
  assert.ok(html.includes('Explore the technical atlas'));
});
test('four differentiated cinematic scenes lead directly to the authoritative flagship products', () => {
  const story = html.slice(html.indexOf('id="product-film-story"'), html.indexOf('id="technical-foundation"'));
  const chapters = [...story.matchAll(/<article class="editorial-chapter[^"]*" id="([^"]+)" data-cinematic-chapter="([^"]+)"/g)];
  const ids = ['discovery', 'learning', 'visualization', 'governance'];
  assert.deepEqual(chapters.map(x=>x[1]), ids.map(x=>'chapter-'+x));
  assert.deepEqual(chapters.map(x=>x[2]), ids);
  for(const product of catalog.flagship)assert.match(story,new RegExp('href="'+product.primary.replaceAll('/','\\/')+'"'));
  for(const image of [
    'astra-lumen-neural-horizon.png', 'astra-lumen-neural-brain.png',
    'astra-lumen-neural-profile-canvas.png', 'astra-lumen-neural-concierge.png'
  ])assert.ok(story.includes(image),image);
  assert.match(story,/Human review first/);
  assert.match(story,/Permission boundaries/);
});
test('approved existing graphics and full product catalog remain functional but secondary', () => {
  for(const id of ['beyond-physics','astra-lumen','neural-visual-experience','governed-workflows']) {
    assert.ok(html.includes('data-product-direction="'+id+'"'));
    assert.ok(html.includes('href="/products/'+id+'/"'));
  }
  for(const value of ['data-cinematic-host','data-cinematic-journey','data-cinematic-status','data-cinematic-layer="0"','data-cinematic-layer="1"','data-cinematic-layer="2"'])assert.ok(html.includes(value),value);
  for(const id of ['science-preview','scientific-time','scientific-surface','portfolio-catalog','capability-catalog','life-products','market-solutions'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.equal((html.match(/data-portfolio-card\b/g)||[]).length,4);
  assert.equal(catalog.capabilities.length,12);
  assert.equal(catalog.life.length,3);
  assert.equal(catalog.markets.length,15);
});
test('film and graphics motion is opt-in, static first, accessible and protective', () => {
  assert.match(html,/<video class="editorial-hero-film" muted playsinline loop preload="none"/);
  assert.match(html,/data-editorial-motion aria-pressed="false"/);
  assert.match(html,/href="\/experience\/"/);
  assert.match(js,/IntersectionObserver/);
  assert.match(js,/prefers-reduced-motion/);
  assert.match(js,/saveData/);
  assert.match(js,/document\.hidden/);
  assert.match(js,/video\.muted = true/);
  assert.match(js,/video\.pause\(\)/);
  assert.match(js,/workbench\.open/);
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(html,/<video[^>]*autoplay/);
  assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|navigator\.mediaDevices/);
});
test('Codex project instructions lock creative standard separately from CI, and release stays HOLD', () => {
  assert.match(agents,/Codex/);
  assert.match(agents,/DJI RS 5/);
  assert.match(agents,/Never put a dense card grid/);
  assert.match(agents,/automated DOM\/CI tests/i);
  assert.match(agents,/they cannot establish artistic quality/i);
  assert.equal(release.publicLaunchEnabled,false);
  assert.equal(release.engineAvailable,false);
  assert.deepEqual(release.indexableRoutes,[]);
});
