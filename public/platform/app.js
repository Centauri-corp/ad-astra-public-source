'use strict';
(() => {
  const publishableKey = 'pk_live_Y2xlcmsuYWRhc3RyYS5nbG9iYWwk';
  const returnPath = window.adAstraReturnPath(new URLSearchParams(location.search).get('return'));
  const authGate = document.getElementById('platform-auth');
  const platform = document.getElementById('platform-content');
  const status = document.getElementById('platform-auth-status');

  function clerkDomain() {
    try { return atob(publishableKey.split('_')[2]).slice(0, -1); } catch { return 'clerk.adastra.global'; }
  }
  async function loadClerk() {
    const clerk = window.Clerk;
    if (!clerk) throw new Error('clerk_not_loaded');
    await clerk.load();
    return clerk;
  }
  async function init() {
    try {
      const clerk = await loadClerk();
      if (!clerk.session) {
        authGate.hidden = false;
        authGate.querySelector('a.button').href = '/sign-in/?return=' + encodeURIComponent(returnPath);
        status.textContent = 'Private preview access requires an existing authorized account. General customer enrollment is coming soon.';
        return;
      }
      await window.adAstraVerifySession(clerk);
      authGate.hidden = true;
      if (returnPath.startsWith('/knowledge/')) { location.replace(returnPath); return; }
      platform.hidden = false;
      document.body.dataset.authenticated = 'true';
      const user = clerk.user;
      const label = user?.primaryEmailAddress?.emailAddress || user?.username || 'Signed in';
      status.textContent = `Signed in as ${label}`;
      const signOut = document.getElementById('platform-sign-out');
      if (signOut) {
        signOut.hidden = false;
        signOut.addEventListener('click', async event => {
          event.preventDefault();
          try { await clerk.signOut(); location.href = '/platform/'; }
          catch { platform.hidden = true; authGate.hidden = false; status.textContent = 'Sign-out could not be confirmed. Please try signing out again before leaving a shared device.'; }
        });
      }
    } catch (error) {
      authGate.hidden = false;
      status.textContent = 'Your account session could not be verified. Please sign in again or try later.';
      platform.hidden = true;
    }
  }
  init();
})();




