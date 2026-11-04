'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/home-experience-neural.js'), 'utf8');
class Element {
  constructor() {
    this.listeners = new Map(); this.dataset = {}; this.attributes = {}; this.children = [];
    this.classes = new Set(); this.hidden = false; this.disabled = false; this.width = 1; this.height = 1;
    this.style = {setProperty() {}};
    this.classList = {add: (...names) => names.forEach(n => this.classes.add(n)), contains: n => this.classes.has(n), remove: n => this.classes.delete(n)};
  }
  addEventListener(type, handler) { this.listeners.set(type, [...(this.listeners.get(type) || []), handler]); }
  fire(type, fields = {}) {
    const event = {type, defaultPrevented: false, preventDefault() {this.defaultPrevented = true;}, ...fields};
    for (const handler of this.listeners.get(type) || []) handler(event);
    return event;
  }
  setAttribute(name, value) {this.attributes[name] = String(value);}
  append(child) {this.children.push(child);}
  prepend(child) {this.children.unshift(child);}
  focus() {this.focused = true;}
  getBoundingClientRect() {return this.rect || {top: 0, bottom: 500, left: 0, right: 600, width: 600, height: 500};}
  set innerHTML(value) {
    this.html = value;
    if (value.includes('data-model="knowledge"')) {
      this.buttons = ['knowledge', 'agents', 'earth'].map(id => {const b = new Element(); b.dataset.model = id; return b;});
      this.motion = new Element();
    } else if (value.includes('NO LIVE TELEMETRY')) {
      this.textNodes = Object.fromEntries(['span', 'strong', 'p', 'small'].map(k => [k, new Element()]));
    }
  }
  querySelector(selector) {
    if (selector === '.hx-model-motion') return this.motion;
    if (this.textNodes) return this.textNodes[selector] || null;
    if (selector === '#hx-neural-canvas') return this.children.find(x => x.id === 'hx-neural-canvas') || null;
    return null;
  }
  querySelectorAll(selector) {return selector === '[data-model]' ? this.buttons || [] : [];}
}
function fixture(options = {}) {
  const document = new Element(), window = new Element(), preference = new Element(), connection = new Element();
  document.body = new Element(); document.hidden = false;
  preference.matches = Boolean(options.reduced); connection.saveData = Boolean(options.saveData);
  window.innerWidth = 1440; window.innerHeight = 1000; window.devicePixelRatio = 3;
  const lab = new Element(), stage = new Element();
  if (options.offscreen) stage.rect = {top: 2000, bottom: 2500, left: 0, right: 600, width: 600, height: 500};
  lab.querySelector = selector => selector === '.neural-stage' ? stage : null;
  document.getElementById = id => id === 'neural-lab' ? lab : null;
  const frames = new Map(), observers = [], mutations = []; let frameId = 0, draws = 0, arcs = [];
  const context = new Proxy({
    clearRect() {draws++; arcs = [];},
    createRadialGradient() {return {addColorStop() {}};},
    arc(...args) {arcs.push(args);}
  }, {get(target, key) {return key in target ? target[key] : () => {};}});
  document.createElement = type => {
    const node = new Element();
    if (type === 'canvas') node.getContext = () => {if (options.throwContext) throw Error('blocked'); return options.noCanvas ? null : context;};
    return node;
  };
  class IntersectionObserver {constructor(callback) {this.callback = callback; observers.push(this);} observe(node) {this.node = node;}}
  class ResizeObserver {constructor(callback) {this.callback = callback;} observe() {}}
  class MutationObserver {constructor(callback) {mutations.push(callback);} observe() {}}
  if (!options.noObservers) Object.assign(window, {IntersectionObserver, ResizeObserver, MutationObserver});
  window.matchMedia = () => preference;
  window.AD_ASTRA_HOME_DATA = {MODEL_MODES: Object.fromEntries(['knowledge', 'agents', 'earth'].map(k => [k, {accent: '#8ee8f4', label: k.toUpperCase(), title: k + ' title', description: k + ' description'}]))};
  const sandbox = vm.createContext({window, document, navigator: {connection}, IntersectionObserver, ResizeObserver, MutationObserver,
    requestAnimationFrame(fn) {const id = ++frameId; frames.set(id, fn); return id;},
    cancelAnimationFrame(id) {frames.delete(id);}, console});
  vm.runInContext(source, sandbox); window.AD_ASTRA_HOME_NEURAL.init();
  const canvas = stage.children.find(n => n.id === 'hx-neural-canvas');
  const controls = stage.children.find(n => n.buttons), readout = stage.children.find(n => n.textNodes);
  return {window, document, preference, connection, stage, canvas, controls, readout, frames,
    draws: () => draws, arcs: () => JSON.stringify(arcs),
    advance(time) {const work = [...frames.values()]; frames.clear(); work.forEach(fn => fn(time));},
    visible(value) {observers.forEach(o => o.callback([{isIntersecting: value}]));},
    globalPause(value) {value ? document.body.classList.add('paused') : document.body.classList.remove('paused'); mutations.forEach(fn => fn());}
  };
}
test('pause cancels frames and preserves the rendered geometry', () => {
  const f = fixture(); f.advance(0); f.advance(40); f.controls.motion.fire('click');
  const geometry = f.arcs(), count = f.draws(); assert.equal(f.frames.size, 0);
  f.advance(5000); f.stage.fire('pointermove', {clientX: 500, clientY: 400});
  assert.equal(f.draws(), count); assert.equal(f.arcs(), geometry); assert.equal(f.stage.dataset.modelMotion, 'static');
});
test('reduced motion prevents animation and cannot be overridden by local play', () => {
  const f = fixture({reduced: true}); assert.equal(f.frames.size, 0); assert.equal(f.controls.motion.disabled, true);
  f.controls.motion.fire('click'); assert.equal(f.frames.size, 0);
});
test('explicit pause survives reduced-motion changes', () => {
  const f = fixture(); f.controls.motion.fire('click'); f.preference.matches = true; f.preference.fire('change');
  f.preference.matches = false; f.preference.fire('change'); assert.equal(f.frames.size, 0);
  f.controls.motion.fire('click'); assert.equal(f.frames.size, 1);
});
test('data-saver changes suspend and resume eligible animation', () => {
  const f = fixture({saveData: true}); assert.equal(f.frames.size, 0);
  f.connection.saveData = false; f.connection.fire('change'); assert.equal(f.frames.size, 1);
  f.connection.saveData = true; f.connection.fire('change'); assert.equal(f.frames.size, 0);
});
test('site-wide pause controls the model without clearing local pause', () => {
  const f = fixture(); f.globalPause(true); assert.equal(f.frames.size, 0);
  f.controls.motion.fire('click'); assert.equal(f.frames.size, 0);
  f.globalPause(false); assert.equal(f.frames.size, 1);
  f.controls.motion.fire('click'); f.globalPause(true); f.globalPause(false); assert.equal(f.frames.size, 0);
});
test('hidden tab never overrides offscreen visibility', () => {
  const f = fixture(); f.visible(false); assert.equal(f.frames.size, 0);
  f.document.hidden = true; f.document.fire('visibilitychange');
  f.document.hidden = false; f.document.fire('visibilitychange'); assert.equal(f.frames.size, 0);
  f.visible(true); assert.equal(f.frames.size, 1);
});
test('page lifecycle cancels and safely restores eligible animation', () => {
  const f = fixture(); f.window.fire('pagehide'); assert.equal(f.frames.size, 0);
  f.window.fire('pageshow'); assert.equal(f.frames.size, 1);
});
test('drawing is capped at 30fps with bounded pixel ratio', () => {
  const f = fixture(), before = f.draws(); for (let t = 0; t <= 1000; t += 5) f.advance(t);
  assert.ok(f.draws() - before <= 31); assert.equal(f.canvas.width, 900); assert.equal(f.canvas.height, 750);
});
for (const failure of ['noCanvas', 'throwContext']) test(failure + ' retains working text and keyboard controls', () => {
  const f = fixture({[failure]: true}); assert.equal(f.frames.size, 0); assert.equal(f.canvas.hidden, true);
  f.controls.buttons[0].fire('keydown', {key: 'ArrowRight'});
  assert.equal(f.readout.textNodes.span.textContent, 'AGENTS'); assert.equal(f.controls.buttons[1].focused, true);
  assert.equal(f.controls.buttons[1].attributes['aria-pressed'], 'true'); assert.equal(f.controls.motion.disabled, true);
});
test('mode selection remains usable while motion is paused', () => {
  const f = fixture(); f.controls.motion.fire('click'); f.controls.buttons[2].fire('click');
  assert.equal(f.readout.textNodes.span.textContent, 'EARTH'); assert.equal(f.frames.size, 0);
});
test('context loss cancels rendering without disabling mode selection', () => {
  const f = fixture(); f.canvas.fire('contextlost'); assert.equal(f.frames.size, 0); assert.equal(f.canvas.hidden, true);
  f.controls.buttons[1].fire('click'); assert.equal(f.readout.textNodes.span.textContent, 'AGENTS');
});
test('observer-free fallback respects viewport and site pause', () => {
  const f = fixture({noObservers: true, offscreen: true}); assert.equal(f.frames.size, 0);
  f.stage.rect = null; f.window.fire('scroll'); assert.equal(f.frames.size, 1);
  f.document.body.classList.add('paused'); f.advance(40); assert.equal(f.frames.size, 0);
});
test('reinitialization does not add duplicate controls or loops', () => {
  const f = fixture(), count = f.stage.children.length; f.window.AD_ASTRA_HOME_NEURAL.init();
  assert.equal(f.stage.children.length, count); assert.equal(f.frames.size, 1);
});
test('invalid model identifiers cannot mutate mode or readout', () => {
  const f = fixture(); f.controls.buttons[1].dataset.model = '__proto__'; f.controls.buttons[1].fire('click');
  assert.equal(f.readout.textNodes.span.textContent, 'KNOWLEDGE');
});
test('module has no provider, tracking, persistence or network operations', () => {
  assert.doesNotMatch(source, /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage)\b/);
  assert.match(source, /NO LIVE TELEMETRY/);
});
