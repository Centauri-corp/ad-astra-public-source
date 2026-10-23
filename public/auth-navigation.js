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
