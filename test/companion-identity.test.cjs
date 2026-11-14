const test = require('node:test');
const assert = require('node:assert/strict');
const {createCompanionIdentity} = require('../public/companion/identity.js');

const sdkURL = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@6.40.1/dist/clerk.browser.js';
const publishableKey = 'pk_live_Y2xlcmsuYWRhc3RyYS5nbG9iYWwk';
const hintKey = 'ad-astra:companion:verified';
const receipt = () => ({protocol: 'ad-astra-customer-session/v1', authenticated: true});
const response = (value = receipt(), ok = true) => ({ok, json: async () => value});
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}
function events(target = {}) {
  const listeners = new Map();
  return Object.assign(target, {
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    emit(type, event = {}) { for (const fn of [...(listeners.get(type) || [])]) fn(event); },
    listenerCount() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); }
  });
}
function scriptNode() {
  const attributes = new Map();
  return events({
    setAttribute(name, value) { attributes.set(name, value); },
    getAttribute(name) { return attributes.get(name) ?? null; }
  });
}
function fixture({existing = true, stored = new Map(), authenticated = false, signedIn = true} = {}) {
  const rows = {loads: 0, tokens: [], requests: [], writes: [], changes: [], notices: [], subscriptions: 0, removals: 0};
  const scripts = [], timers = new Map(), listeners = new Set();
  let timerID = 0;
  const work = {token: async () => 'synthetic-session-token', fetch: async () => response(), load: async () => {}};
  const session = (id = 'session-a') => ({id, getToken() { rows.tokens.push(id); return work.token(); }});
  const clerk = {
    loaded: false, session: signedIn ? session() : null,
    user: signedIn ? {id: 'user-a'} : null, organization: null,
    async load() { rows.loads++; await work.load(); this.loaded = true; },
    addListener(callback) {
      rows.subscriptions++; listeners.add(callback);
      callback({session: this.session, user: this.user, organization: this.organization});
      return () => { rows.removals++; listeners.delete(callback); };
    }
  };
  const doc = events({
    hidden: false, body: {dataset: authenticated ? {authenticated: 'true'} : {}},
    head: {append(node) { scripts.push(node); }},
    querySelectorAll(selector) { assert.equal(selector, 'script[src]'); return scripts; },
    createElement(tag) { assert.equal(tag, 'script'); return scriptNode(); }
  });
  const host = events({
    document: doc, AbortController,
    setTimeout(callback, delay) { const id = ++timerID; timers.set(id, {callback, delay}); return id; },
    clearTimeout(id) { timers.delete(id); },
    sessionStorage: {
      getItem(key) { return stored.get(key) ?? null; },
      setItem(key, value) { rows.writes.push({key, value}); stored.set(key, value); },
      removeItem(key) { stored.delete(key); }
    },
    fetch(url, init) { rows.requests.push({url, init}); return work.fetch(url, init); },
    location: {assign() { assert.fail('must not navigate'); }, replace() { assert.fail('must not navigate'); }}
  });
  Object.defineProperty(host, 'localStorage', {get() { assert.fail('must not access localStorage'); }});
  Object.defineProperty(doc, 'cookie', {get() { assert.fail('must not read cookies'); }, set() { assert.fail('must not write cookies'); }});
  if (existing) host.Clerk = clerk;
  const create = (callbacks = {}) => createCompanionIdentity({host,
    onChange: value => rows.changes.push(value), onNotice: value => rows.notices.push(value), ...callbacks});
  const identity = create();
  return {host, doc, clerk, rows, scripts, timers, stored, work, session, identity, create,
    change(partial, update = true) {
      if (update) Object.assign(clerk, partial);
      for (const fn of [...listeners]) fn(partial);
    },
    expire(delay) {
      const scheduled = [...timers].filter(([, timer]) => timer.delay === delay);
      assert.ok(scheduled.length, `expected ${delay}ms deadline`);
      for (const [id, timer] of scheduled) { timers.delete(id); timer.callback(); }
    }
  };
}

