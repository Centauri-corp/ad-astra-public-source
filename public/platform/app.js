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
        status.textContent = 'Sign in to enter the Ad Astra customer platform.';
        return;
      }
      authGate.hidden = true;
      if (returnPath.startsWith('/knowledge/')) { location.replace(returnPath); return; }
      platform.hidden = false;
      document.body.dataset.authenticated = 'true';
      const user = clerk.user;
      const label = user?.primaryEmailAddress?.emailAddress || user?.username || 'Signed in';
      status.textContent = `Signed in as ${label}`;
      const signOut = document.getElementById('platform-sign-out');
      if (signOut) signOut.addEventListener('click', async event => { event.preventDefault(); await clerk.signOut(); location.href = '/platform/'; });
    } catch (error) {
      authGate.hidden = false;
      status.textContent = 'Sign-in could not load. Please try again shortly.';
      console.error('ad_astra_clerk_load_error', error);
    }
  }
  init();
})();




