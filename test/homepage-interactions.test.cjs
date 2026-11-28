'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../public/app.js'), 'utf8');
const html = fs.readFileSync(require.resolve('../public/index.html'), 'utf8');
async function settle() { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); }

// Execute the shipped script with two independent tablists and observable audio APIs.
// The GPU is a no-op fixture: these tests cover interaction/privacy boundaries, not rendering.
async function browser(options = {}) {
  let focused = null;
  class Element {
    constructor(id = '') { this.id = id; this.handlers = {}; this.attributes = {}; this.dataset = {}; this.style = {setProperty(){}}; this.hidden = false; this.disabled = false; this.tabIndex = 0; this.textContent = ''; this.children = []; this.value = ''; this.classList = {toggle(){}, add(){}, remove(){}}; }
    setAttribute(key, value) { this.attributes[key] = String(value); if (key === 'tabindex') this.tabIndex = Number(value); if (key === 'disabled') this.disabled = true; }
    getAttribute(key) { return this.attributes[key] ?? null; }
    removeAttribute(key) { delete this.attributes[key]; }
    addEventListener(type, handler) { (this.handlers[type] ||= []).push(handler); }
    async emit(type, properties = {}) { const event = {preventDefault(){}, ...properties}; for (const handler of this.handlers[type] || []) await handler(event); }
    focus() { focused = this; }
    replaceChildren(...items) { this.children = items; }
    querySelector() { return new Element(); }
    querySelectorAll() { return []; }
    getBoundingClientRect() { return {top:0, left:0, width:100, height:100}; }
  }
  const nodes = new Map();
  const node = id => { if (!nodes.has(id)) nodes.set(id, new Element(id)); return nodes.get(id); };
  for (const match of html.matchAll(/id="([^"]+)"/g)) node(match[1]);
  const experience = [], intelligence = [];
  for (const match of html.matchAll(/<button\b([^>]*)>/g)) {
    const attrs = Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    const element = node(attrs.id || 'tier-' + attrs['data-tier']);
    for (const [key, value] of Object.entries(attrs)) { element.setAttribute(key, value); if (key.startsWith('data-')) element.dataset[key.slice(5)] = value; }
    element.disabled = /\bdisabled(?:\s|$)/.test(match[1]);
    if (attrs['data-mode']) experience.push(element);
    if (attrs['data-tier']) intelligence.push(element);
  }
  const section = node('intelligence-layer');
  section.querySelectorAll = selector => selector === '.intelligence-tab' ? intelligence : [];
  const scene = new Element('arrival'); scene.dataset = {scene:'arrival', sceneIndex:'01'};
  const document = new Element(); document.body = new Element(); document.documentElement = {scrollHeight:1000}; document.hidden = false;
  document.getElementById = node;
  document.createTextNode = text => ({textContent:text}); document.createElement = () => new Element();
  document.querySelector = selector => selector === '.neural-brain-visual' ? null : node(selector);
  document.querySelectorAll = selector => selector === '[role="tab"]' ? [...intelligence, ...experience] : selector === '#possibilities [role="tab"][data-mode]' ? experience : selector === '[data-scene]' ? [scene] : [];
  const gl = new Proxy({}, {get(_target, key) {
    if (/^[A-Z_]+$/.test(key)) return 1;
    if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
    if (key === 'getAttribLocation') return () => 0;
    if (/^create|getUniformLocation/.test(key)) return () => ({});
    return () => {};
  }});
  node('neural-field-canvas').getContext = () => options.webgl === false ? null : gl;
  const calls = {availability:[], starts:0, localStarts:[], microphone:0, stoppedTracks:0, stoppedStreamIds:[], installs:0, aborts:0};
  let recognizer = null;
  class Recognition {
    constructor() { recognizer = this; if (options.localProperty !== false) this.processLocally = false; }
    static async available(value) { calls.availability.push(JSON.parse(JSON.stringify(value))); if (options.availabilityError) throw Error('Unavailable'); return options.available ? options.available(calls.availability.length) : 'available'; }
    static async install() { calls.installs++; throw Error('Language downloads must not be started'); }
    start() { calls.starts++; if (this.requested) throw Error('InvalidStateError'); this.requested = true; calls.localStarts.push(this.processLocally); if (!options.asyncStart) this.deliverStart(); }
    deliverStart() { this.onstart?.(); }
    stop() { this.requested = false; this.onend?.(); }
    abort() { calls.aborts++; this.requested = false; this.onend?.(); }
  }
  if (options.availableApi === false) Recognition.available = undefined;
  class AudioContext { createAnalyser() { return {fftSize:512, disconnect(){}, getByteTimeDomainData(){}}; } createMediaStreamSource() { return {connect(){}}; } close() { return Promise.resolve(); } }
  const window = new Element(); window.SpeechRecognition = options.recognizer === false ? undefined : Recognition; window.AudioContext = options.audioContext === false ? undefined : AudioContext;
  const navigator = {connection:{saveData:false}, mediaDevices:{getUserMedia:async () => {
    const id = ++calls.microphone;
    const stream = {getTracks:() => [{stop:() => { calls.stoppedTracks++; calls.stoppedStreamIds.push(id); }}]};
    return options.microphone ? options.microphone(stream, id) : stream;
  }}};
  const context = {document, window, navigator, location:{hash:''}, matchMedia:() => ({matches:false, addEventListener(){}}), performance:{now:() => 0}, innerHeight:800, scrollY:0, devicePixelRatio:1, requestAnimationFrame:() => 1, setTimeout:() => 1, clearTimeout(){}, console};
  vm.runInNewContext(source, context, {filename:'public/app.js'});
  await settle();
  return {node, experience, intelligence, document, window, calls, recognizer:() => recognizer, focused:() => focused};
}

