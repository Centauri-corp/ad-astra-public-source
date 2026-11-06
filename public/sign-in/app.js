'use strict';
(() => {
  const publishableKey = 'pk_live_Y2xlcmsuYWRhc3RyYS5nbG9iYWwk';
  const returnPath = window.adAstraReturnPath(new URLSearchParams(location.search).get('return'));
  const status = document.getElementById('sign-in-status');
  const mount = document.getElementById('sign-in');
  const reset = document.getElementById('sign-in-reset');
  const retry = document.getElementById('sign-in-retry');
  function clerkDomain() {
    try { return atob(publishableKey.split('_')[2]).slice(0, -1); } catch { return 'clerk.adastra.global'; }
  }
  async function init() {
    try {
      const clerk = window.Clerk;
      if (!clerk) throw new Error('clerk_not_loaded');
      await clerk.load({ui: {ClerkUI: window.__internal_ClerkUICtor}});
      if (clerk.session) {
        try {
          await window.adAstraVerifySession(clerk);
          location.replace(returnPath);
          return;
        } catch (error) {
          if (['authentication_invalid', 'authentication_required'].includes(error.message)) {
            status.textContent = 'Your current session could not be verified. Sign out, then sign in again.';
            reset.hidden = false;
            reset.addEventListener('click', async () => {
              reset.disabled = true;
              try { await clerk.signOut(); location.reload(); }
              catch { reset.disabled = false; status.textContent = 'Sign-out could not complete. Please try again.'; }
            });
          } else {
            status.textContent = 'Session verification is temporarily unavailable. Please try again shortly.';
          }
          retry.hidden = false;
          retry.addEventListener('click', () => location.reload());
          return;
        }
      }
      clerk.mountSignIn(mount, {fallbackRedirectUrl: returnPath});
      status.textContent = 'Sign in or create an account to continue.';
    } catch (error) {
      status.textContent = 'Sign-in could not load. Please try again shortly.';
      console.error('ad_astra_clerk_load_error', error);
    }
  }
  init();
})();