test('anonymous construction, initial ensure and lifecycle events do not initialize or contact auth', async () => {
  for (const existing of [false, true]) {
    const f = fixture({existing});
    assert.equal(f.identity.scope(), null);
    for (let i = 0; i < 3; i++) assert.equal(await f.identity.ensure(), null);
    await assert.rejects(f.identity.token('invented-scope'), /authentication_required/);
    f.host.emit('pagehide'); f.host.emit('pageshow', {persisted: true});
    f.doc.hidden = true; f.doc.emit('visibilitychange');
    f.doc.hidden = false; f.doc.emit('visibilitychange');
    await flush();
    assert.deepEqual(f.scripts, []);
    assert.equal(f.rows.loads, 0);
    assert.deepEqual(f.rows.tokens, []);
    assert.deepEqual(f.rows.requests, []);
    assert.deepEqual(f.rows.writes, []);
    assert.deepEqual(f.rows.changes, []);
    f.identity.dispose();
    assert.equal(f.host.listenerCount(), 0);
    assert.equal(f.doc.listenerCount(), 0);
  }
});

test('interactive loading injects exactly the known SDK once and shares a bounded initialization', async () => {
  const f = fixture({existing: false}), second = f.create();
  const first = f.identity.ensure({interactive: true});
  assert.equal(f.identity.ensure({interactive: true}), first);
  const other = second.ensure({interactive: true});
  assert.equal(f.scripts.length, 1);
  const script = f.scripts[0];
  assert.equal(script.src, sdkURL);
  assert.equal(script.getAttribute('data-clerk-publishable-key'), publishableKey);
  assert.equal(script.getAttribute('data-companion-auth'), '');
  assert.equal(script.async, true);
  assert.equal(script.crossOrigin, 'anonymous');
  assert.match(script.integrity, /^sha384-/);
  f.host.Clerk = f.clerk;
  script.emit('load'); script.emit('load');
  assert.ok(await first);
  assert.ok(await other);
  assert.equal(f.rows.loads, 1);
  assert.equal(f.rows.requests.length, 2);
  assert.equal(script.listenerCount(), 0);
  assert.equal(f.timers.size, 0);
  f.identity.dispose(); second.dispose();
});

test('an existing platform SDK is reused, while a mismatched SDK key fails closed', async () => {
  for (const valid of [true, false]) {
    const f = fixture({existing: false});
    const script = scriptNode(); script.src = sdkURL;
    script.setAttribute('data-clerk-publishable-key', valid ? publishableKey : 'other-public-key');
    f.scripts.push(script);
    const pending = f.identity.ensure({interactive: true});
    f.host.Clerk = f.clerk; script.emit('load');
    assert.equal(Boolean(await pending), valid);
    assert.equal(f.scripts.length, 1);
    assert.equal(f.rows.loads, valid ? 1 : 0);
    assert.equal(f.rows.requests.length, valid ? 1 : 0);
    f.identity.dispose();
  }
});

test('SDK errors and SDK/load timeouts settle once, clean up and never retry automatically', async () => {
  for (const stage of ['script-timeout', 'script-error', 'load-timeout']) {
    const f = fixture({existing: stage === 'load-timeout'}), late = deferred();
    f.work.load = () => late.promise;
    const pending = f.identity.ensure({interactive: true});
    if (stage === 'script-error') f.scripts[0].emit('error'); else f.expire(10000);
    assert.equal(await pending, null);
    const loads = f.rows.loads;
    late.resolve();
    if (f.scripts[0]) { f.host.Clerk = f.clerk; f.scripts[0].emit('load'); }
    await flush();
    assert.equal(await f.identity.ensure({interactive: true}), null);
    assert.equal(f.rows.loads, loads);
    assert.equal(f.rows.requests.length, 0);
    assert.equal(f.scripts.length, stage === 'load-timeout' ? 0 : 1);
    assert.equal(f.scripts[0]?.listenerCount() || 0, 0);
    assert.equal(f.timers.size, 0);
    f.identity.dispose();
  }
});

test('interactive initialization without a signed-in session stays unavailable and never navigates', async () => {
  const f = fixture({signedIn: false});
  assert.equal(await f.identity.ensure({interactive: true}), null);
  assert.equal(f.rows.loads, 1);
  assert.equal(f.rows.tokens.length, 0);
  assert.equal(f.rows.requests.length, 0);
  assert.equal(f.identity.scope(), null);
  assert.equal(f.stored.size, 0);
  assert.ok(f.rows.notices.length);
  f.identity.dispose();
});

