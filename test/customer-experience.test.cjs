'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const vm = require('node:vm');
const {validate, sampleText, experienceFiles} = require('../scripts/lib/customer-experience.cjs');
const framework = require('../config/customer-experience-framework.json');
const catalog = require('../config/public-product-families.json');
const story = require('../config/story-collection.json');
const root = path.join(__dirname, '..');

test('customer journey binds seven stages and six directions to the existing product catalog', () => {
  validate(framework, catalog);
  for (const direction of framework.directions) assert.ok(catalog.families.some(f => f.id === direction.family));
  for (const stage of framework.stages) assert.ok(fs.existsSync(path.join(root, 'public', stage.route, 'index.html')));
  assert.equal(framework.stages.filter(s => s.state === 'preview').length, 3);
  assert.equal(framework.stages.filter(s => s.state === 'planned').length, 4);
});

test('preview configuration cannot silently activate customer access, tracking or payment', () => {
  for (const key of Object.keys(framework.capabilities)) {
    const altered = structuredClone(framework);
    altered.capabilities[key] = true;
    assert.throws(() => validate(altered, catalog), key);
  }
  const unknown = structuredClone(framework); unknown.directions[0].family = 'unavailable-family';
  assert.throws(() => validate(unknown, catalog));
  const duplicate = structuredClone(framework); duplicate.directions[1].id = 'research';
  assert.throws(() => validate(duplicate, catalog));
  const falseAvailability = structuredClone(framework); falseAvailability.stages[3].state = 'available';
  assert.throws(() => validate(falseAvailability, catalog));
});

test('customer experience and six downloads are deterministic source-derived written examples', () => {
  const files = experienceFiles(framework, catalog, story);
  assert.equal(files.size, 7);
  for (const [file, content] of files) assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), content, file);
  for (const direction of framework.directions) {
    const text = sampleText(direction);
    assert.ok(text.startsWith('AD ASTRA / ILLUSTRATIVE SAMPLE'));
    assert.ok(text.includes('not a generated answer or live service'));
    assert.ok(text.includes(direction.sample.review));
    assert.ok(text.includes('https://adastra.global/status/'));
  }
});