test('experience tabs and intelligence tabs retain independent selections and keyboard focus', async () => {
  const page = await browser({recognizer:false});
  await page.experience[1].emit('click');
  assert.equal(page.experience[1].getAttribute('aria-selected'), 'true');
  assert.equal(page.intelligence[0].getAttribute('aria-selected'), 'true');
  assert.equal(page.intelligence[0].tabIndex, 0);
  await page.intelligence[1].emit('click');
  assert.equal(page.experience[1].getAttribute('aria-selected'), 'true');
  assert.equal(page.experience[1].tabIndex, 0);
  assert.deepEqual(page.intelligence.map(tab => tab.tabIndex), [-1, 0, -1]);
  await page.intelligence[1].emit('keydown', {key:'End'});
  assert.equal(page.focused(), page.intelligence[2]);
  await page.intelligence[2].emit('keydown', {key:'ArrowRight'});
  assert.equal(page.focused(), page.intelligence[0]);
  assert.equal(page.node('intelligence-layer').dataset.tier, '1');
  await page.experience[4].emit('keydown', {key:'ArrowRight'});
  assert.equal(page.focused(), page.experience[0]);
  assert.equal(page.intelligence[0].getAttribute('aria-selected'), 'true');
  assert.deepEqual(page.intelligence.map(tab => tab.tabIndex), [0, -1, -1]);
});

test('intelligence keyboard navigation still works when WebGL is unavailable', async () => {
  const page = await browser({webgl:false});
  await page.intelligence[0].emit('keydown', {key:'ArrowLeft'});
  assert.equal(page.focused(), page.intelligence[2]);
  assert.equal(page.node('intelligence-layer').dataset.tier, '3');
  assert.equal(page.node('voice-command').disabled, true);
  assert.equal(page.calls.microphone, 0);
});

for (const [name, options] of [
  ['no recognition API', {recognizer:false}],
  ['no local-processing property', {localProperty:false}],
  ['no local availability API', {availableApi:false}],
  ['language pack needs downloading', {available:() => 'downloadable'}],
  ['language pack is downloading', {available:() => 'downloading'}],
  ['language pack unavailable', {available:() => 'unavailable'}],
  ['availability check rejects', {availabilityError:true}]
]) test('voice fails closed with ' + name, async () => {
  const page = await browser(options);
  assert.equal(page.node('voice-command').disabled, true);
  await page.node('voice-command').emit('click');
  assert.equal(page.calls.microphone, 0);
  assert.equal(page.calls.starts, 0);
  assert.equal(page.calls.installs, 0);
});

test('voice only starts after an explicit click and requires on-device speech at every check', async () => {
  const page = await browser();
  assert.equal(page.node('voice-command').disabled, false);
  assert.equal(page.calls.microphone, 0);
  assert.equal(page.calls.starts, 0);
  await page.node('voice-command').emit('click');
  assert.equal(page.calls.starts, 1);
  assert.deepEqual(page.calls.localStarts, [true]);
  assert.equal(page.calls.microphone, 1);
  assert.equal(page.calls.installs, 0);
  assert.deepEqual(page.calls.availability, [
    {langs:['en-US'], processLocally:true}, {langs:['en-US'], processLocally:true}
  ]);
  await page.window.emit('pagehide');
  assert.equal(page.node('voice-command').getAttribute('aria-pressed'), 'false');
  assert.ok(page.calls.stoppedTracks > 0);
  assert.equal(page.calls.aborts, 1);
});

