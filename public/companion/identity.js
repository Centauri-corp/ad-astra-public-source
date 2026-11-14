// This adapter only verifies the existing customer session. Engine authorization
// still belongs to the server; neither a DOM flag nor the restore hint grants it.
const publishableKey = 'pk_live_Y2xlcmsuYWRhc3RyYS5nbG9iYWwk';
const sdkURL = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@6.40.1/dist/clerk.browser.js';
const sdkIntegrity = 'sha384-JcUoKGgU3fVbZOepxOhFBTSImBs/0xQTLYLqy0CLEkd2sMiA4wn5VDTC6IJYRSaj';
const hintKey = 'ad-astra:companion:verified';
const loaders = new WeakMap();

// One bounded SDK/load attempt per document, shared by adapter instances. A
// failed attempt does not create scripts or start retries on later ensure calls.
function loadClerk(host) {
  if (loaders.has(host)) return loaders.get(host);
  const pending = new Promise((resolve, reject) => {
    let script, timer, settled = false, initializing = false;
    function finish(error, clerk) {
      if (settled) return;
      settled = true;
      host.clearTimeout(timer);
      script?.removeEventListener('load', initialize);
      script?.removeEventListener('error', failed);
      if (error) reject(error); else resolve(clerk);
    }
    function failed() { finish(Error('authentication_unavailable')); }
    async function initialize() {
      if (settled || initializing) return;
      initializing = true;
      try {
        const clerk = host.Clerk;
        if (!clerk || typeof clerk.load !== 'function' ||
            (clerk.publishableKey && clerk.publishableKey !== publishableKey)) throw Error('authentication_unavailable');
        if (!clerk.loaded) await clerk.load();
        finish(null, clerk);
      } catch { failed(); }
    }
    timer = host.setTimeout(failed, 10000);
    if (host.Clerk) { void initialize(); return; }
    try {
      const doc = host.document;
      script = [...doc.querySelectorAll('script[src]')].find(node => node.src === sdkURL);
      if (script && script.getAttribute('data-clerk-publishable-key') !== publishableKey) throw Error('authentication_unavailable');
      const existing = Boolean(script);
      if (!script) {
        script = doc.createElement('script');
        script.src = sdkURL;
        script.async = true;
        script.integrity = sdkIntegrity;
        script.crossOrigin = 'anonymous';
        script.setAttribute('data-clerk-publishable-key', publishableKey);
        script.setAttribute('data-companion-auth', '');
      }
      script.addEventListener('load', initialize);
      script.addEventListener('error', failed);
      if (!existing) doc.head.append(script);
    } catch { failed(); }
  });
  loaders.set(host, pending);
  return pending;
}

function contextKey(value) {
  const session = value?.session, user = value?.user, organization = value?.organization;
  const id = value => typeof value === 'string' && value.length > 0;
  if (!id(session?.id) || !id(user?.id) || typeof session.getToken !== 'function' ||
      (organization != null && !id(organization.id))) return null;
  if (session.user?.id && session.user.id !== user.id) return null;
  // Tuple encoding avoids collisions, including personal versus an actual org.
  return JSON.stringify([session.id, user.id, organization?.id ?? null]);
}

