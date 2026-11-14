'use strict';
window.adAstraReturnPath = function(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return '/platform/';
  try {
    const url=new URL(value,location.origin);
    if(url.origin!==location.origin || !['/platform/','/knowledge/','/account/billing/'].includes(url.pathname))return '/platform/';
    if(url.pathname==='/account/billing/')return url.pathname;
    const mode=url.searchParams.get('mode');
    const agent=url.searchParams.get('agentId'),params=[];
    if(mode&&['ask','research','create','learn','explore'].includes(mode))params.push('mode='+mode);
    if(agent&&['guide','researcher','creator','analyst','navigator','access','visual'].includes(agent))params.push('agentId='+agent);
    return url.pathname+(params.length?'?'+params.join('&'):'')+(url.hash==='#ask-ad-astra'?'#ask-ad-astra':'');
  } catch {return '/platform/';}
};
window.adAstraVerifySession = async function(clerk) {
  const token = await clerk.session.getToken();
  if(!token)throw new Error('authentication_required');
  const response = await fetch('/api/session',{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(6000),headers:{Authorization:`Bearer ${token}`,'X-Ad-Astra-Request':'public-v1'}});
  if(!response.ok)throw new Error('authentication_invalid');
  const result=await response.json();
  if(result.protocol!=='ad-astra-customer-session/v1'||result.authenticated!==true)throw new Error('authentication_invalid');
};