test('journey is explicit, accessible without script and escapes display copy', () => {
  const html = experienceFiles(framework, catalog, story).get('public/start/index.html');
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.equal((html.match(/data-direction-panel=/g) || []).length, 6);
  assert.equal((html.match(/data-direction-choice=/g) || []).length, 6);
  assert.equal((html.match(/ download=/g) || []).length, 6);
  assert.ok(!/<form\b|<input\b|<textarea\b|<video\b|<audio\b|<iframe\b/.test(html));
  assert.ok(html.includes('data-direction-controls hidden'));
  assert.ok(!/data-direction-panel="[^"]+" hidden/.test(html));
  assert.ok(html.includes('No live AI, account creation or subscriptions'));
  assert.ok(html.includes('name="robots" content="noindex,follow"'));
  assert.ok(html.includes('role="status" aria-live="polite" aria-atomic="true"'));
  const untrusted = structuredClone(framework);
  untrusted.directions[0].sample.title = '<img src=x onerror=alert(1)>';
  const escaped = experienceFiles(untrusted, catalog, story).get('public/start/index.html');
  assert.ok(!escaped.includes('<img src=x'));
  assert.ok(escaped.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('journey selection has no provider, storage, tracking or microphone side effects', () => {
  const js = fs.readFileSync(path.join(root, 'public/start/experience.js'), 'utf8');
  assert.ok(!/fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|getUserMedia|SpeechRecognition|innerHTML|eval\s*\(/.test(js));
  assert.ok(js.includes('allowed.has(value)'));
  assert.ok(js.includes("window.addEventListener('popstate'"));
  assert.ok(js.includes('encodeURIComponent(direction)'));
});

test('default selection receives a shareable URL and every direction survives history safely', () => {
  const controls = {hidden:true}, announcement = {textContent:''}, listeners = {}, pushed = [];
  const buttons = framework.directions.map((d, i) => ({
    dataset:{directionChoice:d.id}, textContent:`0${i + 1}${d.name}↗`, attrs:{},
    setAttribute(key, value) { this.attrs[key] = value; },
    addEventListener(event, handler) { this[event] = handler; }
  }));
  const panels = framework.directions.map(d => ({dataset:{directionPanel:d.id}, hidden:false}));
  const location = {search:''};
  const context = {
    URLSearchParams, location,
    history:{pushState(_state, _title, url) { pushed.push(url); location.search = new URL(url, 'https://adastra.global').search; }},
    document:{
      querySelector(selector) { return selector === '[data-direction-controls]' ? controls : selector === '[data-direction-announcement]' ? announcement : null; },
      querySelectorAll(selector) { return selector === '[data-direction-choice]' ? buttons : selector === '[data-direction-panel]' ? panels : []; }
    },
    window:{addEventListener(event, handler) { listeners[event] = handler; }}
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/start/experience.js'), 'utf8'), context);
  assert.equal(controls.hidden, false);
  assert.equal(panels.filter(p => !p.hidden).length, 1);
  assert.equal(pushed.length, 0, 'Initial rendering must not add a browser-history entry');
  for (const button of buttons) {
    button.click();
    assert.equal(new URLSearchParams(location.search).get('direction'), button.dataset.directionChoice);
    assert.equal(panels.find(p => !p.hidden).dataset.directionPanel, button.dataset.directionChoice);
    assert.equal(buttons.filter(b => b.attrs['aria-pressed'] === 'true').length, 1);
  }
  assert.equal(pushed[0], '/start/?direction=research#workspace');
  const count = pushed.length; buttons.at(-1).click();
  assert.equal(pushed.length, count, 'Reselecting the current direction must not duplicate history');
  location.search = '?direction=create'; listeners.popstate();
  assert.equal(panels.find(p => !p.hidden).dataset.directionPanel, 'create');
  for (const unsafe of ['__proto__', '<script>bad</script>', 'https://untrusted.invalid/']) {
    location.search = '?direction=' + encodeURIComponent(unsafe); listeners.popstate();
    assert.equal(panels.find(p => !p.hidden).dataset.directionPanel, 'research');
    assert.ok(!announcement.textContent.includes(unsafe));
  }
  assert.ok(announcement.textContent.includes('No AI request has been sent'));
});

test('homepage, navigation and route evidence link to a pending, non-indexable journey', () => {
  const home = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.ok(home.includes('href="/start/">Find your starting point'));
  assert.ok(home.includes('href="/platform-preview/">Explore the workspace'));
  for(const mode of ['research','create','plan'])assert.ok(home.includes('href="/platform-preview/?mode='+mode+'"'));
  const evidence = require('../public/route-release-evidence.json');
  const start = evidence.routes.find(r => r.path === '/start/');
  assert.equal(start.decision, 'pending');
  assert.deepEqual(start.missingGates, evidence.requiredRouteGates);
  assert.ok(!evidence.approvedRoutes.includes('/start/'));
  assert.equal(require('../public/release-manifest.json').publicLaunchEnabled, false);
});

test('cinematic arrival and workspace layers are decorative, controllable and do not claim model reasoning', () => {
  const home = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const preview = fs.readFileSync(path.join(root, 'public/platform-preview/index.html'), 'utf8');
  const homeCss = fs.readFileSync(path.join(root, 'public/customer-experience.css'), 'utf8');
  const workspaceCss = fs.readFileSync(path.join(root, 'public/platform-preview/style.css'), 'utf8');
  assert.match(home, /class="ad-arrival-atmosphere" aria-hidden="true"/);
  assert.match(home, /Cinematic experience preview · Customer services in development/);
  assert.match(preview, /class="wp-scene-atmosphere" aria-hidden="true"/);
  assert.match(preview, /Visual layer · not model reasoning\./);
  assert.match(homeCss, /motion-ready:not\(\[data-motion=off\]\)\s+\.ad-arrival-orbit/);
  assert.match(workspaceCss, /data-visual-motion=off\]\s+\.wp-scene-art img,\.wp-app\[data-visual-motion=off\]\s+\.wp-scene-orbit/);
  assert.match(workspaceCss, /@media\(prefers-reduced-motion:reduce\)/);
});