test('only a completed server protocol response grants scope; token uses that captured scope', async () => {
  const f = fixture(), json = deferred();
  f.work.fetch = async () => ({ok: true, json: () => json.promise});
  const pending = f.identity.ensure({interactive: true});
  await flush();
  assert.equal(f.identity.scope(), null);
  assert.deepEqual(f.rows.changes, []);
  assert.deepEqual(f.rows.writes, []);
  assert.equal(f.rows.requests.length, 1);
  const {url, init} = f.rows.requests[0];
  assert.equal(url, '/api/session');
  assert.equal(init.method, 'POST');
  assert.equal(init.credentials, 'same-origin');
  assert.equal(init.cache, 'no-store');
  assert.equal(init.redirect, 'error');
  assert.deepEqual(init.headers, {Authorization: 'Bearer synthetic-session-token', 'X-Ad-Astra-Request': 'public-v1'});
  assert.ok(init.signal instanceof AbortSignal);
  assert.equal(init.body, undefined);
  json.resolve(receipt());
  const scope = await pending;
  assert.equal(typeof scope, 'string');
  assert.equal(f.identity.scope(), scope);
  assert.deepEqual(f.rows.changes, [scope]);
  assert.equal(await f.identity.ensure(), scope);
  assert.equal(await f.identity.token(scope), 'synthetic-session-token');
  assert.equal(f.rows.requests.length, 1);
  assert.equal(f.rows.tokens.length, 2);
  assert.equal(f.timers.size, 0);
  f.identity.dispose();
});

test('client flags and an unproven helper result cannot replace the actual session verifier', async () => {
  const f = fixture({authenticated: true});
  f.host.adAstraVerifySession = async () => assert.fail('an opaque helper result is not a verification receipt');
  f.work.fetch = async () => response({authenticated: true});
  assert.equal(f.identity.scope(), null);
  assert.equal(await f.identity.ensure(), null);
  assert.equal(f.rows.requests.length, 1);
  assert.equal(f.identity.scope(), null);
  assert.deepEqual(f.rows.writes, []);
  f.identity.dispose();
});

test('failed status, protocol, JSON, network and token acquisition never grant or persist access', async () => {
  const failures = [
    f => { f.work.fetch = async () => response(receipt(), false); },
    f => { f.work.fetch = async () => response({protocol: receipt().protocol, authenticated: false}); },
    f => { f.work.fetch = async () => response({protocol: receipt().protocol, authenticated: 'true'}); },
    f => { f.work.fetch = async () => response({protocol: 'wrong/v1', authenticated: true}); },
    f => { f.work.fetch = async () => response(null); },
    f => { f.work.fetch = async () => ({ok: true, json: async () => { throw Error('private-customer-marker'); }}); },
    f => { f.work.fetch = async () => { throw Error('private-customer-marker'); }; },
    ...[null, '', '   ', 123].map(value => f => { f.work.token = async () => value; }),
    f => { f.work.token = async () => { throw Error('private-customer-marker'); }; }
  ];
  for (const fail of failures) {
    const f = fixture({stored: new Map([[hintKey, 'true']])}); fail(f);
    assert.equal(await f.identity.ensure(), null);
    assert.equal(f.identity.scope(), null);
    assert.deepEqual(f.rows.changes, []);
    assert.deepEqual(f.rows.writes, []);
    assert.equal(f.stored.size, 0);
    assert.equal(f.timers.size, 0);
    assert.ok(f.rows.notices.length);
    assert.doesNotMatch(f.rows.notices.join(' '), /private-customer-marker|synthetic-session-token|user-a|session-a/);
    await assert.rejects(f.identity.token('unverified'), /authentication_required/);
    f.identity.dispose();
  }
});

