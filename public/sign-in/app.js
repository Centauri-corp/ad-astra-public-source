'use strict';
(() => {
  const returnPath = window.adAstraReturnPath(new URLSearchParams(location.search).get('return'));
  const status = document.getElementById('sign-in-status');
  const mount = document.getElementById('sign-in');
  const retry = document.getElementById('sign-in-retry');
  let pending = false;

  async function bounded(promise) {
    let timeout;
    try {
      return await Promise.race([
        promise,
        new Promise((resolve, reject) => { timeout = window.setTimeout(() => reject(new Error('sign_in_timeout')), 8000); }),
      ]);
    } finally { window.clearTimeout(timeout); }
  }
  async function init() {
    if (pending) return;
    pending = true;
    retry.hidden = true;
    mount.setAttribute('aria-busy', 'true');
    status.textContent = 'Loading secure preview sign-in…';
    try {
      const clerk = window.Clerk;
      if (!clerk) throw new Error('clerk_not_loaded');
      await bounded(clerk.load({ui: {ClerkUI: window.__internal_ClerkUICtor}}));
      if (clerk.session) {
        await bounded(window.adAstraVerifySession(clerk));
        location.replace(returnPath);
        return;
      }
      clerk.mountSignIn(mount, {
        fallbackRedirectUrl: returnPath,
        forceRedirectUrl: returnPath,
        signUpUrl: '/access/#early-access-title',
        waitlistUrl: '/access/#early-access-title',
        withSignUp: false,
        transferable: false,
      });
      status.textContent = 'Sign in with an existing authorized preview account. General customer enrollment is coming soon.';
    } catch {
      status.textContent = 'Secure sign-in could not be verified. Retry below, or request early access if you do not have an invited preview account.';
      retry.hidden = false;
    } finally {
      mount.setAttribute('aria-busy', 'false');
      pending = false;
    }
  }
  retry.addEventListener('click', init);
  init();
})();
