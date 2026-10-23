'use strict';
(() => {
  const publishableKey = 'pk_live_Y2xlcmsuYWRhc3RyYS5nbG9iYWwk';
  const returnPath = window.adAstraReturnPath(new URLSearchParams(location.search).get('return'));
  const status = document.getElementById('sign-in-status');
  const mount = document.getElementById('sign-in');
  function clerkDomain() {
    try { return atob(publishableKey.split('_')[2]).slice(0, -1); } catch { return 'clerk.adastra.global'; }
  }
  async function init() {
    try {
      const clerk = window.Clerk;
      if (!clerk) throw new Error('clerk_not_loaded');
      await clerk.load({
        ui: {ClerkUI: window.__internal_ClerkUICtor},
        signInForceRedirectUrl: returnPath,
        signUpForceRedirectUrl: returnPath
      });
      if (clerk.session) { location.replace(returnPath); return; }
      clerk.mountSignIn(mount, {
        forceRedirectUrl: returnPath,
        signUpForceRedirectUrl: returnPath
      });
      status.textContent = 'Sign in or create an account to continue.';
    } catch (error) {
      status.textContent = 'Sign-in could not load. Please try again shortly.';
      console.error('ad_astra_clerk_load_error', error);
    }
  }
  init();
})();


