'use strict';
(()=>{
 if(globalThis.AdAstraProductDiscovery){globalThis.AdAstraProductDiscovery.mount();return;}
 const mounted=new WeakMap();
 function mount(scope=document){
  const filter=scope.matches?.('[data-mode-filter]')?scope:scope.querySelector('[data-mode-filter]');if(!filter)return;
  if(mounted.has(filter))return mounted.get(filter);
  const root=filter.closest('main')||scope;
  const cards=[...root.querySelectorAll('[data-family]')],buttons=[...filter.querySelectorAll('button[data-mode]')];
  const result=root.querySelector('#product-results'),allowed=new Set(buttons.map(b=>b.dataset.mode));if(!result)return;
  const events=new AbortController(),{signal}=events;
  const controller={dispose(){if(signal.aborted)return;events.abort();mounted.delete(filter);}};mounted.set(filter,controller);
  function select(mode,writeHistory=false){
    if(!allowed.has(mode))mode='all';let count=0;
    for(const card of cards){const shown=mode==='all'||card.dataset.modes.split(' ').includes(mode);card.hidden=!shown;if(shown)count++;}
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));
    result.textContent=mode==='all'?'All six product directions.':`${count} product directions for ${mode[0].toUpperCase()+mode.slice(1)}.`;
    if(writeHistory){const url=new URL(location.href);if(mode==='all')url.searchParams.delete('mode');else url.searchParams.set('mode',mode);history.pushState(null,'',url);}
  }
  buttons.forEach(button=>button.addEventListener('click',()=>select(button.dataset.mode,true),{signal}));
  window.addEventListener('popstate',()=>select(new URL(location.href).searchParams.get('mode')||'all'),{signal});
  window.addEventListener('ad-astra:before-route-change',controller.dispose,{signal});
  window.addEventListener('pagehide',controller.dispose,{signal});
  filter.hidden=false;select(new URL(location.href).searchParams.get('mode')||'all');
  return controller;
 }
 globalThis.AdAstraProductDiscovery=Object.freeze({mount});
 window.addEventListener('pageshow',event=>{if(event.persisted)mount();});
 mount();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount(),{once:true});
})();
