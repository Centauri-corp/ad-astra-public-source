'use strict';
(()=>{
 if(globalThis.AdAstraCaliforniaPage){globalThis.AdAstraCaliforniaPage.mount();return;}
 const mounted=new WeakMap();
 function mount(scope=document){
  const node=scope.matches?.('#california-subscription-status')?scope:scope.querySelector('#california-subscription-status');if(!node)return;
  if(mounted.has(node))return mounted.get(node);
  const events=new AbortController(),{signal}=events;
  const controller={dispose(){if(signal.aborted)return;events.abort();mounted.delete(node);}};mounted.set(node,controller);
  window.addEventListener('ad-astra:before-route-change',controller.dispose,{signal});
  window.addEventListener('pagehide',controller.dispose,{signal});
  fetch('/api/subscription-status',{headers:{Accept:'application/json'},cache:'no-store',signal})
  .then(response=>{if(!response.ok)throw new Error('unavailable');return response.json();})
  .then(status=>{
    if(signal.aborted)return;
    // Test availability is deliberately never advertised as a paid live offer.
    node.textContent=status.market==='US-CA' && status.environment==='production' && status.available===true && status.frameworkDeployed===true
      ?'California subscription availability is confirmed by the current production status check.'
      :'Paid enrollment remains unavailable while the California release checks are completed.';
  })
  .catch(()=>{if(!signal.aborted)node.textContent='Subscription status is temporarily unavailable. Please check again later.';});
  return controller;
 }
 globalThis.AdAstraCaliforniaPage=Object.freeze({mount});
 window.addEventListener('pageshow',event=>{if(event.persisted)mount();});
 mount();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount(),{once:true});
})();
