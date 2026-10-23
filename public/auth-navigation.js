'use strict';
window.adAstraReturnPath = function(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return '/platform/';
  try {
    const url=new URL(value,location.origin);
    if(url.origin!==location.origin || !['/platform/','/knowledge/'].includes(url.pathname))return '/platform/';
    const mode=url.searchParams.get('mode');
    return url.pathname+(mode && ['ask','research','create','learn','explore'].includes(mode)?'?mode='+mode:'')+(url.hash==='#ask-ad-astra'?'#ask-ad-astra':'');
  } catch {return '/platform/';}
};
window.adAstraVerifySession = async function(clerk) {
  const token = await clerk.session.getToken();
  if(!token)throw new Error('authentication_required');
  const response = await fetch('/api/session',{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(6000),headers:{Authorization:`Bearer ${token}`,'X-Ad-Astra-Request':'public-v1'}});
  if(!response.ok || (await response.json()).authenticated!==true)throw new Error('authentication_invalid');
};