// ensure resolves to a verified scope or null, without opening sign-in or
// navigating. token requires that exact scope and rejects when it is obsolete.
export function createCompanionIdentity({onChange = () => {}, onNotice = () => {}, host = globalThis} = {}) {
  let disposed = false, enabled = false, generation = 0, suspended = host.document?.hidden === true;
  let clerk = null, key = null, awaitingContext = false, unsubscribe = null;
  let verified = null, pending = null;
  const operations = new Set();
  const notify = (callback, value) => { try { callback(value); } catch {} };
  function hint(value) {
    try {
      if (value === true) host.sessionStorage?.setItem(hintKey, 'true');
      else host.sessionStorage?.removeItem(hintKey);
    } catch {} // Storage is optional, including in private browsing.
  }
  function canRestore() {
    if (host.document?.body?.dataset?.authenticated === 'true') return true;
    try { return host.sessionStorage?.getItem(hintKey) === 'true'; } catch { return false; }
  }
  function invalidate(clearHint = true) {
    generation++;
    pending = null;
    const previous = verified;
    verified = null;
    for (const cancel of [...operations]) cancel();
    if (clearHint) hint(false);
    if (previous) notify(onChange, null);
  }
  function changed(next, waiting = false) {
    const different = key !== next;
    key = next;
    awaitingContext = waiting;
    if (different) {
      invalidate();
      notify(onNotice, 'Your account context changed. Start a new conversation.');
    }
  }
  function currentKey() {
    if (disposed || !clerk) return null;
    if (host.Clerk !== clerk) {
      changed(null);
      return null;
    }
    const next = contextKey(clerk);
    // Clerk listeners may report a change before its global getters update.
    // Do not let those old getters resurrect the previous verified context.
    if (awaitingContext) {
      if (next !== key) return null;
      awaitingContext = false;
    } else changed(next);
    return key;
  }
  function scope() {
    const next = currentKey();
    return !disposed && next && verified?.key === next && verified.clerk === clerk ? verified.scope : null;
  }
  function bind(next) {
    if (clerk === next) return;
    if (typeof next.addListener !== 'function') throw Error('authentication_unavailable');
    try { unsubscribe?.(); } catch {}
    unsubscribe = null;
    clerk = next;
    key = contextKey(clerk);
    awaitingContext = false;
    try {
      unsubscribe = clerk.addListener(resources => {
        if (disposed || clerk !== next) return;
        if (host.Clerk !== clerk) { changed(null); return; }
        const value = {};
        for (const field of ['session', 'user', 'organization']) {
          value[field] = resources && Object.hasOwn(resources, field) ? resources[field] : clerk[field];
        }
        const observed = contextKey(value);
        changed(observed, observed !== contextKey(clerk));
      });
      if (typeof unsubscribe !== 'function') throw Error('authentication_unavailable');
    } catch (error) {
      clerk = null;
      key = null;
      throw error;
    }
  }
  function bounded(work) {
    return new Promise((resolve, reject) => {
      let settled = false, timer;
      const controller = new host.AbortController();
      function finish(error, value) {
        if (settled) return;
        settled = true;
        host.clearTimeout(timer);
        operations.delete(cancel);
        if (error) { controller.abort(); reject(error); } else resolve(value);
      }
      const cancel = () => finish(Error('authentication_required'));
      operations.add(cancel);
      timer = host.setTimeout(() => finish(Error('authentication_unavailable')), 6000);
      Promise.resolve().then(() => { if (!settled) return work(controller.signal); })
        .then(value => finish(null, value), error => finish(error));
    });
  }
  function active(attempt, expectedKey) {
    const next = currentKey();
    return !disposed && pending === attempt && generation === attempt.generation &&
      (expectedKey === undefined || next === expectedKey);
  }
  async function verify(attempt) {
    try {
      const loaded = await loadClerk(host);
      if (!active(attempt)) return null;
      bind(loaded);
      const captured = currentKey(), session = clerk.session;
      if (!active(attempt)) return null;
      if (!captured) {
        hint(false);
        notify(onNotice, 'A verified customer account is unavailable. Sign in through the customer workspace.');
        return null;
      }
      const bearer = await bounded(() => session.getToken());
      if (!active(attempt, captured)) return null;
      if (typeof bearer !== 'string' || !bearer.trim()) throw Error('authentication_required');
      // Same verifier and protocol as /auth-navigation.js. A client helper's
      // return value or body flag alone is not a verification receipt.
      await bounded(async signal => {
        const response = await host.fetch('/api/session', {
          method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal,
          headers: {Authorization: `Bearer ${bearer}`, 'X-Ad-Astra-Request': 'public-v1'}
        });
        if (!response.ok) throw Error('authentication_invalid');
        const result = await response.json();
        if (result?.protocol !== 'ad-astra-customer-session/v1' || result.authenticated !== true) throw Error('authentication_invalid');
      });
      if (!active(attempt, captured)) return null;
      // A new generation distinguishes A -> B -> A from the earlier A scope.
      const value = `${captured}:${generation}`;
      verified = {key: captured, clerk, scope: value};
      hint(true);
      notify(onChange, value);
      return active(attempt, captured) && scope() === value ? value : null;
    } catch {
      if (active(attempt)) {
        invalidate();
        notify(onNotice, 'Your account session could not be verified. Try again through the customer workspace.');
      }
      return null;
    } finally {
      if (pending === attempt) pending = null;
    }
  }
  function ensure({interactive = false} = {}) {
    if (disposed) return Promise.resolve(null);
    const value = scope();
    if (value) return Promise.resolve(value);
    if (!enabled) {
      if (interactive !== true && !canRestore()) return Promise.resolve(null);
      enabled = true;
    }
    if (pending) return pending.promise;
    const attempt = {generation};
    pending = attempt;
    attempt.promise = verify(attempt);
    return attempt.promise;
  }
  async function token(expectedScope) {
    if (!expectedScope || scope() !== expectedScope) throw Error('authentication_required');
    const captured = generation, session = clerk.session;
    try {
      const value = await bounded(() => session.getToken());
      if (scope() !== expectedScope || captured !== generation || typeof value !== 'string' || !value.trim()) throw Error('authentication_required');
      return value;
    } catch {
      if (!disposed && captured === generation && scope() === expectedScope) {
        invalidate();
        notify(onNotice, 'Your account session is unavailable. Verify your account again to continue.');
      }
      throw Error('authentication_required');
    }
  }
  function suspend() {
    if (disposed || suspended) return;
    suspended = true;
    if (enabled) invalidate(false);
  }
  function resume(event) {
    if (disposed || (!suspended && event?.persisted !== true)) return;
    suspended = false;
    if (!enabled) return;
    if (verified) invalidate(false);
    void ensure();
  }
  function visibility() {
    if (host.document.hidden) suspend(); else resume();
  }
  host.addEventListener?.('pagehide', suspend);
  host.addEventListener?.('pageshow', resume);
  host.document?.addEventListener?.('visibilitychange', visibility);
  function dispose() {
    if (disposed) return;
    disposed = true;
    invalidate(false); // Keep only the verified boolean for a later document.
    try { unsubscribe?.(); } catch {}
    host.removeEventListener?.('pagehide', suspend);
    host.removeEventListener?.('pageshow', resume);
    host.document?.removeEventListener?.('visibilitychange', visibility);
    unsubscribe = null;
    clerk = null;
    key = null;
  }
  return {scope, ensure, token, dispose};
}