test('the restore hint is exactly a boolean written only after verification and reverified by a later document', async () => {
  for (const invalid of ['false', '1', 'user-a', '{"authenticated":true}', true]) {
    const f = fixture({stored: new Map([[hintKey, invalid]])});
    assert.equal(await f.identity.ensure(), null);
    assert.equal(f.rows.loads, 0);
    assert.equal(f.rows.requests.length, 0);
    f.identity.dispose();
  }
  const f = fixture(), pending = f.identity.ensure({interactive: true});
  assert.equal(f.stored.size, 0);
  assert.ok(await pending);
  assert.deepEqual([...f.stored], [[hintKey, 'true']]);
  assert.deepEqual(f.rows.writes, [{key: hintKey, value: 'true'}]);
  f.identity.dispose();
  assert.deepEqual([...f.stored], [[hintKey, 'true']]);
  const later = fixture({stored: f.stored, existing: false});
  assert.equal(later.identity.scope(), null);
  const restoring = later.identity.ensure();
  assert.equal(later.scripts.length, 1);
  later.host.Clerk = later.clerk; later.scripts[0].emit('load');
  assert.ok(await restoring);
  assert.equal(later.rows.requests.length, 1);
  assert.deepEqual([...later.stored], [[hintKey, 'true']]);
  later.identity.dispose();
});

test('blocked sessionStorage is optional and does not bypass or break interactive verification', async () => {
  const f = fixture();
  Object.defineProperty(f.host, 'sessionStorage', {get() { throw Error('storage blocked'); }});
  assert.equal(await f.identity.ensure(), null);
  assert.equal(f.rows.loads, 0);
  assert.ok(await f.identity.ensure({interactive: true}));
  f.change({session: null, user: null});
  assert.equal(f.identity.scope(), null);
  f.identity.dispose();
});

test('tenant, user, session and logout changes invalidate synchronously and require new verification', async () => {
  for (const kind of ['tenant', 'user', 'session', 'logout']) {
    const f = fixture(), first = await f.identity.ensure({interactive: true});
    const partial = kind === 'tenant' ? {organization: {id: 'org-b'}} :
      kind === 'user' ? {user: {id: 'user-b'}} :
      kind === 'session' ? {session: f.session('session-b')} : {session: null, user: null};
    f.change(partial);
    assert.equal(f.identity.scope(), null, kind);
    assert.deepEqual(f.rows.changes, [first, null], kind);
    assert.equal(f.stored.size, 0, kind);
    const count = f.rows.tokens.length;
    await assert.rejects(f.identity.token(first), /authentication_required/);
    assert.equal(f.rows.tokens.length, count);
    if (kind === 'logout') {
      assert.equal(await f.identity.ensure(), null);
      f.change({session: f.session(), user: {id: 'user-a'}});
    }
    const next = await f.identity.ensure();
    assert.ok(next, kind);
    assert.notEqual(first, next, kind);
    assert.equal(f.rows.requests.length, 2, kind);
    f.identity.dispose();
  }
});

test('a listener change ahead of Clerk global getters cannot resurrect or verify the old tenant', async () => {
  const f = fixture(), first = await f.identity.ensure({interactive: true});
  f.change({organization: {id: 'org-b'}}, false);
  assert.equal(f.identity.scope(), null);
  assert.deepEqual(f.rows.changes, [first, null]);
  assert.equal(await f.identity.ensure(), null);
  assert.equal(f.rows.requests.length, 1);
  f.clerk.organization = {id: 'org-b'};
  const next = await f.identity.ensure();
  assert.ok(next);
  assert.notEqual(first, next);
  assert.equal(f.rows.requests.length, 2);
  f.identity.dispose();
});

test('scope and token defensively detect changed global context even without a delivered listener', async () => {
  const f = fixture(), first = await f.identity.ensure({interactive: true});
  f.clerk.organization = {id: 'unannounced-org'};
  await assert.rejects(f.identity.token(first), /authentication_required/);
  assert.equal(f.identity.scope(), null);
  assert.deepEqual(f.rows.changes, [first, null]);
  assert.ok(await f.identity.ensure());
  f.host.Clerk = null;
  assert.equal(f.identity.scope(), null);
  assert.equal(f.stored.size, 0);
  f.identity.dispose();
});

test('a stale verification token cannot reach the verifier or overwrite a newer tenant', async () => {
  const f = fixture(), late = deferred();
  f.work.token = () => late.promise;
  const old = f.identity.ensure({interactive: true});
  await flush();
  f.change({organization: {id: 'org-b'}});
  assert.equal(await old, null);
  f.work.token = async () => 'new-tenant-token';
  const next = await f.identity.ensure();
  late.resolve('old-tenant-token'); await flush();
  assert.equal(f.identity.scope(), next);
  assert.deepEqual(f.rows.changes, [next]);
  assert.equal(f.rows.requests.length, 1);
  assert.equal(f.rows.requests[0].init.headers.Authorization, 'Bearer new-tenant-token');
  f.identity.dispose();
});