test('voice rechecks local availability before requesting microphone access', async () => {
  const page = await browser({available:call => call === 1 ? 'available' : 'unavailable'});
  await page.node('voice-command').emit('click');
  assert.equal(page.node('voice-command').disabled, true);
  assert.equal(page.calls.starts, 0);
  assert.equal(page.calls.microphone, 0);
});

test('a pending microphone request cannot start speech after the page becomes hidden', async () => {
  let releaseMicrophone;
  const page = await browser({microphone:stream => new Promise(resolve => { releaseMicrophone = () => resolve(stream); })});
  const click = page.node('voice-command').emit('click'); await settle();
  page.document.hidden = true; await page.document.emit('visibilitychange');
  page.document.hidden = false;
  releaseMicrophone(); await click;
  assert.equal(page.calls.starts, 0);
  assert.ok(page.calls.stoppedTracks > 0);
});

test('asynchronous speech startup remains locked until onstart and cannot start twice', async () => {
  const page = await browser({asyncStart:true});
  await page.node('voice-command').emit('click');
  assert.equal(page.node('voice-command').disabled, true);
  assert.equal(page.node('voice-command').getAttribute('aria-pressed'), 'false');
  assert.match(page.node('voice-help').textContent, /Starting on-device/);
  await page.node('voice-command').emit('click');
  assert.equal(page.calls.starts, 1);
  assert.equal(page.calls.microphone, 1);
  assert.equal(page.calls.stoppedTracks, 0);
  page.recognizer().deliverStart();
  assert.equal(page.node('voice-command').disabled, false);
  assert.equal(page.node('voice-command').getAttribute('aria-pressed'), 'true');
  await page.node('voice-command').emit('click');
  assert.equal(page.calls.starts, 1);
  assert.equal(page.node('voice-command').getAttribute('aria-pressed'), 'false');
  assert.ok(page.calls.stoppedTracks > 0);
});

test('startup error unlocks a new attempt and obsolete recognizer events cannot alter it', async () => {
  const page = await browser({asyncStart:true});
  await page.node('voice-command').emit('click');
  const first = page.recognizer();
  first.onerror({error:'not-allowed'});
  assert.equal(page.node('voice-command').disabled, false);
  assert.ok(page.calls.stoppedTracks > 0);
  await page.node('voice-command').emit('click');
  const second = page.recognizer();
  assert.notEqual(second, first);
  const status = page.node('voice-help').textContent;
  first.deliverStart(); first.onend(); first.onerror({error:'aborted'});
  assert.equal(page.node('voice-command').disabled, true);
  assert.equal(page.node('voice-command').getAttribute('aria-pressed'), 'false');
  assert.equal(page.node('voice-help').textContent, status);
  second.deliverStart();
  assert.equal(page.node('voice-command').getAttribute('aria-pressed'), 'true');
});

test('cancelling pending permission releases the lock and stale streams cannot stop a newer attempt', async () => {
  let releaseFirst;
  const page = await browser({asyncStart:true, microphone:(stream, id) => id === 1 ? new Promise(resolve => { releaseFirst = () => resolve(stream); }) : stream});
  const firstClick = page.node('voice-command').emit('click'); await settle();
  const first = page.recognizer();
  page.document.hidden = true; await page.document.emit('visibilitychange');
  assert.equal(page.node('voice-command').disabled, false);
  page.document.hidden = false;
  await page.node('voice-command').emit('click');
  const second = page.recognizer();
  releaseFirst(); await firstClick;
  assert.deepEqual(page.calls.stoppedStreamIds, [1]);
  assert.equal(page.calls.starts, 1);
  first.deliverStart();
  assert.equal(page.node('voice-command').getAttribute('aria-pressed'), 'false');
  assert.equal(page.node('voice-command').disabled, true);
  second.deliverStart();
  assert.equal(page.node('voice-command').getAttribute('aria-pressed'), 'true');
  await page.window.emit('pagehide');
  assert.deepEqual(page.calls.stoppedStreamIds, [1, 2]);
});

for (const [name, options] of [
  ['microphone permission denied', {microphone:() => Promise.reject(Error('NotAllowedError'))}],
  ['audio meter unavailable', {audioContext:false}]
]) test('recognition never starts after ' + name, async () => {
  const page = await browser(options);
  await page.node('voice-command').emit('click');
  assert.equal(page.calls.starts, 0);
  assert.equal(page.node('voice-command').getAttribute('aria-pressed'), 'false');
  assert.equal(page.node('voice-command').disabled, false);
  assert.match(page.node('voice-help').textContent, /unavailable/);
  if (options.audioContext === false) assert.deepEqual(page.calls.stoppedStreamIds, [1]);
});