test('late verifier success or failure cannot restore old access or clear the newer scope', async () => {
  for (const fails of [false, true]) {
    const f = fixture(), late = deferred();
    f.work.fetch = () => late.promise;
    const old = f.identity.ensure({interactive: true}); await flush();
    const signal = f.rows.requests[0].init.signal;
    f.change({organization: {id: 'org-b'}});
    assert.equal(signal.aborted, true);
    assert.equal(await old, null);
    f.work.fetch = async () => response();
    const next = await f.identity.ensure(), notices = [...f.rows.notices];
    if (fails) late.reject(Error('stale failure')); else late.resolve(response());
    await flush();
    assert.equal(f.identity.scope(), next);
    assert.deepEqual(f.rows.changes, [next]);
    assert.deepEqual(f.rows.notices, notices);
    assert.deepEqual(f.rows.writes, [{key: hintKey, value: 'true'}]);
    f.identity.dispose();
  }
});

test('logout during JSON validation cancels verification and ignores the eventual valid receipt', async () => {
  const f = fixture(), late = deferred();
  f.work.fetch = async () => ({ok: true, json: () => late.promise});
  const pending = f.identity.ensure({interactive: true}); await flush();
  f.change({session: null, user: null});
  assert.equal(await pending, null);
  late.resolve(receipt()); await flush();
  assert.equal(f.identity.scope(), null);
  assert.deepEqual(f.rows.changes, []);
  assert.deepEqual(f.rows.writes, []);
  f.identity.dispose();
});

test('pending tokens reject on A to B to A, and old expected scopes cannot be reused', async () => {
  const f = fixture(), first = await f.identity.ensure({interactive: true}), late = deferred();
  f.work.token = () => late.promise;
  const rejected = assert.rejects(f.identity.token(first), /authentication_required/);
  await flush();
  f.change({organization: {id: 'org-b'}});
  f.change({organization: null});
  await rejected;
  f.work.token = async () => 'new-scope-token';
  const next = await f.identity.ensure();
  assert.notEqual(first, next);
  late.resolve('obsolete-token'); await flush();
  assert.equal(f.identity.scope(), next);
  await assert.rejects(f.identity.token(first), /authentication_required/);
  assert.equal(await f.identity.token(next), 'new-scope-token');
  f.identity.dispose();
});

test('token checks context again after await even if Clerk did not emit its change', async () => {
  const f = fixture(), first = await f.identity.ensure({interactive: true});
  f.work.token = async () => { f.clerk.organization = {id: 'org-b'}; return 'obsolete-token'; };
  await assert.rejects(f.identity.token(first), /authentication_required/);
  assert.equal(f.identity.scope(), null);
  assert.deepEqual(f.rows.changes, [first, null]);
  f.identity.dispose();
});

test('failed or empty token refresh invalidates the verified scope and boolean hint', async () => {
  for (const failure of [null, '', Error('private-token-failure')]) {
    const f = fixture(), first = await f.identity.ensure({interactive: true});
    f.work.token = async () => { if (failure instanceof Error) throw failure; return failure; };
    await assert.rejects(f.identity.token(first), /authentication_required/);
    assert.equal(f.identity.scope(), null);
    assert.deepEqual(f.rows.changes, [first, null]);
    assert.equal(f.stored.size, 0);
    assert.equal(f.rows.requests.length, 1);
    assert.doesNotMatch(f.rows.notices.join(' '), /private-token-failure/);
    f.identity.dispose();
  }
});

test('token, fetch and JSON verification deadlines reject late work without granting a scope', async () => {
  for (const stage of ['token', 'fetch', 'json']) {
    const f = fixture(), late = deferred();
    if (stage === 'token') f.work.token = () => late.promise;
    if (stage === 'fetch') f.work.fetch = () => late.promise;
    if (stage === 'json') f.work.fetch = async () => ({ok: true, json: () => late.promise});
    const pending = f.identity.ensure({interactive: true}); await flush();
    f.expire(6000);
    assert.equal(await pending, null);
    if (stage !== 'token') assert.equal(f.rows.requests[0].init.signal.aborted, true);
    late.resolve(stage === 'token' ? 'late-token' : stage === 'fetch' ? response() : receipt());
    await flush();
    assert.equal(f.identity.scope(), null);
    assert.deepEqual(f.rows.writes, []);
    assert.equal(f.timers.size, 0);
    f.identity.dispose();
  }
});

test('missing or failing Clerk subscriptions cannot grant access on a later ensure either', async () => {
  for (const listener of [null, () => { throw Error('listener unavailable'); }, () => undefined]) {
    const f = fixture(); f.clerk.addListener = listener;
    for (let i = 0; i < 2; i++) assert.equal(await f.identity.ensure({interactive: true}), null);
    assert.equal(f.rows.requests.length, 0);
    assert.equal(f.identity.scope(), null);
    f.identity.dispose();
  }
});

test('dispose aborts pending tokens, unsubscribes and ignores later events and SDK initialization', async () => {
  const f = fixture(), first = await f.identity.ensure({interactive: true}), late = deferred();
  f.work.token = () => late.promise;
  const rejected = assert.rejects(f.identity.token(first), /authentication_required/); await flush();
  f.identity.dispose(); f.identity.dispose(); await rejected;
  late.resolve('obsolete-token'); f.change({session: null}); await flush();
  assert.equal(f.identity.scope(), null);
  assert.equal(await f.identity.ensure({interactive: true}), null);
  assert.deepEqual(f.rows.changes, [first, null]);
  assert.equal(f.rows.removals, 1);
  assert.equal(f.host.listenerCount(), 0);
  assert.equal(f.doc.listenerCount(), 0);
  assert.equal(f.timers.size, 0);
  const initializing = fixture({existing: false});
  const pending = initializing.identity.ensure({interactive: true}); initializing.identity.dispose();
  initializing.host.Clerk = initializing.clerk; initializing.scripts[0].emit('load');
  assert.equal(await pending, null);
  assert.equal(initializing.rows.requests.length, 0);
  assert.equal(initializing.rows.subscriptions, 0);
});

test('reentrant logout from onChange cannot expose a scope after ensure resolves', async () => {
  const f = fixture(); f.identity.dispose();
  const identity = f.create({onChange(value) { f.rows.changes.push(value); if (value) f.change({session: null, user: null}); }});
  assert.equal(await identity.ensure({interactive: true}), null);
  assert.equal(identity.scope(), null);
  assert.equal(f.rows.changes.length, 2);
  assert.equal(f.rows.changes[1], null);
  assert.equal(f.stored.size, 0);
  identity.dispose();
});

test('BFCache and visibility resumes reverify backend revocation instead of reusing cached scope', async () => {
  for (const lifecycle of ['bfcache', 'visibility', 'pageshow-only']) {
    const f = fixture(), first = await f.identity.ensure({interactive: true}), late = deferred();
    f.work.fetch = () => late.promise;
    if (lifecycle === 'bfcache') f.host.emit('pagehide');
    if (lifecycle === 'visibility') { f.doc.hidden = true; f.doc.emit('visibilitychange'); }
    if (lifecycle !== 'pageshow-only') assert.equal(f.identity.scope(), null);
    if (lifecycle === 'visibility') { f.doc.hidden = false; f.doc.emit('visibilitychange'); }
    else f.host.emit('pageshow', {persisted: true});
    const resuming = f.identity.ensure(); await flush();
    assert.equal(f.identity.scope(), null);
    assert.deepEqual(f.rows.changes, [first, null]);
    assert.equal(f.rows.requests.length, 2);
    late.resolve(response({protocol: receipt().protocol, authenticated: false}, false));
    assert.equal(await resuming, null);
    assert.equal(f.identity.scope(), null);
    assert.equal(f.stored.size, 0);
    f.identity.dispose();
  }
});

test('a successful resume issues a fresh scope, while duplicate resume events share verification', async () => {
  const f = fixture(), first = await f.identity.ensure({interactive: true});
  f.host.emit('pagehide'); f.host.emit('pageshow', {persisted: true});
  f.host.emit('pageshow', {persisted: true});
  const next = await f.identity.ensure();
  assert.ok(next);
  assert.notEqual(first, next);
  assert.deepEqual(f.rows.changes, [first, null, next]);
  assert.equal(f.rows.requests.length, 2);
  assert.equal(f.rows.loads, 1);
  f.identity.dispose();
});
